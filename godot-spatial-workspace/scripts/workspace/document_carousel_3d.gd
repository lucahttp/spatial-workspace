extends Node3D
## Document carousel: a cylindrical arrangement of reference cards with
## 6DoF dragging, prev/next navigation, magnetic snap, and drop-zones (Archive/Trash).
##
## Features ported from Three.js Carousel.tsx:
## - Arc layout with smooth spring interpolation (lerp).
## - Left (<) and Right (>) navigation buttons to scroll along the arc.
## - Dragging cards with Grip and dropping onto Archive or Trash pedestals.
## - Trigger click to inspect card content in Web Preview.

signal card_moved(card_id: String)
signal card_added(card_id: String)
signal card_removed(card_id: String)
signal card_selected(card_id: String, title: String, badge: String, summary: String)
signal add_card_requested()

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const PILL_SCENE := preload("res://scenes/ui/spatial_affordance_pill.tscn")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

const CARD_RADIUS := 0.42
const CARD_ANGLE_STEP := 0.38
const CARD_WIDTH := 0.19
const CARD_HEIGHT := 0.24
const ADD_BUTTON_DISTANCE := 0.38
const RAY_LENGTH := 10.0

const DEFAULT_CARDS := [
	{
		"id": "design-pico",
		"title": "Diseno Spatial UI",
		"badge": "ESPECIFICACION",
		"summary": "Ventanas con barrita inferior, snap magnetico y grafo de ideas.",
	},
	{
		"id": "web-wolvic",
		"title": "Wolvic & WebXR Layers",
		"badge": "WEB",
		"summary": "Navegador espacial multi-ventana y puente nativo SystemBridge.",
	},
	{
		"id": "note-xr",
		"title": "Spatial Ergonomics 2026",
		"badge": "PAPER",
		"summary": "Cono de confort visual de 33.5 grados y fisicas magneticas.",
	},
]

@export var pads_path: NodePath

@onready var _cards_root: Node3D = %Cards
@onready var _add_button: Node3D = %AddButton

var _xr: XRManagerScript
var _pads: Node3D
var _cards: Array[Node3D] = []
var _card_data: Array[Dictionary] = []
var _next_id := 0

# Navigation
var _offset_index := 0.0
var _target_offset := 0.0
var _prev_btn: Node3D
var _next_btn: Node3D

# Drag state
var _dragging_card: Node3D = null
var _dragging_group := false
var _drag_hand := -1
var _drag_depth := 0.0
var _drag_offset := Vector3.ZERO
var _trigger_consumed := [false, false]


func _ready() -> void:
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	_pads = get_node_or_null(pads_path) as Node3D
	_setup_nav_buttons()
	for data in DEFAULT_CARDS:
		_add_card(data["id"], data["title"], data["badge"], data["summary"])
	_layout_cards()


func _setup_nav_buttons() -> void:
	_prev_btn = _build_nav_button("<", Vector3(-0.48, 0, -0.36), -1.0)
	_next_btn = _build_nav_button(">", Vector3(0.48, 0, -0.36), 1.0)
	add_child(_prev_btn)
	add_child(_next_btn)


func _build_nav_button(label_str: String, pos: Vector3, _dir: float) -> Node3D:
	var btn := Node3D.new()
	btn.name = "NavBtn_" + label_str
	btn.position = pos

	var surface := MeshInstance3D.new()
	var quad := QuadMesh.new()
	quad.size = Vector2(0.045, 0.045)
	surface.mesh = quad
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.12, 0.16, 0.25, 0.85)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	surface.material_override = mat
	btn.add_child(surface)

	var label := Label3D.new()
	label.text = label_str
	label.font_size = 32
	label.pixel_size = 0.0004
	label.position = Vector3(0, 0, 0.002)
	label.modulate = Color(0.35, 0.75, 1.0)
	btn.add_child(label)

	var col := Area3D.new()
	col.name = "Collider"
	col.collision_layer = 2
	col.collision_mask = 0
	col.monitorable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(0.05, 0.05, 0.02)
	shape.shape = box
	col.add_child(shape)
	btn.add_child(col)

	return btn


# --- Cards -----------------------------------------------------------------

func _add_card(card_id: String, title: String, badge: String, summary: String) -> Node3D:
	var card := _build_card(card_id, title, badge, summary)
	_cards_root.add_child(card)
	_cards.append(card)
	_card_data.append({
		"id": card_id,
		"title": title,
		"badge": badge,
		"summary": summary,
	})
	return card


func _build_card(card_id: String, title: String, badge: String, summary: String) -> Node3D:
	var card := Node3D.new()
	card.name = "Card_%s" % card_id

	var surface := MeshInstance3D.new()
	surface.mesh = QuadMesh.new()
	(surface.mesh as QuadMesh).size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	var material := StandardMaterial3D.new()
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.albedo_color = Color(0.09, 0.07, 0.16, 0.94)
	surface.material_override = material
	card.add_child(surface)

	var title_label := Label3D.new()
	title_label.text = title
	title_label.font_size = 40
	title_label.pixel_size = 0.00042
	title_label.width = 320
	title_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title_label.position = Vector3(0, 0.045, 0.002)
	title_label.modulate = Color(1, 0.94, 1, 1)
	card.add_child(title_label)

	var badge_label := Label3D.new()
	badge_label.text = badge
	badge_label.font_size = 26
	badge_label.pixel_size = 0.00042
	badge_label.position = Vector3(0, -0.082, 0.002)
	badge_label.modulate = Color(0.45, 0.78, 0.98, 1)
	card.add_child(badge_label)

	var collider := Area3D.new()
	collider.name = "Collider"
	collider.collision_layer = 2
	collider.collision_mask = 0
	collider.monitorable = true
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(CARD_WIDTH, CARD_HEIGHT, 0.02)
	shape.shape = box
	collider.add_child(shape)
	card.add_child(collider)

	var pill := PILL_SCENE.instantiate() as Node3D
	pill.name = "Affordance"
	pill.position = Vector3(0, -CARD_HEIGHT * 0.5 - 0.035, 0.02)
	pill.set("label_text", "MOVER TARJETA")
	pill.set("hover_collider_path", NodePath("../Collider"))
	card.add_child(pill)

	return card


func _layout_cards() -> void:
	var count := _cards.size()
	if count == 0:
		return
	var mid := (count - 1) * 0.5
	for index in count:
		var card := _cards[index]
		if card == _dragging_card:
			continue
		var angle := (float(index) - mid + _offset_index) * CARD_ANGLE_STEP
		var target_pos := Vector3(sin(angle) * CARD_RADIUS, 0.0, -cos(angle) * CARD_RADIUS)
		card.position = target_pos
		card.rotation = Vector3(0, angle, 0)


func _process(delta: float) -> void:
	if _xr == null:
		return
	_update_add_button()
	_check_add_button()
	_check_nav_buttons()
	_check_card_selection()

	# Smooth navigation scroll lerp
	_offset_index = lerpf(_offset_index, _target_offset, delta * 8.0)

	# Smooth magnetic snapping for resting cards
	var count := _cards.size()
	var mid := (count - 1) * 0.5
	for index in range(count):
		var card := _cards[index]
		if card == _dragging_card:
			continue
		var angle := (float(index) - mid + _offset_index) * CARD_ANGLE_STEP
		var target_pos := Vector3(sin(angle) * CARD_RADIUS, 0.0, -cos(angle) * CARD_RADIUS)
		card.position = card.position.lerp(target_pos, delta * 7.0)
		card.rotation.y = lerpf(card.rotation.y, angle, delta * 7.0)

	# Grip drag handling with strict ownership checks
	if _dragging_card == null and not _dragging_group:
		for hand: int in [0, 1]:
			if _xr.can_claim_grip(hand, self):
				var hit := _hit_under_ray(hand)
				if not hit.is_empty():
					if _xr.claim_grip(hand, self):
						_drag_hand = hand
						_begin_drag(hand, hit)
						break
	else:
		if not _xr.is_grip_pressed(_drag_hand):
			_xr.release_grip(_drag_hand, self)
			if _dragging_card != null:
				_end_card_drag()
			_dragging_card = null
			_dragging_group = false
			_drag_hand = -1
		else:
			_update_drag(_drag_hand)


func _check_nav_buttons() -> void:
	for hand: int in [0, 1]:
		if _xr.is_trigger_pressed(hand):
			if not _trigger_consumed[hand]:
				var origin := _xr.get_aim_origin(hand)
				var dir := _xr.get_aim_direction(hand)
				if dir != Vector3.ZERO:
					var hit := _raycast(origin, origin + dir * RAY_LENGTH)
					if not hit.is_empty():
						var col: Object = hit.get("collider")
						if _prev_btn != null and _prev_btn.get_node_or_null("Collider") == col:
							_trigger_consumed[hand] = true
							_target_offset += 1.0
							SpatialAudioScript.play_click(get_tree(), _prev_btn.global_position)
							return
						elif _next_btn != null and _next_btn.get_node_or_null("Collider") == col:
							_trigger_consumed[hand] = true
							_target_offset -= 1.0
							SpatialAudioScript.play_click(get_tree(), _next_btn.global_position)
							return
		else:
			_trigger_consumed[hand] = false


func _check_card_selection() -> void:
	for hand: int in [0, 1]:
		if _xr.is_trigger_pressed(hand):
			if not _trigger_consumed[hand]:
				var hit := _hit_under_ray(hand)
				if not hit.is_empty() and hit["card"] != null:
					_trigger_consumed[hand] = true
					var card: Node3D = hit["card"]
					var raw_id: String = card.name.trim_prefix("Card_")
					for data in _card_data:
						if data["id"] == raw_id:
							card_selected.emit(data["id"], data["title"], data["badge"], data["summary"])
							SpatialAudioScript.play_chime(get_tree(), card.global_position)
							return
		else:
			_trigger_consumed[hand] = false


func _begin_drag(hand: int, hit: Dictionary = {}) -> void:
	if hit.is_empty():
		hit = _hit_under_ray(hand)
	if hit.is_empty():
		return
	var card: Node3D = hit.get("card")
	if card != null:
		_dragging_card = card
		_drag_depth = _ray_depth(hand)
		var pos: Vector3 = hit["position"]
		_drag_offset = card.global_position - pos
		SpatialAudioScript.play_grab(get_tree(), pos)
	elif hit.get("group", false):
		_dragging_group = true
		_drag_depth = _ray_depth(hand)
		var g_pos: Vector3 = hit["position"]
		_drag_offset = global_position - g_pos
		SpatialAudioScript.play_grab(get_tree(), g_pos)


func _update_drag(hand: int) -> void:
	var origin := _xr.get_aim_origin(hand)
	var direction := _xr.get_aim_direction(hand)
	if direction.length_squared() < 0.0001:
		return
	var point := origin + direction.normalized() * _drag_depth
	if _dragging_card != null:
		_dragging_card.global_position = point + _drag_offset
		card_moved.emit(_dragging_card.name)
	else:
		global_position = point + _drag_offset


func _end_card_drag() -> void:
	if _dragging_card == null:
		return
	var raw_id := _dragging_card.name.trim_prefix("Card_")
	var card_info := {}
	for data in _card_data:
		if data["id"] == raw_id:
			card_info = data
			break

	# Check magnetic drop zones (Archive / Trash)
	if _pads != null and not card_info.is_empty():
		if _pads.has_method("is_near_archive") and _pads.is_near_archive(_dragging_card.global_position):
			_pads.archive_card(card_info, _dragging_card.global_position)
			remove_card(_dragging_card)
			return
		elif _pads.has_method("is_near_trash") and _pads.is_near_trash(_dragging_card.global_position):
			_pads.discard_card(card_info)
			remove_card(_dragging_card)
			return

	SpatialAudioScript.play_release(get_tree(), _dragging_card.global_position)


func remove_card(card: Node3D) -> void:
	var idx := _cards.find(card)
	if idx >= 0:
		_cards.remove_at(idx)
		if idx < _card_data.size():
			_card_data.remove_at(idx)
	card.queue_free()
	_layout_cards()
	card_removed.emit(card.name)


func _hit_under_ray(hand: int) -> Dictionary:
	var origin := _xr.get_aim_origin(hand)
	var direction := _xr.get_aim_direction(hand)
	if direction.length_squared() < 0.0001:
		return {}
	var hit := _raycast(origin, origin + direction * RAY_LENGTH)
	if hit.is_empty():
		return {}
	var collider: Object = hit["collider"]
	for card in _cards:
		if card == collider or card.get_node_or_null("Collider") == collider:
			return {"card": card, "position": hit["position"], "group": false}
	if collider == _cards_root or collider == get_node_or_null("Hub"):
		return {"card": null, "position": hit["position"], "group": true}
	return {}


func _raycast(from: Vector3, to: Vector3) -> Dictionary:
	var query := PhysicsRayQueryParameters3D.create(from, to, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	return get_world_3d().direct_space_state.intersect_ray(query)


func _ray_depth(hand: int) -> float:
	var hit := _hit_under_ray(hand)
	if hit.is_empty():
		return 0.0
	return _xr.get_aim_origin(hand).distance_to(hit["position"])


func _update_add_button() -> void:
	if _add_button == null:
		return
	var near := false
	for hand: int in [0, 1]:
		var origin := _xr.get_aim_origin(hand)
		if origin != Vector3.ZERO and origin.distance_to(_add_button.global_position) < ADD_BUTTON_DISTANCE:
			near = true
			break
	_add_button.visible = near


func _check_add_button() -> void:
	if _add_button == null or not _add_button.visible:
		return
	var collider := _add_button.get_node_or_null("AddCollider") as Area3D
	if collider == null:
		return
	for hand: int in [0, 1]:
		if not _xr.is_trigger_pressed(hand):
			continue
		var origin := _xr.get_aim_origin(hand)
		var direction := _xr.get_aim_direction(hand)
		if direction.length_squared() < 0.0001:
			continue
		var hit := _raycast(origin, origin + direction * RAY_LENGTH)
		if not hit.is_empty() and hit.get("collider") == collider:
			add_card_requested.emit()
			return


func add_card(title: String, badge: String, summary: String) -> String:
	_next_id += 1
	var card_id := "card-%d" % _next_id
	var card := _add_card(card_id, title, badge, summary)
	_layout_cards()
	card_added.emit(card_id)
	SpatialAudioScript.play_chime(get_tree(), card.global_position)
	return card_id


func get_card_count() -> int:
	return _cards.size()
