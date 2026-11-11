extends Node
## Workspace coordinator: owns the spatial panels and the rules that connect
## them (dock / undock, add card, passthrough mode).
##
## The Core never talks to a runtime directly: everything goes through the
## XR manager. This node wires the spatial panels, carousel, orb and system bars.

signal status_changed(status: String)

const PANEL_SCENE := preload("res://scenes/ui/spatial_panel_3d.tscn")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

@export var studio_panel_path: NodePath
@export var preview_panel_path: NodePath
@export var carousel_path: NodePath
@export var system_bars_path: NodePath
@export var thinking_orb_path: NodePath
@export var debug_label_path: NodePath = ^"../Overlay/DebugLabel"

var _studio: Node3D
var _preview: Node3D
var _carousel: Node3D
var _bars: Node3D
var _orb: Node3D
var _debug_label: Label
var _detached: Dictionary = {}
var _initial_transforms: Dictionary = {}


func _ready() -> void:
	_studio = get_node_or_null(studio_panel_path) as Node3D
	_preview = get_node_or_null(preview_panel_path) as Node3D
	_carousel = get_node_or_null(carousel_path) as Node3D
	_bars = get_node_or_null(system_bars_path) as Node3D
	_orb = get_node_or_null(thinking_orb_path) as Node3D
	_debug_label = get_node_or_null(debug_label_path) as Label

	for node in [_studio, _preview, _carousel, _orb]:
		if node != null:
			_initial_transforms[node] = node.transform

	if _studio != null and _studio.has_signal("close_requested"):
		_studio.close_requested.connect(_on_studio_closed)
	if _preview != null and _preview.has_signal("close_requested"):
		_preview.close_requested.connect(_on_preview_closed)
	if _carousel != null:
		if _carousel.has_signal("add_card_requested"):
			_carousel.add_card_requested.connect(_on_add_card_requested)
		if _carousel.has_signal("card_selected"):
			_carousel.card_selected.connect(_on_card_selected)
	if _bars != null:
		if _bars.has_signal("dock_item_pressed"):
			_bars.dock_item_pressed.connect(_on_dock_item_pressed)
		if _bars.has_signal("passthrough_mode_changed"):
			_bars.passthrough_mode_changed.connect(_on_passthrough_changed)
		if _bars.has_signal("settings_pressed"):
			_bars.settings_pressed.connect(_on_settings_pressed)

	# The panels build their 2D content in their own _ready, which runs after
	# this one, so the wiring waits for the next frame.
	_connect_studio_content.call_deferred()


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
	# Offset to the side of the studio so both stay visible.
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

	# Transition Thinking Orb to SOLVING state
	if _orb != null and _orb.has_method("set_state"):
		_orb.set_state(_orb.State.SOLVING)
		get_tree().create_timer(3.0).timeout.connect(func() -> void:
			if _orb != null and _orb.state == _orb.State.SOLVING:
				_orb.set_state(_orb.State.BREATHING)
		)

	# Update WebPreview with execution output
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


## Handles bottom dock buttons (Inicio, wZed, Preview, Fuentes, Voz).
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
		"voice":
			if _orb != null and _orb.has_method("set_state"):
				_orb.set_state(_orb.State.LISTENING)
				SpatialAudioScript.play_chime(get_tree(), _orb.global_position)
				_status("Asistente: Escuchando voz...")


func _on_passthrough_changed(mode: int) -> void:
	_status("Modo XR cambiado: %s" % ("MR Passthrough" if mode == 0 else "VR Espacio"))


func _on_settings_pressed() -> void:
	SpatialAudioScript.play_click(get_tree())
	_status("Ajustes del espacio")


## Resets all panels and entities back to their initial ergonomic positions.
func reset_layout() -> void:
	for node in [_studio, _preview, _carousel, _orb]:
		if node != null and _initial_transforms.has(node):
			node.transform = _initial_transforms[node]
			node.visible = true
	SpatialAudioScript.play_chime(get_tree())


func _status(text: String) -> void:
	if _debug_label != null:
		_debug_label.text = text
	status_changed.emit(text)
