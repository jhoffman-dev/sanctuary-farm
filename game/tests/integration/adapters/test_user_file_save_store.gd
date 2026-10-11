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


## A page reload reads the session clock back from the file: the limit cannot be reset by reloading.
func test_the_session_clock_round_trips_through_the_file() -> void:
	var session := PlaySession.played(PlaySession.begin(1_728_640_000_000, 20_006), 1_728_640_240_000, 20_006)
	assert_eq(_store.save_farm(FarmSave.with_changes(Fixtures.fresh_farm(), {"play_session": session})), OK)
	var reloaded: Dictionary = UserFileSaveStore.new(TEST_PATH).load_farm()
	assert_eq(reloaded.play_session, session)
	assert_eq(PlaySession.left_msec(reloaded.play_session, 1_728_640_240_000, 20_006), PlaySession.LENGTH_MSEC - 240_000)


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


func test_the_players_v3_save_carries_forward_until_a_v4_one_is_written() -> void:
	var earlier := "user://test-farm-save.earlier.v3.json"
	var current := "user://test-farm-save.current.v4.json"
	var v3: Dictionary = JSON.parse_string(FarmSaveCodec.encode(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 5})))
	v3.schema_version = 3
	v3.erase("animals")
	var file := FileAccess.open(earlier, FileAccess.WRITE)
	file.store_string(JSON.stringify(v3))
	file.close()
	var store := UserFileSaveStore.new(current, earlier)
	var migrated: Dictionary = store.load_farm()
	assert_eq([migrated.schema_version, migrated.coins], [FarmSave.SCHEMA_VERSION, 5])
	assert_eq(migrated.animals, Barn.starting_animals())
	assert_eq(store.save_farm(FarmSave.with_changes(migrated, {"coins": 6})), OK)
	assert_eq(store.load_farm().coins, 6, "the v4 file now wins")
	assert_true(FileAccess.file_exists(earlier), "the v3 file is left alone")
	for path in [earlier, current]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

