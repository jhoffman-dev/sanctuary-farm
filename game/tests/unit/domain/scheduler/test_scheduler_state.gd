## scheduler/state.test.ts
extends GutTest


func test_creates_every_in_range_fact_with_only_the_anchors_tier_unlocked() -> void:
	var state: Dictionary = SchedulerState.initial().value
	assert_eq(state.facts.size(), 144)
	assert_eq(state.unlocked_tiers, [1])
	assert_eq(state.global_counter, 0)
	assert_eq(state.recent_families, [])
	assert_null(state.last_served)
	assert_eq(state.commute_credit, {})
	assert_eq(state.max_table, 12)


func test_introduces_the_cold_start_families_at_box_1_due_now_and_nothing_else() -> void:
	var state: Dictionary = SchedulerState.initial().value
	for status: Dictionary in state.facts.values():
		var operands: PackedStringArray = status.id.split("x")
		var family := maxi(int(operands[0]), int(operands[1]))
		var cold_start := FactTuning.COLD_START_FAMILIES.has(family)
		assert_eq(status.introduced, cold_start, status.id)
		assert_eq(status.box, 1 if cold_start else 0, status.id)
		assert_eq(status.due_at, 0)
		assert_eq(status.recent_latencies, [])


func test_honours_a_smaller_table() -> void:
	var state: Dictionary = SchedulerState.initial(5).value
	assert_eq(state.facts.size(), 25)
	assert_eq(state.max_table, 5)
	assert_true(state.facts.has("5x5"))
	assert_false(state.facts.has("6x1"))


func test_with_status_and_with_changes_copy_rather_than_edit() -> void:
	var state: Dictionary = SchedulerState.initial(2).value
	var moved := SchedulerState.with_status(state, FactState.patched(state.facts["1x1"], {"box": 3}))
	var counted := SchedulerState.with_changes(state, {"global_counter": 4})
	assert_eq(moved.facts["1x1"].box, 3)
	assert_eq(state.facts["1x1"].box, 1)
	assert_eq(counted.global_counter, 4)
	assert_eq(state.global_counter, 0)
