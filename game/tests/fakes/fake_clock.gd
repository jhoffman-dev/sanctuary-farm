## A clock the test moves by hand.
extends Clock

var now := 0


func now_msec() -> int:
	return now


func advance(msec: int) -> void:
	now += msec
