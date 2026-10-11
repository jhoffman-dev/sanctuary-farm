## The coin counter and the sound toggle in the corner. Renders what it is
## given; what a toggle means (and saving it) is FarmAudio's business.
class_name Hud
extends PanelContainer

## The player asked to flip sound on or off.
signal mute_toggled

@onready var _coins_label: Label = %CoinsLabel
@onready var _mute_button: Button = %MuteButton


func _ready() -> void:
	_mute_button.pressed.connect(mute_toggled.emit)
	_mute_button.gui_input.connect(_on_mute_gui_input)


func show_coins(coins: int) -> void:
	_coins_label.text = "Coins: %d" % coins


## Pressed means muted, as `aria-pressed` does on the web client's toggle.
func show_muted(muted: bool) -> void:
	_mute_button.set_pressed_no_signal(muted)
	_mute_button.text = "Sound: off" if muted else "Sound: on"


## The button takes keyboard focus so Tab reaches it, but a pointer press must
## not keep it: a focused button eats Enter, and Enter submits the pad's answer.
func _on_mute_gui_input(event: InputEvent) -> void:
	var pointer_up: bool = (event is InputEventMouseButton or event is InputEventScreenTouch) and not event.pressed
	if pointer_up:
		_mute_button.release_focus.call_deferred()
