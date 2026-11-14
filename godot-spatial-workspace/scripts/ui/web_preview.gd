extends Control
## Web Preview 2D panel: an interactive spatial browser window connected to
## NodePod (in-memory virtual container) and wZed CodeStudio.
##
## Features
## ---------
##   - Browser navigation: Back, Forward, Reload, Home, URL bar with lock icon.
##   - Three views: Live App Preview, NodePod Terminal Console, and VFS Inspector.
##   - Live interactive DOM components (reactive counter, buttons) testable in VR.
##   - Real-time HMR updates triggered when Code Studio executes files.
##   - Disables Android virtual keyboard on LineEdit to prevent VR focus hijacking.

signal url_changed(url: String)
signal bookmark_toggled(favorite: bool)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")

const DEFAULT_URL := "http://localhost:5173/preview"
const WOLVIC_URL := "https://wolvic.com/webxr-layers"
const DEEPSEEK_URL := "https://github.com/deepseek-ai/deepseek-harness"

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
@onready var _progress: ProgressBar = %ReadingProgress

# Console View Elements
@onready var _console_output: RichTextLabel = %ConsoleOutput
@onready var _clear_console_btn: Button = %ClearConsoleBtn
@onready var _restart_dev_btn: Button = %RestartDevBtn

# VFS View Elements
@onready var _vfs_file_list: ItemList = %VfsFileList
@onready var _vfs_preview_text: Label = %VfsPreviewText

# Status Bar
@onready var _status: Label = %StatusLabel

var _favorite := false
var _counter_value := 0
var _history: Array[String] = []
var _history_index := -1

const VFS_FILES: Dictionary = {
	"index.js": "Punto de entrada de la aplicación espacial wZed con definiciones de anclajes 3D.",
	"spatial-card.js": "Generador de tarjetas DOM y widgets reactivos compilados al vuelo.",
	"index.html": "<!DOCTYPE html>\n<html>\n  <head><title>NodePod App</title></head>\n  <body><div id=\"app\"></div></body>\n</html>",
	"package.json": "{\n  \"name\": \"nodepod-spatial-workspace\",\n  \"type\": \"module\",\n  \"dependencies\": {\n    \"vite\": \"^5.2.0\",\n    \"three\": \"^0.160.0\"\n  }\n}",
	"vite.config.js": "export default {\n  server: { host: '0.0.0.0', port: 5173, hmr: true }\n};",
}


func _ready() -> void:
	theme = THEME

	# Bug D Prevention: Prevent virtual keyboard from hijacking OpenXR focus
	if _url_edit != null:
		_url_edit.virtual_keyboard_enabled = false
		_url_edit.text_submitted.connect(_on_url_submitted)

	_setup_nav_buttons()
	_setup_tabs()
	_setup_interactive_widget()
	_setup_quick_links()
	_setup_console()
	_setup_vfs()

	_navigate_to(DEFAULT_URL)


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
	if _preview_view != null:
		_preview_view.visible = tab_name == "preview"
	if _console_view != null:
		_console_view.visible = tab_name == "console"
	if _vfs_view != null:
		_vfs_view.visible = tab_name == "vfs"

	if _tab_preview != null:
		_tab_preview.set_pressed_no_signal(tab_name == "preview")
	if _tab_console != null:
		_tab_console.set_pressed_no_signal(tab_name == "console")
	if _tab_vfs != null:
		_tab_vfs.set_pressed_no_signal(tab_name == "vfs")


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
	_counter_value += delta
	_refresh_counter_ui("Estado actualizado: %d" % _counter_value)


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


func _setup_console() -> void:
	if _clear_console_btn != null:
		_clear_console_btn.pressed.connect(func() -> void:
			if _console_output != null:
				_console_output.clear()
		)
	if _restart_dev_btn != null:
		_restart_dev_btn.pressed.connect(_restart_dev_server)

	_boot_console()


func _boot_console() -> void:
	if _console_output == null:
		return
	_console_output.clear()
	_log_console("[color=#42b883][deno:v8][/color] Deno / Celld V8 runtime activo en memoria VFS")
	_log_console("[color=#38bdf8][deno:vfs][/color] Montado /workspace (5 módulos TypeScript / ES)")
	_log_console("[color=#a78bfa][deno:serve][/color] Servidor Deno HTTP corriendo en:")
	_log_console("  ➜ Local:   [color=#38bdf8]http://localhost:5173/[/color]")
	_log_console("  ➜ Network: [color=#38bdf8]http://192.168.1.100:5173/[/color]")
	_log_console("[color=#34d399][celld:actor][/color] Durable Object Facet listo para hot-reload")


func _restart_dev_server() -> void:
	_log_console("[color=#f59e0b][deno:daemon][/color] Reiniciando runtime Deno Web...")
	_log_console("[color=#34d399][deno:serve][/color] Servidor reiniciado en 4ms (V8 Isolate).")
	if _status != null:
		_status.text = "Servidor Deno Web reiniciado · http://localhost:5173"


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


func _on_vfs_file_selected(index: int) -> void:
	if _vfs_file_list == null or _vfs_preview_text == null:
		return
	var item_text := _vfs_file_list.get_item_text(index).trim_prefix("📄 ")
	var info: String = VFS_FILES.get(item_text, "Sin información disponible.")
	_vfs_preview_text.text = "/workspace/%s:\n%s" % [item_text, info]


# --- Browser Navigation -----------------------------------------------------

func _navigate_to(url: String, record_history := true) -> void:
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
	elif url.begins_with("http://localhost"):
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
			_summary.text = "Servidor Deno Web / Celld activo en VFS. Aplicación reactiva lista para interactuar."
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

	# Add live HMR log to console
	_log_console("[color=#34d399][deno:hmr][/color] Hot-reloaded [b]%s[/b] desde wZed CodeStudio" % file_name)
	_log_console("[color=#60a5fa][deno:runner][/color] %s" % summary)

	# Flash HMR label
	if _hmr_status != null:
		_hmr_status.text = "⚡ Deno HMR: %s" % file_name
