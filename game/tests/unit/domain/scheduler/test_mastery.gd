## scheduler/progress.test.ts
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func test_needs_the_mastery_box_and_three_recent_fluent_answers() -> void:
	assert_false(Mastery.is_fact_mastered(null))
	assert_true(Mastery.is_fact_mastered(Fixtures.fact_status({"box": 5, "recent_latencies": [900, 900, 900]})))
	assert_false(Mastery.is_fact_mastered(Fixtures.fact_status({"box": 4, "recent_latencies": [900, 900, 900]})))
	assert_false(Mastery.is_fact_mastered(Fixtures.fact_status({"box": 5, "recent_latencies": [900, 900]})))
	# Only the last three answers count; an older slow one is forgiven.
	assert_true(Mastery.is_fact_mastered(Fixtures.fact_status({"box": 5, "recent_latencies": [5000, 900, 900, 900]})))
	assert_false(Mastery.is_fact_mastered(Fixtures.fact_status({"box": 5, "recent_latencies": [900, 900, 5000]})))


func test_is_exactly_1_only_when_every_fact_in_the_family_is_mastered() -> void:
	var almost := Fixtures.with_fact(Fixtures.fresh(), "1x1", {"box": 5, "recent_latencies": [900, 5000]})
	assert_false(Mastery.is_family_mastered(almost, 1))
	assert_almost_eq(Mastery.family_progress(almost, 1), 0.98, 0.001)

	var done := Fixtures.with_fact(Fixtures.fresh(), "1x1", {"box": 5, "recent_latencies": [900, 900, 900]})
	assert_true(Mastery.is_family_mastered(done, 1))
	assert_eq(Mastery.family_progress(done, 1), 1.0)


func test_caps_at_0_98_while_unmastered_even_when_every_fact_is_at_box_5() -> void:
	var ids := Fixtures.ids_of(FactTable.facts_in_family(3).value)
	var state := Fixtures.with_facts(Fixtures.fresh(), ids, {"box": 5, "recent_latencies": [9000, 9000, 9000]})
	assert_false(Mastery.is_family_mastered(state, 3))
	assert_eq(Mastery.family_progress(state, 3), 0.98)


func test_is_the_share_of_the_family_at_box_3_or_more() -> void:
	var family4: Array = FactTable.facts_in_family(4).value
	var state := Fixtures.with_fact(Fixtures.with_fact(Fixtures.fresh(), "1x4", {"box": 3}), "2x4", {"box": 4})
	assert_almost_eq(Mastery.family_progress(state, 4), 2.0 / family4.size(), 0.0001)


func test_a_family_with_no_facts_in_range_is_neither_mastered_nor_in_progress() -> void:
	var state := Fixtures.fresh(4)
	assert_false(Mastery.is_family_mastered(state, 9))
	assert_eq(Mastery.family_progress(state, 9), 0.0)
