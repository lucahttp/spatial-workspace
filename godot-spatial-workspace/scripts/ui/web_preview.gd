extends Control
## Web Preview 2D panel: a spatial browser window showing the WebXR preview
## card (Wolvic & WebXR Layers) with a URL bar, bookmark stars and a reading
## progress bar.

signal url_changed(url: String)
signal bookmark_toggled(favorite: bool)

const THEME := preload("res://assets/themes/vaporwave_sunset.tres")

const INITIAL_URL := "https://wolvic.com/webxr-layers"
const INITIAL_TITLE := "Wolvic & WebXR Layers"
const INITIAL_SUMMARY := "Integración de navegador espacial multi-ventana y puente nativo SystemBridge."

@onready var _title: Label = %TitleLabel
@onready var _url_edit: LineEdit = %UrlEdit
@onready var _favorite_button: Button = %FavoriteButton
@onready var _progress: ProgressBar = %ReadingProgress
@onready var _summary: Label = %SummaryLabel
@onready var _status: Label = %StatusLabel

var _favorite := false
var _progress_value := 40


func _ready() -> void:
	theme = THEME
	_url_edit.text = INITIAL_URL
	_title.text = INITIAL_TITLE
	_summary.text = INITIAL_SUMMARY
	_progress.value = _progress_value
	_favorite_button.text = "☆"
	_status.text = "Cargando %s…" % INITIAL_URL
	_url_edit.text_submitted.connect(_on_url_submitted)
	_favorite_button.pressed.connect(_on_favorite_pressed)
	_progress.value_changed.connect(_on_progress_changed)


func _on_url_submitted(url: String) -> void:
	_status.text = "Cargando %s…" % url
	url_changed.emit(url)


func _on_favorite_pressed() -> void:
	_favorite = not _favorite
	_favorite_button.text = "★" if _favorite else "☆"
	bookmark_toggled.emit(_favorite)


func _on_progress_changed(value: float) -> void:
	_progress_value = value
	_status.text = "Lectura %d%% · %s" % [int(value), INITIAL_TITLE]


## True when the card is bookmarked.
func is_favorite() -> bool:
	return _favorite


func get_url() -> String:
	return _url_edit.text


## Displays document or reference card information.
func display_document(doc_title: String, doc_summary: String, url: String = "") -> void:
	if _title != null:
		_title.text = doc_title
	if _summary != null:
		_summary.text = doc_summary
	if _url_edit != null:
		_url_edit.text = url if url != "" else "doc://workspace/%s" % doc_title.to_lower().replace(" ", "-")
	if _status != null:
		_status.text = "Visualizando: %s" % doc_title
	if _progress != null:
		_progress.value = 100


## Displays code execution results from CodeStudio wZed.
func display_runner_output(file_name: String, summary: String) -> void:
	if _title != null:
		_title.text = "Ejecución: %s" % file_name
	if _summary != null:
		_summary.text = summary
	if _url_edit != null:
		_url_edit.text = "vfs://runtime/%s" % file_name
	if _status != null:
		_status.text = "✅ Compilado y ejecutado en wZed VFS"
	if _progress != null:
		_progress.value = 100
