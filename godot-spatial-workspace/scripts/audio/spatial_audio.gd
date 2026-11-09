class_name SpatialAudio
extends Node
## Procedural spatial audio service for XR interactions.
## Zero external audio assets, 100% synthesized offline via AudioStreamWAV.

static var _click_stream: AudioStreamWAV
static var _grab_stream: AudioStreamWAV
static var _release_stream: AudioStreamWAV
static var _chime_stream: AudioStreamWAV


static func _ensure_streams() -> void:
	if _click_stream != null:
		return
	_click_stream = _synth_sine(800.0, 400.0, 0.05, 0.15)
	_grab_stream = _synth_sine(700.0, 380.0, 0.08, 0.18)
	_release_stream = _synth_sine(320.0, 200.0, 0.06, 0.14)
	_chime_stream = _synth_triad([587.33, 880.0, 1174.66], 0.35, 0.16)


static func play_click(tree: SceneTree, at_pos: Vector3 = Vector3.ZERO) -> void:
	_ensure_streams()
	_play_stream(tree, _click_stream, at_pos)


static func play_grab(tree: SceneTree, at_pos: Vector3 = Vector3.ZERO) -> void:
	_ensure_streams()
	_play_stream(tree, _grab_stream, at_pos)


static func play_release(tree: SceneTree, at_pos: Vector3 = Vector3.ZERO) -> void:
	_ensure_streams()
	_play_stream(tree, _release_stream, at_pos)


static func play_chime(tree: SceneTree, at_pos: Vector3 = Vector3.ZERO) -> void:
	_ensure_streams()
	_play_stream(tree, _chime_stream, at_pos)


static func _play_stream(tree: SceneTree, stream: AudioStreamWAV, pos: Vector3) -> void:
	if tree == null or stream == null:
		return
	var root := tree.current_scene
	if root == null:
		return

	if pos != Vector3.ZERO:
		var player3d := AudioStreamPlayer3D.new()
		player3d.stream = stream
		player3d.position = pos
		player3d.unit_size = 1.5
		player3d.max_distance = 6.0
		player3d.bus = &"Master"
		root.add_child(player3d)
		player3d.play()
		player3d.finished.connect(player3d.queue_free)
	else:
		var player := AudioStreamPlayer.new()
		player.stream = stream
		player.bus = &"Master"
		root.add_child(player)
		player.play()
		player.finished.connect(player.queue_free)


## Synthesizes a mono 16-bit PCM sweep from freq_start to freq_end.
static func _synth_sine(freq_start: float, freq_end: float, duration: float, volume: float) -> AudioStreamWAV:
	var rate := 22050
	var count := int(duration * rate)
	var data := PackedByteArray()
	data.resize(count * 2)

	var phase := 0.0
	for i in range(count):
		var t := float(i) / float(count)
		var freq := lerpf(freq_start, freq_end, t)
		var envelope := (1.0 - t) * (1.0 - t)
		phase += freq * (TAU / rate)
		var sample := sin(phase) * volume * envelope
		var i16 := clampi(int(sample * 32767.0), -32768, 32767)
		data.encode_s16(i * 2, i16)

	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav


## Synthesizes a sequential harmonic chime triad.
static func _synth_triad(freqs: Array[float], duration: float, volume: float) -> AudioStreamWAV:
	var rate := 22050
	var count := int(duration * rate)
	var data := PackedByteArray()
	data.resize(count * 2)

	var note_duration := duration / float(freqs.size())
	var samples_per_note := int(note_duration * rate)

	var phase := 0.0
	for i in range(count):
		var note_idx := clampi(int(i / samples_per_note), 0, freqs.size() - 1)
		var freq := freqs[note_idx]
		var note_t := float(i % samples_per_note) / float(samples_per_note)
		var env := (1.0 - note_t)
		phase += freq * (TAU / rate)
		var sample := sin(phase) * volume * env
		var i16 := clampi(int(sample * 32767.0), -32768, 32767)
		data.encode_s16(i * 2, i16)

	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav
