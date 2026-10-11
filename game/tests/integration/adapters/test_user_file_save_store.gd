## Round-trips through the real user:// filesystem.
extends GutTest

const TEST_PATH := "user://test-farm-save.v1.json"
const MISSING_DIR_PATH := "user://no-such-folder/farm-save.v1.json"

var _store: UserFileSaveStore


func before_each() -> void:
	_remove_test_file()
	_store = UserFileSaveStore.new(TEST_PATH)


func after_each() -> void:
	_remove_test_file()


func _remove_test_file() -> void:
	if FileAccess.file_exists(TEST_PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(TEST_PATH))


func _write_raw(text: String) -> void:
	var file := FileAccess.open(TEST_PATH, FileAccess.WRITE)
	file.store_string(text)
	file.close()


func test_no_file_means_no_save() -> void:
	assert_null(_store.load_progress())


func test_progress_round_trips() -> void:
	assert_eq(_store.save_progress(FarmProgress.new(42, 17)), OK)
	var loaded := UserFileSaveStore.new(TEST_PATH).load_progress()
	assert_eq(loaded.coins, 42)
	assert_eq(loaded.questions_answered, 17)


func test_a_later_save_replaces_an_earlier_one() -> void:
	_store.save_progress(FarmProgress.new(1, 1))
	_store.save_progress(FarmProgress.new(9, 5))
	assert_eq(_store.load_progress().coins, 9)


func test_a_corrupted_file_loads_as_a_fresh_farm() -> void:
	_write_raw("{\"version\": 1, \"coins\": 4")
	assert_null(_store.load_progress())


func test_an_empty_file_loads_as_a_fresh_farm() -> void:
	_write_raw("")
	assert_null(_store.load_progress())


func test_binary_garbage_loads_as_a_fresh_farm() -> void:
	var file := FileAccess.open(TEST_PATH, FileAccess.WRITE)
	file.store_buffer(PackedByteArray([0xFF, 0x00, 0xFE, 0x7B, 0x80]))
	file.close()
	assert_null(_store.load_progress())


func test_a_folder_that_does_not_exist_refuses_the_write_without_crashing() -> void:
	var store := UserFileSaveStore.new(MISSING_DIR_PATH)
	assert_ne(store.save_progress(FarmProgress.new(1, 1)), OK)
	assert_null(store.load_progress())


func test_the_default_path_is_per_user_and_versioned() -> void:
	assert_string_starts_with(UserFileSaveStore.DEFAULT_PATH, "user://")
	assert_string_contains(UserFileSaveStore.DEFAULT_PATH, ".v%d." % FarmProgressCodec.SCHEMA_VERSION)
