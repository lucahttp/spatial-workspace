extends Node3D
## Document carousel: a cylindrical arrangement of reference cards.
##
## Cards can be moved on their own (Grip on a single card) or the whole group
## can be moved as a unit (Grip on the rail / the carousel hub).
##
## When the hand or the pointer gets close, a "+" button appears so new cards
## can be anchored to the carousel.

signal card_moved(card_id: String)
signal card_added(card_id: String)
signal card_selected(card_id: String, title: String, badge: String, summary: String)
signal add_card_requested()

const XRManagerScript := preload("res://scripts/xr/xr_manager.gd")
const PILL_SCENE := preload("res://scenes/ui/spatial_affordance_pill.tscn")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

const CARD_RADIUS := 0.42
const CARD_ANGLE_STEP := 0.42
const CARD_WIDTH := 0.19
const CARD_HEIGHT := 0.24
const GRIP_MIN_DISTANCE := 0.05
const ADD_BUTTON_DISTANCE := 0.38
const RAY_LENGTH := 10.0

## Reference cards shown by default, mirroring the web seed data.
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

@onready var _cards_root: Node3D = %Cards
@onready var _add_button: Node3D = %AddButton

var _xr: XRManagerScript
var _cards: Array[Node3D] = []
var _card_data: Array[Dictionary] = []
var _next_id := 0

# Drag state
var _dragging_card: Node3D = null
var _dragging_group := false
var _drag_depth := 0.0
var _drag_offset := Vector3.ZERO
var _trigger_consumed := [false, false]


func _ready() -> void:
	_xr = get_tree().get_first_node_in_group("xr_manager") as XRManagerScript
	for data in DEFAULT_CARDS:
		_add_card(data["id"], data["title"], data["badge"], data["summary"])
	_layout_cards()


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
	title_label.modulate = Color(1, 0.9411765, 1, 1)
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

	# Each card carries its own affordance pill, exactly like the web build.
	var pill := PILL_SCENE.instantiate() as Node3D
	pill.name = "Affordance"
	pill.position = Vector3(0, -CARD_HEIGHT * 0.5 - 0.035, 0.02)
	pill.set("label_text", "MOVER TARJETA")
	pill.set("hover_collider_path", NodePath("../Collider"))
	card.add_child(pill)

	return card


## Places the cards on a cylinder facing the viewer.
func _layout_cards() -> void:
	var count := _cards.size()
	if count == 0:
		return
	var mid := (count - 1) * 0.5
	for index in count:
		var card := _cards[index]
		var angle := (index - mid) * CARD_ANGLE_STEP
		card.position = Vector3(sin(angle) * CARD_RADIUS, 0.0, -cos(angle) * CARD_RADIUS)
		card.rotation = Vector3(0, angle, 0)


# --- Dragging --------------------------------------------------------------

func _process(_delta: float) -> void:
	if _xr == null:
		return
	_update_add_button()
	_check_add_button()
	_check_card_selection()
	var gripping := -1
	for hand: int in [0, 1]:
		if _xr.is_grip_pressed(hand):
			gripping = hand
			break
	if gripping < 0:
		_dragging_card = null
		_dragging_group = false
		return
	if _dragging_card == null and not _dragging_group:
		_begin_drag(gripping)
		return
	_update_drag(gripping)


## Selects a card on trigger press, forwarding its contents to Web Preview.
func _check_card_selection() -> void:
	for hand: int in [0, 1]:
		if _xr.is_trigger_pressed(hand):
			if not _trigger_consumed[hand]:
				var hit := _hit_under_ray(hand)
				if not hit.is_empty() and hit["card"] != null:
					_trigger_consumed[hand] = true
					var card: Node3D = hit["card"]
					var raw_id: String = card.name.trim_prefix("Card_")
					var card_info: Dictionary = {}
					for data in _card_data:
						if data["id"] == raw_id:
							card_info = data
							break
					if not card_info.is_empty():
						card_selected.emit(card_info["id"], card_info["title"], card_info["badge"], card_info["summary"])
						SpatialAudioScript.play_chime(get_tree(), card.global_position)
		else:
			_trigger_consumed[hand] = false


## The "+" button reacts to the trigger, same as any other 2D control.
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
		var hit := XRManagerScript.ray_hit(get_world_3d(), origin, origin + direction * RAY_LENGTH, collider)
		if not hit.is_empty():
			add_card_requested.emit()
			return


func _begin_drag(hand: int) -> void:
	var hit := _hit_under_ray(hand)
	if hit.is_empty():
		return
	var card: Node3D = hit["card"]
	if card != null:
		_dragging_card = card
		_drag_depth = _ray_depth(hand)
		var position: Vector3 = hit["position"]
		_drag_offset = card.global_position - position
		SpatialAudioScript.play_grab(get_tree(), position)
	elif hit["group"]:
		_dragging_group = true
		_drag_depth = _ray_depth(hand)
		var group_position: Vector3 = hit["position"]
		_drag_offset = global_position - group_position
		SpatialAudioScript.play_grab(get_tree(), group_position)


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


## Finds the card (or the group hub) under the controller ray.
func _hit_under_ray(hand: int) -> Dictionary:
	var origin := _xr.get_aim_origin(hand)
	var direction := _xr.get_aim_direction(hand)
	if direction.length_squared() < 0.0001:
		return {}
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * RAY_LENGTH, 0x0002)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hits := get_world_3d().direct_space_state.intersect_ray(query)
	if hits.is_empty():
		return {}
	# intersect_ray returns the hit as a Dictionary (empty when nothing was hit).
	var hit: Dictionary = hits
	var collider: Object = hit["collider"]
	for card in _cards:
		if card == collider or card.get_node_or_null("Collider") == collider:
			return {"card": card, "position": hit["position"], "group": false}
	# The hub area moves the whole group.
	if collider == _cards_root or collider == get_node_or_null("Hub"):
		return {"card": null, "position": hit["position"], "group": true}
	return {}


func _ray_depth(hand: int) -> float:
	var hit := _hit_under_ray(hand)
	if hit.is_empty():
		return 0.0
	return _xr.get_aim_origin(hand).distance_to(hit["position"])


# --- Add button ------------------------------------------------------------

## The "+" button only shows up when the user is close to the carousel.
func _update_add_button() -> void:
	if _add_button == null:
		return
	var near := false
	for hand: int in [0, 1]:
		var origin := _xr.get_aim_origin(hand)
		if origin == Vector3.ZERO:
			continue
		if origin.distance_to(_add_button.global_position) < ADD_BUTTON_DISTANCE:
			near = true
			break
	_add_button.visible = near


## Adds a new reference card at the end of the carousel.
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
