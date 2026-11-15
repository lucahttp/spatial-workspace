extends Node

func _ready() -> void:
	print("--- Capture runner started ---")
	var scene: PackedScene = load("res://scenes/ui/web_preview_2d.tscn")
	var preview := scene.instantiate()
	add_child(preview)
	
	for i in range(10):
		await get_tree().process_frame
		
	var img := get_viewport().get_texture().get_image()
	if img != null:
		img.save_png("/tmp/web_preview_captured.png")
		print("SUCCESS: saved /tmp/web_preview_captured.png, size: ", img.get_size())
	else:
		print("FAILED: image is null")
	get_tree().quit()
