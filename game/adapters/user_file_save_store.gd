## SaveStore on Godot's per-user storage: a JSON file under `user://` (on the
## web export that is IndexedDB). The schema version is in both the file name
## and the blob, so a future v4 never misreads a v3 save.
class_name UserFileSaveStore
extends SaveStore

const DEFAULT_PATH := "user://farm-save.v3.json"

var _path: String


func _init(path: String = DEFAULT_PATH) -> void:
	_path = path


func load_farm() -> Variant:
	if not FileAccess.file_exists(_path):
		return null
	# An unreadable file reads as "" and decodes to null: a fresh farm.
	return FarmSaveCodec.decode(FileAccess.get_file_as_string(_path))


func save_farm(farm: Dictionary) -> Error:
	var file := FileAccess.open(_path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	var written := file.store_string(FarmSaveCodec.encode(farm))
	file.close()
	return OK if written else ERR_FILE_CANT_WRITE
