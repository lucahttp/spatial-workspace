extends Node
## Workspace coordinator: owns the spatial panels and the rules that connect
## them (dock / undock, add card, passthrough mode).
##
## The Core never talks to a runtime directly: everything goes through the
## XR manager. This node wires the spatial panels, carousel, orb, idea graph,
## pads and system bars.

signal status_changed(status: String)

const PANEL_SCENE := preload("res://scenes/ui/spatial_panel_3d.tscn")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

@export var studio_panel_path: NodePath
@export var preview_panel_path: NodePath
@export var carousel_path: NodePath
@export var system_bars_path: NodePath
@export var thinking_orb_path: NodePath
@export var idea_graph_path: NodePath
@export var pads_path: NodePath
@export var transcript_panel_path: NodePath
@export var debug_label_path: NodePath = ^"../Overlay/DebugLabel"

var _studio: Node3D
var _preview: Node3D
var _carousel: Node3D
var _bars: Node3D
var _orb: Node3D
var _graph: Node3D
var _pads: Node3D
var _transcript: Node3D
var _debug_label: Label
var _detached: Dictionary = {}
var _initial_transforms: Dictionary = {}

enum DeviceProfile {
	MR_XR_VR = 0,
	DESKTOP = 1,
	TABLET = 2,
	MOBILE = 3,
	TV = 4,
}

var current_profile: int = -1


func _ready() -> void:
	_studio = get_node_or_null(studio_panel_path) as Node3D
	_preview = get_node_or_null(preview_panel_path) as Node3D
	_carousel = get_node_or_null(carousel_path) as Node3D
	_bars = get_node_or_null(system_bars_path) as Node3D
	_orb = get_node_or_null(thinking_orb_path) as Node3D
	_graph = get_node_or_null(idea_graph_path) as Node3D
	_pads = get_node_or_null(pads_path) as Node3D
	_transcript = get_node_or_null(transcript_panel_path) as Node3D
	_debug_label = get_node_or_null(debug_label_path) as Label

	for node in [_studio, _preview, _carousel, _orb, _graph, _pads, _transcript, _bars]:
		if node != null:
			_initial_transforms[node] = node.transform

	if _graph != null:
		_graph.visible = false
	if _pads != null:
		_pads.visible = false

	get_viewport().size_changed.connect(_on_viewport_size_changed)
	call_deferred("_initialize_responsive_layout")

	if _studio != null and _studio.has_signal("close_requested"):
		_studio.close_requested.connect(_on_studio_closed)
	if _preview != null and _preview.has_signal("close_requested"):
		_preview.close_requested.connect(_on_preview_closed)
	if _transcript != null and _transcript.has_signal("close_requested"):
		_transcript.close_requested.connect(func() -> void: _transcript.visible = false)

	if _carousel != null:
		if _carousel.has_signal("add_card_requested"):
			_carousel.add_card_requested.connect(_on_add_card_requested)
		if _carousel.has_signal("card_selected"):
			_carousel.card_selected.connect(_on_card_selected)
		if _pads != null:
			_carousel.set("pads_path", _carousel.get_path_to(_pads))

	if _graph != null and _graph.has_signal("source_selected"):
		_graph.connect("source_selected", _on_graph_source_selected)

	if _pads != null:
		if _pads.has_signal("card_archived"):
			_pads.connect("card_archived", _on_card_archived)
		if _pads.has_signal("card_discarded"):
			_pads.connect("card_discarded", _on_card_discarded)
		if _graph != null:
			_pads.set("idea_graph_path", _pads.get_path_to(_graph))

	if _bars != null:
		if _bars.has_signal("dock_item_pressed"):
			_bars.dock_item_pressed.connect(_on_dock_item_pressed)
		if _bars.has_signal("passthrough_mode_changed"):
			_bars.passthrough_mode_changed.connect(_on_passthrough_changed)
		if _bars.has_signal("settings_pressed"):
			_bars.settings_pressed.connect(_on_settings_pressed)

	var xr_mgr := get_tree().get_first_node_in_group("xr_manager")
	if xr_mgr != null and xr_mgr.has_signal("voice_trigger_pressed"):
		xr_mgr.connect("voice_trigger_pressed", _on_controller_voice_pressed)

	if _orb != null and _orb.has_signal("voice_trigger_requested"):
		_orb.voice_trigger_requested.connect(_on_controller_voice_pressed)

	_connect_studio_content.call_deferred()
	_connect_transcript_content.call_deferred()


## Wires CodeStudio 2D signals (detach views, run code).
func _connect_studio_content() -> void:
	if _studio == null:
		return
	var viewport := _studio.get_node_or_null("PanelViewport") as SubViewport
	if viewport == null:
		return
	var host := viewport.get_node_or_null("Content")
	if host == null:
		return
	for child in host.get_children():
		if child.has_signal("detach_view_requested"):
			child.detach_view_requested.connect(detach_view)
		if child.has_signal("run_requested"):
			child.run_requested.connect(_on_run_requested)


## Wires TranscriptPanel quick delegation buttons.
func _connect_transcript_content() -> void:
	if _transcript == null:
		return
	var viewport := _transcript.get_node_or_null("PanelViewport") as SubViewport
	if viewport == null:
		return
	var host := viewport.get_node_or_null("Content")
	if host == null:
		return
	for child in host.get_children():
		if child.has_method("get_orchestrator"):
			var orch = child.get_orchestrator()
			if orch != null:
				if orch.has_method("set_coordinator"):
					orch.set_coordinator(self)
				if orch.has_signal("workspace_action_requested") and not orch.workspace_action_requested.is_connected(_on_workspace_action_requested):
					orch.workspace_action_requested.connect(_on_workspace_action_requested)
		if child.has_signal("run_wzed_requested"):
			child.connect("run_wzed_requested", func() -> void: _on_run_requested("index.js"))
		if child.has_signal("create_module_requested"):
			child.connect("create_module_requested", func() -> void: add_reference_card("Nuevo Módulo 3D", "SPATIAL", "Generado por voz."))
		if child.has_signal("list_vfs_requested"):
			child.connect("list_vfs_requested", func() -> void:
				if _studio != null:
					_studio.visible = true
				_status("Listando VFS...")
			)
		if child.has_signal("voice_command_submitted"):
			child.connect("voice_command_submitted", _on_voice_command_submitted)
		if child.has_signal("model_configured"):
			child.connect("model_configured", _on_model_configured)
		if child.has_signal("open_browser_requested"):
			child.connect("open_browser_requested", _on_open_browser_requested)
		if child.has_signal("recenter_requested"):
			child.connect("recenter_requested", recenter)
		if child.has_signal("orb_state_changed"):
			child.connect("orb_state_changed", func(st: int) -> void:
				if _orb != null and _orb.has_method("set_state"):
					_orb.set_state(st)
			)
		if child.has_signal("mic_volume_meter_updated"):
			child.connect("mic_volume_meter_updated", func(vol: float) -> void:
				if _orb != null and _orb.has_method("set_voice_level"):
					_orb.set_voice_level(vol)
			)


func _on_voice_command_submitted(utterance: String) -> void:
	_status("Voz: %s" % utterance)
	if _orb != null and _orb.has_method("set_state"):
		_orb.set_state(_orb.State.LISTENING)
		SpatialAudioScript.play_listening_start(get_tree(), _orb.global_position)
		get_tree().create_timer(1.2).timeout.connect(func() -> void:
			if _orb != null:
				_orb.set_state(_orb.State.WORKING)
				SpatialAudioScript.play_voice_response(get_tree(), _orb.global_position)
			get_tree().create_timer(2.0).timeout.connect(func() -> void:
				if _orb != null and _orb.state == _orb.State.WORKING:
					_orb.set_state(_orb.State.BREATHING)
			)
		)


func _on_model_configured(provider_name: String, model_name: String, voice_id: String) -> void:
	_status("Modelo Live configurado: %s (%s) con voz %s" % [provider_name, model_name, voice_id])
	if _orb != null:
		SpatialAudioScript.play_chime(get_tree(), _orb.global_position)


func _on_open_browser_requested(url: String) -> void:
	if _preview != null:
		_preview.visible = true
		var preview_viewport := _preview.get_node_or_null("PanelViewport") as SubViewport
		if preview_viewport != null:
			var host := preview_viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("_navigate_to"):
						child._navigate_to(url)


## Handles web search queries dispatched by Needle / GPT Live.
func _on_search_web_requested(query: String) -> void:
	_status("Búsqueda web: %s" % query)
	if _preview != null:
		_preview.visible = true
		var preview_viewport := _preview.get_node_or_null("PanelViewport") as SubViewport
		if preview_viewport != null:
			var host := preview_viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("display_search_results"):
						child.display_search_results(query)


## Central dispatcher for high-level agent workspace actions from RealtimeAgentOrchestrator.
func _on_workspace_action_requested(action_name: String, params: Dictionary) -> void:
	match action_name:
		"run_wzed":
			var file_name: String = params.get("file", "index.js")
			_on_run_requested(file_name)
		"open_browser":
			var url: String = params.get("url", "http://localhost:5173/preview")
			_on_open_browser_requested(url)
		"search_web":
			var query: String = params.get("query", "")
			_on_search_web_requested(query)
		"recenter":
			recenter()
		"reset_layout":
			reset_layout()
		"set_layout_profile":
			var profile_id: int = params.get("profile", 1)
			var animated: bool = params.get("animated", false)
			apply_device_profile(profile_id, animated)
		"add_card":
			var title: String = params.get("title", "Nueva Fuente")
			var badge: String = params.get("badge", "VOZ")
			var summary: String = params.get("summary", "Generada por HeyBuddy")
			add_reference_card(title, badge, summary)
		"toggle_panel":
			var p_id: String = params.get("panel_id", "")
			var vis: bool = params.get("visible", true)
			var node_target = get("_%s" % ("studio" if p_id == "code" else p_id))
			if node_target != null:
				node_target.visible = vis
				_status("Panel %s %s" % [p_id, "visible" if vis else "oculto"])


func _on_controller_voice_pressed() -> void:
	if _transcript != null:
		_transcript.visible = true
		var viewport := _transcript.get_node_or_null("PanelViewport") as SubViewport
		if viewport != null:
			var host := viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("get_orchestrator"):
						var orch: Object = child.get_orchestrator()
						if orch != null:
							orch.trigger_start_button()
							_status("Voz: Activado vía mando / dock")


func _on_studio_closed() -> void:
	if _studio != null:
		_studio.visible = false
	_status("Estudio de código cerrado")


func _on_preview_closed() -> void:
	if _preview != null:
		_preview.visible = false
	_status("Vista previa cerrada")


## Detaches a view of the studio into its own floating spatial panel.
func detach_view(view_id: String) -> void:
	if _detached.has(view_id):
		return
	var panel := PANEL_SCENE.instantiate() as Node3D
	panel.name = "Detached_%s" % view_id
	panel.content_scene = _studio.content_scene
	panel.content_solo_view = view_id
	panel.panel_size = Vector2(0.7, 0.44)
	panel.position = _studio.position + Vector3(0.95, 0.05, 0.35)
	add_child(panel)
	_detached[view_id] = panel
	if _studio.has_method("set_view_docked"):
		_studio.set_view_docked(view_id, false)
	_status("Vista %s desacoplada" % view_id)


## Brings a detached view back into the studio panel.
func dock_view(view_id: String) -> void:
	if not _detached.has(view_id):
		return
	var panel: Node = _detached[view_id]
	_detached.erase(view_id)
	if is_instance_valid(panel):
		panel.queue_free()
	if _studio != null and _studio.has_method("set_view_docked"):
		_studio.set_view_docked(view_id, true)
	_status("Vista %s acoplada" % view_id)


## Adds a reference card to the carousel.
func add_reference_card(title: String, badge: String, summary: String) -> void:
	if _carousel == null or not _carousel.has_method("add_card"):
		return
	var card_id: String = _carousel.add_card(title, badge, summary)
	_status("Tarjeta %s anclada" % title)


func _on_add_card_requested() -> void:
	add_reference_card("Nueva Fuente", "NUEVO", "Anclada desde el boton + del carrusel.")


## Handles code execution triggered from wZed CodeStudio.
func _on_run_requested(file_name: String) -> void:
	_status("Ejecutando %s..." % file_name)
	SpatialAudioScript.play_chime(get_tree(), _studio.global_position if _studio else Vector3.ZERO)

	if _orb != null and _orb.has_method("set_state"):
		_orb.set_state(_orb.State.SOLVING)
		get_tree().create_timer(3.0).timeout.connect(func() -> void:
			if _orb != null and _orb.state == _orb.State.SOLVING:
				_orb.set_state(_orb.State.BREATHING)
		)

	if _preview != null:
		_preview.visible = true
		var preview_viewport := _preview.get_node_or_null("PanelViewport") as SubViewport
		if preview_viewport != null:
			var host := preview_viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("display_runner_output"):
						var summary := "Compilado wZed exitosamente para %s con nodos 3D activos." % file_name
						child.display_runner_output(file_name, summary)


## Handles card selection from DocumentCarousel: routes data to WebPreview.
func _on_card_selected(id: String, title: String, _badge: String, summary: String) -> void:
	_status("Tarjeta seleccionada: %s" % title)
	if _orb != null and _orb.has_method("set_state"):
		_orb.set_state(_orb.State.WORKING)
		get_tree().create_timer(2.0).timeout.connect(func() -> void:
			if _orb != null and _orb.state == _orb.State.WORKING:
				_orb.set_state(_orb.State.BREATHING)
		)

	if _preview != null:
		_preview.visible = true
		var preview_viewport := _preview.get_node_or_null("PanelViewport") as SubViewport
		if preview_viewport != null:
			var host := preview_viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("display_document"):
						child.display_document(title, summary, "doc://carousel/%s" % id)


func _on_graph_source_selected(_id: String, title: String, url: String) -> void:
	_status("Fuente del mapa: %s" % title)
	if _preview != null:
		_preview.visible = true
		var preview_viewport := _preview.get_node_or_null("PanelViewport") as SubViewport
		if preview_viewport != null:
			var host := preview_viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("display_document"):
						child.display_document(title, "Fuente conectada en el Mapa de Ideas.", url)


func _on_card_archived(card_data: Dictionary) -> void:
	_status("Archivado: %s -> Tejiendo mapa" % card_data.get("title", ""))


func _on_card_discarded(card_data: Dictionary) -> void:
	_status("Descartado a la basura: %s" % card_data.get("title", ""))


## Handles bottom dock buttons.
func _on_dock_item_pressed(id: String) -> void:
	SpatialAudioScript.play_click(get_tree())
	match id:
		"all":
			reset_layout()
			_status("Espacio restablecido")
		"code":
			if _studio != null:
				_studio.visible = not _studio.visible
				_status("wZed %s" % ("abierto" if _studio.visible else "cerrado"))
		"preview":
			if _preview != null:
				_preview.visible = not _preview.visible
				_status("Preview %s" % ("abierto" if _preview.visible else "cerrado"))
		"carousel":
			if _carousel != null:
				_carousel.visible = not _carousel.visible
				_status("Fuentes %s" % ("abiertas" if _carousel.visible else "cerradas"))
		"graph":
			if _graph != null:
				_graph.visible = not _graph.visible
				_status("Mapa de ideas %s" % ("abierto" if _graph.visible else "cerrado"))
		"pads":
			if _pads != null:
				_pads.visible = not _pads.visible
				_status("Bandejas %s" % ("abiertas" if _pads.visible else "cerradas"))
		"voice":
			_on_controller_voice_pressed()
		"recenter":
			recenter()


func _on_passthrough_changed(mode: int) -> void:
	_status("Modo XR cambiado: %s" % ("MR Passthrough" if mode == 0 else "VR Espacio"))


func _on_settings_pressed() -> void:
	SpatialAudioScript.play_click(get_tree())
	_status("Ajustes: Configuración de Modelo y Espacio")
	if _transcript != null:
		_transcript.visible = true
		var viewport := _transcript.get_node_or_null("PanelViewport") as SubViewport
		if viewport != null:
			var host := viewport.get_node_or_null("Content")
			if host != null:
				for child in host.get_children():
					if child.has_method("show_settings"):
						child.show_settings(true)


## Recenters workspace directly in front of active viewpoint.
func recenter() -> void:
	if XRServer.primary_interface != null:
		XRServer.center_on_hmd(XRServer.RESET_FULL_ROTATION, true)
	SpatialAudioScript.play_chime(get_tree())
	_status("Workspace recentrado frente a tu vista")


## Resets all panels and entities back to their initial ergonomic positions.
func reset_layout() -> void:
	for node in [_studio, _preview, _carousel, _orb, _graph, _pads, _transcript]:
		if node != null and _initial_transforms.has(node):
			node.transform = _initial_transforms[node]
			node.visible = true
	SpatialAudioScript.play_chime(get_tree())


func _status(text: String) -> void:
	if _debug_label != null:
		_debug_label.text = text
	status_changed.emit(text)


# --- Responsive Layout System (Mobile, Tablet, Desktop, TV, XR) ------------

func _initialize_responsive_layout() -> void:
	var profile := detect_device_profile()
	apply_device_profile(profile, false)


func detect_device_profile() -> int:
	var xr_mgr := get_tree().get_first_node_in_group("xr_manager")
	if xr_mgr != null and xr_mgr.has_method("is_session_active") and xr_mgr.is_session_active():
		return DeviceProfile.MR_XR_VR
	
	var vp := get_viewport()
	if vp == null:
		return DeviceProfile.DESKTOP
	var vp_size := vp.get_visible_rect().size
	if vp_size.x >= 2560 and vp_size.y >= 1440:
		return DeviceProfile.TV
	elif vp_size.y > vp_size.x * 1.05 or vp_size.x < 720:
		return DeviceProfile.MOBILE
	elif vp_size.x < 1150:
		return DeviceProfile.TABLET
	else:
		return DeviceProfile.DESKTOP


func _on_viewport_size_changed() -> void:
	var new_profile := detect_device_profile()
	if new_profile != current_profile:
		apply_device_profile(new_profile, true)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				apply_device_profile(DeviceProfile.DESKTOP, true)
			KEY_2:
				apply_device_profile(DeviceProfile.TABLET, true)
			KEY_3:
				apply_device_profile(DeviceProfile.MOBILE, true)
			KEY_4:
				apply_device_profile(DeviceProfile.TV, true)
			KEY_5:
				apply_device_profile(DeviceProfile.MR_XR_VR, true)


func apply_device_profile(profile: int, animated: bool = true) -> void:
	current_profile = profile
	var tween: Tween = null
	if animated and is_inside_tree():
		tween = create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	
	match profile:
		DeviceProfile.MR_XR_VR:
			_apply_xr_layout(tween)
			_status("Layout: MR/XR/VR 6DoF Espacial")
		DeviceProfile.DESKTOP:
			_apply_desktop_layout(tween)
			_status("Layout: Desktop Widescreen 3 Paneles")
		DeviceProfile.TABLET:
			_apply_tablet_layout(tween)
			_status("Layout: Tablet Foco Adaptativo")
		DeviceProfile.MOBILE:
			_apply_mobile_layout(tween)
			_status("Layout: Mobile Vertical Compacto")
		DeviceProfile.TV:
			_apply_tv_layout(tween)
			_status("Layout: TV Panorámica 10-Foot 4K")


func _apply_desktop_layout(tween: Tween) -> void:
	_animate_node(tween, _preview, Vector3(0.0, 1.48, -1.45), Vector3.ZERO, Vector3.ONE)
	_animate_node(tween, _studio, Vector3(-1.08, 1.48, -1.40), Vector3(0, deg_to_rad(16), 0), Vector3.ONE)
	_animate_node(tween, _transcript, Vector3(1.02, 1.48, -1.40), Vector3(0, deg_to_rad(-16), 0), Vector3.ONE)
	_animate_node(tween, _orb, Vector3(0.0, 1.95, -1.35), Vector3.ZERO, Vector3.ONE)
	_animate_node(tween, _carousel, Vector3(0.0, 0.96, -1.25), Vector3.ZERO, Vector3.ONE)
	_animate_node(tween, _bars, Vector3(0.0, 0.90, -1.15), Vector3.ZERO, Vector3.ONE)
	if _studio != null: _studio.visible = true
	if _preview != null: _preview.visible = true
	if _transcript != null: _transcript.visible = true
	if _graph != null: _graph.visible = false
	if _pads != null: _pads.visible = false


func _apply_tablet_layout(tween: Tween) -> void:
	var s := Vector3(0.85, 0.85, 0.85)
	_animate_node(tween, _preview, Vector3(0.0, 1.44, -1.35), Vector3.ZERO, s)
	_animate_node(tween, _studio, Vector3(-0.78, 1.44, -1.35), Vector3(0, deg_to_rad(22), 0), s)
	_animate_node(tween, _transcript, Vector3(0.78, 1.44, -1.35), Vector3(0, deg_to_rad(-22), 0), s)
	_animate_node(tween, _orb, Vector3(0.0, 1.88, -1.30), Vector3.ZERO, Vector3(0.9, 0.9, 0.9))
	_animate_node(tween, _carousel, Vector3(0.0, 0.96, -1.25), Vector3.ZERO, s)
	_animate_node(tween, _bars, Vector3(0.0, 0.90, -1.15), Vector3.ZERO, s)
	if _studio != null: _studio.visible = true
	if _preview != null: _preview.visible = true
	if _transcript != null: _transcript.visible = true


func _apply_mobile_layout(tween: Tween) -> void:
	var s_prev := Vector3(0.72, 0.72, 0.72)
	var s_trans := Vector3(0.65, 0.65, 0.65)
	_animate_node(tween, _orb, Vector3(0.0, 1.95, -1.15), Vector3.ZERO, Vector3(0.8, 0.8, 0.8))
	_animate_node(tween, _preview, Vector3(0.0, 1.55, -1.18), Vector3.ZERO, s_prev)
	_animate_node(tween, _transcript, Vector3(0.0, 1.08, -1.18), Vector3.ZERO, s_trans)
	_animate_node(tween, _studio, Vector3(-1.3, 1.45, -1.3), Vector3(0, deg_to_rad(30), 0), Vector3(0.6, 0.6, 0.6))
	_animate_node(tween, _bars, Vector3(0.0, 0.72, -1.10), Vector3.ZERO, Vector3(0.75, 0.75, 0.75))
	if _preview != null: _preview.visible = true
	if _transcript != null: _transcript.visible = true


func _apply_tv_layout(tween: Tween) -> void:
	var s := Vector3(1.35, 1.35, 1.35)
	_animate_node(tween, _preview, Vector3(0.0, 1.55, -2.25), Vector3.ZERO, s)
	_animate_node(tween, _studio, Vector3(-1.65, 1.55, -2.15), Vector3(0, deg_to_rad(24), 0), s)
	_animate_node(tween, _transcript, Vector3(1.55, 1.55, -2.15), Vector3(0, deg_to_rad(-24), 0), s)
	_animate_node(tween, _orb, Vector3(0.0, 2.30, -2.15), Vector3.ZERO, Vector3(1.4, 1.4, 1.4))
	_animate_node(tween, _carousel, Vector3(0.0, 0.95, -2.10), Vector3.ZERO, s)
	_animate_node(tween, _bars, Vector3(0.0, 0.85, -1.95), Vector3.ZERO, Vector3(1.3, 1.3, 1.3))
	if _studio != null: _studio.visible = true
	if _preview != null: _preview.visible = true
	if _transcript != null: _transcript.visible = true


func _apply_xr_layout(tween: Tween) -> void:
	for node in [_studio, _preview, _carousel, _orb, _graph, _pads, _transcript, _bars]:
		if node != null and _initial_transforms.has(node):
			var initial_t: Transform3D = _initial_transforms[node]
			_animate_node(tween, node, initial_t.origin, initial_t.basis.get_euler(), initial_t.basis.get_scale())


func _animate_node(tween: Tween, node: Node3D, target_pos: Vector3, target_rot: Vector3, target_scale: Vector3) -> void:
	if node == null:
		return
	if tween != null:
		tween.tween_property(node, "position", target_pos, 0.45)
		tween.tween_property(node, "rotation", target_rot, 0.45)
		tween.tween_property(node, "scale", target_scale, 0.45)
	else:
		node.position = target_pos
		node.rotation = target_rot
		node.scale = target_scale
