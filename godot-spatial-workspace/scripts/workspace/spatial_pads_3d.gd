class_name SpatialPads3D
extends Node3D
## Spatial Pads: Archive Pedestal and Trash Pedestal drop-zones ported from Pads.tsx.
##
## Includes:
## - 3D Slate Tray with levitating document leaves for Archiving.
## - 3D Titanium Cylinder Receptacle with rotating coral ring for Discarding.
## - Parabolic bezier animated droplet from Archive Pedestal to IdeaGraph.

signal card_archived(card_data: Dictionary)
signal card_discarded(card_data: Dictionary)

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")
const PILL_SCENE := preload("res://scenes/ui/spatial_affordance_pill.tscn")

const COLOR_ARCHIVE := Color(0.06, 0.72, 0.50) # Emerald Mint (#10b981)
const COLOR_TRASH := Color(0.94, 0.27, 0.27) # Coral Red (#ef4444)

@export var idea_graph_path: NodePath

var _archive_node: Node3D
var _archive_paper: Node3D
var _archive_collider: Area3D

var _trash_node: Node3D
var _trash_ring: MeshInstance3D
var _trash_collider: Area3D

var _idea_graph: Node3D
var _xr: XRManagerScript
var _time := 0.0

# Active animated droplets flying towards IdeaGraph
var _droplets: Array[Dictionary] = []

# Drag state
var _dragging_node: Node3D = null
var _dragging_hand := -1
var _drag_depth := 0.0
var _drag_offset := Vector3.ZERO


func _ready() -> void:
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_idea_graph = get_node_or_null(idea_graph_path) as Node3D
	_setup_archive_pedestal()
	_setup_trash_pedestal()


func _setup_archive_pedestal() -> void:
	_archive_node = Node3D.new()
	_archive_node.name = "ArchivePedestal"
	_archive_node.position = Vector3(-0.42, 0.0, 0.0)
	_archive_node.rotation_degrees = Vector3(-24, 8, 0)
	add_child(_archive_node)

	# Slate base plinth
	var plinth := MeshInstance3D.new()
	var plinth_mesh := BoxMesh.new()
	plinth_mesh.size = Vector3(0.28, 0.024, 0.18)
	plinth.mesh = plinth_mesh
	var plinth_mat := StandardMaterial3D.new()
	plinth_mat.albedo_color = Color(0.12, 0.16, 0.23) # Slate #1e293b
	plinth_mat.roughness = 0.5
	plinth.material_override = plinth_mat
	_archive_node.add_child(plinth)

	# Mint rim frame
	var rim := MeshInstance3D.new()
	var rim_mesh := BoxMesh.new()
	rim_mesh.size = Vector3(0.284, 0.005, 0.184)
	rim.mesh = rim_mesh
	rim.position = Vector3(0, 0.014, 0)
	var rim_mat := StandardMaterial3D.new()
	rim_mat.albedo_color = COLOR_ARCHIVE
	rim_mat.emission_enabled = true
	rim_mat.emission = COLOR_ARCHIVE
	rim_mat.emission_energy_multiplier = 0.6
	rim.material_override = rim_mat
	_archive_node.add_child(rim)

	# Levitating papers group
	_archive_paper = Node3D.new()
	_archive_paper.name = "LevitatingPapers"
	_archive_paper.position = Vector3(0, 0.025, 0)

	var p1 := MeshInstance3D.new()
	var b1 := BoxMesh.new()
	b1.size = Vector3(0.20, 0.004, 0.12)
	p1.mesh = b1
	var m1 := StandardMaterial3D.new()
	m1.albedo_color = Color(0.65, 0.95, 0.82)
	p1.material_override = m1
	_archive_paper.add_child(p1)

	var p2 := MeshInstance3D.new()
	var b2 := BoxMesh.new()
	b2.size = Vector3(0.18, 0.004, 0.11)
	p2.mesh = b2
	p2.position = Vector3(-0.01, 0.006, -0.01)
	p2.rotation_degrees = Vector3(0, 4, 0)
	var m2 := StandardMaterial3D.new()
	m2.albedo_color = Color(0.82, 0.98, 0.90)
	p2.material_override = m2
	_archive_paper.add_child(p2)

	_archive_node.add_child(_archive_paper)

	# Label pill
	var label := Label3D.new()
	label.text = "BANDEJA ARCHIVAR"
	label.font_size = 22
	label.pixel_size = 0.00035
	label.position = Vector3(0, 0.065, 0)
	label.modulate = COLOR_ARCHIVE
	label.outline_modulate = Color.BLACK
	label.outline_size = 5
	_archive_node.add_child(label)

	# Drop & Grab Collider (Layer 2)
	_archive_collider = Area3D.new()
	_archive_collider.name = "ArchiveCollider"
	_archive_collider.collision_layer = 2
	_archive_collider.collision_mask = 0
	_archive_collider.monitorable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.32, 0.16, 0.22)
	shape.shape = box
	_archive_collider.add_child(shape)
	_archive_node.add_child(_archive_collider)


func _setup_trash_pedestal() -> void:
	_trash_node = Node3D.new()
	_trash_node.name = "TrashPedestal"
	_trash_node.position = Vector3(0.42, 0.0, 0.0)
	_trash_node.rotation_degrees = Vector3(-24, -8, 0)
	add_child(_trash_node)

	# Titanium Cylinder receptacle
	var canister := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.09
	cyl.bottom_radius = 0.075
	cyl.height = 0.12
	cyl.radial_segments = 24
	canister.mesh = cyl
	var can_mat := StandardMaterial3D.new()
	can_mat.albedo_color = Color(0.12, 0.14, 0.20)
	can_mat.roughness = 0.6
	can_mat.metallic = 0.3
	canister.material_override = can_mat
	_trash_node.add_child(canister)

	# Spinning Coral Rim Ring
	_trash_ring = MeshInstance3D.new()
	_trash_ring.name = "CoralRim"
	var torus := TorusMesh.new()
	torus.inner_radius = 0.088
	torus.outer_radius = 0.096
	torus.rings = 24
	torus.ring_segments = 8
	_trash_ring.mesh = torus
	_trash_ring.position = Vector3(0, 0.062, 0)
	var ring_mat := StandardMaterial3D.new()
	ring_mat.albedo_color = COLOR_TRASH
	ring_mat.emission_enabled = true
	ring_mat.emission = COLOR_TRASH
	ring_mat.emission_energy_multiplier = 0.7
	_trash_ring.material_override = ring_mat
	_trash_node.add_child(_trash_ring)

	# Label pill
	var label := Label3D.new()
	label.text = "TACHO BASURA"
	label.font_size = 22
	label.pixel_size = 0.00035
	label.position = Vector3(0, 0.09, 0)
	label.modulate = COLOR_TRASH
	label.outline_modulate = Color.BLACK
	label.outline_size = 5
	_trash_node.add_child(label)

	# Drop & Grab Collider (Layer 2)
	_trash_collider = Area3D.new()
	_trash_collider.name = "TrashCollider"
	_trash_collider.collision_layer = 2
	_trash_collider.collision_mask = 0
	_trash_collider.monitorable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.24, 0.18, 0.24)
	shape.shape = box
	_trash_collider.add_child(shape)
	_trash_node.add_child(_trash_collider)


func _process(delta: float) -> void:
	_time += delta
	# Levitating paper animation
	if _archive_paper != null:
		_archive_paper.position.y = 0.025 + sin(_time * 2.2) * 0.005
	# Spinning trash ring
	if _trash_ring != null:
		_trash_ring.rotation.y += delta * 0.8
	_update_droplets(delta)
	_handle_drag()


func _handle_drag() -> void:
	if _xr == null:
		return
	if _dragging_node == null:
		for hand: int in [0, 1]:
			if _xr.can_claim_grip(hand, self):
				var origin := _xr.get_aim_origin(hand)
				var dir := _xr.get_aim_direction(hand)
				if dir != Vector3.ZERO:
					var hit := _raycast(origin, origin + dir * 10.0)
					if not hit.is_empty():
						var col: Object = hit.get("collider")
						if col == _archive_collider and _xr.claim_grip(hand, self):
							_start_drag(_archive_node, hand, origin, hit.get("position"))
							break
						elif col == _trash_collider and _xr.claim_grip(hand, self):
							_start_drag(_trash_node, hand, origin, hit.get("position"))
							break
	else:
		if not _xr.is_grip_pressed(_dragging_hand):
			_xr.release_grip(_dragging_hand, self)
			_dragging_node = null
			_dragging_hand = -1
			SpatialAudioScript.play_release(get_tree(), global_position)
		else:
			var origin := _xr.get_aim_origin(_dragging_hand)
			var dir := _xr.get_aim_direction(_dragging_hand)
			if dir != Vector3.ZERO:
				_dragging_node.global_position = origin + dir * _drag_depth + _drag_offset


func _start_drag(node: Node3D, hand: int, origin: Vector3, hit_pos: Vector3) -> void:
	_dragging_node = node
	_dragging_hand = hand
	_drag_depth = origin.distance_to(hit_pos)
	_drag_offset = node.global_position - hit_pos
	SpatialAudioScript.play_grab(get_tree(), hit_pos)


func _raycast(from: Vector3, to: Vector3) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(from, to, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	return get_world_3d().direct_space_state.intersect_ray(query)


## Drops and archives a card, triggering the flying bezier droplet to IdeaGraph.
func archive_card(card_data: Dictionary, from_pos: Vector3 = Vector3.ZERO) -> void:
	var start_pos := from_pos if from_pos != Vector3.ZERO else _archive_node.global_position
	var end_pos := _idea_graph.global_position if _idea_graph != null else global_position + Vector3(0, 0.4, 0)
	
	_spawn_droplet(start_pos, end_pos, card_data)
	SpatialAudioScript.play_archive(get_tree(), _archive_node.global_position)
	card_archived.emit(card_data)


## Discards a card into the trash pedestal.
func discard_card(card_data: Dictionary) -> void:
	SpatialAudioScript.play_trash(get_tree(), _trash_node.global_position)
	card_discarded.emit(card_data)


func _spawn_droplet(start_pos: Vector3, end_pos: Vector3, data: Dictionary) -> void:
	var droplet_mesh := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.016
	sphere.height = 0.032
	droplet_mesh.mesh = sphere

	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = COLOR_ARCHIVE
	droplet_mesh.material_override = mat

	var light := OmniLight3D.new()
	light.light_color = COLOR_ARCHIVE
	light.light_energy = 1.8
	light.omni_range = 0.35
	droplet_mesh.add_child(light)

	add_child(droplet_mesh)
	droplet_mesh.global_position = start_pos

	_droplets.append({
		"mesh": droplet_mesh,
		"start": start_pos,
		"end": end_pos,
		"data": data,
		"progress": 0.0
	})


func _update_droplets(delta: float) -> void:
	var i := 0
	while i < _droplets.size():
		var d: Dictionary = _droplets[i]
		d["progress"] = float(d["progress"]) + delta * 1.5
		var t: float = d["progress"]
		var mesh: MeshInstance3D = d["mesh"]

		if t >= 1.0:
			# Droplet arrived at IdeaGraph: add source
			if _idea_graph != null and _idea_graph.has_method("add_source"):
				var data: Dictionary = d["data"]
				_idea_graph.add_source(
					data.get("id", "src"),
					data.get("title", "Nueva Fuente"),
					data.get("badge", "DOC"),
					data.get("url", "")
				)
			mesh.queue_free()
			_droplets.remove_at(i)
		else:
			# Quadratic Bezier Curve: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
			var p0: Vector3 = d["start"]
			var p2: Vector3 = d["end"]
			var mid_y := maxf(p0.y, p2.y) + 0.32
			var p1 := Vector3((p0.x + p2.x) * 0.5, mid_y, (p0.z + p2.z) * 0.5)

			var one_minus := 1.0 - t
			var cur_pos := (one_minus * one_minus) * p0 + (2.0 * one_minus * t) * p1 + (t * t) * p2
			mesh.global_position = cur_pos
			i += 1


## Returns true if the position is within the Archive drop-zone radius.
func is_near_archive(pos: Vector3, radius: float = 0.28) -> bool:
	return _archive_node != null and _archive_node.global_position.distance_to(pos) < radius


## Returns true if the position is within the Trash drop-zone radius.
func is_near_trash(pos: Vector3, radius: float = 0.28) -> bool:
	return _trash_node != null and _trash_node.global_position.distance_to(pos) < radius
