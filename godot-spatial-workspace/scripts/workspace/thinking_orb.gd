extends Node3D
## Spline-Inspired Tech Reactive 3D Orb for Godot VR.
##
## Recreates the iconic tech orb from the Spline tutorial by Vlad Kolokolnikov:
## - Multi-layer architecture: Fresnel core, dual counter-rotating gyro rings,
##   and an outer spherical cloner matrix (72 instances via MultiMeshInstance3D).
## - Reactive Follow & Distance events: magnetically tilts toward the active
##   VR pointer, expands outer nodule matrix outward on proximity, and flares emission.
## - Damped spring recoil physics on cognitive state transitions.
## - Full 6DoF grip drag & trigger cognitive state cycling for OpenXR / PICO 4 Ultra.

enum State {
	BREATHING,
	LISTENING,
	WORKING,
	SEARCHING,
	SOLVING,
	CONNECTING,
	COMPOSING,
	WEAVING,
	SHAPING,
}

const STATE_NAMES := {
	State.BREATHING: "breathing",
	State.LISTENING: "listening",
	State.WORKING: "working",
	State.SEARCHING: "searching",
	State.SOLVING: "solving",
	State.CONNECTING: "connecting",
	State.COMPOSING: "composing",
	State.WEAVING: "weaving",
	State.SHAPING: "shaping",
}

const STATE_LOOK := {
	State.BREATHING: {
		"color": Color(0.24, 0.65, 1.0),
		"rim": Color(0.85, 0.95, 1.0),
		"energy": 1.4,
		"speed": 0.45,
		"spread": 1.0,
	},
	State.LISTENING: {
		"color": Color(0.12, 0.94, 0.58), # Vlad Kolokolnikov's cyber green
		"rim": Color(0.9, 1.0, 0.92),
		"energy": 1.8,
		"speed": 0.65,
		"spread": 1.2,
	},
	State.WORKING: {
		"color": Color(0.68, 0.42, 1.0),
		"rim": Color(0.95, 0.88, 1.0),
		"energy": 2.1,
		"speed": 0.95,
		"spread": 1.05,
	},
	State.SEARCHING: {
		"color": Color(1.0, 0.82, 0.18),
		"rim": Color(1.0, 0.98, 0.85),
		"energy": 2.3,
		"speed": 1.35,
		"spread": 1.35,
	},
	State.SOLVING: {
		"color": Color(0.15, 0.98, 0.78),
		"rim": Color(0.88, 1.0, 0.96),
		"energy": 2.4,
		"speed": 1.1,
		"spread": 0.95,
	},
	State.CONNECTING: {
		"color": Color(1.0, 0.38, 0.76),
		"rim": Color(1.0, 0.9, 0.96),
		"energy": 2.3,
		"speed": 1.4,
		"spread": 1.25,
	},
	State.COMPOSING: {
		"color": Color(0.16, 0.88, 0.95),
		"rim": Color(0.9, 1.0, 1.0),
		"energy": 2.0,
		"speed": 0.8,
		"spread": 1.1,
	},
	State.WEAVING: {
		"color": Color(0.56, 0.52, 1.0),
		"rim": Color(0.92, 0.90, 1.0),
		"energy": 2.2,
		"speed": 1.15,
		"spread": 1.15,
	},
	State.SHAPING: {
		"color": Color(1.0, 0.58, 0.16),
		"rim": Color(1.0, 0.94, 0.86),
		"energy": 2.5,
		"speed": 1.5,
		"spread": 1.05,
	},
}

const CLONE_COUNT := 72
const BASE_CLONE_RADIUS := 0.064
const MAX_CLONE_EXPANSION := 0.038
const INTERACTION_DISTANCE := 0.75
const MAX_TILT_RAD := 0.65

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")
const FresnelShader := preload("res://shaders/tech_orb_fresnel.gdshader")
const ProjectedCirclesShader := preload("res://shaders/projected_circles_orb.gdshader")

@export var affordance_path: NodePath
@export var collider_path: NodePath = ^"Collider"

var state: State = State.BREATHING

var _visuals: Node3D
var _core: MeshInstance3D
var _projected_rings: Node3D
var _inner_ring: MeshInstance3D
var _outer_ring: MeshInstance3D
var _cloner: MultiMeshInstance3D
var _particles: CPUParticles3D
var _light: OmniLight3D
var _affordance: Node3D
var _collider: Area3D
var _xr: XRManagerScript

# Materials
var _core_material: ShaderMaterial
var _ring_contour_material: StandardMaterial3D
var _ring_material_inner: StandardMaterial3D
var _ring_material_outer: StandardMaterial3D
var _cloner_material: StandardMaterial3D
var _particle_material: StandardMaterial3D

# Cloner base distribution
var _base_dirs: Array[Vector3] = []

# Spring dynamics for recoil
var _bounce_scale := 1.0
var _bounce_velocity := 0.0
var _bounce_spring := 180.0
var _bounce_damping := 14.0

# Target transition values
var _target_color := Color(0.24, 0.65, 1.0)
var _target_rim := Color(0.85, 0.95, 1.0)
var _target_energy := 1.4
var _target_speed := 0.45
var _target_spread := 1.0
var _pulse := 0.0

# Interaction state
var _proximity := 0.0
var _target_pointer_local := Vector3.FORWARD
var _dragging := false
var _dragging_hand := -1
var _drag_depth := 0.0
var _drag_offset := Vector3.ZERO
var _trigger_consumed := [false, false]


func _ready() -> void:
	if is_inside_tree():
		_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_setup_nodes()
	_setup_fibonacci_cloner()
	_setup_materials()
	_apply_state(State.BREATHING, true)


func _setup_nodes() -> void:
	_visuals = get_node_or_null("OrbVisuals") as Node3D
	if _visuals == null:
		_visuals = Node3D.new()
		_visuals.name = "OrbVisuals"
		add_child(_visuals)

	_collider = get_node_or_null(collider_path) as Area3D
	if _collider == null:
		_collider = Area3D.new()
		_collider.name = "Collider"
		_collider.collision_layer = 2
		_collider.collision_mask = 0
		_collider.monitorable = true
		var shape := CollisionShape3D.new()
		var sphere := SphereShape3D.new()
		sphere.radius = 0.14
		shape.shape = sphere
		_collider.add_child(shape)
		add_child(_collider)

	_affordance = get_node_or_null(affordance_path) as Node3D
	if _affordance != null and _affordance.has_method("set_label"):
		_affordance.set_label("ORBE: %s" % get_state_name().to_upper())

	_setup_core_mesh()
	_setup_projected_rings()
	_setup_rings()
	_setup_particles()
	_setup_light()


func _setup_projected_rings() -> void:
	_projected_rings = _visuals.get_node_or_null("ProjectedRings") as Node3D
	if _projected_rings == null:
		_projected_rings = Node3D.new()
		_projected_rings.name = "ProjectedRings"
		_visuals.add_child(_projected_rings)

	# 5 nested latitude contour rings inspired by 2025_09_15_blender_projected_circles.blend
	# (Array of concentric circles projected with Shrinkwrap onto the sphere)
	var latitudes := [
		{"y": 0.0, "r_in": 0.046, "r_out": 0.0485},
		{"y": 0.018, "r_in": 0.042, "r_out": 0.0442},
		{"y": -0.018, "r_in": 0.042, "r_out": 0.0442},
		{"y": 0.030, "r_in": 0.032, "r_out": 0.0338},
		{"y": -0.030, "r_in": 0.032, "r_out": 0.0338},
	]
	for i in range(latitudes.size()):
		var data: Dictionary = latitudes[i]
		var ring_node := _projected_rings.get_node_or_null("Ring_%d" % i) as MeshInstance3D
		if ring_node == null:
			ring_node = MeshInstance3D.new()
			ring_node.name = "Ring_%d" % i
			var torus := TorusMesh.new()
			torus.inner_radius = data["r_in"]
			torus.outer_radius = data["r_out"]
			torus.rings = 36
			torus.ring_segments = 10
			ring_node.mesh = torus
			ring_node.position.y = data["y"]
			_projected_rings.add_child(ring_node)


func _setup_core_mesh() -> void:
	_core = _visuals.get_node_or_null("Core") as MeshInstance3D
	if _core == null:
		_core = MeshInstance3D.new()
		_core.name = "Core"
		var sphere := SphereMesh.new()
		sphere.radius = 0.034
		sphere.height = 0.068
		sphere.radial_segments = 32
		sphere.rings = 16
		_core.mesh = sphere
		_visuals.add_child(_core)


func _setup_rings() -> void:
	_inner_ring = _visuals.get_node_or_null("InnerRing") as MeshInstance3D
	if _inner_ring == null:
		_inner_ring = MeshInstance3D.new()
		_inner_ring.name = "InnerRing"
		var torus := TorusMesh.new()
		torus.inner_radius = 0.051
		torus.outer_radius = 0.056
		torus.rings = 48
		torus.ring_segments = 12
		_inner_ring.mesh = torus
		_inner_ring.rotation_degrees = Vector3(35.0, 20.0, 0.0)
		_visuals.add_child(_inner_ring)

	_outer_ring = _visuals.get_node_or_null("OuterRing") as MeshInstance3D
	if _outer_ring == null:
		_outer_ring = MeshInstance3D.new()
		_outer_ring.name = "OuterRing"
		var torus := TorusMesh.new()
		torus.inner_radius = 0.075
		torus.outer_radius = 0.081
		torus.rings = 48
		torus.ring_segments = 12
		_outer_ring.mesh = torus
		_outer_ring.rotation_degrees = Vector3(-45.0, -25.0, 30.0)
		_visuals.add_child(_outer_ring)


func _setup_fibonacci_cloner() -> void:
	_cloner = _visuals.get_node_or_null("TechCloner") as MultiMeshInstance3D
	if _cloner == null:
		_cloner = MultiMeshInstance3D.new()
		_cloner.name = "TechCloner"
		_visuals.add_child(_cloner)

	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = true
	mm.instance_count = CLONE_COUNT

	var capsule := CapsuleMesh.new()
	capsule.radius = 0.0032
	capsule.height = 0.013
	capsule.radial_segments = 12
	capsule.rings = 4
	mm.mesh = capsule

	_base_dirs.clear()
	var phi := (1.0 + sqrt(5.0)) / 2.0
	var golden_angle := 2.0 * PI * (1.0 - 1.0 / phi)

	for i in range(CLONE_COUNT):
		var y := 1.0 - (float(i) / float(CLONE_COUNT - 1)) * 2.0
		var radius_at_y := sqrt(maxf(0.0, 1.0 - y * y))
		var theta := golden_angle * float(i)
		var x := cos(theta) * radius_at_y
		var z := sin(theta) * radius_at_y
		var dir := Vector3(x, y, z).normalized()
		_base_dirs.append(dir)

		var basis := _basis_from_up(dir)
		var t := Transform3D(basis, dir * BASE_CLONE_RADIUS)
		mm.set_instance_transform(i, t)
		mm.set_instance_color(i, _target_color)

	_cloner.multimesh = mm


func _setup_particles() -> void:
	_particles = _visuals.get_node_or_null("Particles") as CPUParticles3D
	if _particles == null:
		_particles = CPUParticles3D.new()
		_particles.name = "Particles"
		_particles.emission_shape = CPUParticles3D.EMISSION_SHAPE_SPHERE
		_particles.emission_sphere_radius = 0.04
		_particles.spread = 180.0
		_particles.gravity = Vector3(0.0, 0.02, 0.0)
		_particles.initial_velocity_min = 0.02
		_particles.initial_velocity_max = 0.06
		_particles.scale_amount_min = 0.6
		_particles.scale_amount_max = 1.2
		_particles.lifetime = 2.4
		_particles.amount = 64
		_particles.local_coords = true
		_visuals.add_child(_particles)


func _setup_light() -> void:
	_light = _visuals.get_node_or_null("Light") as OmniLight3D
	if _light == null:
		_light = OmniLight3D.new()
		_light.name = "Light"
		_light.light_color = _target_color
		_light.light_energy = 1.2
		_light.omni_range = 1.3
		_visuals.add_child(_light)


func _setup_materials() -> void:
	_core_material = ShaderMaterial.new()
	_core_material.shader = ProjectedCirclesShader
	_core_material.set_shader_parameter("base_color", Color(0.02, 0.04, 0.07))
	_core_material.set_shader_parameter("ring_color", _target_color)
	_core_material.set_shader_parameter("rim_color", _target_rim)
	_core_material.set_shader_parameter("ring_glow", 3.6)
	_core.material_override = _core_material

	_ring_contour_material = StandardMaterial3D.new()
	_ring_contour_material.metallic = 0.95
	_ring_contour_material.roughness = 0.15
	_ring_contour_material.emission_enabled = true
	_ring_contour_material.emission = _target_color
	_ring_contour_material.emission_energy_multiplier = 1.2
	if _projected_rings != null:
		for child in _projected_rings.get_children():
			if child is MeshInstance3D:
				(child as MeshInstance3D).material_override = _ring_contour_material

	_ring_material_inner = StandardMaterial3D.new()
	_ring_material_inner.metallic = 0.95
	_ring_material_inner.roughness = 0.15
	_ring_material_inner.emission_enabled = true
	_ring_material_inner.emission = _target_color
	_ring_material_inner.emission_energy_multiplier = 0.9
	_inner_ring.material_override = _ring_material_inner

	_ring_material_outer = StandardMaterial3D.new()
	_ring_material_outer.metallic = 0.92
	_ring_material_outer.roughness = 0.2
	_ring_material_outer.emission_enabled = true
	_ring_material_outer.emission = _target_color
	_ring_material_outer.emission_energy_multiplier = 0.6
	_outer_ring.material_override = _ring_material_outer

	_cloner_material = StandardMaterial3D.new()
	_cloner_material.vertex_color_use_as_albedo = true
	_cloner_material.metallic = 0.92
	_cloner_material.roughness = 0.18
	_cloner_material.emission_enabled = true
	_cloner_material.emission = Color.WHITE
	_cloner_material.emission_energy_multiplier = 0.65
	_cloner_material.emission_operator = BaseMaterial3D.EMISSION_OP_MULTIPLY
	_cloner.material_override = _cloner_material

	var quad := QuadMesh.new()
	quad.size = Vector2(0.0035, 0.0035)
	_particle_material = StandardMaterial3D.new()
	_particle_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_particle_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_particle_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	_particle_material.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	_particle_material.albedo_color = _target_color
	_particle_material.emission_enabled = true
	_particle_material.emission = _target_color
	quad.material = _particle_material
	_particles.mesh = quad


func _process(delta: float) -> void:
	if not is_inside_tree():
		return
	_update_physics_spring(delta)
	_update_proximity_and_pointer()
	_update_visuals(delta)
	_update_cloner(delta)
	_handle_interaction()


func _update_physics_spring(delta: float) -> void:
	var force := -_bounce_spring * (_bounce_scale - 1.0) - _bounce_damping * _bounce_velocity
	_bounce_velocity += force * delta
	_bounce_scale += _bounce_velocity * delta


func _update_proximity_and_pointer() -> void:
	var min_dist := 999.0
	var pointer_world := global_position + Vector3.FORWARD

	if _xr != null:
		for hand: int in [0, 1]:
			if not _xr.is_controller_active(hand):
				continue
			var origin := _xr.get_aim_origin(hand)
			var dir := _xr.get_aim_direction(hand)
			var hand_dist := global_position.distance_to(origin)

			if dir != Vector3.ZERO:
				var to_orb := global_position - origin
				var proj := to_orb.dot(dir)
				if proj > 0.0:
					var closest_ray := origin + dir * proj
					var ray_dist := global_position.distance_to(closest_ray)
					var effective := minf(hand_dist, ray_dist * 1.4)
					if effective < min_dist:
						min_dist = effective
						pointer_world = closest_ray
				else:
					if hand_dist < min_dist:
						min_dist = hand_dist
						pointer_world = origin
			else:
				if hand_dist < min_dist:
					min_dist = hand_dist
					pointer_world = origin

	if min_dist < INTERACTION_DISTANCE:
		var target_prox := 1.0 - (min_dist / INTERACTION_DISTANCE)
		_proximity = lerpf(_proximity, target_prox, 0.15)
		_target_pointer_local = _visuals.to_local(pointer_world)
	else:
		_proximity = lerpf(_proximity, 0.0, 0.08)
		_target_pointer_local = Vector3.FORWARD


func _update_visuals(delta: float) -> void:
	var speed_factor := _target_speed * (1.0 + _proximity * 1.6)
	_pulse += delta * (1.5 + speed_factor)

	# 1. Follow / Look-At Tilt (Spline Pointer Tracking)
	if _proximity > 0.02 and _target_pointer_local.length_squared() > 0.001:
		var target_dir := _target_pointer_local.normalized()
		var forward := Vector3.FORWARD
		var angle := forward.angle_to(target_dir)
		if angle > MAX_TILT_RAD:
			var axis := forward.cross(target_dir).normalized()
			if axis.length_squared() > 0.001:
				target_dir = forward.rotated(axis, MAX_TILT_RAD)
		var target_basis := Basis.looking_at(target_dir, Vector3.UP)
		var q_cur := _visuals.basis.get_rotation_quaternion()
		var q_target := target_basis.get_rotation_quaternion()
		_visuals.basis = Basis(q_cur.slerp(q_target, minf(delta * 5.0, 1.0)))
	else:
		var q_cur := _visuals.basis.get_rotation_quaternion()
		_visuals.basis = Basis(q_cur.slerp(Quaternion.IDENTITY, minf(delta * 3.0, 1.0)))

	# 2. Concentric Projected Rings & Gyro Rotation
	var breathe := 1.0 + sin(_pulse * 2.5) * 0.05 + _proximity * 0.12
	if _projected_rings != null:
		_projected_rings.rotate_y(delta * 0.45 * (1.0 + _proximity * 1.5))
		_projected_rings.scale = Vector3.ONE * breathe * _bounce_scale

	if _inner_ring != null:
		_inner_ring.rotate_object_local(Vector3(0.5, 1.0, 0.2).normalized(), delta * (0.7 + _proximity * 1.5))
	if _outer_ring != null:
		_outer_ring.rotate_object_local(Vector3(-0.3, 0.4, 0.9).normalized(), delta * (0.5 + _proximity * 1.2))

	# 3. Dynamic Material Shading & Emission Modulation
	if _core != null:
		_core.scale = Vector3.ONE * breathe * _bounce_scale
		if _core_material != null:
			_core_material.set_shader_parameter("pulse_phase", _pulse)
			_core_material.set_shader_parameter("proximity_infl", _proximity)
			_core_material.set_shader_parameter("pointer_local", _target_pointer_local)
			_core_material.set_shader_parameter("ring_color", _target_color)
			_core_material.set_shader_parameter("rim_color", _target_rim)

	if _light != null:
		_light.light_color = _light.light_color.lerp(_target_color, delta * 4.0)
		_light.light_energy = _target_energy * (0.9 + _proximity * 0.8)

	if _ring_contour_material != null:
		_ring_contour_material.emission = _target_color
		_ring_contour_material.emission_energy_multiplier = 1.2 + _proximity * 1.6
	if _ring_material_inner != null:
		_ring_material_inner.emission = _target_color
		_ring_material_inner.emission_energy_multiplier = 0.9 + _proximity * 1.2
	if _ring_material_outer != null:
		_ring_material_outer.emission = _target_color
		_ring_material_outer.emission_energy_multiplier = 0.6 + _proximity * 0.9


func _update_cloner(delta: float) -> void:
	if _cloner == null or _cloner.multimesh == null:
		return

	var mm := _cloner.multimesh
	var breathe_wave := sin(_pulse * 2.8) * 0.003
	var total_spread := _target_spread * (1.0 + _proximity * 0.5)

	for i in range(CLONE_COUNT):
		var dir := _base_dirs[i]
		var harmonic := sin(_pulse * 2.2 + float(i) * 0.4) * 0.0035

		# Localized distance bloom from the pointer
		var base_pos := dir * BASE_CLONE_RADIUS
		var local_dist := base_pos.distance_to(_target_pointer_local)
		var local_infl := clampf(1.0 - (local_dist / 0.22), 0.0, 1.0)
		var infl := maxf(local_infl, _proximity * 0.4)

		var r := (BASE_CLONE_RADIUS + infl * MAX_CLONE_EXPANSION * total_spread + harmonic + breathe_wave) * _bounce_scale
		var scale_rad := (1.0 + infl * 0.6) * _bounce_scale
		var scale_len := (1.0 + infl * 1.3) * _bounce_scale

		var basis := _basis_from_up(dir)
		basis = basis.scaled(Vector3(scale_rad, scale_len, scale_rad))
		var xform := Transform3D(basis, dir * r)
		mm.set_instance_transform(i, xform)

		var clone_color := _target_color.lerp(_target_rim, infl * 0.8)
		mm.set_instance_color(i, clone_color)


func _basis_from_up(up_dir: Vector3) -> Basis:
	var up := up_dir.normalized()
	var forward := Vector3.UP.cross(up)
	if forward.length_squared() < 0.001:
		forward = Vector3.RIGHT.cross(up)
	forward = forward.normalized()
	var right := up.cross(forward).normalized()
	return Basis(right, up, forward)


func _handle_interaction() -> void:
	if _xr == null or _collider == null:
		return
	var tree := get_tree()
	if tree == null:
		return

	# 1. Trigger Click: Cycles cognitive state with spring recoil
	for hand: int in [0, 1]:
		if _xr.is_trigger_pressed(hand):
			if not _trigger_consumed[hand]:
				var hit := _raycast_hit(hand)
				if not hit.is_empty():
					_trigger_consumed[hand] = true
					cycle_state()
					SpatialAudioScript.play_chime(tree, global_position)
		else:
			_trigger_consumed[hand] = false

	# 2. Grip Drag: Translates the orb in 3D space
	if not _dragging:
		for hand: int in [0, 1]:
			if _xr.is_grip_pressed(hand):
				var hit := _raycast_hit(hand)
				if not hit.is_empty():
					_dragging = true
					_dragging_hand = hand
					var pos: Vector3 = hit["position"]
					_drag_depth = _xr.get_aim_origin(hand).distance_to(pos)
					_drag_offset = global_position - pos
					SpatialAudioScript.play_grab(tree, global_position)
					if _affordance != null and _affordance.has_method("set_dragging"):
						_affordance.set_dragging(true)
					break
	else:
		if not _xr.is_grip_pressed(_dragging_hand):
			_dragging = false
			_dragging_hand = -1
			SpatialAudioScript.play_release(tree, global_position)
			if _affordance != null and _affordance.has_method("set_dragging"):
				_affordance.set_dragging(false)
		else:
			var origin := _xr.get_aim_origin(_dragging_hand)
			var dir := _xr.get_aim_direction(_dragging_hand)
			if dir != Vector3.ZERO:
				global_position = origin + dir * _drag_depth + _drag_offset


func _raycast_hit(hand: int) -> Dictionary:
	var origin := _xr.get_aim_origin(hand)
	var dir := _xr.get_aim_direction(hand)
	if dir == Vector3.ZERO:
		return {}
	var query := PhysicsRayQueryParameters3D.create(origin, origin + dir * 10.0, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty() or hit["collider"] != _collider:
		return {}
	return hit


## Cycles cognitive states in sequence.
func cycle_state() -> void:
	var next_val := (int(state) + 1) % (State.SHAPING + 1)
	set_state(next_val as State)


## Switches the orb to a cognitive state.
func set_state(new_state: State) -> void:
	if new_state == state:
		return
	state = new_state
	_apply_state(new_state, false)
	# Trigger elastic spring recoil on state transition
	_bounce_velocity = -1.9
	if _affordance != null and _affordance.has_method("set_label"):
		_affordance.set_label("ORBE: %s" % get_state_name().to_upper())


func get_state_name() -> String:
	return STATE_NAMES.get(state, "breathing")


func _apply_state(target: State, immediate: bool) -> void:
	var look: Dictionary = STATE_LOOK.get(target, STATE_LOOK[State.BREATHING])
	_target_color = look["color"]
	_target_rim = look["rim"]
	_target_energy = look["energy"]
	_target_speed = look["speed"]
	_target_spread = look["spread"]

	if _affordance != null and _affordance.has_method("set_accent"):
		_affordance.set_accent(_target_color)

	if _particle_material != null:
		_particle_material.albedo_color = _target_color
		_particle_material.emission = _target_color
	if _core_material != null:
		_core_material.set_shader_parameter("ring_color", _target_color)
		_core_material.set_shader_parameter("rim_color", _target_rim)
	if _ring_contour_material != null:
		_ring_contour_material.emission = _target_color

	if immediate:
		_bounce_scale = 1.0
		_bounce_velocity = 0.0
