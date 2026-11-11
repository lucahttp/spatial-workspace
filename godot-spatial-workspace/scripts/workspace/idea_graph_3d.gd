class_name IdeaGraph3D
extends Node3D
## 3D Mind Map & Knowledge Graph ported from Three.js IdeaGraph.tsx.
##
## Features:
## - Central Idea Crystal (octahedron) with orbital rotating halo and warm glow.
## - Satellite source nodes with constellation links connecting to the central crystal.
## - 6DoF Grip dragging to reposition the graph anywhere in space.
## - Trigger click on satellite pearl nodes to inspect the source in Web Preview.

signal source_selected(id: String, title: String, url: String)
signal graph_moved()

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")
const PILL_SCENE := preload("res://scenes/ui/spatial_affordance_pill.tscn")

const COLOR_IDEA := Color(0.96, 0.62, 0.15) # Warm Amber / Gold
const COLOR_ACCENT := Color(0.22, 0.74, 0.98) # Sky Cyan

@export var affordance_path: NodePath = ^"Affordance"

var _crystal: MeshInstance3D
var _halo: MeshInstance3D
var _light: OmniLight3D
var _title_label: Label3D
var _satellites_root: Node3D
var _lines_mesh: MeshInstance3D
var _immediate_mesh: ImmediateMesh
var _affordance: Node3D
var _collider: Area3D
var _xr: XRManagerScript

var _sources: Array[Dictionary] = [
	{
		"id": "doc-spatial",
		"title": "Diseño Spatial UI",
		"badge": "SPEC",
		"url": "https://docs.google.com/spatial-pico-spec"
	},
	{
		"id": "web-wolvic",
		"title": "Wolvic WebXR",
		"badge": "WEB",
		"url": "https://wolvic.com/webxr-layers"
	}
]

var _dragging := false
var _dragging_hand := -1
var _drag_depth := 0.0
var _drag_offset := Vector3.ZERO
var _trigger_consumed := [false, false]


func _ready() -> void:
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_affordance = get_node_or_null(affordance_path) as Node3D
	_setup_nodes()
	_rebuild_satellites()


func _setup_nodes() -> void:
	# Central Idea Crystal
	_crystal = MeshInstance3D.new()
	_crystal.name = "IdeaCrystal"
	var prism := PrismMesh.new()
	prism.size = Vector3(0.045, 0.055, 0.045)
	_crystal.mesh = prism

	var crystal_mat := StandardMaterial3D.new()
	crystal_mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	crystal_mat.albedo_color = COLOR_IDEA
	crystal_mat.emission_enabled = true
	crystal_mat.emission = COLOR_IDEA
	crystal_mat.emission_energy_multiplier = 1.3
	crystal_mat.roughness = 0.2
	crystal_mat.metallic = 0.7
	_crystal.material_override = crystal_mat
	add_child(_crystal)

	# Warm Point Light
	_light = OmniLight3D.new()
	_light.light_color = COLOR_IDEA
	_light.light_energy = 1.6
	_light.omni_range = 0.8
	add_child(_light)

	# Rotating Orbital Halo Ring
	_halo = MeshInstance3D.new()
	_halo.name = "Halo"
	var torus := TorusMesh.new()
	torus.inner_radius = 0.048
	torus.outer_radius = 0.052
	torus.rings = 36
	torus.ring_segments = 8
	_halo.mesh = torus
	_halo.rotation_degrees = Vector3(55, 0, 0)

	var halo_mat := StandardMaterial3D.new()
	halo_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	halo_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	halo_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	halo_mat.albedo_color = Color(COLOR_IDEA.r, COLOR_IDEA.g, COLOR_IDEA.b, 0.65)
	_halo.material_override = halo_mat
	add_child(_halo)

	# Central Title Label
	_title_label = Label3D.new()
	_title_label.name = "TitleLabel"
	_title_label.font_size = 28
	_title_label.pixel_size = 0.0004
	_title_label.position = Vector3(0, 0.075, 0)
	_title_label.modulate = COLOR_IDEA
	_title_label.outline_modulate = Color.BLACK
	_title_label.outline_size = 6
	add_child(_title_label)

	# Root for Satellite Pearls and Constellation Lines
	_satellites_root = Node3D.new()
	_satellites_root.name = "Satellites"
	add_child(_satellites_root)

	_lines_mesh = MeshInstance3D.new()
	_lines_mesh.name = "ConstellationLines"
	_immediate_mesh = ImmediateMesh.new()
	_lines_mesh.mesh = _immediate_mesh
	var lines_mat := StandardMaterial3D.new()
	lines_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	lines_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	lines_mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	lines_mat.albedo_color = Color(COLOR_ACCENT.r, COLOR_ACCENT.g, COLOR_ACCENT.b, 0.7)
	_lines_mesh.material_override = lines_mat
	add_child(_lines_mesh)

	# Base Grab Collider for IdeaGraph (Layer 2)
	_collider = Area3D.new()
	_collider.name = "Collider"
	_collider.collision_layer = 2
	_collider.collision_mask = 0
	_collider.monitorable = true
	var shape := CollisionShape3D.new()
	var sphere := SphereShape3D.new()
	sphere.radius = 0.24
	shape.shape = sphere
	_collider.add_child(shape)
	add_child(_collider)

	if _affordance != null and _affordance.has_method("set_label"):
		_affordance.set_label("MAPA DE IDEAS")


func _process(delta: float) -> void:
	if _crystal != null:
		_crystal.rotation.y += delta * 0.6
		_crystal.rotation.x += delta * 0.3
	if _halo != null:
		_halo.rotation.z -= delta * 0.4
	_handle_interaction()


func _rebuild_satellites() -> void:
	for child in _satellites_root.get_children():
		child.queue_free()

	_title_label.text = "IDEA Y FUENTES (%d)" % _sources.size()

	_immediate_mesh.clear_surfaces()
	_immediate_mesh.surface_begin(Mesh.PRIMITIVE_LINES)

	var count := _sources.size()
	for i in range(count):
		var source: Dictionary = _sources[i]
		var angle := (float(i) / maxf(1.0, float(count))) * TAU + 0.4
		var dist := 0.20 + float(i % 2) * 0.04
		var pos := Vector3(cos(angle) * dist, sin(angle) * (dist * 0.7), sin(angle * 2.0) * 0.06)

		# Satellite Pearl
		var pearl := Node3D.new()
		pearl.name = "Satellite_%s" % source.get("id", str(i))
		pearl.position = pos

		var mesh_inst := MeshInstance3D.new()
		var sphere := SphereMesh.new()
		sphere.radius = 0.014
		sphere.height = 0.028
		mesh_inst.mesh = sphere

		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
		mat.albedo_color = COLOR_ACCENT
		mat.emission_enabled = true
		mat.emission = COLOR_ACCENT
		mat.emission_energy_multiplier = 1.1
		mat.roughness = 0.3
		mat.metallic = 0.5
		mesh_inst.material_override = mat
		pearl.add_child(mesh_inst)

		# Floating text
		var label := Label3D.new()
		var title_str: String = source.get("title", "Fuente")
		label.text = title_str.substr(0, 18)
		label.font_size = 20
		label.pixel_size = 0.00035
		label.position = Vector3(0, 0.026, 0)
		label.modulate = Color.WHITE
		label.outline_modulate = Color.BLACK
		label.outline_size = 5
		pearl.add_child(label)

		# Pearl Collider (Layer 2)
		var pearl_area := Area3D.new()
		pearl_area.name = "PearlCollider"
		pearl_area.collision_layer = 2
		pearl_area.collision_mask = 0
		pearl_area.monitorable = true
		var col_shape := CollisionShape3D.new()
		var col_sphere := SphereShape3D.new()
		col_sphere.radius = 0.028
		col_shape.shape = col_sphere
		pearl_area.add_child(col_shape)
		pearl.add_child(pearl_area)

		_satellites_root.add_child(pearl)

		# Line from center (0,0,0) to satellite
		_immediate_mesh.surface_add_vertex(Vector3.ZERO)
		_immediate_mesh.surface_add_vertex(pos)

	_immediate_mesh.surface_end()


func _handle_interaction() -> void:
	if _xr == null:
		return

	# 1. Trigger selection on satellite pearls
	for hand: int in [0, 1]:
		if _xr.is_trigger_pressed(hand):
			if not _trigger_consumed[hand]:
				var origin := _xr.get_aim_origin(hand)
				var dir := _xr.get_aim_direction(hand)
				if dir != Vector3.ZERO:
					var hit := _raycast(origin, origin + dir * 10.0)
					if not hit.is_empty():
						var col: Object = hit.get("collider")
						for i in range(_sources.size()):
							var node_name := "Satellite_%s" % _sources[i].get("id", str(i))
							var pearl := _satellites_root.get_node_or_null(node_name)
							if pearl != null and pearl.get_node_or_null("PearlCollider") == col:
								_trigger_consumed[hand] = true
								var src: Dictionary = _sources[i]
								source_selected.emit(src.get("id", ""), src.get("title", ""), src.get("url", ""))
								SpatialAudioScript.play_click(get_tree(), pearl.global_position)
								return
		else:
			_trigger_consumed[hand] = false

	# 2. Grip drag on central graph collider
	if not _dragging:
		for hand: int in [0, 1]:
			if _xr.can_claim_grip(hand, self):
				var origin := _xr.get_aim_origin(hand)
				var dir := _xr.get_aim_direction(hand)
				if dir != Vector3.ZERO:
					var hit := _raycast(origin, origin + dir * 10.0)
					if not hit.is_empty() and hit.get("collider") == _collider:
						if _xr.claim_grip(hand, self):
							_dragging = true
							_dragging_hand = hand
							var pos: Vector3 = hit.get("position")
							_drag_depth = origin.distance_to(pos)
							_drag_offset = global_position - pos
							SpatialAudioScript.play_grab(get_tree(), global_position)
							if _affordance != null and _affordance.has_method("set_dragging"):
								_affordance.set_dragging(true)
							break
	else:
		if not _xr.is_grip_pressed(_dragging_hand):
			_xr.release_grip(_dragging_hand, self)
			_dragging = false
			_dragging_hand = -1
			SpatialAudioScript.play_release(get_tree(), global_position)
			if _affordance != null and _affordance.has_method("set_dragging"):
				_affordance.set_dragging(false)
			graph_moved.emit()
		else:
			var origin := _xr.get_aim_origin(_dragging_hand)
			var dir := _xr.get_aim_direction(_dragging_hand)
			if dir != Vector3.ZERO:
				global_position = origin + dir * _drag_depth + _drag_offset


func _raycast(from: Vector3, to: Vector3) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(from, to, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	return get_world_3d().direct_space_state.intersect_ray(query)


## Adds a new source to the Mind Map and rebuilds links.
func add_source(id: String, title: String, badge: String, url: String) -> void:
	for src in _sources:
		if src.get("id") == id:
			return
	_sources.append({"id": id, "title": title, "badge": badge, "url": url})
	_rebuild_satellites()
	SpatialAudioScript.play_chime(get_tree(), global_position)


func get_sources() -> Array[Dictionary]:
	return _sources
