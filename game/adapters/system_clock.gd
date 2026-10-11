## Clock on the engine's monotonic tick counter.
class_name SystemClock
extends Clock


func now_msec() -> int:
	return Time.get_ticks_msec()
