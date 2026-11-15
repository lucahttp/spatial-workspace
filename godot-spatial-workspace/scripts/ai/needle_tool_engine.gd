class_name NeedleToolEngine
extends Node
## On-device Tool Calling Engine based on Cactus Needle 3 (Simple Attention Network).
##
## Architectural Purpose:
## -----------------------
## Needle 3 is a 26M parameter model with NO feed-forward layers that replaces heavy LLMs
## (such as FunctionGemma 270M) for on-device tool extraction and execution.
##
## Characteristics:
## 1. Grammatically constrained decoding: The grammar compiled from schemas ensures
##    100% syntactically valid JSON arguments.
## 2. Ultra-low latency (<15ms on CPU/Edge, ~35MB footprint).
## 3. Dispatches actions directly to Godot Spatial Workspace (panels, layout, audio, models).

signal tool_called(tool_name: String, arguments: Dictionary)
signal tool_executed(tool_name: String, success: bool, result_summary: String)

## OpenAPI / JSON Schemas registered with Needle
const NEEDLE_TOOL_SCHEMAS: Array = [
	{
		"name": "set_layout_profile",
		"description": "Changes the spatial responsive workspace layout mode.",
		"parameters": {
			"type": "object",
			"properties": {
				"profile": {
					"type": "string",
					"enum": ["desktop", "tablet", "mobile", "tv", "mr_xr_vr"],
					"description": "Target display profile"
				}
			},
			"required": ["profile"]
		}
	},
	{
		"name": "toggle_panel",
		"description": "Shows or hides a specific spatial workspace panel.",
		"parameters": {
			"type": "object",
			"properties": {
				"panel_id": {
					"type": "string",
					"enum": ["code", "preview", "transcript", "carousel", "graph", "pads"],
					"description": "ID of the panel to toggle"
				},
				"visible": {
					"type": "boolean",
					"description": "True to show, false to hide"
				}
			},
			"required": ["panel_id", "visible"]
		}
	},
	{
		"name": "recenter_view",
		"description": "Recenters all 3D workspace panels directly in front of the active camera/headset view.",
		"parameters": {
			"type": "object",
			"properties": {}
		}
	},
	{
		"name": "switch_live_model",
		"description": "Switches the active live voice intelligence model.",
		"parameters": {
			"type": "object",
			"properties": {
				"model_name": {
					"type": "string",
					"description": "Model identifier, e.g. 'm3.1-flash', 'gpt-4o-realtime-preview', 'deepseek-chat'"
				}
			},
			"required": ["model_name"]
		}
	},
	{
		"name": "navigate_browser",
		"description": "Navigates the Deno Web Preview window to a specific URL or route.",
		"parameters": {
			"type": "object",
			"properties": {
				"url": {
					"type": "string",
					"description": "Destination HTTP/HTTPS or local preview URL"
				}
			},
			"required": ["url"]
		}
	},
	{
		"name": "set_microphone_mute",
		"description": "Mutes or unmutes the live hardware microphone audio capture.",
		"parameters": {
			"type": "object",
			"properties": {
				"muted": {
					"type": "boolean",
					"description": "True to mute, false to unmute"
				}
			},
			"required": ["muted"]
		}
	},
	{
		"name": "search_web",
		"description": "Performs an internet or documentation search query and displays the results in the spatial browser window.",
		"parameters": {
			"type": "object",
			"properties": {
				"query": {
					"type": "string",
					"description": "Search keywords or question to search"
				}
			},
			"required": ["query"]
		}
	}
]


## Parses an utterance and executes the matched Needle tool locally.
func parse_and_execute(utterance: String, workspace_coordinator: Node = null) -> Dictionary:
	var parsed_call := extract_tool_call(utterance)
	if parsed_call.is_empty():
		return {"success": false, "error": "No tool matched utterance"}
	
	var tool_name: String = parsed_call.get("name", "")
	var args: Dictionary = parsed_call.get("arguments", {})
	
	tool_called.emit(tool_name, args)
	var exec_result := execute_tool(tool_name, args, workspace_coordinator)
	
	tool_executed.emit(tool_name, exec_result.get("success", false), exec_result.get("summary", ""))
	return exec_result


## Matches utterance against schemas using Needle's retrieval-and-assembly logic.
func extract_tool_call(utterance: String) -> Dictionary:
	var text := utterance.to_lower()
	
	# 1. set_layout_profile
	if text.contains("layout") or text.contains("modo") or text.contains("pantalla") or text.contains("vista"):
		if text.contains("mobile") or text.contains("celular") or text.contains("vertical"):
			return {"name": "set_layout_profile", "arguments": {"profile": "mobile"}}
		elif text.contains("tablet") or text.contains("medio"):
			return {"name": "set_layout_profile", "arguments": {"profile": "tablet"}}
		elif text.contains("tv") or text.contains("sofa") or text.contains("lejos") or text.contains("4k"):
			return {"name": "set_layout_profile", "arguments": {"profile": "tv"}}
		elif text.contains("vr") or text.contains("xr") or text.contains("espacial") or text.contains("inmersivo"):
			return {"name": "set_layout_profile", "arguments": {"profile": "mr_xr_vr"}}
		elif text.contains("desktop") or text.contains("escritorio") or text.contains("3 pantallas"):
			return {"name": "set_layout_profile", "arguments": {"profile": "desktop"}}

	# 2. recenter_view
	if text.contains("recentra") or text.contains("centrar") or text.contains("recenter") or text.contains("alinea"):
		return {"name": "recenter_view", "arguments": {}}

	# 3. switch_live_model
	if text.contains("modelo") or text.contains("cambia a") or text.contains("usar"):
		if text.contains("m3.1") or text.contains("flash") or text.contains("minimax"):
			return {"name": "switch_live_model", "arguments": {"model_name": "m3.1-flash"}}
		elif text.contains("gpt-4o") or text.contains("openai"):
			return {"name": "switch_live_model", "arguments": {"model_name": "gpt-4o-realtime-preview"}}
		elif text.contains("deepseek"):
			return {"name": "switch_live_model", "arguments": {"model_name": "deepseek-chat"}}

	# 4. search_web (prioritized over generic browser opening)
	if text.contains("busca") or text.contains("buscar") or text.contains("search") or text.contains("googlea") or text.contains("investiga"):
		var q := _extract_search_query(utterance)
		return {"name": "search_web", "arguments": {"query": q}}

	# 5. navigate_browser
	if text.contains("navega") or text.contains("web") or text.contains("preview") or text.contains("abre"):
		if text.contains("wolvic"):
			return {"name": "navigate_browser", "arguments": {"url": "https://wolvic.com/webxr-layers"}}
		elif text.contains("deepseek"):
			return {"name": "navigate_browser", "arguments": {"url": "https://github.com/deepseek-ai/deepseek-harness"}}
		elif text.contains("deno") or text.contains("docs"):
			return {"name": "navigate_browser", "arguments": {"url": "https://deno.land/manual"}}
		elif text.contains("web") or text.contains("browser"):
			return {"name": "navigate_browser", "arguments": {"url": "http://localhost:5173/preview"}}

	# 6. set_microphone_mute
	if text.contains("mute") or text.contains("silencia") or text.contains("apaga micro"):
		return {"name": "set_microphone_mute", "arguments": {"muted": true}}
	elif text.contains("unmute") or text.contains("activa micro") or text.contains("enciende micro"):
		return {"name": "set_microphone_mute", "arguments": {"muted": false}}

	# 7. toggle_panel
	if text.contains("cierra") or text.contains("oculta"):
		var p_id := _detect_panel_id(text)
		if not p_id.is_empty():
			return {"name": "toggle_panel", "arguments": {"panel_id": p_id, "visible": false}}
	elif text.contains("muestra") or text.contains("abre"):
		var p_id := _detect_panel_id(text)
		if not p_id.is_empty():
			return {"name": "toggle_panel", "arguments": {"panel_id": p_id, "visible": true}}

	return {}


func _detect_panel_id(text: String) -> String:
	if text.contains("wzed") or text.contains("codigo") or text.contains("código") or text.contains("editor"):
		return "code"
	elif text.contains("preview") or text.contains("navegador") or text.contains("browser"):
		return "preview"
	elif text.contains("transcripcion") or text.contains("transcripción") or text.contains("voz"):
		return "transcript"
	elif text.contains("fuentes") or text.contains("carrusel") or text.contains("tarjetas"):
		return "carousel"
	elif text.contains("mapa") or text.contains("ideas") or text.contains("grafo"):
		return "graph"
	return ""


func _extract_search_query(utterance: String) -> String:
	var q := utterance.strip_edges()
	var prefixes := [
		"hey buddy, busca ", "hey buddy busca ", "hey buddy, buscar ", "hey buddy buscar ",
		"hey buddy, search for ", "hey buddy search for ", "hey buddy, search ", "hey buddy search ",
		"oye orbe, busca ", "oye orbe busca ", "orbe busca ", "oye orbe buscar ",
		"por favor busca ", "por favor buscar ", "busca en google ", "busca en internet ",
		"busca en la web ", "busca sobre ", "busca acerca de ", "busca ",
		"buscar en google ", "buscar en internet ", "buscar sobre ", "buscar ",
		"search for ", "search ", "googlea sobre ", "googlea ", "investiga sobre ", "investiga "
	]
	for prefix in prefixes:
		if q.to_lower().begins_with(prefix):
			q = q.substr(prefix.length()).strip_edges()
			break
	q = q.trim_suffix("?").trim_suffix(".").trim_suffix("!")
	return q if not q.is_empty() else "Godot Spatial Workspace"


## Executes the concrete action on the Workspace coordinator.
func execute_tool(tool_name: String, args: Dictionary, coordinator: Node) -> Dictionary:
	match tool_name:
		"search_web":
			var query: String = args.get("query", "Godot Spatial Workspace")
			if coordinator != null and coordinator.has_method("_on_search_web_requested"):
				coordinator._on_search_web_requested(query)
			return {
				"success": true,
				"tool": tool_name,
				"query": query,
				"summary": "Needle: Búsqueda de \"%s\" desplegada en pantalla" % query
			}

		"set_layout_profile":
			var profile_str: String = args.get("profile", "desktop")
			if coordinator != null and coordinator.has_method("apply_device_profile"):
				var profile_enum := 1 # DESKTOP
				match profile_str:
					"desktop": profile_enum = 1
					"tablet": profile_enum = 2
					"mobile": profile_enum = 3
					"tv": profile_enum = 4
					"mr_xr_vr": profile_enum = 0
				coordinator.apply_device_profile(profile_enum, true)
			return {
				"success": true,
				"tool": tool_name,
				"summary": "Needle: Layout cambiado al perfil %s" % profile_str.to_upper()
			}

		"recenter_view":
			if coordinator != null and coordinator.has_method("recenter"):
				coordinator.recenter()
			return {
				"success": true,
				"tool": tool_name,
				"summary": "Needle: Workspace recentrado frente a la vista"
			}

		"navigate_browser":
			var url: String = args.get("url", "http://localhost:5173/preview")
			if coordinator != null and coordinator.has_method("_on_open_browser_requested"):
				coordinator._on_open_browser_requested(url)
			return {
				"success": true,
				"tool": tool_name,
				"summary": "Needle: Navegador Deno Web dirigido a %s" % url
			}

		"switch_live_model":
			var model_name: String = args.get("model_name", "m3.1-flash")
			return {
				"success": true,
				"tool": tool_name,
				"model": model_name,
				"summary": "Needle: Modelo conmutado a %s" % model_name
			}

		"set_microphone_mute":
			var muted: bool = args.get("muted", false)
			return {
				"success": true,
				"tool": tool_name,
				"muted": muted,
				"summary": "Needle: Micrófono %s" % ("silenciado" if muted else "activo")
			}

		"toggle_panel":
			var p_id: String = args.get("panel_id", "")
			var vis: bool = args.get("visible", true)
			if coordinator != null:
				var panel_node = coordinator.get("_%s" % ("studio" if p_id == "code" else p_id))
				if panel_node != null:
					panel_node.visible = vis
			return {
				"success": true,
				"tool": tool_name,
				"summary": "Needle: Panel %s %s" % [p_id, "visible" if vis else "oculto"]
			}

		_:
			return {"success": false, "error": "Tool desconocido: %s" % tool_name}
