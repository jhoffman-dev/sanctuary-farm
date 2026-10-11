## facts/tuning.test.ts
extends GutTest


# ─── tier_of — first matching rule wins, 1 → 6 ───

func test_anchors_anything_with_a_1_2_or_10() -> void:
	assert_eq(FactTuning.tier_of(1, 9), 1)
	assert_eq(FactTuning.tier_of(7, 2), 1)
	assert_eq(FactTuning.tier_of(10, 12), 1)


func test_easy_patterns_5s_squares_and_11s_up_to_11x9() -> void:
	assert_eq(FactTuning.tier_of(5, 7), 2)
	assert_eq(FactTuning.tier_of(7, 7), 2)
	assert_eq(FactTuning.tier_of(11, 9), 2)
	assert_eq(FactTuning.tier_of(11, 11), 2)


func test_3s_and_4s_then_9s_then_6_7_8_then_the_rest() -> void:
	assert_eq(FactTuning.tier_of(3, 8), 3)
	assert_eq(FactTuning.tier_of(4, 9), 3)
	assert_eq(FactTuning.tier_of(9, 6), 4)
	assert_eq(FactTuning.tier_of(6, 8), 5)
	# 12×7 has a 7, so it lands in tier 5 before the 12s rule is reached.
	assert_eq(FactTuning.tier_of(12, 7), 5)
	assert_eq(FactTuning.tier_of(11, 12), 6)
	assert_eq(FactTuning.tier_of(12, 12), 2)


func test_is_total_over_the_12x12_table_and_every_tier_is_named() -> void:
	for fact: Fact in FactTable.build(12).value:
		assert_true(FactTuning.TIER_NAMES.get(FactTuning.tier_of(fact.a, fact.b)) is String, fact.id)


# ─── fact identity ───

func test_family_is_the_larger_operand() -> void:
	assert_eq(FactTuning.family_of(7, 8), 8)
	assert_eq(FactTuning.family_of(12, 3), 12)


func test_commute_id_swaps_the_operands_and_rejects_a_malformed_id() -> void:
	assert_eq(FactTuning.commute_id(FactTuning.fact_id(7, 8)).value, "8x7")
	assert_eq(FactTuning.commute_id("12x3").value, "3x12")
	var refused := FactTuning.commute_id("nonsense")
	assert_false(refused.ok)
	assert_string_contains(refused.error, "malformed")


func test_hard_core_matching_is_order_insensitive() -> void:
	assert_true(FactTuning.is_hard_core(FactTuning.fact_id(7, 8)))
	assert_true(FactTuning.is_hard_core(FactTuning.fact_id(8, 7)))
	assert_false(FactTuning.is_hard_core(FactTuning.fact_id(2, 2)))


func test_the_12x12_table_covers_families_1_to_12() -> void:
	var seen := {}
	for fact: Fact in FactTable.build(12).value:
		seen[fact.family] = true
	var families := seen.keys()
	families.sort()
	assert_eq(families, Array(FactTuning.ALL_FAMILIES))


func test_leitner_intervals_grow_with_the_box() -> void:
	assert_lt(FactTuning.LEITNER_INTERVALS[1], FactTuning.LEITNER_INTERVALS[2])
	assert_lt(FactTuning.LEITNER_INTERVALS[4], FactTuning.LEITNER_INTERVALS[5])


# ─── whole_number: TypeScript's Number.isInteger, for values from JSON ───

func test_whole_number_accepts_ints_and_whole_floats_only() -> void:
	assert_eq(FactTuning.whole_number(7), 7)
	assert_eq(FactTuning.whole_number(7.0), 7)
	for value: Variant in [7.5, NAN, INF, -INF, "7", null, true, [7]]:
		assert_null(FactTuning.whole_number(value), str(value))
