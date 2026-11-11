extends Node3D
## System bars: the simplified top bar and the visionOS-style bottom dock.
##
## Top bar
## -------
## Two primary buttons: "Passthrough MR / VR" (switches the XR session
## between mixed reality and virtual reality) and "Ajustes".
##
## Bottom dock
## ------------
## A compact floating row of quick access buttons, the same set the web
## build had (Inicio, wZed, Preview, Fuentes, Voz).
##
## Both bars are spatial panels: each one is a QuadMesh textured with a
## SubViewport, so the vaporwave theme applies to every button.

signal passthrough_mode_changed(mode: int)
signal settings_pressed()
signal dock_item_pressed(id: String)

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")

const DOCK_ITEMS := [
	{"id": "all", "label": "Inicio"},
	{"id": "code", "label": "wZed"},
	{"id": "preview", "label": "Preview"},
	{"id": "carousel", "label": "Fuentes"},
	{"id": "graph", "label": "Mapa"},
	{"id": "pads", "label": "Bandejas"},
	{"id": "voice", "label": "Voz"},
	{"id": "recenter", "label": "Recentrar"},
]

## Top bar and dock are rebuilt from code so the theme and the button set
## live in one place.
const TOP_BAR_SIZE := Vector2(0.46, 0.062)
const DOCK_SIZE := Vector2(0.62, 0.052)
const TOP_BAR_PIXELS := Vector2i(760, 100)
const DOCK_PIXELS := Vector2i(1050, 90)

var _xr: XRManagerScript
var _passthrough_button: Button
var _top_viewport: SubViewport
var _dock_viewport: SubViewport


func _ready() -> void:
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_build_top_bar()
	_build_dock()


# --- Construction ----------------------------------------------------------

func _build_top_bar() -> void:
	var surface := get_node_or_null("TopBar/Surface") as MeshInstance3D
	var viewport := get_node_or_null("TopBar/TopViewport") as SubViewport
	if surface == null or viewport == null:
		return
	_top_viewport = viewport
	_bind_texture(surface, viewport)

	var root := viewport.get_node_or_null("Root") as Control
	if root == null:
		return
	root.theme = load("res://assets/themes/vaporwave_sunset.tres")

	var row := root.get_node_or_null("Row") as HBoxContainer
	if row == null:
		return

	_passthrough_button = Button.new()
	_passthrough_button.text = "Passthrough MR / VR"
	_passthrough_button.pressed.connect(_on_passthrough_pressed)
	row.add_child(_passthrough_button)

	var settings_button := Button.new()
	settings_button.text = "Ajustes"
	settings_button.pressed.connect(func() -> void: settings_pressed.emit())
	row.add_child(settings_button)


func _build_dock() -> void:
	var surface := get_node_or_null("Dock/Surface") as MeshInstance3D
	var viewport := get_node_or_null("Dock/DockViewport") as SubViewport
	if surface == null or viewport == null:
		return
	_dock_viewport = viewport
	_bind_texture(surface, viewport)

	var root := viewport.get_node_or_null("Root") as Control
	if root == null:
		return
	root.theme = load("res://assets/themes/vaporwave_sunset.tres")

	var row := root.get_node_or_null("Row") as HBoxContainer
	if row == null:
		return
	for item in DOCK_ITEMS:
		var button := Button.new()
		button.text = item["label"]
		button.pressed.connect(_on_dock_pressed.bind(item["id"]))
		row.add_child(button)


## The ViewportTexture of a hand written .tscn cannot resolve its viewport
## at runtime, so the texture is bound here instead.
func _bind_texture(surface: MeshInstance3D, viewport: SubViewport) -> void:
	var material := surface.material_override as StandardMaterial3D
	if material == null:
		material = StandardMaterial3D.new()
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		surface.material_override = material
	material.albedo_texture = viewport.get_texture()


# --- Actions ---------------------------------------------------------------

func _on_passthrough_pressed() -> void:
	if _xr == null:
		return
	# The button toggles between MR (passthrough on) and VR (opaque).
	var enabled := not _xr.is_passthrough_enabled()
	_xr.set_passthrough(enabled)
	_update_passthrough_label(enabled)
	passthrough_mode_changed.emit(0 if enabled else 1)


func _update_passthrough_label(enabled: bool) -> void:
	if _passthrough_button != null:
		_passthrough_button.text = "Passthrough MR" if enabled else "VR"


func _on_dock_pressed(id: String) -> void:
	dock_item_pressed.emit(id)


## Shows the passthrough state that the XR session is actually in.
func sync_passthrough_state(enabled: bool) -> void:
	_update_passthrough_label(enabled)
