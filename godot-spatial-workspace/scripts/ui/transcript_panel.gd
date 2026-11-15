class_name TranscriptPanel2D
extends Control
## 2D UI for Voice & Agent Reasoning transcript, GPT-Live orchestrator, and
## MiniMax Bare LLM delegation.
##
## Implements direct XR model cycling, hardware microphone capture via
## AudioCaptureService, and organic reactive feedback matching the Thinking Orb.

signal run_wzed_requested()
signal create_module_requested()
signal list_vfs_requested()
signal open_browser_requested(url: String)
signal recenter_requested()
signal mic_toggled(active: bool)
signal voice_command_submitted(utterance: String)
signal model_configured(provider_name: String, model_name: String, voice_id: String)
signal orb_state_changed(orb_state: int)
signal mic_volume_meter_updated(volume: float)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")
const LiveModelManagerScript := preload("res://scripts/ai/live_model_manager.gd")
const RealtimeOrchestratorScript := preload("res://scripts/ai/realtime_agent_orchestrator.gd")
const AudioCaptureServiceScript := preload("res://scripts/audio/audio_capture_service.gd")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

# Header Nodes
@onready var _orb_state_label: Label = %OrbStateLabel
@onready var _model_badge: Button = %ModelBadge
@onready var _eq_container: HBoxContainer = %EqualizerRow
@onready var _settings_toggle_btn: Button = %SettingsToggleBtn

# Direct Model Selector Bar
@onready var _provider_cycle_btn: Button = %ProviderCycleBtn
@onready var _model_prev_btn: Button = %ModelPrevBtn
@onready var _model_direct_label: Button = %ModelDirectLabel
@onready var _model_next_btn: Button = %ModelNextBtn
@onready var _voice_mic_btn: Button = %VoiceMicBtn

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
@onready var _prov_minimax_btn: Button = %ProvMiniMaxBtn
@onready var _prov_azure_btn: Button = %ProvAzureBtn
@onready var _prov_openai_btn: Button = %ProvOpenAIBtn
@onready var _prov_local_btn: Button = %ProvLocalBtn
@onready var _refresh_models_btn: Button = %RefreshModelsBtn
@onready var _model_chips_container: HBoxContainer = %ModelChipsContainer
@onready var _custom_model_edit: LineEdit = %CustomModelEdit
@onready var _apply_model_btn: Button = %ApplyModelBtn

@onready var _voice_moss_btn: Button = %VoiceMossBtn
@onready var _voice_qingse_btn: Button = %VoiceQingseBtn
@onready var _voice_tianmei_btn: Button = %VoiceTianmeiBtn
@onready var _voice_alloy_btn: Button = %VoiceAlloyBtn

@onready var _api_key_edit: LineEdit = %ApiKeyEdit
@onready var _show_key_btn: Button = %ShowKeyBtn
@onready var _paste_key_btn: Button = %PasteKeyBtn
@onready var _test_voice_btn: Button = %TestVoiceBtn
@onready var _test_result_label: Label = %TestResultLabel
@onready var _save_config_btn: Button = %SaveConfigBtn
@onready var _load_secrets_btn: Button = %LoadSecretsBtn
@onready var _close_settings_btn: Button = %CloseSettingsBtn

var _model_manager: LiveModelManagerScript
var _orchestrator: RealtimeOrchestratorScript
var _audio_capture: AudioCaptureServiceScript
var _mic_active := true
var _eq_bars: Array[ColorRect] = []
var _time := 0.0
var _is_speaking := false
var _current_mic_volume := 0.0
var _model_http: HTTPRequest


func _ready() -> void:
	theme = THEME
	_model_manager = LiveModelManagerScript.new()
	_orchestrator = RealtimeOrchestratorScript.new(_model_manager)

	_setup_audio_capture()
	_setup_http()
	_setup_equalizer()
	_prevent_virtual_keyboard_hijack()
	_connect_signals()
	_connect_orchestrator()
	_refresh_all_ui()
	_fetch_remote_models(_model_manager.current_provider)

	set_transcript([
		"● GPT-Live activo en el Orbe con orquestación Swarm.",
		"● Micrófono y VAD de hardware activos: habla para interactuar.",
		"● Selector directo XR: usa [◀] y [▶] para cambiar modelos al instante.",
		"● Tareas pesadas se delegan dinámicamente a MiniMax (m3.1-flash).",
	])


func _setup_audio_capture() -> void:
	_audio_capture = AudioCaptureServiceScript.new()
	add_child(_audio_capture)
	_audio_capture.volume_meter_updated.connect(_on_mic_volume_updated)
	_audio_capture.speech_detected.connect(_on_speech_detected)
	_audio_capture.speech_finished.connect(_on_speech_finished)


func _setup_http() -> void:
	_model_http = HTTPRequest.new()
	_model_http.timeout = 5.0
	add_child(_model_http)
	_model_http.request_completed.connect(_on_models_request_completed)


func _setup_equalizer() -> void:
	if _eq_container == null:
		return
	for child in _eq_container.get_children():
		child.queue_free()
	_eq_bars.clear()
	for i in range(5):
		var bar := ColorRect.new()
		bar.custom_minimum_size = Vector2(4, 6)
		bar.color = Color(0.22, 0.74, 0.98) # Cyan accent
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		_eq_container.add_child(bar)
		_eq_bars.append(bar)


func _prevent_virtual_keyboard_hijack() -> void:
	if _api_key_edit != null:
		_api_key_edit.virtual_keyboard_enabled = false
	if _custom_model_edit != null:
		_custom_model_edit.virtual_keyboard_enabled = false


func _process(delta: float) -> void:
	_time += delta
	var target_volume := _current_mic_volume if _mic_active else 0.0
	var speed := 14.0 if _is_speaking else 8.0

	for i in range(_eq_bars.size()):
		var harmonic := absf(sin(_time * speed + float(i) * 1.2))
		var height := 4.0 + (target_volume * 22.0) + (harmonic * 6.0 if _is_speaking else 0.0)
		_eq_bars[i].custom_minimum_size.y = clampf(height, 4.0, 26.0)
		if target_volume > 0.05 or _is_speaking:
			_eq_bars[i].color = Color(0.12, 0.94, 0.58) # Active cyber green
		else:
			_eq_bars[i].color = Color(0.22, 0.74, 0.98) # Idle cyan


func _on_mic_volume_updated(volume: float) -> void:
	_current_mic_volume = volume
	mic_volume_meter_updated.emit(volume)


func _on_speech_detected() -> void:
	if not _mic_active:
		return
	if _orchestrator.state == _orchestrator.State.IDLE:
		_orchestrator.trigger_wake_word("Voz detectada en hardware")
		SpatialAudioScript.play_listening_start(get_tree())


func _on_speech_finished() -> void:
	if not _mic_active:
		return
	if _orchestrator.state == _orchestrator.State.LISTENING:
		_orchestrator.submit_user_utterance("Comando por voz capturado en el espacio")


func _connect_signals() -> void:
	if _settings_toggle_btn != null:
		_settings_toggle_btn.pressed.connect(toggle_settings_view)
	if _model_badge != null:
		_model_badge.pressed.connect(toggle_settings_view)
	if _model_direct_label != null:
		_model_direct_label.pressed.connect(toggle_settings_view)
	if _close_settings_btn != null:
		_close_settings_btn.pressed.connect(func() -> void: show_settings(false))

	# Direct Model & Provider Cycling Buttons
	if _model_prev_btn != null:
		_model_prev_btn.pressed.connect(func() -> void: _cycle_model(false))
	if _model_next_btn != null:
		_model_next_btn.pressed.connect(func() -> void: _cycle_model(true))
	if _provider_cycle_btn != null:
		_provider_cycle_btn.pressed.connect(func() -> void: _cycle_provider(true))

	if _voice_mic_btn != null:
		_voice_mic_btn.toggled.connect(func(active: bool) -> void:
			_mic_active = active
			if _audio_capture != null:
				_audio_capture.set_active(active)
			_voice_mic_btn.text = "🎙️ Mic VAD" if active else "🔇 Mic Off"
		)

	# Start Button
	if _start_button != null:
		_start_button.pressed.connect(func() -> void:
			SpatialAudioScript.play_click(get_tree())
			_orchestrator.trigger_start_button()
		)

	# Quick speech shortcuts
	if _quick_voice_1 != null:
		_quick_voice_1.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Hey Buddy, crea tarjeta 3D con MiniMax")
		)
	if _quick_voice_2 != null:
		_quick_voice_2.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Hey Buddy, corre wZed")
		)
	if _quick_voice_3 != null:
		_quick_voice_3.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Hey Buddy, busca cómo compilar WebXR en Godot")
		)
	if _quick_voice_4 != null:
		_quick_voice_4.pressed.connect(func() -> void:
			_orchestrator.submit_user_utterance("Recentra el espacio")
		)

	# Action Pills
	if _btn_run != null:
		_btn_run.pressed.connect(func() -> void: run_wzed_requested.emit())
	if _btn_create != null:
		_btn_create.pressed.connect(func() -> void: create_module_requested.emit())
	if _btn_vfs != null:
		_btn_vfs.pressed.connect(func() -> void: list_vfs_requested.emit())
	if _btn_browser != null:
		_btn_browser.pressed.connect(func() -> void: open_browser_requested.emit("http://localhost:5173/preview"))

	# Provider Chips in Settings
	if _prov_minimax_btn != null:
		_prov_minimax_btn.pressed.connect(func() -> void: _select_provider(_model_manager.Provider.MINIMAX))
	if _prov_azure_btn != null:
		_prov_azure_btn.pressed.connect(func() -> void: _select_provider(_model_manager.Provider.OPENAI_REALTIME))
	if _prov_openai_btn != null:
		_prov_openai_btn.pressed.connect(func() -> void: _select_provider(_model_manager.Provider.OPENAI_REALTIME))
	if _prov_local_btn != null:
		_prov_local_btn.pressed.connect(func() -> void: _select_provider(_model_manager.Provider.MOCK_LOCAL))

	# Voice Chips
	if _voice_moss_btn != null:
		_voice_moss_btn.pressed.connect(func() -> void: _select_voice("moss_audio", "MOSS (Jarvis)"))
	if _voice_qingse_btn != null:
		_voice_qingse_btn.pressed.connect(func() -> void: _select_voice("male-qn-qingse", "Qingse (Joven)"))
	if _voice_tianmei_btn != null:
		_voice_tianmei_btn.pressed.connect(func() -> void: _select_voice("female-tianmei", "Tianmei (Asistente)"))
	if _voice_alloy_btn != null:
		_voice_alloy_btn.pressed.connect(func() -> void: _select_voice("alloy", "Alloy (Natural)"))

	# Settings buttons & custom models
	if _refresh_models_btn != null:
		_refresh_models_btn.pressed.connect(func() -> void:
			SpatialAudioScript.play_click(get_tree())
			_fetch_remote_models(_model_manager.current_provider)
		)
	if _apply_model_btn != null:
		_apply_model_btn.pressed.connect(_on_apply_custom_model)
	if _custom_model_edit != null:
		_custom_model_edit.text_submitted.connect(func(_t: String) -> void: _on_apply_custom_model())

	if _show_key_btn != null:
		_show_key_btn.pressed.connect(_on_show_key_pressed)
	if _paste_key_btn != null:
		_paste_key_btn.pressed.connect(_on_paste_key_pressed)
	if _save_config_btn != null:
		_save_config_btn.pressed.connect(_on_save_config_pressed)
	if _load_secrets_btn != null:
		_load_secrets_btn.pressed.connect(_on_load_secrets_pressed)
	if _test_voice_btn != null:
		_test_voice_btn.pressed.connect(_on_test_voice_pressed)


func _connect_orchestrator() -> void:
	if _orchestrator == null:
		return
	_orchestrator.state_changed.connect(_on_orchestrator_state_changed)
	_orchestrator.message_logged.connect(_on_message_logged)
	_orchestrator.orb_state_requested.connect(func(orb_state: int) -> void: orb_state_changed.emit(orb_state))


func _cycle_model(forward: bool) -> void:
	SpatialAudioScript.play_click(get_tree())
	var new_model := _model_manager.cycle_model(forward)
	_refresh_all_ui()
	append_log("⚡ Modelo cambiado a: %s" % new_model)
	if _test_result_label != null:
		_test_result_label.text = "Modelo: %s" % new_model


func _cycle_provider(forward: bool) -> void:
	SpatialAudioScript.play_click(get_tree())
	var prov_id := _model_manager.cycle_provider(forward)
	_refresh_all_ui()
	_fetch_remote_models(prov_id)
	append_log("🌐 Proveedor cambiado a: %s (%s)" % [
		_model_manager.PROVIDER_NAMES.get(prov_id, ""),
		_model_manager.current_model
	])


func _select_provider(prov_id: int) -> void:
	SpatialAudioScript.play_click(get_tree())
	_model_manager.set_provider(prov_id as LiveModelManagerScript.Provider)
	_refresh_all_ui()
	_fetch_remote_models(prov_id)
	append_log("Proveedor activo: %s" % _model_manager.PROVIDER_NAMES.get(prov_id, ""))


func _select_model(model_name: String) -> void:
	SpatialAudioScript.play_click(get_tree())
	_model_manager.current_model = model_name
	_model_manager.save_config()
	_refresh_all_ui()
	append_log("Modelo seleccionado: %s" % model_name)


func _select_voice(voice_id: String, voice_name: String) -> void:
	SpatialAudioScript.play_click(get_tree())
	_model_manager.voice_id = voice_id
	_model_manager.save_config()
	if _test_result_label != null:
		_test_result_label.text = "Voz: %s" % voice_name


func _refresh_all_ui() -> void:
	var prov_id: int = _model_manager.current_provider
	var prov_name: String = _model_manager.PROVIDER_NAMES.get(prov_id, "MiniMax")
	var active_model: String = _model_manager.current_model

	# Header badge
	if _model_badge != null:
		_model_badge.text = "● GPT-LIVE + %s (%s)" % [prov_name.to_upper(), active_model.to_upper()]

	# Selector bar
	if _provider_cycle_btn != null:
		_provider_cycle_btn.text = "🌐 %s" % prov_name.split(" ")[0]
	if _model_direct_label != null:
		_model_direct_label.text = "⚡ %s" % active_model

	# Provider buttons highlight
	if _prov_minimax_btn != null:
		_prov_minimax_btn.modulate = Color(1.2, 1.2, 1.2) if prov_id == 0 else Color(0.7, 0.7, 0.7)
	if _prov_azure_btn != null:
		_prov_azure_btn.modulate = Color(1.2, 1.2, 1.2) if prov_id == 1 and not _model_manager.azure_resources.is_empty() else Color(0.7, 0.7, 0.7)
	if _prov_openai_btn != null:
		_prov_openai_btn.modulate = Color(1.2, 1.2, 1.2) if prov_id == 1 and _model_manager.azure_resources.is_empty() else Color(0.7, 0.7, 0.7)
	if _prov_local_btn != null:
		_prov_local_btn.modulate = Color(1.2, 1.2, 1.2) if prov_id == 3 else Color(0.7, 0.7, 0.7)

	# API Key field
	if _api_key_edit != null and not _model_manager.api_key.is_empty():
		_api_key_edit.text = _model_manager.api_key

	_rebuild_model_chips()


func _rebuild_model_chips() -> void:
	if _model_chips_container == null:
		return
	for child in _model_chips_container.get_children():
		child.queue_free()

	var models := _model_manager.get_models_for_provider(_model_manager.current_provider)
	for m in models:
		var btn := Button.new()
		btn.text = str(m)
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		if str(m) == _model_manager.current_model:
			btn.text = "⚡ " + str(m)
			btn.modulate = Color(0.2, 1.0, 0.8) # Active highlight
		btn.pressed.connect(func() -> void: _select_model(str(m)))
		_model_chips_container.add_child(btn)


func _on_apply_custom_model() -> void:
	if _custom_model_edit == null:
		return
	var text: String = _custom_model_edit.text.strip_edges()
	if text.is_empty():
		return
	SpatialAudioScript.play_click(get_tree())
	_model_manager.set_custom_model(text)
	_custom_model_edit.text = ""
	_refresh_all_ui()
	append_log("⚡ Modelo personalizado configurado: %s" % text)
	if _test_result_label != null:
		_test_result_label.text = "Modelo activo: %s" % text


func _fetch_remote_models(provider_id: int) -> void:
	if _model_http == null:
		return
	var req_info: Dictionary = _model_manager.get_models_endpoint_and_headers(provider_id)
	var url: String = req_info.get("url", "")
	var headers: PackedStringArray = req_info.get("headers", PackedStringArray())
	if url.is_empty():
		return
	if provider_id != _model_manager.Provider.MOCK_LOCAL and _model_manager.api_key.is_empty() and _model_manager.custom_endpoint.is_empty():
		return
	_model_http.cancel_request()
	_model_http.request(url, headers, HTTPClient.METHOD_GET)
	if _test_result_label != null:
		_test_result_label.text = "Consultando modelos en API..."


func _on_models_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if result == HTTPRequest.RESULT_SUCCESS and response_code == 200:
		var json_str := body.get_string_from_utf8()
		var provider_id: int = _model_manager.current_provider
		var fetched: Array = _model_manager.parse_and_store_models_response(provider_id, json_str)
		if fetched.size() > 0:
			if not fetched.has(_model_manager.current_model):
				if fetched.has("m3.1-flash"):
					_model_manager.current_model = "m3.1-flash"
				elif fetched.has("gpt-4o-realtime-preview"):
					_model_manager.current_model = "gpt-4o-realtime-preview"
				else:
					_model_manager.current_model = str(fetched[0])
				_model_manager.save_config()
			_refresh_all_ui()
			if _test_result_label != null:
				_test_result_label.text = "Modelos remotos: %d disponibles" % fetched.size()
			append_log("📡 Lista de modelos actualizada desde el proveedor (%d modelos)" % fetched.size())
	else:
		if _test_result_label != null and _model_manager.current_provider != _model_manager.Provider.MOCK_LOCAL:
			_test_result_label.text = "Modo offline / modelos guardados en caché."


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
	var ok: bool = _model_manager.save_config()
	_refresh_all_ui()
	_fetch_remote_models(_model_manager.current_provider)
	if _test_result_label != null:
		_test_result_label.text = "✅ Guardado en %s" % LiveModelManagerScript.CONFIG_PATH if ok else "❌ Error al guardar"
	append_log("Configuración guardada: %s (%s)" % [_model_manager.get_badge_text(), _model_manager.current_model])


func _on_load_secrets_pressed() -> void:
	var result: Dictionary = _model_manager.scan_and_import_secrets()
	if result.get("success", false):
		_refresh_all_ui()
		_fetch_remote_models(_model_manager.current_provider)
		if _test_result_label != null:
			_test_result_label.text = "✅ " + str(result.get("message", ""))
		append_log("Secretos importados: %s" % str(result.get("message", "")))
	else:
		if _test_result_label != null:
			_test_result_label.text = "⚠️ " + str(result.get("message", ""))


func _on_test_voice_pressed() -> void:
	SpatialAudioScript.play_voice_response(get_tree())
	if _test_result_label != null:
		_test_result_label.text = "🔊 Probando voz %s..." % _model_manager.voice_id
	_orchestrator.submit_user_utterance("Prueba de voz en el orbe espacial")


func _on_orchestrator_state_changed(_new_state: int, state_name: String) -> void:
	if _orb_state_label != null:
		_orb_state_label.text = "ESTADO: %s" % state_name.to_upper()
	_is_speaking = _new_state == _orchestrator.State.SPEAKING
	if _start_button != null:
		match _new_state:
			_orchestrator.State.IDLE:
				_start_button.text = "🔴 HEY BUDDY / INICIAR"
				_start_button.modulate = Color(1.0, 1.0, 1.0)
			_orchestrator.State.LISTENING:
				_start_button.text = "🎙️ ESCUCHANDO..."
				_start_button.modulate = Color(0.2, 1.0, 0.6)
			_orchestrator.State.GPT_LIVE_THINKING:
				_start_button.text = "🧠 GPT-LIVE PENSANDO..."
				_start_button.modulate = Color(0.8, 0.4, 1.0)
			_orchestrator.State.DELEGATING:
				_start_button.text = "⚡ DELEGANDO A MINIMAX..."
				_start_button.modulate = Color(1.0, 0.8, 0.2)
			_orchestrator.State.EXPERT_EXECUTING:
				_start_button.text = "⚙️ MINIMAX EJECUTANDO..."
				_start_button.modulate = Color(0.9, 0.6, 0.2)
			_orchestrator.State.SPEAKING:
				_start_button.text = "🔊 GPT-LIVE HABLANDO..."
				_start_button.modulate = Color(0.2, 0.9, 1.0)


func _on_message_logged(speaker: String, text: String, color_hex: String) -> void:
	if _transcript_label == null:
		return
	var time := Time.get_time_string_from_system()
	_transcript_label.append_text("[color=#64748b][%s][/color] [color=%s][b]%s:[/b][/color] %s\n" % [time, color_hex, speaker, text])


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
