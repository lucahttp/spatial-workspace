class_name LiveModelManager
extends RefCounted
## Manages Live Agent / GPT Live model configuration and speech orchestration.
## Supports MiniMax (m3.1-flash / MiniMax-Text-01), OpenAI Realtime, and DeepSeek Harness.
##
## Configuration is persisted in user://live_model_config.json.
## Supports easy secrets loading from /sdcard/spatial_workspace_secrets.json,
## res://secrets.json, and OS environment variables.

signal config_changed()
signal agent_speaking_started(text: String)
signal agent_speaking_finished()
signal tool_executed(tool_name: String, result: String)
signal models_fetched(provider_id: int, model_names: Array)

const CONFIG_PATH := "user://live_model_config.json"

const EXTERNAL_CANDIDATE_PATHS := [
	"user://live_model_config.json",
	"/sdcard/spatial_workspace_secrets.json",
	"/sdcard/Download/spatial_secrets.json",
	"/sdcard/Download/spatial_workspace_secrets.json",
	"res://secrets.json",
]

enum Provider {
	MINIMAX,
	OPENAI_REALTIME,
	DEEPSEEK,
	MOCK_LOCAL,
}

const PROVIDER_NAMES: Dictionary = {
	Provider.MINIMAX: "MiniMax Realtime",
	Provider.OPENAI_REALTIME: "OpenAI GPT-4o Live",
	Provider.DEEPSEEK: "DeepSeek Reasoning",
	Provider.MOCK_LOCAL: "Modo Local / Simulado",
}

const DEFAULT_MODELS: Dictionary = {
	Provider.MINIMAX: "m3.1-flash",
	Provider.OPENAI_REALTIME: "gpt-4o-realtime-preview",
	Provider.DEEPSEEK: "deepseek-chat",
	Provider.MOCK_LOCAL: "mock-voice-agent",
}

const AVAILABLE_MODELS: Dictionary = {
	Provider.MINIMAX: ["m3.1-flash", "MiniMax-M3.1-Flash", "MiniMax-Text-01"],
	Provider.OPENAI_REALTIME: ["gpt-4o-realtime-preview", "gpt-4o-mini-realtime-preview"],
	Provider.DEEPSEEK: ["deepseek-chat", "deepseek-reasoner"],
	Provider.MOCK_LOCAL: ["mock-voice-agent", "jarvis-offline"],
}

const VOICES: Dictionary = {
	Provider.MINIMAX: [
		{"id": "moss_audio", "name": "MOSS (Jarvis Calmo / Intelectual)"},
		{"id": "male-qn-qingse", "name": "Qingse (Masculino Juvenil / Dinámico)"},
		{"id": "female-tianmei", "name": "Tianmei (Femenino Dulce / Asistente)"},
		{"id": "female-yujie", "name": "Yujie (Femenino Maduro / Profesional)"},
		{"id": "presenter_male", "name": "Presenter (Locutor Formal)"},
		{"id": "audiobook_female", "name": "Audiobook (Narradora Expresiva)"},
	],
	Provider.OPENAI_REALTIME: [
		{"id": "alloy", "name": "Alloy (Neutro y balanceado)"},
		{"id": "echo", "name": "Echo (Cálido y conversacional)"},
		{"id": "shimmer", "name": "Shimmer (Claro y expresivo)"},
		{"id": "ash", "name": "Ash (Preciso y conciso)"},
		{"id": "ballad", "name": "Ballad (Melódico y suave)"},
		{"id": "coral", "name": "Coral (Amigable)"},
		{"id": "sage", "name": "Sage (Profesional)"},
		{"id": "verse", "name": "Verse (Versátil)"},
	],
	Provider.DEEPSEEK: [
		{"id": "deepseek_code", "name": "DeepSeek Coding Voice"},
	],
	Provider.MOCK_LOCAL: [
		{"id": "jarvis_synth", "name": "Jarvis Síntesis Espacial"},
	],
}

var current_provider: Provider = Provider.MINIMAX
var current_model: String = "m3.1-flash"
var api_key: String = ""
var group_id: String = "" # Needed for MiniMax accounts
var voice_id: String = "moss_audio"
var custom_endpoint: String = ""
var azure_resources: Dictionary = {}
var system_prompt: String = "Eres Jarvis, el asistente de voz espacial de Spatial Workspace. Coordinas el estudio de código wZed, ejecutas scripts con Deno/Web y orquestas paneles 3D."
var vad_enabled := true
var temperature := 0.7
var dynamic_models: Dictionary = {}


## Returns the list of models for a provider, prioritizing dynamically queried models over baseline fallbacks.
func get_models_for_provider(provider_id: int) -> Array:
	if dynamic_models.has(provider_id) and dynamic_models[provider_id].size() > 0:
		return dynamic_models[provider_id]
	return AVAILABLE_MODELS.get(provider_id, [])


## Constructs the endpoint and headers to dynamically query a provider's models list.
func get_models_endpoint_and_headers(provider_id: int) -> Dictionary:
	var url := ""
	var headers: PackedStringArray = ["Content-Type: application/json"]

	match provider_id:
		Provider.MINIMAX:
			url = "https://api.minimax.chat/v1/models"
			if not api_key.is_empty():
				headers.append("Authorization: Bearer %s" % api_key)
		Provider.OPENAI_REALTIME:
			url = "https://api.openai.com/v1/models"
			if not api_key.is_empty():
				headers.append("Authorization: Bearer %s" % api_key)
		Provider.DEEPSEEK:
			url = "https://api.deepseek.com/models"
			if not api_key.is_empty():
				headers.append("Authorization: Bearer %s" % api_key)
		Provider.MOCK_LOCAL:
			url = "http://localhost:11434/v1/models"

	return {"url": url, "headers": headers}


## Parses a remote JSON payload from /v1/models and caches the model IDs dynamically.
func parse_and_store_models_response(provider_id: int, json_body: String) -> Array:
	var parsed_models: Array = []
	var json := JSON.new()
	if json.parse(json_body) == OK and json.data is Dictionary:
		var root: Dictionary = json.data
		var data_array: Array = root.get("data", [])
		for item in data_array:
			if item is Dictionary and item.has("id"):
				var mid: String = str(item["id"])
				if not parsed_models.has(mid):
					parsed_models.append(mid)
		# Ollama /tags format fallback
		if parsed_models.is_empty() and root.has("models"):
			for m in root["models"]:
				if m is Dictionary and m.has("name"):
					parsed_models.append(str(m["name"]))

	if not parsed_models.is_empty():
		dynamic_models[provider_id] = parsed_models
		models_fetched.emit(provider_id, parsed_models)

	return parsed_models


func _init() -> void:
	load_config()


## Loads persisted configuration or defaults, and auto-discovers external secrets if missing.
func load_config() -> void:
	var loaded := false
	if FileAccess.file_exists(CONFIG_PATH):
		var file := FileAccess.open(CONFIG_PATH, FileAccess.READ)
		if file != null:
			var json_text := file.get_as_text()
			var json := JSON.new()
			if json.parse(json_text) == OK and json.data is Dictionary:
				_apply_dictionary_data(json.data)
				loaded = true

	if not loaded:
		_apply_defaults()

	# Always scan external paths (e.g. pushed via ADB to /sdcard or local res://secrets.json)
	scan_and_import_secrets()

	# Check environment variables
	_check_environment_secrets()


func _check_environment_secrets() -> void:
	var env_minimax_key := OS.get_environment("MINIMAX_API_KEY")
	var env_minimax_group := OS.get_environment("MINIMAX_GROUP_ID")
	var env_openai_key := OS.get_environment("OPENAI_API_KEY")

	if not env_minimax_key.is_empty() and api_key.is_empty():
		api_key = env_minimax_key
		current_provider = Provider.MINIMAX
	if not env_minimax_group.is_empty() and group_id.is_empty():
		group_id = env_minimax_group
	if not env_openai_key.is_empty() and api_key.is_empty():
		api_key = env_openai_key
		current_provider = Provider.OPENAI_REALTIME


## Scans candidate paths (/sdcard, Download, res://) for external secrets files.
## Returns a result dictionary describing what was found.
func scan_and_import_secrets() -> Dictionary:
	for path in EXTERNAL_CANDIDATE_PATHS:
		if path == CONFIG_PATH:
			continue
		if FileAccess.file_exists(path):
			var file := FileAccess.open(path, FileAccess.READ)
			if file != null:
				var text := file.get_as_text()
				var json := JSON.new()
				if json.parse(text) == OK and json.data is Dictionary:
					var count := _apply_dictionary_data(json.data)
					if count > 0:
						save_config()
						return {
							"success": true,
							"path": path,
							"count": count,
							"message": "Cargados %d secretos desde %s" % [count, path],
						}
				# Try parsing as KEY=VALUE .env style
				var env_count := _parse_and_apply_env_text(text)
				if env_count > 0:
					save_config()
					return {
						"success": true,
						"path": path,
						"count": env_count,
						"message": "Cargados %d secretos formato .env desde %s" % [env_count, path],
					}

	return {
		"success": false,
		"path": "",
		"count": 0,
		"message": "No se encontraron archivos de secretos externos.",
	}


func _apply_dictionary_data(data: Dictionary) -> int:
	var count := 0

	# Standard keys
	if data.has("provider"):
		current_provider = data.get("provider") as Provider
	if data.has("model"):
		var m_val: String = str(data.get("model", current_model))
		if m_val == "speech-02-turbo" or m_val == "abab6.5s-chat":
			current_model = "m3.1-flash"
		else:
			current_model = m_val
	if data.has("voice_id"):
		voice_id = data.get("voice_id", voice_id)
	if data.has("custom_endpoint"):
		custom_endpoint = data.get("custom_endpoint", custom_endpoint)

	# Direct api_key & group_id
	if data.has("api_key") and not str(data["api_key"]).is_empty():
		api_key = str(data["api_key"]).strip_edges()
		count += 1
	if data.has("group_id") and not str(data["group_id"]).is_empty():
		group_id = str(data["group_id"]).strip_edges()
		count += 1

	# Provider-specific named keys (convenience for multi-provider files)
	if data.has("minimax_api_key") and not str(data["minimax_api_key"]).is_empty():
		api_key = str(data["minimax_api_key"]).strip_edges()
		current_provider = Provider.MINIMAX
		count += 1
	if data.has("minimax_group_id") and not str(data["minimax_group_id"]).is_empty():
		group_id = str(data["minimax_group_id"]).strip_edges()
		count += 1

	if data.has("openai_api_key") and not str(data["openai_api_key"]).is_empty():
		if api_key.is_empty():
			api_key = str(data["openai_api_key"]).strip_edges()
			current_provider = Provider.OPENAI_REALTIME
		count += 1

	if data.has("azure_resources") and data["azure_resources"] is Dictionary:
		azure_resources = data["azure_resources"]
		count += azure_resources.size()

	return count


func _parse_and_apply_env_text(text: String) -> int:
	var lines := text.split("\n")
	var count := 0
	for line in lines:
		var trimmed := line.strip_edges()
		if trimmed.begins_with("#") or not trimmed.contains("="):
			continue
		var parts := trimmed.split("=", true, 1)
		if parts.size() < 2:
			continue
		var key := parts[0].strip_edges().to_upper()
		var val := parts[1].strip_edges().trim_prefix("\"").trim_suffix("\"").trim_prefix("'").trim_suffix("'")

		match key:
			"MINIMAX_API_KEY":
				api_key = val
				current_provider = Provider.MINIMAX
				count += 1
			"MINIMAX_GROUP_ID":
				group_id = val
				count += 1
			"OPENAI_API_KEY":
				if api_key.is_empty():
					api_key = val
					current_provider = Provider.OPENAI_REALTIME
				count += 1
			"API_KEY":
				api_key = val
				count += 1
			"GROUP_ID":
				group_id = val
				count += 1

	return count


## Saves configuration to user://live_model_config.json.
func save_config() -> bool:
	var file := FileAccess.open(CONFIG_PATH, FileAccess.WRITE)
	if file == null:
		return false

	var data := {
		"provider": current_provider,
		"model": current_model,
		"api_key": api_key,
		"group_id": group_id,
		"voice_id": voice_id,
		"custom_endpoint": custom_endpoint,
		"azure_resources": azure_resources,
		"system_prompt": system_prompt,
		"vad_enabled": vad_enabled,
		"temperature": temperature,
		"updated_at": Time.get_datetime_string_from_system(),
	}

	file.store_string(JSON.stringify(data, "  "))
	config_changed.emit()
	return true


func _apply_defaults() -> void:
	current_provider = Provider.MINIMAX
	current_model = DEFAULT_MODELS[Provider.MINIMAX]
	voice_id = "moss_audio"


func set_provider(new_provider: Provider) -> void:
	current_provider = new_provider
	current_model = DEFAULT_MODELS.get(new_provider, "default")
	var voice_list: Array = VOICES.get(new_provider, [])
	if voice_list.size() > 0:
		voice_id = voice_list[0]["id"]
	save_config()


## Returns a concise display badge for the current setup (e.g. "MiniMax: speech-02").
func get_badge_text() -> String:
	var provider_label: String = PROVIDER_NAMES.get(current_provider, "Live")
	return "%s (%s)" % [provider_label, current_model]


## Returns the default endpoint for the current provider.
func get_endpoint() -> String:
	if not custom_endpoint.is_empty():
		return custom_endpoint

	match current_provider:
		Provider.MINIMAX:
			return "wss://api.minimax.chat/v1/realtime"
		Provider.OPENAI_REALTIME:
			return "wss://api.openai.com/v1/realtime?model=%s" % current_model
		Provider.DEEPSEEK:
			return "https://api.deepseek.com/chat/completions"
		_:
			return "local://mock-realtime"


## Processes a simulated or real user utterance and returns a structured response.
func process_user_turn(user_utterance: String) -> Dictionary:
	var prompt_lower := user_utterance.to_lower()
	var response_text := ""
	var tool_name := ""
	var tool_arg := ""

	if prompt_lower.contains("corre") or prompt_lower.contains("ejecuta") or prompt_lower.contains("run"):
		tool_name = "run_wzed"
		tool_arg = "index.js"
		response_text = "Ejecutando script index.js en el motor VFS de wZed."
	elif prompt_lower.contains("browser") or prompt_lower.contains("web") or prompt_lower.contains("navegador"):
		tool_name = "open_browser"
		tool_arg = "http://localhost:5173/preview"
		response_text = "Abriendo el navegador web en el servidor NodePod local."
	elif prompt_lower.contains("recentra") or prompt_lower.contains("centrar") or prompt_lower.contains("recenter"):
		tool_name = "recenter"
		response_text = "Recentrado el espacio de trabajo frente a tu punto de vista."
	elif prompt_lower.contains("reinicia") or prompt_lower.contains("layout") or prompt_lower.contains("reset"):
		tool_name = "reset_layout"
		response_text = "Restableciendo paneles y orbe a sus posiciones ergonómicas."
	elif prompt_lower.contains("minimax"):
		response_text = "Modelo MiniMax activo con voz %s y latencia ultra baja en PICO 4 Ultra." % voice_id
	else:
		response_text = "Entendido. Procesando con %s (%s). Coordinando agentes en el espacio." % [
			PROVIDER_NAMES.get(current_provider, "Live Agent"),
			current_model,
		]

	return {
		"response": response_text,
		"tool_name": tool_name,
		"tool_arg": tool_arg,
		"provider": PROVIDER_NAMES.get(current_provider, "Live"),
		"voice": voice_id,
	}
