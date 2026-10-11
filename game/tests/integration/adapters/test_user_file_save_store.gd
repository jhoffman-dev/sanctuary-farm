## Round-trips through the real user:// filesystem.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const TEST_PATH := "user://test-farm-save.v3.json"
const MISSING_DIR_PATH := "user://no-such-folder/farm-save.v3.json"

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


func _farm_with(coins: int) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": coins})


func test_no_file_means_no_save() -> void:
	assert_null(_store.load_farm())


func test_a_farm_round_trips_through_a_fresh_store() -> void:
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 42, "feed": 3})
	assert_eq(_store.save_farm(farm), OK)
	assert_eq(UserFileSaveStore.new(TEST_PATH).load_farm(), farm)


func test_a_later_save_replaces_an_earlier_one() -> void:
	_store.save_farm(_farm_with(1))
	_store.save_farm(_farm_with(9))
	assert_eq(_store.load_farm().coins, 9)


func test_two_stores_on_one_file_the_last_write_wins() -> void:
	var other := UserFileSaveStore.new(TEST_PATH)
	_store.save_farm(_farm_with(1))
	other.save_farm(_farm_with(2))
	_store.save_farm(_farm_with(3))
	other.save_farm(_farm_with(4))
	assert_eq(_store.load_farm().coins, 4)


func test_a_corrupted_file_loads_as_a_fresh_farm() -> void:
	_write_raw(FarmSaveCodec.encode(Fixtures.fresh_farm()).left(200))
	assert_null(_store.load_farm())


func test_an_empty_file_loads_as_a_fresh_farm() -> void:
	_write_raw("")
	assert_null(_store.load_farm())


func test_binary_garbage_loads_as_a_fresh_farm() -> void:
	var file := FileAccess.open(TEST_PATH, FileAccess.WRITE)
	file.store_buffer(PackedByteArray([0xFF, 0x00, 0xFE, 0x7B, 0x80]))
	file.close()
	assert_null(_store.load_farm())


func test_a_folder_that_does_not_exist_refuses_the_write_without_crashing() -> void:
	var store := UserFileSaveStore.new(MISSING_DIR_PATH)
	assert_ne(store.save_farm(Fixtures.fresh_farm()), OK)
	assert_null(store.load_farm())


func test_the_default_path_is_per_user_and_versioned() -> void:
	assert_string_starts_with(UserFileSaveStore.DEFAULT_PATH, "user://")
	assert_string_contains(UserFileSaveStore.DEFAULT_PATH, ".v%d." % FarmSaveCodec.SCHEMA_VERSION)
