## Clock on the system's wall clock, in epoch milliseconds. It can step
## backwards; FarmGame grades such an answer as slow rather than trusting it.
class_name SystemClock
extends Clock


func now_msec() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)
