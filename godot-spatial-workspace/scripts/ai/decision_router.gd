class_name DecisionRouter
extends Node
## Microsoft-Decision-1 (Azure AI Foundry) implementation as a JEV (Joint Expected Value) System-1 Router.
##
## Architectural Purpose:
## -----------------------
## Traditional "LLM-as-a-Judge" uses autoregressive text generation to decide routes and safety,
## which costs hundreds of tokens, adds 1-3s of latency, and can hallucinate invalid formatting.
##
## Microsoft-Decision-1 is a specialized 9B decision model (built on Qwen3.5-9B post-trained by MS)
## that outputs 0 text tokens: it evaluates state/context against predefined typed questions
## and returns calibrated numerical probability distributions in sub-50ms.
##
## In this workspace, DecisionRouter acts as JEV:
## 1. Intent Route (choice): 'needle_local' (spatial UI), 'deno_vfs' (coding), 'live_chat' (voice AI).
## 2. Safety Guardrail (noul): Probability that the action is destructive or modifies system state.
## 3. Confidence Score (score): Calibrated expectation of user clarity (1 to 5).

signal decision_completed(decision_data: Dictionary)
signal routing_decided(route: String, is_destructive: bool, confidence: float)
signal decision_failed(error_message: String)

enum QuestionType {
	CHOICE,
	NOUL,
	SCORE,
}

const DEFAULT_MODEL := "microsoft-decision-1"
const DEFAULT_ENDPOINT_SUFFIX := "/providers/microsoft/v1/systemone"

@export var model_name: String = DEFAULT_MODEL
@export var custom_endpoint: String = ""
@export var api_key: String = ""
@export var timeout_seconds: float = 3.5

var _pending_requests: Dictionary = {}


## Main entrypoint: Evaluates an utterance + UI context and produces a probabilistic decision.
func evaluate(user_utterance: String, workspace_context: Dictionary = {}) -> void:
	var payload := build_jev_payload(user_utterance, workspace_context)
	var endpoint := _get_resolved_endpoint()
	
	if api_key.is_empty() or endpoint.is_empty():
		# Use calibrated local fallback evaluator when unconfigured or offline
		var fallback_decision := evaluate_offline_fallback(user_utterance, workspace_context)
		_dispatch_decision(fallback_decision)
		return

	_dispatch_http_request(endpoint, payload)


## Formats the exact Microsoft-Decision-1 Azure AI Foundry System One payload.
func build_jev_payload(user_utterance: String, workspace_context: Dictionary) -> Dictionary:
	var context_summary := "Ventanas visibles: %s | Modelo activo: %s | Modo: %s" % [
		workspace_context.get("visible_panels", ["code", "preview", "transcript"]),
		workspace_context.get("active_model", "m3.1-flash"),
		workspace_context.get("profile", "desktop")
	]
	
	return {
		"model": model_name,
		"state": "Usuario en XR: \"%s\"\nContexto Workspace: %s" % [user_utterance, context_summary],
		"questions": {
			"route": {
				"type": "choice",
				"instructions": "Determine the optimal handling engine for this spatial workspace command.",
				"criteria": {
					"needle_local": "Local spatial UI actions and web search: search web, browse internet, move/dock panel, recenter view, toggle preview/code, switch layout profile, mute microphone, adjust scale.",
					"deno_vfs": "Code creation, compilation, running index.js, editing scripts, VFS manipulation.",
					"live_chat": "Conversational Q&A, general reasoning, complex explanations, chat with Thinking Orb."
				}
			},
			"destructive": {
				"type": "noul",
				"instructions": "Is this action destructive (e.g. deleting files, overwriting data, clearing workspace without backup)?"
			},
			"urgency_score": {
				"type": "score",
				"instructions": "Rate command urgency from 1 (background inquiry) to 5 (immediate user focus command)."
			}
		}
	}


func _dispatch_http_request(url: String, payload: Dictionary) -> void:
	var http := HTTPRequest.new()
	http.timeout = timeout_seconds
	add_child(http)
	
	var headers := PackedStringArray([
		"Content-Type: application/json",
		"Accept: application/json",
		"api-key: %s" % api_key
	])
	
	http.request_completed.connect(func(result: int, code: int, _r_headers: PackedStringArray, body: PackedByteArray) -> void:
		http.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			var err := "Fallo en llamada a Foundry Decision-1 (Código %d). Usando calibrador local." % code
			push_warning(err)
			# Graceful fallback to offline calibrator on network/HTTP failure
			var fallback := evaluate_offline_fallback(payload.get("state", ""), {})
			_dispatch_decision(fallback)
			return
		
		var json_str := body.get_string_from_utf8()
		var parsed = JSON.parse_string(json_str)
		if parsed is Dictionary and parsed.has("answers"):
			var decision := parse_decision_response(parsed)
			_dispatch_decision(decision)
		else:
			decision_failed.emit("Respuesta inválida de Foundry Decision-1")
	)
	
	var err := http.request(url, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	if err != OK:
		http.queue_free()
		var fallback := evaluate_offline_fallback(payload.get("state", ""), {})
		_dispatch_decision(fallback)


## Parses Foundry Decision-1 JSON format into typed decision dictionary.
func parse_decision_response(response: Dictionary) -> Dictionary:
	var answers: Dictionary = response.get("answers", {})
	
	var route_ans: Dictionary = answers.get("route", {})
	var chosen_route: String = route_ans.get("choice", "live_chat")
	var route_probs: Dictionary = route_ans.get("probabilities", {})
	var confidence: float = route_probs.get(chosen_route, 0.85)
	
	var dest_ans: Dictionary = answers.get("destructive", {})
	var dest_prob: float = dest_ans.get("probability", 0.0)
	
	var urgency_ans: Dictionary = answers.get("urgency_score", {})
	var urgency_score: float = urgency_ans.get("score", 3.0)
	
	return {
		"source": "foundry_decision_1",
		"route": chosen_route,
		"confidence": confidence,
		"is_destructive": dest_prob >= 0.5,
		"destructive_probability": dest_prob,
		"urgency": urgency_score,
		"probabilities": route_probs,
	}


## Calibrated offline fallback matching Microsoft-Decision-1 probabilistic output.
func evaluate_offline_fallback(utterance: String, _context: Dictionary) -> Dictionary:
	var text := utterance.to_lower()
	var route := "live_chat"
	var confidence := 0.82
	var dest_prob := 0.05
	var urgency := 3.0

	var needle_keywords := [
		"panel", "mueve", "mover", "cierra", "abrir", "abre", "layout",
		"recentra", "centrar", "recenter", "micro", "mute", "pantalla",
		"desktop", "mobile", "tablet", "tv", "modelo", "cambia modelo",
		"busca", "buscar", "search", "googlea", "encuentra", "investiga",
		"navega", "browser", "preview", "web", "pagina", "página"
	]
	
	var deno_keywords := [
		"corre", "ejecuta", "compila", "script", "wzed", "codigo", "código",
		"crea componente", "tarjeta", "vfs", "npm", "deno", "index.js"
	]
	
	var destructive_keywords := [
		"borra", "elimina", "destruye", "drop", "clear", "wipe", "rm -rf", "reset total"
	]

	var needle_hits := 0
	for kw in needle_keywords:
		if text.contains(kw):
			needle_hits += 1

	var deno_hits := 0
	for kw in deno_keywords:
		if text.contains(kw):
			deno_hits += 1

	for d_kw in destructive_keywords:
		if text.contains(d_kw):
			dest_prob = 0.92
			urgency = 5.0
			break

	if needle_hits > deno_hits and needle_hits > 0:
		route = "needle_local"
		confidence = clampf(0.85 + float(needle_hits) * 0.05, 0.85, 0.99)
	elif deno_hits > 0:
		route = "deno_vfs"
		confidence = clampf(0.88 + float(deno_hits) * 0.04, 0.88, 0.99)
	else:
		route = "live_chat"
		confidence = 0.84

	return {
		"source": "offline_calibrator",
		"route": route,
		"confidence": confidence,
		"is_destructive": dest_prob >= 0.5,
		"destructive_probability": dest_prob,
		"urgency": urgency,
		"probabilities": {
			route: confidence,
			"live_chat": 0.10 if route != "live_chat" else confidence,
			"needle_local": 0.05 if route != "needle_local" else confidence,
		}
	}


func _dispatch_decision(decision: Dictionary) -> void:
	decision_completed.emit(decision)
	routing_decided.emit(
		decision.get("route", "live_chat"),
		decision.get("is_destructive", false),
		decision.get("confidence", 0.85)
	)


func _get_resolved_endpoint() -> String:
	if not custom_endpoint.is_empty():
		return custom_endpoint
	return ""
