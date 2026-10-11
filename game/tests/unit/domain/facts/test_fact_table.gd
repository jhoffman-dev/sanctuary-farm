## facts/table.test.ts
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const BAD_SIZES := [0, -1, 13, 1.5, NAN, INF, 1e12]

var _all: Array


func before_all() -> void:
	_all = FactTable.build(12).value


func _filtered(facts: Array, field: String, value: int) -> Array:
	return facts.filter(func(fact: Fact) -> bool: return fact.get(field) == value)


func test_builds_every_ordered_pair_for_a_12x12_table() -> void:
	assert_eq(_all.size(), 144)
	assert_ne(FactTable.get_fact("7x8"), FactTable.get_fact("8x7"))
	assert_eq(FactTable.get_fact("7x8").answer, 56)
	assert_null(FactTable.get_fact("13x1"))


func test_respects_a_smaller_max_table() -> void:
	var facts: Array = FactTable.build(4).value
	assert_eq(facts.size(), 16)
	assert_true(facts.all(func(fact: Fact) -> bool: return fact.a <= 4 and fact.b <= 4))


func test_family_is_the_larger_operand_and_family_sizes_are_uneven() -> void:
	assert_eq(FactTable.facts_in_family(1).value.size(), 1)
	assert_eq(FactTable.facts_in_family(12).value.size(), 23)
	assert_eq(FactTable.facts_in_family(12, 4).value.size(), 0)
	for fact: Fact in _all:
		assert_eq(fact.family, FactTuning.family_of(fact.a, fact.b))


func test_every_fact_carries_the_tier_that_tier_of_assigns() -> void:
	for fact: Fact in _all:
		assert_eq(fact.tier, FactTuning.tier_of(fact.a, fact.b))
	assert_gt(FactTable.facts_in_tier(1).value.size(), 0)
	assert_eq(FactTable.facts_in_tier(6, 4).value.size(), 0)


func test_id_and_commute_id_round_trip() -> void:
	for fact: Fact in _all:
		assert_eq(fact.id, FactTuning.fact_id(fact.a, fact.b))
		assert_eq(FactTuning.commute_id(fact.id).value, FactTuning.fact_id(fact.b, fact.a))


func test_marks_the_hard_core_set_on_both_operand_orders() -> void:
	assert_true(FactTable.get_fact("7x8").hard_core)
	assert_true(FactTable.get_fact("8x7").hard_core)
	assert_false(FactTable.get_fact("2x2").hard_core)


func test_returns_a_fresh_array_on_every_build() -> void:
	var first: Array = FactTable.build(3).value
	assert_false(is_same(first, FactTable.build(3).value))
	assert_eq(first, FactTable.build(3).value)
	first.clear()
	assert_eq(FactTable.build(3).value.size(), 9)


func test_accepts_every_whole_table_size_from_min_table_to_max_table_default() -> void:
	for n in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		assert_true(FactTable.check_size(n).ok, "n=%d" % n)
		assert_eq(FactTable.build(n).value.size(), n * n, "n=%d" % n)
	assert_eq(FactTable.check_size(6.0).value, 6, "a whole float, as JSON gives it, is that size")


func test_refuses_a_table_size_outside_the_range_before_building_anything() -> void:
	for max_table: Variant in BAD_SIZES + ["12", null, true]:
		var label := "max_table=%s" % str(max_table)
		assert_false(FactTable.check_size(max_table).ok, label)
		assert_string_contains(FactTable.check_size(max_table).error, "max_table", label)
		assert_false(FactTable.build(max_table).ok, label)
		assert_false(FactTable.facts_in_family(1, max_table).ok, label)
		assert_false(FactTable.facts_in_tier(1, max_table).ok, label)


# ─── family and tier membership is computed once per table size (SF-88) ───

func test_matches_a_fresh_build_of_every_table_size_for_every_family_and_tier() -> void:
	for max_table in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		var fresh: Array = FactTable.build(max_table).value
		for family in range(0, FactTuning.MAX_TABLE_DEFAULT + 2):
			assert_eq(
				Array(FactTable.facts_in_family(family, max_table).value), _filtered(fresh, "family", family),
				"%d-table family %d" % [max_table, family]
			)
		for tier in range(1, 7):
			assert_eq(
				Array(FactTable.facts_in_tier(tier, max_table).value), _filtered(fresh, "tier", tier),
				"%d-table tier %d" % [max_table, tier]
			)


func test_hands_out_the_same_read_only_arrays_and_facts_on_every_call() -> void:
	var family: Array = FactTable.facts_in_family(7, 9).value
	var tier: Array = FactTable.facts_in_tier(1, 9).value
	assert_true(is_same(FactTable.facts_in_family(7, 9).value, family))
	assert_true(is_same(FactTable.facts_in_tier(1, 9).value, tier))
	for facts: Array in [family, tier, FactTable.facts_in_family(13).value, FactTable.facts_in_tier(6, 4).value]:
		assert_true(facts.is_read_only())


func test_a_shared_fact_refuses_a_write() -> void:
	var first: Fact = FactTable.facts_in_family(7, 9).value[0]
	first.answer = 0
	assert_push_error("immutable")
	assert_eq(FactTable.facts_in_family(7, 9).value[0].answer, first.a * first.b)


func test_still_refuses_an_invalid_table_size_and_leaves_the_valid_sizes_untouched() -> void:
	for max_table: Variant in [0, 13, 2.5, NAN]:
		assert_false(FactTable.facts_in_family(1, max_table).ok)
		assert_false(FactTable.facts_in_tier(1, max_table).ok)
	assert_eq(FactTable.facts_in_family(12).value.size(), 23)
	assert_eq(Array(FactTable.facts_in_tier(1, 3).value), _filtered(FactTable.build(3).value, "tier", 1))


func test_a_family_or_tier_given_as_a_whole_float_finds_its_facts() -> void:
	assert_eq(FactTable.facts_in_family(7.0).value.size(), FactTable.facts_in_family(7).value.size())
	assert_eq(FactTable.facts_in_family(7.5).value.size(), 0)
