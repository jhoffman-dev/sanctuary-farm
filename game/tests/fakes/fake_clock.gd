## A clock the test moves by hand. `step` > 0 makes it move on every reading,
## as a real clock does between two calls.
extends Clock

var now := 0
var step := 0


func _init(start: int = 0) -> void:
	now = start


func now_msec() -> int:
	now += step
	return now


func advance(msec: int) -> void:
	now += msec
