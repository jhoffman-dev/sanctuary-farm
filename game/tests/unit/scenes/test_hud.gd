## Component test: the HUD shows coins and a sound toggle a keyboard can reach.
extends GutTest

const HudScene := preload("res://scenes/ui/hud.tscn")

var _hud: Hud
var _button: Button


func before_each() -> void:
	_hud = HudScene.instantiate()
	add_child_autofree(_hud)
	_button = _hud.get_node("%MuteButton")
	watch_signals(_hud)


func _pointer_release() -> InputEventMouseButton:
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = false
	return event


func test_shows_the_coin_count() -> void:
	_hud.show_coins(12)
	assert_eq(_hud.get_node("%CoinsLabel").text, "Coins: 12")


func test_the_toggle_says_whether_sound_is_on() -> void:
	_hud.show_muted(false)
	assert_eq([_button.text, _button.button_pressed], ["Sound: on", false])
	_hud.show_muted(true)
	assert_eq([_button.text, _button.button_pressed], ["Sound: off", true])


func test_the_toggle_is_named_for_screen_readers_and_reachable_by_tab() -> void:
	assert_eq(_button.accessibility_name, "Sound on/off")
	assert_eq(_button.focus_mode, Control.FOCUS_ALL)


func test_pressing_the_toggle_asks_to_flip_sound() -> void:
	_button.pressed.emit()
	assert_signal_emit_count(_hud, "mute_toggled", 1)


func test_showing_the_state_does_not_ask_to_flip_it() -> void:
	_hud.show_muted(true)
	assert_signal_not_emitted(_hud, "mute_toggled")


func test_a_pointer_press_does_not_leave_the_toggle_holding_enter() -> void:
	_button.grab_focus()
	_button.gui_input.emit(_pointer_release())
	await wait_process_frames(1)
	assert_false(_button.has_focus())
