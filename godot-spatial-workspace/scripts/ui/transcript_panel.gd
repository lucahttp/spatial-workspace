class_name TranscriptPanel2D
extends Control
## 2D UI for Voice & Agent Reasoning transcript, GPT-Live orchestrator, and
## MiniMax Bare LLM delegation.
##
## Implements the OpenAI Realtime Agents pattern:
## (HeyBuddy or Start Button) -> (GPT-Live) -> (MiniMax Bare LLM / Downstream Agents) -> (Spatial Workspace)

signal run_wzed_requested()
signal create_module_requested()
signal list_vfs_requested()
signal open_browser_requested(url: String)
signal recenter_requested()
signal mic_toggled(active: bool)
signal voice_command_submitted(utterance: String)
signal model_configured(provider_name: String, model_name: String, voice_id: String)
signal orb_state_changed(orb_state: int)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")
const LiveModelManagerScript := preload("res://scripts/ai/live_model_manager.gd")
const RealtimeOrchestratorScript := preload("res://scripts/ai/realtime_agent_orchestrator.gd")

# Header Nodes
@onready var _orb_state_label: Label = %OrbStateLabel
@onready var _model_badge: Button = %ModelBadge
@onready var _eq_container: HBoxContainer = %EqualizerRow
@onready var _settings_toggle_btn: Button = %SettingsToggleBtn

# Trigger Bar Nodes
@onready var _start_button: Button = %StartButton
@onready var _pipeline_breadcrumb: Label = %PipelineBreadcrumb
@onready var _wake_word_toggle: Button = %WakeWordToggle

# View Stack
@onready var _transcript_view: Control = %TranscriptView
@onready var _settings_view: Control = %SettingsView

# Transcript View Nodes
@onready var _transcript_label: RichTextLabel = %TranscriptText
@onready var _quick_voice_1: Button = %QuickVoice1
@onready var _quick_voice_2: Button = %QuickVoice2
@onready var _quick_voice_3: Button = %QuickVoice3
@onready var _quick_voice_4: Button = %QuickVoice4
@onready var _btn_run: Button = %BtnRun
@onready var _btn_create: Button = %BtnCreate
@onready var _btn_vfs: Button = %BtnVfs
@onready var _btn_browser: Button = %BtnBrowser

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
@onready var _load_secrets_btn: Button = %LoadSecretsBtn
@onready var _close_settings_btn: Button = %CloseSettingsBtn

var _model_manager: LiveModelManagerScript
var _orchestrator: RealtimeOrchestratorScript
var _mic_active := true
var _eq_bars: Array[ColorRect] = []
var _time := 0.0
var _is_speaking := false


func _ready() -> void:
	theme = THEME
	_model_manager = LiveModelManagerScript.new()
	_orchestrator = RealtimeOrchestratorScript.new(_model_manager)

	_setup_equalizer()
	_prevent_virtual_keyboard_hijack()
	_populate_settings_ui()
	_connect_signals()
	_connect_orchestrator()

	_update_model_badge()
	set_transcript([
		"● GPT-Live activo con orquestación Swarm.",
		"● Wake Word: \"Hey Buddy\" o presiona el botón rojo para hablar.",
		"● Tareas pesadas se delegan dinámicamente a MiniMax (m3.1-flash).",
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

	# Start Button & Wake Word
	if _start_button != null:
		_start_button.pressed.connect(_on_start_button_pressed)
	if _wake_word_toggle != null:
		_wake_word_toggle.toggled.connect(func(active: bool) -> void:
			_orchestrator.wake_word_enabled = active
			_wake_word_toggle.text = "🎙️ Wake Word" if active else "🔇 Wake Off"
		)

	# Quick speech chips
	if _quick_voice_1 != null:
		_quick_voice_1.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Hey Buddy, crea una tarjeta 3D con MiniMax")
		)
	if _quick_voice_2 != null:
		_quick_voice_2.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Hey Buddy, corre wZed")
		)
	if _quick_voice_3 != null:
		_quick_voice_3.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Abre el navegador web en localhost:5173")
		)
	if _quick_voice_4 != null:
		_quick_voice_4.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Recentra el espacio de trabajo")
		)

	# Action pills
	if _btn_run != null:
		_btn_run.pressed.connect(func() -> void: run_wzed_requested.emit())
	if _btn_create != null:
		_btn_create.pressed.connect(func() -> void: create_module_requested.emit())
	if _btn_vfs != null:
		_btn_vfs.pressed.connect(func() -> void: list_vfs_requested.emit())
	if _btn_browser != null:
		_btn_browser.pressed.connect(func() -> void: open_browser_requested.emit("http://localhost:5173/preview"))

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
	if _load_secrets_btn != null:
		_load_secrets_btn.pressed.connect(_on_load_secrets_pressed)


func _connect_orchestrator() -> void:
	if _orchestrator == null:
		return
	_orchestrator.message_logged.connect(_on_orchestrator_message_logged)
	_orchestrator.state_changed.connect(_on_orchestrator_state_changed)
	_orchestrator.workspace_action_requested.connect(_on_workspace_action_requested)
	_orchestrator.orb_state_requested.connect(func(st: int) -> void: orb_state_changed.emit(st))


func _on_start_button_pressed() -> void:
	_orchestrator.trigger_start_button()


func _on_orchestrator_state_changed(state_id: int, state_name: String) -> void:
	if _orb_state_label != null:
		_orb_state_label.text = "ESTADO: %s" % state_name.to_upper()

	if _start_button != null:
		match state_id:
			RealtimeOrchestratorScript.State.LISTENING:
				_start_button.text = "🟢 ESCUCHANDO..."
				_start_button.modulate = Color(0.2, 1.0, 0.4)
			RealtimeOrchestratorScript.State.DELEGATING, RealtimeOrchestratorScript.State.EXPERT_EXECUTING:
				_start_button.text = "⚡ DELEGANDO A MINIMAX..."
				_start_button.modulate = Color(0.9, 0.6, 1.0)
			RealtimeOrchestratorScript.State.SPEAKING:
				_start_button.text = "🔊 GPT-LIVE HABLANDO..."
				_start_button.modulate = Color(0.3, 0.8, 1.0)
			_:
				_start_button.text = "🔴 HEY BUDDY / INICIAR"
				_start_button.modulate = Color.WHITE

	if _pipeline_breadcrumb != null:
		match state_id:
			RealtimeOrchestratorScript.State.LISTENING:
				_pipeline_breadcrumb.text = "[🎙️ Hey Buddy ACTIVO] ➔ GPT-Live ➔ MiniMax ➔ Workspace"
			RealtimeOrchestratorScript.State.GPT_LIVE_THINKING, RealtimeOrchestratorScript.State.DELEGATING:
				_pipeline_breadcrumb.text = "Hey Buddy ➔ [⚡ GPT-Live DELEGANDO] ➔ MiniMax ➔ Workspace"
			RealtimeOrchestratorScript.State.EXPERT_EXECUTING:
				_pipeline_breadcrumb.text = "Hey Buddy ➔ GPT-Live ➔ [🤖 MiniMax EJECUTANDO] ➔ Workspace"
			RealtimeOrchestratorScript.State.SPEAKING:
				_pipeline_breadcrumb.text = "Hey Buddy ➔ [🔊 GPT-Live RESOLVIENDO] ➔ [🌐 Workspace ACTUALIZADO]"
			_:
				_pipeline_breadcrumb.text = "Hey Buddy ➔ GPT-Live ➔ MiniMax ➔ Workspace"


func _on_orchestrator_message_logged(speaker: String, text: String, color_hex: String) -> void:
	append_log("[color=%s][%s][/color] %s" % [color_hex, speaker, text])
	if speaker == "GPT-LIVE" and text.begins_with("🔊"):
		_is_speaking = true
		var duration: float = clampf(float(text.length()) * 0.05, 1.5, 4.0)
		get_tree().create_timer(duration).timeout.connect(func() -> void:
			_is_speaking = false
		)


func _on_workspace_action_requested(action_name: String, params: Dictionary) -> void:
	match action_name:
		"run_wzed":
			run_wzed_requested.emit()
		"open_browser":
			var url: String = params.get("url", "http://localhost:5173/preview")
			open_browser_requested.emit(url)
		"recenter":
			recenter_requested.emit()
		"reset_layout":
			recenter_requested.emit()


# --- Settings UI Handlers ----------------------------------------------------

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


var _model_http: HTTPRequest = null


func _refresh_models_and_voices() -> void:
	var provider_id: int = _provider_option.get_selected_id() if _provider_option != null else _model_manager.current_provider
	var models: Array = _model_manager.get_models_for_provider(provider_id)
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

	_fetch_dynamic_models_if_possible(provider_id)


func _fetch_dynamic_models_if_possible(provider_id: int) -> void:
	if _model_http == null:
		_model_http = HTTPRequest.new()
		add_child(_model_http)
		_model_http.request_completed.connect(_on_models_request_completed)

	if _model_http.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED:
		return

	var req_info: Dictionary = _model_manager.get_models_endpoint_and_headers(provider_id)
	var url: String = req_info.get("url", "")
	var headers: PackedStringArray = req_info.get("headers", PackedStringArray())
	if not url.is_empty():
		_model_http.request(url, headers, HTTPClient.METHOD_GET)


func _on_models_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json_str := body.get_string_from_utf8()
		var provider_id: int = _model_manager.current_provider
		var fetched: Array = _model_manager.parse_and_store_models_response(provider_id, json_str)
		if fetched.size() > 0:
			if _model_option != null:
				_model_option.clear()
				for m in fetched:
					_model_option.add_item(m)
				var current_idx: int = fetched.find(_model_manager.current_model)
				_model_option.select(max(0, current_idx))
			if _test_result_label != null:
				_test_result_label.text = "Modelos remotos: %d disponibles" % fetched.size()


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


func _on_load_secrets_pressed() -> void:
	var result: Dictionary = _model_manager.scan_and_import_secrets()
	if result.get("success", false):
		_populate_settings_ui()
		_update_model_badge()
		if _test_result_label != null:
			_test_result_label.text = "✅ " + str(result.get("message", ""))
		append_log("Secretos importados: %s" % str(result.get("message", "")))
	else:
		if _test_result_label != null:
			_test_result_label.text = "⚠️ " + str(result.get("message", ""))


func _on_test_voice_pressed() -> void:
	if _test_result_label != null:
		_test_result_label.text = "🔊 Probando voz %s..." % _model_manager.voice_id
	_orchestrator.submit_user_utterance("Prueba de voz en el orbe espacial")


func _update_model_badge() -> void:
	if _model_badge != null:
		_model_badge.text = "● GPT-LIVE + %s SWARM" % _model_manager.get_badge_text().to_upper()


func toggle_settings_view() -> void:
	show_settings(_transcript_view.visible)


func show_settings(show: bool) -> void:
	if _transcript_view != null:
		_transcript_view.visible = not show
	if _settings_view != null:
		_settings_view.visible = show
	if _settings_toggle_btn != null:
		_settings_toggle_btn.text = "◀" if show else "⚙️"


func set_transcript(lines: Array) -> void:
	if _transcript_label == null:
		return
	_transcript_label.clear()
	for line in lines:
		_transcript_label.append_text("• %s\n" % str(line))


func append_log(text: String) -> void:
	if _transcript_label != null:
		_transcript_label.append_text("  %s\n" % text)


func get_orchestrator() -> RealtimeOrchestratorScript:
	return _orchestrator
