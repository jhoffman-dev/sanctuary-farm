## Port: a monotonic millisecond clock, used to measure answer latency.
## Adapters: SystemClock (adapters/). Tests: FakeClock (tests/fakes/).
class_name Clock
extends RefCounted


## Subclasses override this. The base is never meant to be called.
func now_msec() -> int:
	push_error("Clock.now_msec() is abstract; inject an adapter or a fake")
	return 0
