extends Node
## Workspace coordinator: owns the spatial panels and the rules that connect
## them (dock / undock, add card, passthrough mode).
##
## The Core never talks to a runtime directly: everything goes through the
## XR manager. This node only wires the panels together.

signal status_changed(status: String)

const PANEL_SCENE := preload("res://scenes/ui/spatial_panel_3d.tscn")

@export var studio_panel_path: NodePath
@export var preview_panel_path: NodePath
@export var carousel_path: NodePath

var _studio: Node3D
var _preview: Node3D
var _carousel: Node3D
var _detached: Dictionary = {}


func _ready() -> void:
	_studio = get_node_or_null(studio_panel_path) as Node3D
	_preview = get_node_or_null(preview_panel_path) as Node3D
	_carousel = get_node_or_null(carousel_path) as Node3D
	if _studio != null:
		if _studio.has_signal("close_requested"):
			_studio.connect("close_requested", _on_studio_closed)
	if _carousel != null and _carousel.has_signal("add_card_requested"):
		_carousel.connect("add_card_requested", _on_add_card_requested)
	# The panels build their 2D content in their own _ready, which runs after
	# this one, so the wiring waits for the next frame.
	_connect_studio_content.call_deferred()


## The studio content asks to be detached into its own floating panel.
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
			child.connect("detach_view_requested", detach_view)


func _on_studio_closed() -> void:
	if _studio != null:
		_studio.visible = false
	_status("Estudio de código cerrado")


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


func _status(text: String) -> void:
	status_changed.emit(text)
