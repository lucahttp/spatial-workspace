extends Control
## Web Preview 2D panel: an interactive spatial browser window connected to
## Deno Web & Celld V8 sandbox and wZed CodeStudio.
##
## Features:
##   - Browser navigation: Back, Forward, Reload, Home, URL bar with lock icon.
##   - Three views: Live App Preview, Deno/Celld Terminal Console, and VFS Inspector.
##   - Live interactive DOM components (reactive counter, buttons) testable in VR.
##   - Real-time HMR updates triggered when Code Studio executes files.
##   - Disables Android virtual keyboard on LineEdit to prevent VR focus hijacking.

signal url_changed(url: String)
signal bookmark_toggled(favorite: bool)
signal run_file_requested(file_name: String)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")
const SpatialAudioScript := preload("res://scripts/audio/spatial_audio.gd")

const DEFAULT_URL := "http://localhost:5173/preview"
const WOLVIC_URL := "https://wolvic.com/webxr-layers"
const DEEPSEEK_URL := "https://github.com/deepseek-ai/deepseek-harness"
const DOCS_URL := "http://localhost:5173/docs/wzed"

# Top Navigation Controls
@onready var _back_button: Button = %BackButton
@onready var _forward_button: Button = %ForwardButton
@onready var _reload_button: Button = %ReloadButton
@onready var _home_button: Button = %HomeButton
@onready var _url_edit: LineEdit = %UrlEdit
@onready var _lock_icon: Label = %LockIcon
@onready var _live_badge: Label = %LiveBadge
@onready var _favorite_button: Button = %FavoriteButton

# Tabs
@onready var _tab_preview: Button = %TabPreview
@onready var _tab_console: Button = %TabConsole
@onready var _tab_vfs: Button = %TabVfs
@onready var _hmr_status: Label = %HmrStatus

# Views
@onready var _preview_view: Control = %PreviewView
@onready var _console_view: Control = %ConsoleView
@onready var _vfs_view: Control = %VfsView

# Preview View Elements
@onready var _title: Label = %TitleLabel
@onready var _summary: Label = %SummaryLabel
@onready var _dec_button: Button = %DecButton
@onready var _inc_button: Button = %IncButton
@onready var _reset_counter_btn: Button = %ResetCounterBtn
@onready var _count_display: Label = %CountDisplay
@onready var _widget_state: Label = %WidgetStateLabel
@onready var _quick1: Button = %QuickBtn1
@onready var _quick2: Button = %QuickBtn2
@onready var _quick3: Button = %QuickBtn3
@onready var _quick4: Button = %QuickBtn4
@onready var _progress: ProgressBar = %ReadingProgress

# Console View Elements
@onready var _console_output: RichTextLabel = %ConsoleOutput
@onready var _clear_console_btn: Button = %ClearConsoleBtn
@onready var _restart_dev_btn: Button = %RestartDevBtn

# VFS View Elements
@onready var _vfs_file_list: ItemList = %VfsFileList
@onready var _vfs_preview_text: RichTextLabel = %VfsPreviewText
@onready var _execute_file_btn: Button = %ExecuteFileBtn

# Status Bar
@onready var _status: Label = %StatusLabel

var _favorite := false
var _counter_value := 0
var _history: Array[String] = []
var _history_index := -1
var _selected_vfs_file := "index.js"

const VFS_FILES: Dictionary = {
	"index.js": "[color=#60a5fa]// Punto de entrada wZed Spatial App[/color]\n[color=#c084fc]import[/color] { SpatialAnchor, SceneNode } [color=#c084fc]from[/color] [color=#34d399]'wzed/spatial'[/color];\n\n[color=#c084fc]export default[/color] [color=#f59e0b]function[/color] [color=#38bdf8]initSpace[/color]() {\n  [color=#f59e0b]const[/color] anchor = [color=#c084fc]new[/color] SpatialAnchor({ position: [0, 1.4, -1.2] });\n  anchor.attach([color=#c084fc]new[/color] SceneNode([color=#34d399]'ReactiveCard'[/color]));\n  [color=#38bdf8]console[/color].log([color=#34d399]'[deno:v8] 3 anclajes compilados'[/color]);\n}",
	"spatial-card.js": "[color=#60a5fa]// Generador de Tarjetas Reactivas 3D[/color]\n[color=#c084fc]import[/color] { defineComponent } [color=#c084fc]from[/color] [color=#34d399]'wzed/dom'[/color];\n\n[color=#c084fc]export const[/color] SpatialCard = defineComponent({\n  name: [color=#34d399]'InteractiveCounter'[/color],\n  state: { count: 0 },\n  render(state) {\n    [color=#c084fc]return[/color] [color=#34d399]`<div class=\"glass-card\">Clicks: ${state.count}</div>`[/color];\n  }\n});",
	"index.html": "<!DOCTYPE html>\n<html>\n  <head><title>Deno Spatial WebXR App</title></head>\n  <body style=\"background:#0b0d19;color:#fff;\">\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/index.js\"></script>\n  </body>\n</html>",
	"deno.json": "{\n  \"name\": \"deno-spatial-workspace\",\n  \"version\": \"2.0.0\",\n  \"compilerOptions\": { \"jsx\": \"react-jsx\" },\n  \"tasks\": { \"dev\": \"deno run --allow-net --allow-read index.js\" }\n}",
}


func _ready() -> void:
	theme = THEME

	if _url_edit != null:
		_url_edit.virtual_keyboard_enabled = false
		_url_edit.text_submitted.connect(_on_url_submitted)

	_setup_nav_buttons()
	_setup_tabs()
	_setup_interactive_widget()
	_setup_quick_links()
	_setup_console()
	_setup_vfs()

	_navigate_to(DEFAULT_URL, true, false)


func _setup_nav_buttons() -> void:
	if _back_button != null:
		_back_button.pressed.connect(_on_back_pressed)
	if _forward_button != null:
		_forward_button.pressed.connect(_on_forward_pressed)
	if _reload_button != null:
		_reload_button.pressed.connect(_on_reload_pressed)
	if _home_button != null:
		_home_button.pressed.connect(func() -> void: _navigate_to(DEFAULT_URL))
	if _favorite_button != null:
		_favorite_button.pressed.connect(_on_favorite_pressed)


func _setup_tabs() -> void:
	if _tab_preview != null:
		_tab_preview.pressed.connect(func() -> void: _switch_tab("preview"))
	if _tab_console != null:
		_tab_console.pressed.connect(func() -> void: _switch_tab("console"))
	if _tab_vfs != null:
		_tab_vfs.pressed.connect(func() -> void: _switch_tab("vfs"))


func _switch_tab(tab_name: String) -> void:
	SpatialAudioScript.play_click(get_tree())
	if _preview_view != null:
		_preview_view.visible = tab_name == "preview"
	if _console_view != null:
		_console_view.visible = tab_name == "console"
	if _vfs_view != null:
		_vfs_view.visible = tab_name == "vfs"

	if _tab_preview != null:
		_tab_preview.button_pressed = tab_name == "preview"
	if _tab_console != null:
		_tab_console.button_pressed = tab_name == "console"
	if _tab_vfs != null:
		_tab_vfs.button_pressed = tab_name == "vfs"


func _setup_interactive_widget() -> void:
	if _dec_button != null:
		_dec_button.pressed.connect(func() -> void: _update_counter(-1))
	if _inc_button != null:
		_inc_button.pressed.connect(func() -> void: _update_counter(+1))
	if _reset_counter_btn != null:
		_reset_counter_btn.pressed.connect(func() -> void:
			_counter_value = 0
			_refresh_counter_ui("Contador reiniciado")
		)


func _update_counter(delta: int) -> void:
	SpatialAudioScript.play_click(get_tree())
	_counter_value += delta
	_refresh_counter_ui("Estado actualizado: %d" % _counter_value)
	_log_console("[color=#38bdf8][deno:state][/color] Counter modificado -> [b]%d[/b]" % _counter_value)


func _refresh_counter_ui(state_msg: String) -> void:
	if _count_display != null:
		_count_display.text = "Clicks: %d" % _counter_value
	if _widget_state != null:
		_widget_state.text = "Estado: %s" % state_msg


func _setup_quick_links() -> void:
	if _quick1 != null:
		_quick1.pressed.connect(func() -> void: _navigate_to(DEFAULT_URL))
	if _quick2 != null:
		_quick2.pressed.connect(func() -> void: _navigate_to(WOLVIC_URL))
	if _quick3 != null:
		_quick3.pressed.connect(func() -> void: _navigate_to(DEEPSEEK_URL))
	if _quick4 != null:
		_quick4.pressed.connect(func() -> void: _navigate_to(DOCS_URL))


func _setup_console() -> void:
	if _clear_console_btn != null:
		_clear_console_btn.pressed.connect(func() -> void:
			SpatialAudioScript.play_click(get_tree())
			if _console_output != null:
				_console_output.clear()
		)
	if _restart_dev_btn != null:
		_restart_dev_btn.pressed.connect(func() -> void:
			SpatialAudioScript.play_click(get_tree())
			_log_console("[color=#f59e0b][deno:isolate][/color] Reiniciando V8 isolate en memfs...")
			_log_console("[color=#34d399][deno:ready][/color] Isolate listo en 3.1ms · HMR escuchando en :5173")
		)

	_log_console("[color=#34d399][deno:v8][/color] V8 Isolate arrancado en 2.8ms")
	_log_console("[color=#60a5fa][celld:daemon][/color] Actor Celld sincronizado con SQLite memfs")
	_log_console("[color=#c084fc][deno:serve][/color] Servidor HTTP escuchando en http://localhost:5173")


func _log_console(bbcode_line: String) -> void:
	if _console_output != null:
		var time := Time.get_time_string_from_system()
		_console_output.append_text("[color=#64748b][%s][/color] %s\n" % [time, bbcode_line])


func _setup_vfs() -> void:
	if _vfs_file_list != null:
		_vfs_file_list.clear()
		for file in VFS_FILES.keys():
			_vfs_file_list.add_item("📄 " + file)
		_vfs_file_list.item_selected.connect(_on_vfs_file_selected)
		if _vfs_file_list.item_count > 0:
			_vfs_file_list.select(0)
			_on_vfs_file_selected(0)

	if _execute_file_btn != null:
		_execute_file_btn.pressed.connect(func() -> void:
			SpatialAudioScript.play_click(get_tree())
			run_file_requested.emit(_selected_vfs_file)
			display_runner_output(_selected_vfs_file, "Ejecutado %s con compilación JIT V8" % _selected_vfs_file)
		)


func _on_vfs_file_selected(index: int) -> void:
	if _vfs_file_list == null or _vfs_preview_text == null:
		return
	var item_text := _vfs_file_list.get_item_text(index).trim_prefix("📄 ")
	_selected_vfs_file = item_text
	var info: String = VFS_FILES.get(item_text, "Sin información disponible.")
	_vfs_preview_text.text = "[b]/workspace/%s:[/b]\n\n%s" % [item_text, info]


# --- Browser Navigation -----------------------------------------------------

func _navigate_to(url: String, record_history := true, play_audio := true) -> void:
	if play_audio:
		SpatialAudioScript.play_click(get_tree())
	if record_history:
		_history = _history.slice(0, _history_index + 1)
		_history.append(url)
		_history_index = _history.size() - 1

	if _url_edit != null:
		_url_edit.text = url

	if url.begins_with("https://"):
		if _lock_icon != null:
			_lock_icon.text = "🔒"
		if _live_badge != null:
			_live_badge.text = "🌐 WebXR"
	elif url.contains("localhost:5173"):
		if _lock_icon != null:
			_lock_icon.text = "⚡"
		if _live_badge != null:
			_live_badge.text = "🟢 Deno :5173"
	else:
		if _lock_icon != null:
			_lock_icon.text = "📄"
		if _live_badge != null:
			_live_badge.text = "📦 VFS"

	_update_content_for_url(url)
	_log_console("[color=#38bdf8][browser:nav][/color] Navegando a %s" % url)

	if _status != null:
		_status.text = "Cargado: %s" % url

	url_changed.emit(url)


func _update_content_for_url(url: String) -> void:
	if url.contains("localhost:5173"):
		if _title != null:
			_title.text = "Deno Spatial App (TypeScript + WebXR)"
		if _summary != null:
			_summary.text = "Servidor Deno Web y Celld V8 activo en VFS. Aplicación reactiva lista para interactuar."
		if _progress != null:
			_progress.value = 100
	elif url.contains("wolvic"):
		if _title != null:
			_title.text = "Wolvic & WebXR Layers"
		if _summary != null:
			_summary.text = "Integración de navegador espacial multi-ventana, composición de capas WebXR y puente SystemBridge."
		if _progress != null:
			_progress.value = 85
	elif url.contains("deepseek"):
		if _title != null:
			_title.text = "DeepSeek Harness Architecture"
		if _summary != null:
			_summary.text = "Meta-framework agéntico: Agent = Model + Harness. Ejecución desacoplada, tool-calling y sandbox seguro."
		if _progress != null:
			_progress.value = 95
	elif url.contains("docs"):
		if _title != null:
			_title.text = "Documentación wZed & Deno VFS"
		if _summary != null:
			_summary.text = "Guía completa de arquitectura de ejecución espacial, anclajes 3D y orquestación con MiniMax."
		if _progress != null:
			_progress.value = 100
	elif url.contains("duckduckgo.com") or url.contains("google.com") or url.contains("search") or url.contains("?q="):
		var q := "Búsqueda Web"
		if url.contains("?q="):
			q = url.split("?q=")[1].split("&")[0].uri_decode()
		if _title != null:
			_title.text = "🔍 Búsqueda: \"%s\"" % q
		if _summary != null:
			_summary.text = "Resultados web para \"%s\". Explora documentación técnica, repositorios y guías en el navegador espacial." % q
		if _progress != null:
			_progress.value = 100


func _on_url_submitted(new_url: String) -> void:
	_navigate_to(new_url)


func _on_back_pressed() -> void:
	if _history_index > 0:
		_history_index -= 1
		_navigate_to(_history[_history_index], false)


func _on_forward_pressed() -> void:
	if _history_index < _history.size() - 1:
		_history_index += 1
		_navigate_to(_history[_history_index], false)


func _on_reload_pressed() -> void:
	var current := get_url()
	_log_console("[color=#f59e0b][browser:reload][/color] Recargando %s..." % current)
	_navigate_to(current, false)


func _on_favorite_pressed() -> void:
	_favorite = not _favorite
	if _favorite_button != null:
		_favorite_button.text = "★" if _favorite else "☆"
	bookmark_toggled.emit(_favorite)


func is_favorite() -> bool:
	return _favorite


func get_url() -> String:
	return _url_edit.text if _url_edit != null else DEFAULT_URL


## Displays document or reference card information from the 3D Carousel.
func display_document(doc_title: String, doc_summary: String, url: String = "") -> void:
	var target_url := url if url != "" else "doc://workspace/%s" % doc_title.to_lower().replace(" ", "-")
	_navigate_to(target_url)

	if _title != null:
		_title.text = doc_title
	if _summary != null:
		_summary.text = doc_summary
	if _status != null:
		_status.text = "Visualizando: %s" % doc_title
	if _progress != null:
		_progress.value = 100


## Displays code execution results from CodeStudio wZed.
func display_runner_output(file_name: String, summary: String) -> void:
	var runner_url := "http://localhost:5173/vfs/%s" % file_name
	_navigate_to(runner_url)

	if _title != null:
		_title.text = "⚡ Deno Web Live: %s" % file_name
	if _summary != null:
		_summary.text = summary
	if _widget_state != null:
		_widget_state.text = "HMR Activo: %s actualizado" % file_name
	if _status != null:
		_status.text = "✅ Compilado y recargado con Deno/Celld VFS"
	if _progress != null:
		_progress.value = 100

	_log_console("[color=#34d399][deno:hmr][/color] Hot-reloaded [b]%s[/b] desde wZed CodeStudio" % file_name)
	_log_console("[color=#60a5fa][deno:runner][/color] %s" % summary)

	if _hmr_status != null:
		_hmr_status.text = "⚡ Deno HMR: %s" % file_name


## Displays a web search query and renders search results in the browser window.
func display_search_results(query: String, custom_summary: String = "") -> void:
	var encoded_query := query.uri_encode()
	var search_url := "https://duckduckgo.com/?q=%s" % encoded_query
	_navigate_to(search_url)

	if _title != null:
		_title.text = "🔍 Búsqueda: \"%s\"" % query
	if _summary != null:
		if not custom_summary.is_empty():
			_summary.text = custom_summary
		else:
			_summary.text = "Resultados web para \"%s\". Explora documentación técnica, repositorios y guías en el navegador espacial." % query
	if _widget_state != null:
		_widget_state.text = "Búsqueda activa: %s" % query
	if _status != null:
		_status.text = "Resultados encontrados para: %s" % query
	if _progress != null:
		_progress.value = 100

	_log_console("[color=#38bdf8][browser:search][/color] Consulta web: [b]%s[/b]" % query)
	_log_console("[color=#34d399][browser:results][/color] Desplegados resultados para \"%s\" vía DuckDuckGo / WebXR" % query)
