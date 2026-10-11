## SaveStore on Godot's per-user storage: a JSON file under `user://` (on the
## web export that is IndexedDB). The schema version is in both the file name
## and the blob, so a future v2 never misreads a v1 save.
class_name UserFileSaveStore
extends SaveStore

const DEFAULT_PATH := "user://farm-save.v1.json"

var _path: String


func _init(path: String = DEFAULT_PATH) -> void:
	_path = path


func load_progress() -> FarmProgress:
	if not FileAccess.file_exists(_path):
		return null
	# An unreadable file reads as "" and decodes to null: a fresh farm.
	return FarmProgressCodec.decode(FileAccess.get_file_as_string(_path))


func save_progress(progress: FarmProgress) -> Error:
	var file := FileAccess.open(_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	var written := file.store_string(FarmProgressCodec.encode(progress))
	file.close()
	return OK if written else ERR_FILE_CANT_WRITE
