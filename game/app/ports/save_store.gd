## Port: where the farm's progress is kept between visits.
## Adapters: UserFileSaveStore (adapters/). Tests: InMemorySaveStore (tests/fakes/).
class_name SaveStore
extends RefCounted


## The saved progress, or null when there is none or it cannot be trusted.
## Never fails loudly: a bad save means a fresh farm, not a crash.
func load_progress() -> FarmProgress:
	push_error("SaveStore.load_progress() is abstract")
	return null


## OK, or the engine error that stopped the write.
func save_progress(_progress: FarmProgress) -> Error:
	push_error("SaveStore.save_progress() is abstract")
	return FAILED
