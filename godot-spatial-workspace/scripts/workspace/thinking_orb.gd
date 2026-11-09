extends Node3D
## Thinking orb: a swarm of glowing particles that reacts to the cognitive
## state of the assistant, ported from the WebXR version (thinking-orbs).
##
## States mirror the web build: breathing, listening, working, searching,
## solving, connecting, composing, weaving and shaping.
##
## CPUParticles3D is used on purpose: it keeps the .tscn hand-authorable and
## behaves identically on the mobile GPU of the Pico 4 Ultra.

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

## Per state: particle colour, energy (brightness), speed and swarm spread.
const STATE_LOOK := {
	State.BREATHING: {"color": Color(0.42, 0.55, 0.95), "energy": 1.1, "speed": 0.35, "spread": 1.0},
	State.LISTENING: {"color": Color(0.22, 0.74, 0.98), "energy": 1.6, "speed": 0.55, "spread": 1.15},
	State.WORKING: {"color": Color(0.65, 0.55, 0.98), "energy": 2.0, "speed": 0.85, "spread": 0.95},
	State.SEARCHING: {"color": Color(0.98, 0.75, 0.14), "energy": 2.2, "speed": 1.25, "spread": 1.35},
	State.SOLVING: {"color": Color(0.20, 0.85, 0.60), "energy": 2.4, "speed": 1.05, "spread": 0.85},
	State.CONNECTING: {"color": Color(0.96, 0.45, 0.71), "energy": 2.3, "speed": 1.45, "spread": 1.25},
	State.COMPOSING: {"color": Color(0.13, 0.83, 0.93), "energy": 2.1, "speed": 0.75, "spread": 1.05},
	State.WEAVING: {"color": Color(0.75, 0.52, 0.99), "energy": 2.2, "speed": 1.15, "spread": 1.15},
	State.SHAPING: {"color": Color(0.96, 0.62, 0.18), "energy": 2.5, "speed": 1.55, "spread": 1.0},
}

@export var particle_count := 220
@export var particle_radius := 0.055
@export var core_radius := 0.012
@export var transition_speed := 4.0
@export var affordance_path: NodePath

var state: State = State.BREATHING

var _particles: CPUParticles3D
var _core: MeshInstance3D
var _halo: MeshInstance3D
var _light: OmniLight3D
var _material: StandardMaterial3D
var _affordance: Node3D

var _target_color := Color(0.42, 0.55, 0.95)
var _target_energy := 1.1
var _target_speed := 0.35
var _target_spread := 1.0
var _pulse := 0.0


func _ready() -> void:
	_particles = get_node_or_null("Particles") as CPUParticles3D
	_core = get_node_or_null("Core") as MeshInstance3D
	_halo = get_node_or_null("Halo") as MeshInstance3D
	_light = get_node_or_null("Light") as OmniLight3D
	_affordance = get_node_or_null(affordance_path) as Node3D
	if _affordance != null and _affordance.has_method("set_label"):
		_affordance.set_label("MOVER ORBE")
	if _particles != null:
		_particles.amount = particle_count
		# The particle material is built here instead of in the scene so the
		# script always owns the instance it animates.
		var quad := QuadMesh.new()
		quad.size = Vector2(0.004, 0.004)
		_material = StandardMaterial3D.new()
		_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_material.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		_material.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
		_material.albedo_color = Color(0.42, 0.55, 0.95)
		_material.emission_enabled = true
		_material.emission = Color(0.42, 0.55, 0.95)
		_material.emission_energy_multiplier = 1.1
		quad.material = _material
		_particles.mesh = quad
		_particles.emission_sphere_radius = particle_radius
	if _core != null and _core.mesh is SphereMesh:
		var sphere := _core.mesh as SphereMesh
		sphere.radius = core_radius
		sphere.height = core_radius * 2.0
	_apply_state(State.BREATHING, true)


func _process(delta: float) -> void:
	_pulse += delta * (1.4 + _target_speed)
	var t := minf(delta * transition_speed, 1.0)
	if _material != null:
		_material.emission = _material.emission.lerp(_target_color, t)
		_material.albedo_color = _material.albedo_color.lerp(_target_color, t)
		_material.emission_energy_multiplier = lerpf(_material.emission_energy_multiplier, _target_energy, t)
	if _light != null:
		_light.light_color = _light.light_color.lerp(_target_color, t)
		_light.light_energy = lerpf(_light.light_energy, _target_energy * 0.8, t)
	if _core != null:
		var breathe := 1.0 + sin(_pulse * 2.0) * 0.06
		_core.scale = Vector3.ONE * breathe * (1.0 + _target_energy * 0.05)
	if _halo != null:
		_halo.rotation.y += delta * _target_speed * 0.5
		_halo.scale = Vector3.ONE * (1.0 + _target_spread * 0.35)
	if _particles != null:
		_particles.initial_velocity_min = lerpf(_particles.initial_velocity_min, _target_speed * 0.08, t)
		_particles.initial_velocity_max = lerpf(_particles.initial_velocity_max, _target_speed * 0.18, t)
		_particles.scale_amount_min = lerpf(_particles.scale_amount_min, 0.5 * _target_spread, t)
		_particles.scale_amount_max = lerpf(_particles.scale_amount_max, 1.4 * _target_spread, t)


## Switches the orb to a cognitive state.
func set_state(new_state: State) -> void:
	if new_state == state:
		return
	state = new_state
	_apply_state(new_state, false)


func get_state_name() -> String:
	return STATE_NAMES.get(state, "breathing")


func _apply_state(target: State, immediate: bool) -> void:
	var look: Dictionary = STATE_LOOK.get(target, STATE_LOOK[State.BREATHING])
	_target_color = look["color"]
	_target_energy = look["energy"]
	_target_speed = look["speed"]
	_target_spread = look["spread"]
	if _affordance != null and _affordance.has_method("set_accent"):
		_affordance.set_accent(_target_color)
	if _particles == null:
		return
	if immediate:
		_particles.amount = particle_count
		_particles.emission_sphere_radius = particle_radius
		# The swarm has to stay tight: a wide spread would fill the room.
		_particles.initial_velocity_min = _target_speed * 0.08
		_particles.initial_velocity_max = _target_speed * 0.18
		_particles.scale_amount_min = 0.5 * _target_spread
		_particles.scale_amount_max = 1.4 * _target_spread
		if _material != null:
			_material.emission = _target_color
			_material.albedo_color = _target_color
			_material.emission_energy_multiplier = _target_energy
