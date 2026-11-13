class_name TranscriptPanel2D
extends Control
## 2D UI for Voice & Agent Reasoning transcript and Live Model settings.
##
## Features:
## - Live animated equalizer bars reactive to speech states.
## - Active Model Badge (MiniMax Realtime, OpenAI GPT-4o Live, DeepSeek, Local).
## - Model & Voice configuration view with API Key, MiniMax Group ID, and Voice Personas.
## - Quick speech action chips to simulate or trigger voice commands directly.
## - Virtual keyboard disabled on line edits to prevent OpenXR window focus hijacking.

signal run_wzed_requested()
signal create_module_requested()
signal list_vfs_requested()
signal open_browser_requested(url: String)
signal recenter_requested()
signal mic_toggled(active: bool)
signal voice_command_submitted(utterance: String)
signal model_configured(provider_name: String, model_name: String, voice_id: String)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")
const LiveModelManagerScript := preload("res://scripts/ai/live_model_manager.gd")

# Header Nodes
@onready var _orb_state_label: Label = %OrbStateLabel
@onready var _model_badge: Button = %ModelBadge
@onready var _eq_container: HBoxContainer = %EqualizerRow
@onready var _settings_toggle_btn: Button = %SettingsToggleBtn

# View Stack
@onready var _transcript_view: Control = %TranscriptView
@onready var _settings_view: Control = %SettingsView

# Transcript View Nodes
@onready var _transcript_label: RichTextLabel = %TranscriptText
@onready var _quick_voice_1: Button = %QuickVoice1
@onready var _quick_voice_2: Button = %QuickVoice2
@onready var _quick_voice_3: Button = %QuickVoice3
@onready var _btn_run: Button = %BtnRun
@onready var _btn_create: Button = %BtnCreate
@onready var _btn_vfs: Button = %BtnVfs
@onready var _mic_button: Button = %MicButton

# Settings View Nodes
@onready var _provider_option: OptionButton = %ProviderOption
@onready var _model_option: OptionButton = %ModelOption
@onready var _voice_option: OptionButton = %VoiceOption
@onready var _api_key_edit: LineEdit = %ApiKeyEdit
@onready var _show_key_btn: Button = %ShowKeyBtn
@onready var _paste_key_btn: Button = %PasteKeyBtn
@onready var _group_id_row: Control = %GroupIdRow
@onready var _group_id_edit: LineEdit = %GroupIdEdit
@onready var _test_voice_btn: Button = %TestVoiceBtn
@onready var _test_result_label: Label = %TestResultLabel
@onready var _save_config_btn: Button = %SaveConfigBtn
@onready var _close_settings_btn: Button = %CloseSettingsBtn

var _model_manager: LiveModelManagerScript
var _mic_active := true
var _eq_bars: Array[ColorRect] = []
var _time := 0.0
var _is_speaking := false


func _ready() -> void:
	theme = THEME
	_model_manager = LiveModelManagerScript.new()

	_setup_equalizer()
	_prevent_virtual_keyboard_hijack()
	_populate_settings_ui()
	_connect_signals()

	_update_model_badge()
	set_transcript([
		"Asistente listo. Modelo activo: %s." % _model_manager.get_badge_text(),
		"Voz configurada: %s. Reconocimiento de voz y supervisión activa." % _model_manager.voice_id,
	])


func _prevent_virtual_keyboard_hijack() -> void:
	if _api_key_edit != null:
		_api_key_edit.virtual_keyboard_enabled = false
	if _group_id_edit != null:
		_group_id_edit.virtual_keyboard_enabled = false


func _setup_equalizer() -> void:
	if _eq_container == null:
		return
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
	if not _mic_active and not _is_speaking:
		for bar in _eq_bars:
			bar.custom_minimum_size.y = 4
		return

	var speed := 12.0 if _is_speaking else 6.0
	var amp := 20.0 if _is_speaking else 14.0
	for i in range(_eq_bars.size()):
		var val := 4.0 + absf(sin(_time * speed + float(i) * 1.3)) * amp
		_eq_bars[i].custom_minimum_size.y = val


func _connect_signals() -> void:
	if _settings_toggle_btn != null:
		_settings_toggle_btn.pressed.connect(toggle_settings_view)
	if _model_badge != null:
		_model_badge.pressed.connect(toggle_settings_view)
	if _close_settings_btn != null:
		_close_settings_btn.pressed.connect(func() -> void: show_settings(false))

	if _btn_run != null:
		_btn_run.pressed.connect(func() -> void: run_wzed_requested.emit())
	if _btn_create != null:
		_btn_create.pressed.connect(func() -> void: create_module_requested.emit())
	if _btn_vfs != null:
		_btn_vfs.pressed.connect(func() -> void: list_vfs_requested.emit())
	if _mic_button != null:
		_mic_button.pressed.connect(_on_mic_pressed)

	# Quick speech chips
	if _quick_voice_1 != null:
		_quick_voice_1.pressed.connect(func() -> void: trigger_user_speech("MiniMax, corre index.js en wZed"))
	if _quick_voice_2 != null:
		_quick_voice_2.pressed.connect(func() -> void: trigger_user_speech("Abre el navegador web en localhost:5173"))
	if _quick_voice_3 != null:
		_quick_voice_3.pressed.connect(func() -> void: trigger_user_speech("Recentra el espacio de trabajo"))

	# Settings controls
	if _provider_option != null:
		_provider_option.item_selected.connect(_on_provider_selected)
	if _model_option != null:
		_model_option.item_selected.connect(_on_model_selected)
	if _voice_option != null:
		_voice_option.item_selected.connect(_on_voice_selected)
	if _show_key_btn != null:
		_show_key_btn.pressed.connect(_on_show_key_pressed)
	if _paste_key_btn != null:
		_paste_key_btn.pressed.connect(_on_paste_key_pressed)
	if _test_voice_btn != null:
		_test_voice_btn.pressed.connect(_on_test_voice_pressed)
	if _save_config_btn != null:
		_save_config_btn.pressed.connect(_on_save_config_pressed)


func _populate_settings_ui() -> void:
	if _provider_option == null:
		return
	_provider_option.clear()
	for p in [LiveModelManagerScript.Provider.MINIMAX, LiveModelManagerScript.Provider.OPENAI_REALTIME, LiveModelManagerScript.Provider.DEEPSEEK, LiveModelManagerScript.Provider.MOCK_LOCAL]:
		var label: String = LiveModelManagerScript.PROVIDER_NAMES.get(p, "Provider")
		_provider_option.add_item(label, p)

	_provider_option.select(_model_manager.current_provider)
	_refresh_models_and_voices()

	if _api_key_edit != null:
		_api_key_edit.text = _model_manager.api_key
	if _group_id_edit != null:
		_group_id_edit.text = _model_manager.group_id


func _refresh_models_and_voices() -> void:
	var provider_id: int = _provider_option.get_selected_id() if _provider_option != null else _model_manager.current_provider
	var models: Array = LiveModelManagerScript.AVAILABLE_MODELS.get(provider_id, [])
	var voices: Array = LiveModelManagerScript.VOICES.get(provider_id, [])

	if _model_option != null:
		_model_option.clear()
		for m in models:
			_model_option.add_item(m)
		var current_idx: int = models.find(_model_manager.current_model)
		_model_option.select(max(0, current_idx))

	if _voice_option != null:
		_voice_option.clear()
		for v in voices:
			_voice_option.add_item(v.get("name", "Voice"), voices.find(v))
		var selected_voice_idx := 0
		for i in range(voices.size()):
			if voices[i].get("id") == _model_manager.voice_id:
				selected_voice_idx = i
				break
		_voice_option.select(selected_voice_idx)

	if _group_id_row != null:
		_group_id_row.visible = provider_id == LiveModelManagerScript.Provider.MINIMAX


func _on_provider_selected(_index: int) -> void:
	var prov_id := _provider_option.get_selected_id() as LiveModelManagerScript.Provider
	_model_manager.current_provider = prov_id
	_model_manager.current_model = LiveModelManagerScript.DEFAULT_MODELS.get(prov_id, "")
	_refresh_models_and_voices()
	if _test_result_label != null:
		_test_result_label.text = "Proveedor cambiado a %s" % LiveModelManagerScript.PROVIDER_NAMES.get(prov_id)


func _on_model_selected(index: int) -> void:
	if _model_option != null:
		_model_manager.current_model = _model_option.get_item_text(index)


func _on_voice_selected(index: int) -> void:
	var provider_id: int = _provider_option.get_selected_id()
	var voices: Array = LiveModelManagerScript.VOICES.get(provider_id, [])
	if index >= 0 and index < voices.size():
		_model_manager.voice_id = voices[index].get("id", "default")


func _on_show_key_pressed() -> void:
	if _api_key_edit != null:
		_api_key_edit.secret = not _api_key_edit.secret
		if _show_key_btn != null:
			_show_key_btn.text = "🔒" if not _api_key_edit.secret else "👁"


func _on_paste_key_pressed() -> void:
	if _api_key_edit != null:
		var clip: String = DisplayServer.clipboard_get().strip_edges()
		if not clip.is_empty():
			_api_key_edit.text = clip
			if _test_result_label != null:
				_test_result_label.text = "API Key pegada desde el portapapeles."


func _on_save_config_pressed() -> void:
	if _api_key_edit != null:
		_model_manager.api_key = _api_key_edit.text.strip_edges()
	if _group_id_edit != null:
		_model_manager.group_id = _group_id_edit.text.strip_edges()
	if _model_option != null:
		_model_manager.current_model = _model_option.get_item_text(_model_option.selected)

	var ok: bool = _model_manager.save_config()
	_update_model_badge()
	if _test_result_label != null:
		_test_result_label.text = "✅ Guardado en %s" % LiveModelManagerScript.CONFIG_PATH if ok else "❌ Error al guardar"
	append_log("Configuración guardada: %s" % _model_manager.get_badge_text())
	model_configured.emit(
		LiveModelManagerScript.PROVIDER_NAMES.get(_model_manager.current_provider, ""),
		_model_manager.current_model,
		_model_manager.voice_id
	)


func _on_test_voice_pressed() -> void:
	if _test_result_label != null:
		_test_result_label.text = "🔊 Probando voz %s con %s..." % [_model_manager.voice_id, _model_manager.current_model]
	simulate_agent_speech("Hola. Soy Jarvis configurado con %s y la voz %s en tu PICO 4 Ultra." % [
		_model_manager.current_model,
		_model_manager.voice_id,
	])


func _update_model_badge() -> void:
	if _model_badge != null:
		_model_badge.text = "⚡ %s" % _model_manager.get_badge_text()


func toggle_settings_view() -> void:
	show_settings(_transcript_view.visible)


func show_settings(show: bool) -> void:
	if _transcript_view != null:
		_transcript_view.visible = not show
	if _settings_view != null:
		_settings_view.visible = show
	if _settings_toggle_btn != null:
		_settings_toggle_btn.text = "◀" if show else "⚙️"


func _on_mic_pressed() -> void:
	_mic_active = not _mic_active
	if _mic_button != null:
		_mic_button.text = "🎤 Micrófono activo (Click para pausar)" if _mic_active else "🔇 Micrófono pausado (Click para activar)"
		_mic_button.modulate = Color.WHITE if _mic_active else Color(0.7, 0.7, 0.7)
	mic_toggled.emit(_mic_active)


## Triggers a user speech turn, routes it through LiveModelManager and emits appropriate signals.
func trigger_user_speech(utterance: String) -> void:
	append_log("[color=#38bdf8]Tú:[/color] %s" % utterance)
	voice_command_submitted.emit(utterance)

	var turn_data: Dictionary = _model_manager.process_user_turn(utterance)
	var response: String = turn_data.get("response", "")
	var tool_name: String = turn_data.get("tool_name", "")
	var tool_arg: String = turn_data.get("tool_arg", "")

	simulate_agent_speech(response)

	if not tool_name.is_empty():
		match tool_name:
			"run_wzed":
				run_wzed_requested.emit()
			"open_browser":
				open_browser_requested.emit(tool_arg)
			"recenter":
				recenter_requested.emit()
			"reset_layout":
				recenter_requested.emit()


## Simulates the agent speaking state, pulsating the equalizer and updating logs.
func simulate_agent_speech(speech_text: String) -> void:
	_is_speaking = true
	append_log("[color=#34d399]%s:[/color] %s" % [_model_manager.voice_id.to_upper(), speech_text])

	var duration: float = clampf(float(speech_text.length()) * 0.05, 1.5, 4.0)
	get_tree().create_timer(duration).timeout.connect(func() -> void:
		_is_speaking = false
	)


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


func get_model_manager() -> LiveModelManagerScript:
	return _model_manager
