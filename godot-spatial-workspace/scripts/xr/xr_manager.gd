class_name SpatialXRManager
extends Node
## XR runtime detection, session lifecycle and AR passthrough.
##
## Platform adapters
## --------------------
## The Core (workspace, panels, orb) never talks to a runtime directly: it asks
## this node for controller state. Two adapters feed that state:
##
##   - OPENXR     : Godot's built-in OpenXR module. Vision Pro (visionOS) and
##                  Pico 4 Ultra (Android, via the OpenXR Vendors plugin) both
##                  expose controllers through the same XRController3D API.
##   - REALITYKIT : Apple's RealityKit plugin for Godot registers its own
##                  XRInterface. It is discovered by name and falls back to the
##                  OpenXR controller API, which the plugin also implements.
##
## The separation between GRIP and TRIGGER is the core of the interaction model
## and mirrors the WebXR port:
##
##   GRIP    -> grab and move a spatial object
##   TRIGGER -> activate a control

signal runtime_detected(runtime: int)
signal session_started(runtime: int)
signal session_stopped()
signal passthrough_changed(enabled: bool)
signal grip_changed(hand: int, pressed: bool)
signal trigger_changed(hand: int, pressed: bool)

enum Runtime { NONE, OPENXR, REALITYKIT }
enum Hand { LEFT = 0, RIGHT = 1 }

const INTERFACE_OPENXR := "OpenXR"
const INTERFACE_REALITYKIT := "RealityKit"

## OpenXR action names. Godot's default action map exposes the grip and the
## trigger as float axes; the runtime converts the digital button for us.
const ACTION_GRIP := "grip"
const ACTION_TRIGGER := "trigger"

## Analog inputs above this threshold count as pressed.
const GRIP_THRESHOLD := 0.55
const TRIGGER_THRESHOLD := 0.55

@export var auto_start_session := false
@export var start_in_ar := false

var runtime: Runtime = Runtime.NONE
var xr_interface: XRInterface = null
var _passthrough_enabled := false

var _controllers: Array = [null, null]
var _grip_down: Array[bool] = [false, false]
var _trigger_down: Array[bool] = [false, false]


func _ready() -> void:
	# The runtime has to be detected before the session starts, otherwise the
	# controllers are never bound to the right interface.
	runtime = _detect_runtime()
	runtime_detected.emit(runtime)
	_collect_controllers()
	if auto_start_session:
		start_session()


func _process(_delta: float) -> void:
	if _controllers[0] == null and _controllers[1] == null:
		_collect_controllers()
		return
	for hand: int in [Hand.LEFT, Hand.RIGHT]:
		var controller := _controllers[hand] as XRController3D
		if controller == null:
			continue
		var grip := _read_grip(controller)
		if grip != _grip_down[hand]:
			_grip_down[hand] = grip
			grip_changed.emit(hand, grip)
		var trigger := _read_trigger(controller)
		if trigger != _trigger_down[hand]:
			_trigger_down[hand] = trigger
			trigger_changed.emit(hand, trigger)


# --- Runtime detection -----------------------------------------------------

func _detect_runtime() -> Runtime:
	# RealityKit is checked first: when the Apple plugin is installed it is the
	# runtime that owns the session, and OpenXR may not even be registered.
	var realitykit := XRServer.find_interface(INTERFACE_REALITYKIT)
	if realitykit != null:
		return Runtime.REALITYKIT
	var openxr := XRServer.find_interface(INTERFACE_OPENXR)
	if openxr != null:
		return Runtime.OPENXR
	return Runtime.NONE


func _collect_controllers() -> void:
	_controllers = [null, null]
	for node in get_tree().get_nodes_in_group("xr_controller"):
		var controller := node as XRController3D
		if controller == null:
			continue
		var hand := _hand_of(controller)
		if hand >= 0:
			_controllers[hand] = controller


func _hand_of(controller: XRController3D) -> int:
	match controller.get_tracker_hand():
		XRPositionalTracker.TRACKER_HAND_LEFT:
			return Hand.LEFT
		XRPositionalTracker.TRACKER_HAND_RIGHT:
			return Hand.RIGHT
		_:
			# Without a runtime the hand is unknown, so the tracker name is the
			# fallback: Godot defines "left_hand" and "right_hand".
			var tracker := String(controller.get_tracker())
			if tracker == "left_hand":
				return Hand.LEFT
			if tracker == "right_hand":
				return Hand.RIGHT
			return -1


# --- Session ---------------------------------------------------------------

## Starts the XR session. Returns false when no runtime is usable, in which
## case the scene keeps running on the desktop (mouse fallback).
func start_session() -> bool:
	if xr_interface == null:
		xr_interface = XRServer.find_interface(INTERFACE_REALITYKIT)
		if xr_interface == null:
			xr_interface = XRServer.find_interface(INTERFACE_OPENXR)
	if xr_interface == null:
		push_warning("XR: no interface available (OpenXR or RealityKit).")
		return false
	if not xr_interface.is_initialized():
		if not xr_interface.initialize():
			push_warning("XR: interface failed to initialize.")
			return false
	# OpenXR drives the frame timing on the headset, so the desktop v-sync has
	# to go or the compositor stutters.
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	get_viewport().use_xr = true
	_collect_controllers()
	if start_in_ar:
		set_passthrough(true)
	session_started.emit(runtime)
	return true


func stop_session() -> void:
	if xr_interface == null or not xr_interface.is_initialized():
		return
	set_passthrough(false)
	get_viewport().use_xr = false
	xr_interface.uninitialize()
	session_stopped.emit()


func is_session_active() -> bool:
	return xr_interface != null and xr_interface.is_initialized()


# --- Passthrough -----------------------------------------------------------

## Enables AR passthrough when the runtime supports it.
## Opaque  -> VR. Additive -> AR on see-through optics. Alpha -> AR with
## video passthrough (needs a transparent viewport background).
func set_passthrough(enabled: bool) -> bool:
	if xr_interface == null or not xr_interface.is_initialized():
		return false
	var viewport := get_viewport()
	var modes := xr_interface.get_supported_environment_blend_modes()
	if enabled:
		if XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND in modes:
			xr_interface.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ALPHA_BLEND
			viewport.transparent_bg = true
		elif XRInterface.XR_ENV_BLEND_MODE_ADDITIVE in modes:
			xr_interface.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_ADDITIVE
			viewport.transparent_bg = false
		else:
			push_warning("XR: no passthrough blend mode supported.")
			return false
		_clear_environment()
	else:
		if XRInterface.XR_ENV_BLEND_MODE_OPAQUE in modes:
			xr_interface.environment_blend_mode = XRInterface.XR_ENV_BLEND_MODE_OPAQUE
		viewport.transparent_bg = false
	_passthrough_enabled = enabled
	passthrough_changed.emit(enabled)
	return true


## True while the session shows the real world (MR) instead of a void (VR).
func is_passthrough_enabled() -> bool:
	return _passthrough_enabled


func _clear_environment() -> void:
	var node := get_tree().get_first_node_in_group("xr_environment")
	var world_environment := node as WorldEnvironment
	if world_environment == null:
		return
	var env := world_environment.environment
	if env == null:
		return
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0, 0, 0, 0)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR


# --- Controller state ------------------------------------------------------

func get_controller(hand: int) -> XRController3D:
	if hand < 0 or hand >= _controllers.size():
		return null
	return _controllers[hand] as XRController3D


func is_grip_pressed(hand: int) -> bool:
	return hand >= 0 and hand < _grip_down.size() and _grip_down[hand]


func is_trigger_pressed(hand: int) -> bool:
	return hand >= 0 and hand < _trigger_down.size() and _trigger_down[hand]


## World space origin of the aim ray for the given hand.
func get_aim_origin(hand: int) -> Vector3:
	var controller := get_controller(hand)
	if controller == null:
		return Vector3.ZERO
	return controller.global_position


## World space direction of the aim ray for the given hand.
func get_aim_direction(hand: int) -> Vector3:
	var controller := get_controller(hand)
	if controller == null:
		return Vector3.ZERO
	return -controller.global_basis.z.normalized()


func _read_grip(controller: XRController3D) -> bool:
	# Godot's OpenXR action map exposes the grip as a float axis; the runtime
	# converts the digital button for us. The docs recommend float + own
	# threshold over the bool variant, so we only read the float.
	return controller.get_float(ACTION_GRIP) > GRIP_THRESHOLD


func _read_trigger(controller: XRController3D) -> bool:
	return controller.get_float(ACTION_TRIGGER) > TRIGGER_THRESHOLD


# --- Shared raycast helper ------------------------------------------------

## Raycasts against the whole physics world and returns the hit when it
## belongs to `target` (usually an Area3D), or an empty Dictionary otherwise.
## Shared by the viewport bridge, the panel and the affordance pill so the
## GRIP/TRIGGER split stays consistent everywhere.
static func ray_hit(world: World3D, from: Vector3, to: Vector3, target: Object) -> Dictionary:
	if world == null or target == null:
		return {}
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	# intersect_ray returns the hit as a Dictionary (empty when nothing was hit).
	var hit: Dictionary = world.direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return {}
	if hit["collider"] != target:
		return {}
	return hit
