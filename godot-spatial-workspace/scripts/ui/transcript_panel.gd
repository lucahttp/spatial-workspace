class_name TranscriptPanel2D
extends Control
## 2D UI for Voice & Agent Reasoning transcript, ported from TranscriptPanel in Workspace.tsx.
##
## Includes:
## - Live animated equalizer bars.
## - "FOUNDRY LIVE" agent indicator.
## - Transcript output list.
## - Quick delegation pills (Run wZed, Create 3D Module, List VFS).
## - Microphone toggle.

signal run_wzed_requested()
signal create_module_requested()
signal list_vfs_requested()
signal mic_toggled(active: bool)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")

@onready var _orb_state_label: Label = %OrbStateLabel
@onready var _eq_container: HBoxContainer = %EqualizerRow
@onready var _transcript_label: RichTextLabel = %TranscriptText
@onready var _mic_button: Button = %MicButton

@onready var _btn_run: Button = %BtnRun
@onready var _btn_create: Button = %BtnCreate
@onready var _btn_vfs: Button = %BtnVfs

var _mic_active := true
var _eq_bars: Array[ColorRect] = []
var _time := 0.0


func _ready() -> void:
	theme = THEME
	_setup_equalizer()
	_btn_run.pressed.connect(func() -> void: run_wzed_requested.emit())
	_btn_create.pressed.connect(func() -> void: create_module_requested.emit())
	_btn_vfs.pressed.connect(func() -> void: list_vfs_requested.emit())
	_mic_button.pressed.connect(_on_mic_pressed)
	set_transcript(["Asistente listo. Reconocimiento de voz y supervisión activa."])


func _setup_equalizer() -> void:
	for child in _eq_container.get_children():
		child.queue_free()
	_eq_bars.clear()
	for i in range(5):
		var bar := ColorRect.new()
		bar.custom_minimum_size = Vector2(4, 8)
		bar.color = Color(0.22, 0.74, 0.98) # Cyan accent
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		_eq_container.add_child(bar)
		_eq_bars.append(bar)


func _process(delta: float) -> void:
	_time += delta
	if not _mic_active:
		for bar in _eq_bars:
			bar.custom_minimum_size.y = 4
		return

	for i in range(_eq_bars.size()):
		var val := 4.0 + absf(sin(_time * 6.0 + float(i) * 1.3)) * 16.0
		_eq_bars[i].custom_minimum_size.y = val


func _on_mic_pressed() -> void:
	_mic_active = not _mic_active
	_mic_button.text = "🎤 Micrófono activo (Click para pausar)" if _mic_active else "🔇 Micrófono pausado (Click para activar)"
	_mic_button.modulate = Color.WHITE if _mic_active else Color(0.7, 0.7, 0.7)
	mic_toggled.emit(_mic_active)


func set_orb_state(state_name: String) -> void:
	if _orb_state_label != null:
		_orb_state_label.text = "ESTADO: %s" % state_name.to_upper()


func set_transcript(lines: Array) -> void:
	if _transcript_label == null:
		return
	_transcript_label.clear()
	for line in lines:
		_transcript_label.append_text("• %s\n" % str(line))


func append_log(text: String) -> void:
	if _transcript_label != null:
		_transcript_label.append_text("  > %s\n" % text)
