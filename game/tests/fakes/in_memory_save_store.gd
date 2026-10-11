## A SaveStore that keeps progress in a field and can be told to refuse writes.
extends SaveStore

var stored: FarmProgress = null
var save_count := 0
var refuse_writes := false


func load_progress() -> FarmProgress:
	return stored


func save_progress(progress: FarmProgress) -> Error:
	if refuse_writes:
		return ERR_FILE_CANT_WRITE
	stored = progress
	save_count += 1
	return OK
