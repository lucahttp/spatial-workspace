extends Control
## Code Studio 2D panel: a wZed-style IDE surface rendered inside a
## SubViewport so it works in 3D like any other Godot Control.
##
## Features
## ---------
##   - Top bar with file tabs (index.js / spatial-card.js), breadcrumbs and
##     a "▶ Ejecutar" button.
##   - Native Godot CodeEdit with line numbers and JS syntax highlighting
##     through a CodeHighlighter.
##   - A view rail (Editor / Explorador / Terminal / Ajustes). Every view
##     can be undocked into its own floating panel and docked back, the same
##     contract the WebXR build had.

signal run_requested(file_name: String)
signal view_docked(view_id: String, docked: bool)
signal detach_view_requested(view_id: String)

const JS_KEYWORDS := [
	"const", "let", "var", "function", "return", "if", "else", "for", "while",
	"of", "in", "new", "class", "extends", "import", "export", "from",
	"default", "async", "await", "try", "catch", "finally", "throw", "typeof",
	"instanceof", "this", "null", "true", "false", "break", "continue", "switch",
	"case", "delete", "void", "yield", "super",
]

const JS_MEMBER_KEYWORDS := ["this", "super"]

const COLOR_KEYWORD := Color(0.831, 0.302, 0.561)
const COLOR_MEMBER := Color(0.42, 0.55, 0.95)
const COLOR_FUNCTION := Color(0.22, 0.74, 0.98)
const COLOR_NUMBER := Color(0.98, 0.75, 0.14)
const COLOR_SYMBOL := Color(0.62, 0.45, 0.96)
const COLOR_COMMENT := Color(0.48, 0.53, 0.63)
const COLOR_STRING := Color(0.2, 0.85, 0.6)

## Sample files, mirrored from the WebXR virtual file system.
const FILES := {
	"index.js": "// ✨ Spatial In-Browser Runner (wZed Logic)\nconsole.log('⚡ Initializing Spatial Workspace Script...');\n\nconst anchors = [\n  { name: 'Vision Anchor', x: 0.0, y: 1.25, z: -1.25 },\n  { name: 'Mind Map Orb', x: -0.72, y: 1.45, z: -1.15 },\n  { name: 'Web Preview', x: 0.88, y: 1.25, z: -1.22 },\n];\n\nconsole.log(`📦 Created ${anchors.length} spatial reference nodes in 3D scene.`);\nanchors.forEach((a, i) => {\n  console.log(`  [${i + 1}] ${a.name} -> pos: (${a.x}, ${a.y}, ${a.z})`);\n});\n\nconsole.log('🎉 Execution completed successfully!');\nreturn { ok: true, nodeCount: anchors.length, anchors };\n",
	"spatial-card.js": "// 🎨 Generates DOM / HTML preview for Web Preview Card\nconsole.log('Rendering Spatial Card Widget...');\n\nconst html = `\n  <div style=\"font-family: system-ui, sans-serif; padding: 1.2rem;\">\n    <h2 style=\"color: #7c3aed; margin-top: 0;\">VisionOS Pastel Card</h2>\n    <p style=\"font-size: 13px; color: #475569;\">\n      Compilado en el navegador con el motor VFS de wZed.\n    </p>\n  </div>\n`;\n\nconsole.log('✅ HTML markup generated.');\nreturn html;\n",
}

## Tab order shown in the top bar.
const TABS := ["index.js", "spatial-card.js"]

## Views of the rail. Each one can float on its own.
const VIEWS := ["editor", "explorer", "terminal", "settings"]

@onready var _tabs: HBoxContainer = %Tabs
@onready var _breadcrumbs: Label = %Breadcrumbs
@onready var _run_button: Button = %RunButton
@onready var _editor: CodeEdit = %CodeEditor
@onready var _view_buttons: HBoxContainer = %ViewButtons
@onready var _view_stack: Control = %ViewStack
@onready var _explorer_list: ItemList = %ExplorerList
@onready var _terminal_output: RichTextLabel = %TerminalOutput
@onready var _status: Label = %StatusLabel

var _active_file := "index.js"
var _active_view := "editor"
var _solo_view := ""
var _undocked: Dictionary = {}


func _ready() -> void:
	if _editor != null:
		_editor.virtual_keyboard_enabled = false
	_build_highlighter()
	_build_tabs()
	_build_view_buttons()
	_explorer_list.clear()
	for name in FILES.keys():
		_explorer_list.add_item(name)
	_explorer_list.item_selected.connect(_on_file_selected)
	_run_button.pressed.connect(_on_run_pressed)
	_set_file(_active_file)
	_set_view("editor")
	_terminal_output.text = ""


# --- Code editor -----------------------------------------------------------

## JS syntax highlighting with the vaporwave palette.
func _build_highlighter() -> void:
	var highlighter := CodeHighlighter.new()
	for keyword in JS_KEYWORDS:
		highlighter.add_keyword_color(keyword, COLOR_KEYWORD)
	for keyword in JS_MEMBER_KEYWORDS:
		highlighter.add_member_keyword_color(keyword, COLOR_MEMBER)
	highlighter.add_color_region("/*", "*/", COLOR_COMMENT)
	highlighter.add_color_region("//", "", COLOR_COMMENT, true)
	highlighter.add_color_region("`", "`", COLOR_STRING)
	highlighter.add_color_region("\"", "\"", COLOR_STRING)
	highlighter.add_color_region("'", "'", COLOR_STRING)
	highlighter.number_color = COLOR_NUMBER
	highlighter.symbol_color = COLOR_SYMBOL
	highlighter.function_color = COLOR_FUNCTION
	highlighter.member_variable_color = COLOR_MEMBER
	_editor.syntax_highlighter = highlighter
	_editor.gutters_draw_line_numbers = true
	_editor.gutters_line_numbers_min_digits = 2


func _build_tabs() -> void:
	for child in _tabs.get_children():
		child.queue_free()
	for file_name in TABS:
		var tab := Button.new()
		tab.text = file_name
		tab.toggle_mode = true
		tab.button_pressed = file_name == _active_file
		tab.pressed.connect(_on_tab_pressed.bind(file_name))
		_tabs.add_child(tab)


func _build_view_buttons() -> void:
	for child in _view_buttons.get_children():
		child.queue_free()
	for view in VIEWS:
		var button := Button.new()
		button.text = view.capitalize()
		button.toggle_mode = true
		button.button_pressed = view == _active_view
		button.pressed.connect(_on_view_pressed.bind(view))
		_view_buttons.add_child(button)
	# Detach button: floats the current view into its own spatial panel.
	var detach := Button.new()
	detach.text = "↗ Desacoplar"
	detach.pressed.connect(_on_detach_pressed)
	_view_buttons.add_child(detach)


func _on_detach_pressed() -> void:
	detach_view_requested.emit(_active_view)


# --- State -----------------------------------------------------------------

func _on_tab_pressed(file_name: String) -> void:
	_set_file(file_name)


func _on_file_selected(index: int) -> void:
	var file_name := _explorer_list.get_item_text(index)
	_set_file(file_name)
	_set_view("editor")


func _set_file(file_name: String) -> void:
	_active_file = file_name
	var content: String = FILES.get(file_name, "")
	_editor.text = content
	_editor.set_caret_line(0)
	_breadcrumbs.text = "workspace > project > %s" % file_name
	for child in _tabs.get_children():
		var button := child as Button
		if button != null:
			button.set_pressed_no_signal(button.text == file_name)
	_status.text = "%s · %d líneas" % [file_name, content.split("\n").size()]


func _on_view_pressed(view: String) -> void:
	_set_view(view)


## Shows only one view and hides the rail: used when the view is detached
## into its own floating panel.
func set_solo_view(view_id: String) -> void:
	_solo_view = view_id
	_view_buttons.visible = false
	_set_view(view_id)


func _set_view(view: String) -> void:
	_active_view = view
	for child in _view_buttons.get_children():
		var button := child as Button
		if button != null:
			button.set_pressed_no_signal(button.text.to_lower() == view)
	var panel := _view_stack.get_node_or_null(view.capitalize() + "View")
	if panel != null:
		panel.visible = true
	for sibling in _view_stack.get_children():
		if sibling != panel:
			sibling.visible = false


# --- Run -------------------------------------------------------------------

func _on_run_pressed() -> void:
	_run_button.text = "▶ Ejecutando..."
	_terminal_output.append_text("[%s] $ node %s\n" % [_timestamp(), _active_file])
	var lines: PackedStringArray = FILES.get(_active_file, "").split("\n")
	var count := 0
	for line in lines:
		var trimmed: String = line.strip_edges()
		if trimmed.begins_with("console.log("):
			count += 1
			_terminal_output.append_text("  %s\n" % trimmed.trim_prefix("console.log(").trim_suffix(");"))
		elif trimmed.begins_with("//") or trimmed.is_empty():
			continue
		else:
			_terminal_output.append_text("  %s\n" % trimmed)
	_terminal_output.append_text("✅ %s completado (%d logs)\n" % [_active_file, count])
	_run_button.text = "▶ Ejecutar"
	_set_view("terminal")
	run_requested.emit(_active_file)


## The text shown in the terminal panel.
func get_terminal_output() -> String:
	return _terminal_output.get_parsed_text()


func _timestamp() -> String:
	return Time.get_time_string_from_system()


# --- Dock / undock ---------------------------------------------------------

## Marks a view as floating in the space. The workspace reads this to spawn
## the detached panel; docking it back removes it.
func set_view_docked(view_id: String, docked: bool) -> void:
	_undocked[view_id] = not docked
	view_docked.emit(view_id, docked)


func is_view_docked(view_id: String) -> bool:
	return not bool(_undocked.get(view_id, false))


func toggle_view_dock(view_id: String) -> void:
	set_view_docked(view_id, is_view_docked(view_id))
