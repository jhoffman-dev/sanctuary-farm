## A SaveStore that keeps the farm in a field. It can refuse writes, and it can
## hold each write until the test calls release() — a store that answers later,
## as a network store would, so the facade's queueing can be watched.
extends SaveStore

## Emitted by release() to let one held write finish.
signal released

var stored: Variant = null
## Every farm accepted, in order.
var saved: Array[Dictionary] = []
var refuse_writes := false
## Refuse only the next write, then accept again.
var refuse_next := false
## Hold each write until release().
var hold_writes := false
## How many writes are waiting for release().
var held := 0


func _init(initial: Variant = null) -> void:
	stored = initial


func load_farm() -> Variant:
	return stored


func save_farm(farm: Dictionary) -> Error:
	if hold_writes:
		held += 1
		await released
		held -= 1
	if refuse_writes or refuse_next:
		refuse_next = false
		return ERR_FILE_CANT_WRITE
	stored = farm
	saved.append(farm)
	return OK


func release() -> void:
	released.emit()
