class_name AudioCaptureService
extends Node
## Hardware microphone capture, real-time energy metering, and Voice Activity Detection (VAD).
##
## Manages the "Record" AudioBus, attaches an AudioEffectCapture and AudioStreamMicrophone,
## and provides live volume levels and speech onset/offset events for VR voice agents.

signal volume_meter_updated(level: float)
signal speech_detected()
signal speech_finished()
signal permission_granted(granted: bool)

const BUS_NAME := "Record"
const SPEECH_THRESHOLD := 0.035
const SILENCE_THRESHOLD := 0.015
const MIN_SPEECH_DURATION := 0.25
const SILENCE_TIMEOUT := 1.2

var _capture_effect: AudioEffectCapture
var _mic_player: AudioStreamPlayer
var _is_speaking := false
var _speech_timer := 0.0
var _silence_timer := 0.0
var _smoothed_volume := 0.0
var _active := true


func _ready() -> void:
	_request_os_permissions()
	_setup_audio_bus()
	_setup_mic_player()


func _request_os_permissions() -> void:
	if OS.get_name() == "Android":
		var perms := OS.get_granted_permissions()
		if not perms.has("android.permission.RECORD_AUDIO"):
			OS.request_permissions()


func _setup_audio_bus() -> void:
	var idx := AudioServer.get_bus_index(BUS_NAME)
	if idx < 0:
		AudioServer.add_bus()
		idx = AudioServer.bus_count - 1
		AudioServer.set_bus_name(idx, BUS_NAME)
		AudioServer.set_bus_mute(idx, true) # Prevent feedback howling into speakers

	# Find or add AudioEffectCapture
	_capture_effect = null
	for effect_idx in range(AudioServer.get_bus_effect_count(idx)):
		var effect := AudioServer.get_bus_effect(idx, effect_idx)
		if effect is AudioEffectCapture:
			_capture_effect = effect
			break

	if _capture_effect == null:
		_capture_effect = AudioEffectCapture.new()
		_capture_effect.buffer_length = 0.5
		AudioServer.add_bus_effect(idx, _capture_effect)


func _setup_mic_player() -> void:
	_mic_player = AudioStreamPlayer.new()
	_mic_player.bus = BUS_NAME
	_mic_player.stream = AudioStreamMicrophone.new()
	add_child(_mic_player)
	_mic_player.play()


func _process(delta: float) -> void:
	if not _active or _capture_effect == null:
		return

	var frames_avail: int = _capture_effect.get_frames_available()
	var current_energy := 0.0

	if frames_avail > 0:
		var buffer: PackedVector2Array = _capture_effect.get_buffer(frames_avail)
		current_energy = calculate_rms_energy(buffer)

	# Smooth volume meter for UI equalizer
	_smoothed_volume = lerpf(_smoothed_volume, current_energy * 6.0, 0.35)
	_smoothed_volume = clampf(_smoothed_volume, 0.0, 1.0)
	volume_meter_updated.emit(_smoothed_volume)

	# VAD State Machine
	if _smoothed_volume >= SPEECH_THRESHOLD:
		_silence_timer = 0.0
		_speech_timer += delta
		if not _is_speaking and _speech_timer >= MIN_SPEECH_DURATION:
			_is_speaking = true
			speech_detected.emit()
	else:
		_speech_timer = 0.0
		if _is_speaking:
			_silence_timer += delta
			if _silence_timer >= SILENCE_TIMEOUT:
				_is_speaking = false
				speech_finished.emit()


func calculate_rms_energy(buffer: PackedVector2Array) -> float:
	var count := buffer.size()
	if count == 0:
		return 0.0
	var sum_squares := 0.0
	for sample in buffer:
		sum_squares += (sample.x * sample.x + sample.y * sample.y) * 0.5
	return sqrt(sum_squares / float(count))


func get_current_volume() -> float:
	return _smoothed_volume


func is_speech_active() -> bool:
	return _is_speaking


func set_active(active: bool) -> void:
	_active = active
	if not _active:
		_is_speaking = false
		_smoothed_volume = 0.0
		volume_meter_updated.emit(0.0)
