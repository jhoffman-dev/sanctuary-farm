## Port: wall-clock time, the only way the application learns what time it is.
## Answer latency and session-log times are read from it.
## Adapters: SystemClock (adapters/). Tests: FakeClock (tests/fakes/).
class_name Clock
extends RefCounted


## Epoch milliseconds. It may step backwards (a corrected system clock); the
## use-cases guard against that rather than trusting it.
func now_msec() -> int:
	push_error("Clock.now_msec() is abstract; inject an adapter or a fake")
	return 0
