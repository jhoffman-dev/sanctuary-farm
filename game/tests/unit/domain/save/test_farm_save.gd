## save/empty.test.ts
extends GutTest


func test_starts_with_no_coins_day_one_feed_no_sessions_and_default_settings() -> void:
	var farm: Dictionary = FarmSave.empty().value
	assert_eq(farm.schema_version, FarmSave.SCHEMA_VERSION)
	assert_eq(farm.coins, 0)
	assert_eq(farm.feed, Coins.STARTING_FEED)
	assert_eq(farm.sessions, [])
	assert_eq(farm.settings, {"muted": false, "max_table": 12})
	assert_eq(farm.scheduler, SchedulerState.initial().value)


func test_threads_max_table_into_both_the_settings_and_the_scheduler() -> void:
	var farm: Dictionary = FarmSave.empty(6).value
	assert_eq(farm.settings.max_table, 6)
	assert_eq(farm.scheduler.max_table, 6)
	assert_eq(farm.scheduler.facts.size(), 36)


func test_with_changes_copies_and_leaves_the_original_alone() -> void:
	var farm: Dictionary = FarmSave.empty().value
	var richer := FarmSave.with_changes(farm, {"coins": 5})
	assert_eq(richer.coins, 5)
	assert_eq(farm.coins, 0)
