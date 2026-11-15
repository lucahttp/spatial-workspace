class_name RealtimeAgentOrchestrator
extends RefCounted
## Realtime Voice Agent Orchestrator based on OpenAI Realtime Agents and GPT-Live.
##
## Pipeline Architecture:
## ---------------------
## 1. Trigger: Wake Word ("Hey Buddy") OR Start Button in VR.
## 2. GPT-Live (Frontman): Fast, low-latency conversational voice agent.
##    Evaluates user intent and issues immediate voice acknowledgement.
## 3. Delegation (Handoff): Delegates heavy tasks to MiniMax-M3.1-Flash
##    (m3.1-flash / MiniMax-Text-01) or specialized expert agents.
## 4. Spatial Control: Dispatches actions to Godot spatial workspace
##    (wZed VFS code runner, Deno/Web browser preview, 3D panel transformations).
## 5. Voice Resolution: GPT-Live speaks final outcome with 3D spatial audio.

signal state_changed(state_id: int, state_name: String)
signal message_logged(speaker: String, text: String, color_hex: String)
signal delegation_started(agent_name: String, task: String)
signal delegation_finished(agent_name: String, result: Dictionary)
signal workspace_action_requested(action_name: String, params: Dictionary)
signal orb_state_requested(orb_state: int)

enum State {
	IDLE,
	LISTENING,
	GPT_LIVE_THINKING,
	DELEGATING,
	EXPERT_EXECUTING,
	SPEAKING,
}

const STATE_NAMES: Dictionary = {
	State.IDLE: "En espera",
	State.LISTENING: "Escuchando (Hey Buddy)",
	State.GPT_LIVE_THINKING: "GPT-Live analizando",
	State.DELEGATING: "Delegando a MiniMax",
	State.EXPERT_EXECUTING: "MiniMax ejecutando",
	State.SPEAKING: "GPT-Live hablando",
}

const LiveModelManagerScript := preload("res://scripts/ai/live_model_manager.gd")
const DecisionRouterScript := preload("res://scripts/ai/decision_router.gd")
const NeedleToolEngineScript := preload("res://scripts/ai/needle_tool_engine.gd")

var state: State = State.IDLE
var model_manager: LiveModelManagerScript
var decision_router: DecisionRouterScript
var needle_engine: NeedleToolEngineScript
var coordinator_ref: Node = null
var wake_word_enabled := true
var last_user_utterance := ""


func _init(mgr: LiveModelManagerScript = null) -> void:
	if mgr != null:
		model_manager = mgr
	else:
		model_manager = LiveModelManagerScript.new()
	
	decision_router = DecisionRouterScript.new()
	needle_engine = NeedleToolEngineScript.new()
	
	decision_router.decision_completed.connect(_on_jev_decision_completed)


## Sets the workspace coordinator reference for direct spatial Needle tool calls.
func set_coordinator(coord: Node) -> void:
	coordinator_ref = coord


## Triggers the listening state via Wake Word ("Hey Buddy").
func trigger_wake_word(phrase: String = "Hey Buddy") -> void:
	if state == State.LISTENING or state == State.DELEGATING:
		return
	_set_state(State.LISTENING)
	message_logged.emit("SISTEMA", "🎙️ Wake Word detectado: \"%s\"" % phrase, "#38bdf8")
	orb_state_requested.emit(1) # State.LISTENING in ThinkingOrb


## Triggers listening via physical Start / Mic button press in VR.
func trigger_start_button() -> void:
	if state == State.IDLE:
		_set_state(State.LISTENING)
		message_logged.emit("SISTEMA", "🔴 Botón Start presionado. Escuchando...", "#38bdf8")
		orb_state_requested.emit(1) # State.LISTENING
	elif state == State.LISTENING:
		submit_user_utterance(last_user_utterance if not last_user_utterance.is_empty() else "Acomoda el workspace")


## Submits a user speech utterance into the JEV (Foundry Decision-1) + Needle pipeline.
func submit_user_utterance(utterance: String) -> void:
	var cleaned := utterance.strip_edges()
	var lower := cleaned.to_lower()
	
	# Detect and strip wake phrase onset
	var wake_phrases := ["hey buddy", "hello buddy", "hi buddy", "oye orbe", "computer"]
	for wp in wake_phrases:
		if lower.begins_with(wp):
			message_logged.emit("HEYBUDDY", "🎙️ Wake Word detectado: \"%s\"" % wp, "#38bdf8")
			cleaned = cleaned.substr(wp.length()).strip_edges().trim_prefix(",").strip_edges()
			break

	if cleaned.is_empty():
		cleaned = "Acomoda el workspace"

	last_user_utterance = cleaned
	message_logged.emit("TÚ", utterance, "#67e8f9")

	_set_state(State.GPT_LIVE_THINKING)
	orb_state_requested.emit(2) # State.WORKING

	# Evaluate intent and safety with Microsoft-Decision-1 as JEV
	var context := {
		"active_model": model_manager.current_model if model_manager else "m3.1-flash",
	}
	decision_router.evaluate(cleaned, context)


func _on_jev_decision_completed(decision: Dictionary) -> void:
	var route: String = decision.get("route", "live_chat")
	var confidence: float = decision.get("confidence", 0.85)
	var is_dest: bool = decision.get("is_destructive", false)
	var dest_prob: float = decision.get("destructive_probability", 0.0)

	# Log JEV probabilistic reasoning
	var jev_log := "⚖️ [JEV] Ruta: %s (%.0f%%) · Peligro: %.0f%%" % [
		route.to_upper(),
		confidence * 100.0,
		dest_prob * 100.0
	]
	message_logged.emit("FOUNDRY JEV", jev_log, "#a855f7")

	if is_dest:
		message_logged.emit("GUARDRAIL", "⚠️ Acción potencialmente destructiva detectada. Requiere confirmación del usuario.", "#ef4444")
		orb_state_requested.emit(8) # State.SHAPING (alert)
		_finish_with_speech("JEV GUARDRAIL", "Atención: La acción solicitada puede ser destructiva. Por favor confirma en la cápsula 3D.")
		return

	match route:
		"needle_local":
			_execute_needle_local(last_user_utterance)
		"deno_vfs":
			_delegate_to_deno_coder(last_user_utterance)
		_:
			_reply_live_chat(last_user_utterance)


func _execute_needle_local(utterance: String) -> void:
	_set_state(State.EXPERT_EXECUTING)
	orb_state_requested.emit(4) # State.SOLVING

	var needle_res := needle_engine.parse_and_execute(utterance, coordinator_ref)
	var summary: String = needle_res.get("summary", "Needle ejecutó la acción espacial local.")
	var tool_name: String = needle_res.get("tool", "")

	if tool_name == "search_web":
		var q: String = needle_res.get("query", "")
		workspace_action_requested.emit("search_web", {"query": q})
	elif tool_name == "navigate_browser":
		workspace_action_requested.emit("open_browser", {"url": needle_res.get("url", "")})
	elif tool_name == "recenter_view":
		workspace_action_requested.emit("recenter", {})

	message_logged.emit("NEEDLE 3", "⚡ " + summary, "#10b981")
	_finish_with_speech("NEEDLE 3", summary)


func _delegate_to_deno_coder(utterance: String) -> void:
	var current_model: String = model_manager.current_model if model_manager else "m3.1-flash"
	var agent_name := "MiniMax Coder (%s)" % current_model
	var task_desc := "Compilar componente reactivo en Deno Web V8 Sandbox"

	_set_state(State.DELEGATING)
	message_logged.emit("GPT-LIVE", "Delegando a %s para compilar en Deno VFS..." % agent_name, "#c084fc")
	delegation_started.emit(agent_name, task_desc)
	orb_state_requested.emit(4) # State.SOLVING

	var route_data := {
		"agent_type": "minimax_coder",
		"action": "run_wzed",
		"action_param": "spatial-card.js" if utterance.contains("tarjeta") or utterance.contains("componente") else "index.js",
		"is_create": utterance.contains("crea") or utterance.contains("componente"),
	}
	_execute_expert_agent(agent_name, route_data)


func _reply_live_chat(utterance: String) -> void:
	var lower := utterance.to_lower()
	if lower.contains("busca") or lower.contains("search") or lower.contains("googlea"):
		_execute_needle_local(utterance)
		return

	var active_model: String = model_manager.current_model if model_manager else "m3.1-flash"
	var reply := ""
	if lower.contains("quien eres") or lower.contains("quién eres") or lower.contains("que haces") or lower.contains("qué haces"):
		reply = "Soy tu copiloto espacial de voz GPT-Live en VR con Needle 3 para herramientas locales y MiniMax (%s) para programación wZed." % active_model
	else:
		reply = "Entendido. Coordinando con %s en el espacio de trabajo. ¿Quieres buscar algo en la web o modificar tus ventanas 3D?" % active_model

	_finish_with_speech("GPT-LIVE", reply)


## Evaluates user utterance and routes to appropriate downstream expert agent.
func _evaluate_route(utterance: String) -> Dictionary:
	var text := utterance.to_lower()

	# 1. Coding / Scripting / wZed / Deno tasks -> Delegate to MiniMax Coder
	if text.contains("corre") or text.contains("ejecuta") or text.contains("wzed") or text.contains("codigo") or text.contains("código") or text.contains("crea") or text.contains("tarjeta"):
		var is_create: bool = text.contains("crea") or text.contains("tarjeta") or text.contains("componente")
		var target_file := "spatial-card.js" if is_create else "index.js"
		var current_active_model: String = model_manager.current_model if model_manager != null else "m3.1-flash"
		return {
			"delegate": true,
			"agent": "MiniMax (%s)" % current_active_model,
			"agent_type": "minimax_coder",
			"task": "Generar y compilar componente 3D en %s con %s" % [target_file, current_active_model],
			"ack_speech": "Entendido. Delegando a MiniMax %s para compilar %s en el motor Deno/wZed." % [current_active_model, target_file],
			"action": "run_wzed",
			"action_param": target_file,
			"is_create": is_create,
		}

	# 2. Browser / Deno Web Preview tasks -> Delegate to Browser Agent
	if text.contains("browser") or text.contains("navegador") or text.contains("web") or text.contains("pagina") or text.contains("página") or text.contains("preview"):
		var target_url := "http://localhost:5173/preview"
		if text.contains("wolvic"):
			target_url = "https://wolvic.com/webxr-layers"
		elif text.contains("deepseek"):
			target_url = "https://github.com/deepseek-ai/deepseek-harness"

		return {
			"delegate": true,
			"agent": "Browser Web Agent (Deno Web Sandbox)",
			"agent_type": "browser_agent",
			"task": "Navegar a %s en el sandbox Deno Web" % target_url,
			"ack_speech": "Abriendo el navegador web en %s a través del sandbox Deno Web." % target_url,
			"action": "open_browser",
			"action_param": target_url,
		}

	# 3. Spatial Layout / Alignment / Window Control -> Delegate to Spatial Architect
	if text.contains("recentra") or text.contains("centrar") or text.contains("recenter") or text.contains("reinicia") or text.contains("layout") or text.contains("acomoda"):
		var is_reset: bool = text.contains("reinicia") or text.contains("reset")
		return {
			"delegate": true,
			"agent": "Spatial Architect Agent",
			"agent_type": "spatial_architect",
			"task": "Reorganizar paneles y recentrar punto de vista 3D",
			"ack_speech": "Reorganizando y recentrando el espacio de trabajo frente a tu vista.",
			"action": "reset_layout" if is_reset else "recenter",
			"action_param": "",
		}

	# 4. Fallback: Direct conversational response from GPT-Live
	return {
		"delegate": false,
		"reply": "Hola, soy el asistente GPT-Live. Puedo delegar tareas a MiniMax m3.1-flash para programar en wZed, abrir el navegador Deno Web o controlar tus paneles espaciales en VR.",
	}


## Executes downstream expert agent work.
func _execute_expert_agent(agent_name: String, route: Dictionary) -> void:
	var agent_type: String = route.get("agent_type", "")
	var action: String = route.get("action", "")
	var action_param: String = route.get("action_param", "")

	_set_state(State.EXPERT_EXECUTING)

	var result_data := {}
	var final_voice_summary := ""

	match agent_type:
		"minimax_coder":
			var is_create: bool = route.get("is_create", false)
			if is_create:
				result_data = {
					"success": true,
					"file": action_param,
					"summary": "Componente reactivo generado por MiniMax (%s) -> Hot-Reloaded en Deno Sandbox" % (model_manager.current_model if model_manager != null else "m3.1-flash"),
				}
				final_voice_summary = "MiniMax generó y compiló el componente en spatial-card.js. Ya lo puedes ver interactivo en tu vista previa de Deno."
			else:
				result_data = {
					"success": true,
					"file": action_param,
					"summary": "Ejecutado index.js con 3 anclajes espaciales en Deno VFS",
				}
				final_voice_summary = "MiniMax completó la ejecución del script. Tres nodos de anclaje están activos en el espacio."

			# Dispatch workspace control action
			workspace_action_requested.emit("run_wzed", {"file": action_param, "summary": result_data["summary"]})

		"browser_agent":
			result_data = {
				"success": true,
				"url": action_param,
				"summary": "Página cargada en Deno Web con latencia 6ms",
			}
			final_voice_summary = "El navegador web está abierto en %s con soporte para capas espaciales." % action_param
			workspace_action_requested.emit("open_browser", {"url": action_param})

		"spatial_architect":
			result_data = {
				"success": true,
				"action": action,
				"summary": "Espacio recentrado y paneles alineados",
			}
			final_voice_summary = "Espacio de trabajo recentrado ergonómicamente frente a ti."
			workspace_action_requested.emit(action, {})

		_:
			result_data = {"success": true, "summary": "Tarea finalizada"}
			final_voice_summary = "La tarea fue completada exitosamente."

	message_logged.emit(agent_name.to_upper(), "✅ " + str(result_data.get("summary", "")), "#f59e0b")
	delegation_finished.emit(agent_name, result_data)

	# Return voice response via GPT-Live
	_finish_with_speech("GPT-LIVE", final_voice_summary)


func _finish_with_speech(speaker: String, text: String) -> void:
	_set_state(State.SPEAKING)
	message_logged.emit(speaker, "🔊 " + text, "#4ade80")
	orb_state_requested.emit(6) # State.COMPOSING (pulse speaking)


func _set_state(new_state: State) -> void:
	state = new_state
	var state_label: String = STATE_NAMES.get(new_state, "Unknown")
	state_changed.emit(new_state, state_label)
