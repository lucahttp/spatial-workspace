extends Node3D
## Turns 3D controller rays into 2D GUI events inside a SubViewport.
##
## A spatial panel is a QuadMesh textured with a SubViewport. Any Control/Theme
## authored in 2D therefore works in 3D for free — we only have to translate the
## controller ray into viewport pixels and feed the resulting mouse events to the
## SubViewport.
##
## The interaction split matches the WebXR port:
##
##   TRIGGER -> forwarded as a mouse click, so 2D Controls activate
##   GRIP    -> handled by spatial_panel_3d.gd, never forwarded as a click
##
## The mouse is also supported so the scene can be tested on the desktop.

signal hover_changed(hovering: bool)
signal clicked()

# Preloaded (not referenced by global class name) so the script also parses in
# a headless run without the editor's class cache.
const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

@export var sub_viewport_path: NodePath
@export var surface_path: NodePath
@export var collider_path: NodePath

var _viewport: SubViewport
var _surface: MeshInstance3D
var _collider: Area3D
var _xr_manager: XRManagerScript
var _hovering := false
var _last_position := Vector2.ZERO
var _trigger_down := false

@onready var _camera: Camera3D = get_viewport().get_camera_3d()


func _ready() -> void:
	_viewport = get_node_or_null(sub_viewport_path) as SubViewport
	_surface = get_node_or_null(surface_path) as MeshInstance3D
	_collider = get_node_or_null(collider_path) as Area3D
	_xr_manager = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	if _viewport == null:
		push_warning("SpatialViewportBridge: no SubViewport assigned.")


func _process(_delta: float) -> void:
	if _viewport == null or _surface == null:
		return
	var hit := _resolve_pointer()
	if hit.is_empty():
		_set_hovering(false)
		return
	var world_position: Vector3 = hit["position"]
	var local := _surface.to_local(world_position)
	var size := _surface_size()
	if size.x <= 0.0 or size.y <= 0.0:
		return
	var uv := Vector2(
		(local.x / size.x) + 0.5,
		0.5 - (local.y / size.y)
	)
	if uv.x < 0.0 or uv.x > 1.0 or uv.y < 0.0 or uv.y > 1.0:
		_set_hovering(false)
		return
	_set_hovering(true)
	_push_motion(Vector2(uv.x * _viewport.size.x, uv.y * _viewport.size.y))


func _unhandled_input(event: InputEvent) -> void:
	# Desktop fallback: a real mouse click activates the 2D Controls.
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_trigger_down = event.pressed
		_push_button(_last_position, event.pressed)


# --- Pointer resolution ----------------------------------------------------

## Returns the raycast hit on this panel, or an empty Dictionary.
func _resolve_pointer() -> Dictionary:
	# The XR controller ray wins over the mouse.
	if _xr_manager != null:
		var candidate_hits := {}
		for hand: int in [0, 1]:
			var origin := _xr_manager.get_aim_origin(hand)
			var direction := _xr_manager.get_aim_direction(hand)
			if direction == Vector3.ZERO:
				continue
			var hit := _raycast(origin, origin + direction * 10.0)
			if not hit.is_empty():
				candidate_hits[hand] = hit

		if not candidate_hits.is_empty():
			# If any candidate hand is actively pressing the trigger, prioritize it!
			var chosen_hand := -1
			for hand: int in candidate_hits.keys():
				if _xr_manager.is_trigger_pressed(hand):
					chosen_hand = hand
					break
			# Otherwise prefer right hand (1) if it hit, else left hand (0)
			if chosen_hand < 0:
				chosen_hand = 1 if candidate_hits.has(1) else candidate_hits.keys()[0]
			_sync_trigger(chosen_hand)
			return candidate_hits[chosen_hand]

	# No controller is pointing at the panel: drop any pending click.
	_sync_trigger(-1)
	if _camera == null:
		return {}
	var mouse := get_viewport().get_mouse_position()
	var from := _camera.project_ray_origin(mouse)
	var to := from + _camera.project_ray_normal(mouse) * 10.0
	return _raycast(from, to)


## Mirrors the XR trigger state into the 2D viewport as a mouse button.
func _sync_trigger(hand: int) -> void:
	if _xr_manager == null:
		return
	var pressed := false
	if hand >= 0:
		pressed = _xr_manager.is_trigger_pressed(hand)
	if pressed == _trigger_down:
		return
	_trigger_down = pressed
	_push_button(_last_position, pressed)
	if pressed:
		SpatialAudioScript.play_click(get_tree(), global_position)
		clicked.emit()


## Raycast against this panel's collider. Returns an empty Dictionary on a miss.
func _raycast(from: Vector3, to: Vector3) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(from, to, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	# intersect_ray returns the hit as a Dictionary (empty when nothing was hit).
	var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return {}
	if hit["collider"] != _collider:
		return {}
	return hit


# --- 2D event forwarding ---------------------------------------------------

func _push_motion(pixels: Vector2) -> void:
	var motion := InputEventMouseMotion.new()
	motion.position = pixels
	motion.global_position = pixels
	motion.relative = pixels - _last_position
	motion.button_mask = MOUSE_BUTTON_MASK_LEFT if _trigger_down else 0
	_last_position = pixels
	_viewport.push_input(motion, true)


func _push_button(pixels: Vector2, pressed: bool) -> void:
	var button := InputEventMouseButton.new()
	button.button_index = MOUSE_BUTTON_LEFT
	button.pressed = pressed
	button.button_mask = MOUSE_BUTTON_MASK_LEFT if pressed else 0
	button.position = pixels
	button.global_position = pixels
	_viewport.push_input(button, true)


func _set_hovering(value: bool) -> void:
	if value == _hovering:
		return
	_hovering = value
	# The SubViewport needs to be told about the pointer entering or leaving,
	# otherwise the Controls never get a hover state.
	if value:
		_viewport.notify_mouse_entered()
	else:
		_viewport.notify_mouse_exited()
	hover_changed.emit(value)


func _surface_size() -> Vector2:
	var mesh := _surface.mesh
	if mesh is QuadMesh:
		return (mesh as QuadMesh).size
	return Vector2.ZERO


## True when the pointer is currently over the panel.
func is_hovering() -> bool:
	return _hovering


## Viewport pixel position of the last pointer sample.
func get_pointer_position() -> Vector2:
	return _last_position
