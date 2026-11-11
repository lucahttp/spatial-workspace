class_name SpatialControllerPointer
extends Node3D
## Visual controller model, laser pointer ray and targeting reticle for VR.
##
## Attaches to an XRController3D. Renders:
## 1. A physical controller grip proxy so the hand is visible in 6DoF.
## 2. A directional laser ray that dynamically adjusts length to physics hits.
## 3. A reticle dot/ring that projects onto panels, affordances and the orb.

@export var hand: int = 0 # 0 = Left, 1 = Right
@export var beam_color: Color = Color(0.35, 0.65, 1.0, 0.55)
@export var reticle_color: Color = Color(0.45, 0.8, 1.0, 0.9)
@export var max_length: float = 10.0

var _controller: XRController3D
var _beam: MeshInstance3D
var _reticle: MeshInstance3D
var _body: MeshInstance3D
var _beam_material: StandardMaterial3D
var _reticle_material: StandardMaterial3D
var _beam_mesh: CylinderMesh


func _ready() -> void:
	_controller = get_parent() as XRController3D
	_setup_visuals()


func _setup_visuals() -> void:
	# 1. Controller Body Proxy (Sleek handheld capsule)
	_body = MeshInstance3D.new()
	_body.name = "ControllerBody"
	var body_mesh := CapsuleMesh.new()
	body_mesh.radius = 0.018
	body_mesh.height = 0.09
	body_mesh.radial_segments = 16
	_body.mesh = body_mesh
	
	var body_mat := StandardMaterial3D.new()
	body_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	body_mat.albedo_color = Color(0.08, 0.09, 0.12, 0.9)
	body_mat.metallic = 0.4
	body_mat.roughness = 0.3
	body_mat.emission_enabled = true
	body_mat.emission = beam_color * 0.4
	_body.material_override = body_mat
	_body.transform.origin = Vector3(0, -0.015, 0.03)
	add_child(_body)

	# 2. Laser Beam
	_beam = MeshInstance3D.new()
	_beam.name = "LaserBeam"
	_beam_mesh = CylinderMesh.new()
	_beam_mesh.top_radius = 0.0012
	_beam_mesh.bottom_radius = 0.0018
	_beam_mesh.height = 1.0
	_beam_mesh.radial_segments = 8
	_beam.mesh = _beam_mesh

	_beam_material = StandardMaterial3D.new()
	_beam_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_beam_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_beam_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_beam_material.albedo_color = beam_color
	_beam.material_override = _beam_material
	add_child(_beam)

	# 3. Reticle Dot
	_reticle = MeshInstance3D.new()
	_reticle.name = "Reticle"
	var reticle_mesh := SphereMesh.new()
	reticle_mesh.radius = 0.008
	reticle_mesh.height = 0.016
	reticle_mesh.radial_segments = 12
	reticle_mesh.rings = 6
	_reticle.mesh = reticle_mesh

	_reticle_material = StandardMaterial3D.new()
	_reticle_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_reticle_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_reticle_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_reticle_material.albedo_color = reticle_color
	_reticle.material_override = _reticle_material
	_reticle.top_level = true
	add_child(_reticle)


func _process(_delta: float) -> void:
	if _controller == null:
		return

	# Hide everything if controller tracker is not actively tracking
	var is_active := _controller.get_is_active()
	visible = is_active
	if not is_active:
		if _reticle != null:
			_reticle.visible = false
		return

	_reticle.visible = true

	# Read trigger and grip states for reactive visual feedback
	var trigger_down: bool = _controller.get_float("trigger") > 0.5 or _controller.is_button_pressed("trigger_click") or _controller.is_button_pressed("trigger")
	var grip_down: bool = _controller.get_float("grip") > 0.5 or _controller.is_button_pressed("grip_click") or _controller.is_button_pressed("grip")

	# Update materials based on state
	if grip_down:
		# Grabbing/Moving mode: warm amber/cyan blend
		_beam_material.albedo_color = Color(1.0, 0.7, 0.2, 0.75)
		_reticle_material.albedo_color = Color(1.0, 0.8, 0.3, 0.95)
	elif trigger_down:
		# Active clicking pulse: intense electric glow
		_beam_material.albedo_color = beam_color.lightened(0.4)
		_reticle_material.albedo_color = reticle_color.lightened(0.4)
	else:
		# Idle hovering
		_beam_material.albedo_color = beam_color
		_reticle_material.albedo_color = reticle_color

	# Raycast forward into physics world (collision mask 2 is spatial UI & panels, mask 1 is general)
	var space := get_world_3d().direct_space_state
	var origin := global_position
	var forward := -global_basis.z.normalized()
	var target := origin + forward * max_length

	var query := PhysicsRayQueryParameters3D.create(origin, target, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	var hit := space.intersect_ray(query)

	var hit_distance := max_length
	var hit_normal := -forward

	if not hit.is_empty():
		hit_distance = origin.distance_to(hit["position"])
		_reticle.global_position = hit["position"]
		hit_normal = hit["normal"]
	else:
		_reticle.global_position = target

	# Orient beam along -Z and position it midway between controller and hit
	_beam_mesh.height = hit_distance
	_beam.position = Vector3(0, 0, -hit_distance * 0.5)
	_beam.rotation_degrees = Vector3(90, 0, 0)

	# Scale reticle slightly based on hit distance for consistent visual angular size
	var reticle_scale := clampf(hit_distance * 0.8, 0.5, 2.5)
	_reticle.scale = Vector3.ONE * reticle_scale
