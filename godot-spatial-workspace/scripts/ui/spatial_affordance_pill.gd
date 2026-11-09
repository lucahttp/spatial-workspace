extends Node3D
## Spatial affordance pill: a floating capsule that tells the user that an
## object can be moved.
##
## The pill appears ONLY when the user commits to the object:
##
##   1. DWELL      : the pointer hovers it continuously for DWELL_SECONDS
##   2. PROXIMITY  : a controller/hand comes closer than PROXIMITY_DISTANCE
##   3. GRIP       : the grip button is held while pointing at it
##
## The same rule applies to every spatial object (panels, orb, carousel
## cards), so the pill script owns the detection and the hosts only set the
## label / accent and the dragging state.

const DWELL_SECONDS := 3.0
const PROXIMITY_DISTANCE := 0.38
const RAY_LENGTH := 10.0

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")

@export var label_text := "MOVER"
@export var target_path: NodePath
@export var hover_collider_path: NodePath
@export var accent_color := Color(0.62, 0.45, 0.96)

var _dwell := 0.0
var _hovered := false
var _near := false
var _gripping := false
var _dragging := false

var _label: Label3D
var _background: MeshInstance3D
var _material: StandardMaterial3D
var _target: Node3D
var _collider: Area3D
var _xr: XRManagerScript

static var _capsule_texture: ImageTexture = null


func _ready() -> void:
	_label = get_node_or_null("Label") as Label3D
	_background = get_node_or_null("Background") as MeshInstance3D
	_target = get_node_or_null(target_path) as Node3D
	if _target == null:
		_target = get_parent() as Node3D
	_collider = get_node_or_null(hover_collider_path) as Area3D
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript

	# The material is built here so each pill owns its own instance and the
	# texture can be tinted per affordance.
	_material = StandardMaterial3D.new()
	_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_material.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	_material.cull_mode = BaseMaterial3D.CULL_DISABLED
	_material.albedo_texture = _get_capsule_texture()
	_material.albedo_color = accent_color
	if _background != null:
		_background.material_override = _material

	set_label(label_text)
	visible = false


func _process(delta: float) -> void:
	_hovered = _is_hovering()
	if _hovered:
		_dwell += delta
	else:
		_dwell = 0.0

	_near = _is_near()
	_gripping = _is_gripping()

	var dwell_done := _dwell >= DWELL_SECONDS
	visible = dwell_done or _near or _gripping or _dragging
	if visible and _label != null:
		_label.text = label_text


# --- Detection -------------------------------------------------------------

func _is_hovering() -> bool:
	if _collider == null:
		return false
	for hand: int in [0, 1]:
		var ray := _controller_ray(hand)
		if ray.is_empty():
			continue
		if not XRManagerScript.ray_hit(get_world_3d(), ray["from"], ray["to"], _collider).is_empty():
			return true
	return false


func _is_near() -> bool:
	if _target == null or _xr == null:
		return false
	for hand: int in [0, 1]:
		var origin := _xr.get_aim_origin(hand)
		if origin == Vector3.ZERO:
			continue
		if origin.distance_to(_target.global_position) < PROXIMITY_DISTANCE:
			return true
	return false


func _is_gripping() -> bool:
	if _collider == null or _xr == null:
		return false
	for hand: int in [0, 1]:
		if not _xr.is_grip_pressed(hand):
			continue
		var ray := _controller_ray(hand)
		if ray.is_empty():
			continue
		if not XRManagerScript.ray_hit(get_world_3d(), ray["from"], ray["to"], _collider).is_empty():
			return true
	return false


## Aim ray of a hand, or an empty Dictionary when that hand has no pose yet.
func _controller_ray(hand: int) -> Dictionary:
	if _xr == null:
		return {}
	var origin := _xr.get_aim_origin(hand)
	var direction := _xr.get_aim_direction(hand)
	if origin == Vector3.ZERO or direction == Vector3.ZERO:
		return {}
	return {"from": origin, "to": origin + direction * RAY_LENGTH}


# --- Public API ------------------------------------------------------------

func set_label(text: String) -> void:
	label_text = text
	if _label != null:
		_label.text = text


func set_accent(color: Color) -> void:
	accent_color = color
	if _material != null:
		_material.albedo_color = color


## True while the pill is on screen.
func is_affordance_visible() -> bool:
	return visible


## 0..1 progress of the hover dwell.
func get_dwell_progress() -> float:
	return clampf(_dwell / DWELL_SECONDS, 0.0, 1.0)


func set_dragging(value: bool) -> void:
	_dragging = value
	if _dragging and _material != null:
		_material.albedo_color = Color(0.22, 0.65, 0.95)
	elif _material != null:
		_material.albedo_color = accent_color


# --- Capsule texture -------------------------------------------------------

## A rounded capsule (pill) mask: white border, dark fill, transparent
## outside. Built once and shared by every pill.
static func _get_capsule_texture() -> ImageTexture:
	if _capsule_texture != null:
		return _capsule_texture
	var width := 256
	var height := 64
	var img := Image.create_empty(width, height, false, Image.FORMAT_RGBA8)
	var radius := float(height) * 0.5
	var half := Vector2(float(width) * 0.5, float(height) * 0.5)
	var inner := half - Vector2(radius, radius)
	for y in height:
		for x in width:
			var p := Vector2(float(x) + 0.5, float(y) + 0.5) - half
			var d := Vector2(maxf(absf(p.x) - inner.x, 0.0), maxf(absf(p.y) - inner.y, 0.0)).length() - radius
			var alpha := clampf(0.5 - d, 0.0, 1.0)
			var border := absf(d) < 2.0
			var rgb := Color(1, 1, 1) if border else Color(0.14, 0.14, 0.14)
			img.set_pixel(x, y, Color(rgb.r, rgb.g, rgb.b, alpha))
	_capsule_texture = ImageTexture.create_from_image(img)
	return _capsule_texture
