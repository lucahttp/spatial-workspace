extends Node3D
## A spatial panel: a QuadMesh textured with a SubViewport, plus the
## visionOS-style floating bottom bar.
##
## Interaction model (same contract as the WebXR port):
##
##   GRIP    -> grab the panel and move it in 3D
##   TRIGGER -> activate the 2D Controls inside the SubViewport
##
## Bimanual manipulation: when a second controller grips the same panel, the
## distance between both grips drives the scale and the angle between them
## drives the yaw, exactly like the two-handed handle in the web version.
##
## The drag uses a stable drag plane: the depth of the grip along the ray is
## recorded on grab, so moving the panel never makes the grip "fall off".

signal close_requested()

const GRIP_MIN_DISTANCE := 0.05

# Preloaded (not referenced by global class name) so the script also parses in
# a headless run without the editor's class cache.
const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")

@export var panel_size := Vector2(0.94, 0.58)
@export var surface_path: NodePath
@export var collider_path: NodePath
@export var bottom_bar_path: NodePath
@export var affordance_path: NodePath
@export var viewport_path: NodePath = ^"PanelViewport"
## 2D scene rendered inside the panel. Empty keeps the built-in demo content.
@export var content_scene: PackedScene
## When set, the content shows only that view (used by detached panels).
@export var content_solo_view := ""

var _surface: MeshInstance3D
var _collider: Area3D
var _bottom_bar: Node3D
var _xr_manager: XRManagerScript
var _affordance: Node3D

var _dragging := false
var _dragging_hand := -1
var _second_hand := -1

# Grab frame: for each gripping hand we keep the depth along the ray and the
# offset between the grip point and the panel origin.
var _depth := {}
var _offset := {}

# Bimanual reference frame
var _bimanual_start_distance := 0.0
var _bimanual_start_angle := 0.0
var _bimanual_start_scale := Vector3.ONE
var _bimanual_start_rotation := 0.0


func _ready() -> void:
	_surface = get_node_or_null(surface_path) as MeshInstance3D
	_collider = get_node_or_null(collider_path) as Area3D
	_bottom_bar = get_node_or_null(bottom_bar_path) as Node3D
	_xr_manager = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_affordance = get_node_or_null(affordance_path) as Node3D
	if _surface != null:
		_apply_surface_size()
		_bind_viewport_texture()
	_build_content()


## Instantiates the 2D content inside the panel viewport when one is set.
func _build_content() -> void:
	if content_scene == null:
		return
	var viewport := get_node_or_null(viewport_path) as SubViewport
	if viewport == null:
		return
	var host := viewport.get_node_or_null("Content")
	if host == null:
		return
	var demo := viewport.get_node_or_null("Demo")
	if demo != null:
		demo.visible = false
	var content := content_scene.instantiate()
	host.add_child(content)
	if content_solo_view != "" and content.has_method("set_solo_view"):
		content.set_solo_view(content_solo_view)


## The ViewportTexture of a hand written .tscn cannot resolve its viewport
## at runtime, so the live texture is bound here.
func _bind_viewport_texture() -> void:
	var viewport := get_node_or_null(viewport_path) as SubViewport
	if viewport == null:
		return
	var material := _surface.material_override as StandardMaterial3D
	if material == null:
		material = StandardMaterial3D.new()
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		_surface.material_override = material
	material.albedo_texture = viewport.get_texture()


func _process(_delta: float) -> void:
	if _xr_manager == null:
		return
	var gripping := -1
	for hand: int in [0, 1]:
		if _xr_manager.is_grip_pressed(hand):
			gripping = hand
			break
	if gripping < 0:
		if _dragging:
			_end_drag()
		return
	if not _dragging:
		_start_drag(gripping)
		return
	if gripping != _dragging_hand and _second_hand < 0:
		# Second controller grabbed the same panel -> bimanual manipulation.
		_second_hand = gripping
		_begin_bimanual()
		return
	if _second_hand >= 0:
		_update_bimanual()
	else:
		_update_single(gripping)


# --- Dragging --------------------------------------------------------------

func _start_drag(hand: int) -> void:
	var hit := _hit_on_panel(hand)
	if hit.is_empty():
		return
	var position: Vector3 = hit["position"]
	_dragging = true
	_dragging_hand = hand
	_second_hand = -1
	_depth[hand] = _ray_depth(hand)
	_offset[hand] = global_position - position
	_set_affordance_dragging(true)


func _end_drag() -> void:
	_dragging = false
	_dragging_hand = -1
	_second_hand = -1
	_depth.clear()
	_offset.clear()
	_set_affordance_dragging(false)


## Tells the affordance pill whether the panel is being held.
func _set_affordance_dragging(value: bool) -> void:
	if _affordance != null and _affordance.has_method("set_dragging"):
		_affordance.set_dragging(value)


## Moves the panel so the grip keeps its relative position on the panel.
func _update_single(hand: int) -> void:
	var point := _point_on_drag_plane(hand)
	if point.is_empty():
		return
	var offset: Vector3 = _offset.get(hand, Vector3.ZERO)
	var point_position: Vector3 = point["position"]
	global_position = point_position + offset


# --- Bimanual manipulation -------------------------------------------------

func _begin_bimanual() -> void:
	var a := _point_on_drag_plane(_dragging_hand)
	var b := _point_on_drag_plane(_second_hand)
	if a.is_empty() or b.is_empty():
		return
	var pa: Vector3 = a["position"]
	var pb: Vector3 = b["position"]
	_bimanual_start_distance = maxf(pa.distance_to(pb), GRIP_MIN_DISTANCE)
	_bimanual_start_angle = _yaw_between(pa, pb)
	_bimanual_start_scale = scale
	_bimanual_start_rotation = rotation.y


func _update_bimanual() -> void:
	var a := _point_on_drag_plane(_dragging_hand)
	var b := _point_on_drag_plane(_second_hand)
	if a.is_empty() or b.is_empty():
		return
	var pa: Vector3 = a["position"]
	var pb: Vector3 = b["position"]
	var distance := pa.distance_to(pb)
	var angle := _yaw_between(pa, pb)
	var ratio := distance / maxf(_bimanual_start_distance, GRIP_MIN_DISTANCE)
	scale = _bimanual_start_scale * ratio
	rotation.y = _bimanual_start_rotation + (angle - _bimanual_start_angle)
	# The panel follows the midpoint of both grips.
	global_position = (pa + pb) * 0.5


## Signed yaw angle of the vector between two grip points.
func _yaw_between(a: Vector3, b: Vector3) -> float:
	return atan2(a.x - b.x, a.z - b.z)


# --- Grip geometry ---------------------------------------------------------

## Raycast against this panel's collider. Returns an empty Dictionary on a miss.
func _hit_on_panel(hand: int) -> Dictionary:
	var origin := _xr_manager.get_aim_origin(hand)
	var direction := _xr_manager.get_aim_direction(hand)
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 10.0)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	# intersect_ray returns the hit as a Dictionary (empty when nothing was hit).
	var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return {}
	if hit["collider"] != _collider:
		return {}
	return hit


## Distance from the controller origin to the panel along the ray.
func _ray_depth(hand: int) -> float:
	var hit := _hit_on_panel(hand)
	if hit.is_empty():
		return 0.0
	var position: Vector3 = hit["position"]
	return _xr_manager.get_aim_origin(hand).distance_to(position)


## Point where the ray crosses the drag plane at the recorded depth.
func _point_on_drag_plane(hand: int) -> Dictionary:
	var origin := _xr_manager.get_aim_origin(hand)
	var direction := _xr_manager.get_aim_direction(hand)
	if direction.length_squared() < 0.0001:
		return {}
	var depth: float = _depth.get(hand, 0.0)
	if depth <= 0.0:
		return _hit_on_panel(hand)
	return {"position": origin + direction.normalized() * depth}


# --- Bottom bar ------------------------------------------------------------

## Shows or hides the floating bottom bar (visionOS style).
func set_bottom_bar_visible(value: bool) -> void:
	if _bottom_bar != null:
		_bottom_bar.visible = value


## Emits close_requested; the workspace decides what to do with it.
func request_close() -> void:
	close_requested.emit()


func _apply_surface_size() -> void:
	var mesh := _surface.mesh
	if mesh is QuadMesh:
		(mesh as QuadMesh).size = panel_size


## True while the panel is being dragged with the grip.
func is_dragging() -> bool:
	return _dragging
