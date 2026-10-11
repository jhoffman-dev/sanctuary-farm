## SaveStore on Godot's per-user storage: a JSON file under `user://` (on the
## web export that is IndexedDB). The schema version is in both the file name
## and the blob, so an older build never misreads a newer save. The player's
## own save carries forward: with no v4 file yet, the v3 one is read (and the
## codec migrates it); the next save writes v4 and leaves the v3 file alone.
class_name UserFileSaveStore
extends SaveStore

const DEFAULT_PATH := "user://farm-save.v4.json"
const V3_PATH := "user://farm-save.v3.json"

var _path: String
var _earlier_path: String


## `earlier_path` is read when `path` has no file yet. The default store reads
## V3_PATH; a store at any other path (a test's) has no history unless given one.
func _init(path: String = DEFAULT_PATH, earlier_path: String = "") -> void:
	_path = path
	_earlier_path = V3_PATH if path == DEFAULT_PATH and earlier_path.is_empty() else earlier_path


func load_farm() -> Variant:
	for candidate in [_path, _earlier_path]:
		if not candidate.is_empty() and FileAccess.file_exists(candidate):
			# An unreadable file reads as "" and decodes to null: a fresh farm.
			return FarmSaveCodec.decode(FileAccess.get_file_as_string(candidate))
	return null


func save_farm(farm: Dictionary) -> Error:
	var file := FileAccess.open(_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	var written := file.store_string(FarmSaveCodec.encode(farm))
	file.close()
	return OK if written else ERR_FILE_CANT_WRITE
