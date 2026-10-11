## Port: where the farm is kept between visits. An implementation may finish
## at once (a file) or later (a network store, with `await` inside), so the
## application always awaits both calls.
## Adapters: UserFileSaveStore (adapters/). Tests: InMemorySaveStore (tests/fakes/).
class_name SaveStore
extends RefCounted


## The saved FarmSave dictionary, or null when there is none or it cannot be
## trusted. Never fails loudly: a bad save means a fresh farm, not a crash.
func load_farm() -> Variant:
	push_error("SaveStore.load_farm() is abstract")
	return null


## OK once the farm is stored, or the engine error that stopped the write.
func save_farm(_farm: Dictionary) -> Error:
	push_error("SaveStore.save_farm() is abstract")
	return FAILED
