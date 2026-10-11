## scheduler/tiers.test.ts. Seed 7 serves every fact of a table within 16
## fluent cycles per fact (SF-81); every run is also checked against the
## TypeScript trace and final state for the same seed.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")
const SEED := 7
const CYCLES_PER_FACT := 16

var _oracles: Dictionary
## max_table -> the steps of its coverage run, played once for the file.
var _runs := {}


func before_all() -> void:
	_oracles = Digest.oracles()
	for max_table in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		var budget: int = max_table * max_table * CYCLES_PER_FACT
		_runs[max_table] = Fixtures.play(Fixtures.fresh(max_table), SeededRng.new(SEED), budget, Fixtures.always_fluent)


func _every_fact_at_box(state: Dictionary, box: int) -> Dictionary:
	return Fixtures.with_facts(state, state.facts.keys(), {"box": box})


func _served_ids(max_table: int) -> Array:
	var served := {}
	for step: Fixtures.Step in _runs[max_table]:
		served[step.served.id] = true
	var ids := served.keys()
	ids.sort()
	return ids


func test_does_not_let_a_tier_with_no_facts_in_play_wall_off_the_tiers_above_it() -> void:
	# An 8×8 table has no "has a 9" fact at all, so tier 4 can never reach box 3.
	assert_eq(FactTable.facts_in_tier(4, 8).value.size(), 0)
	var state := _every_fact_at_box(Fixtures.fresh(8), 3)
	var unlocked: Array = TierUnlock.with_unlocked_tiers(state, SchedulerCards.in_play(state)).unlocked_tiers
	assert_has(unlocked, 5)


func test_still_holds_a_tier_back_while_its_own_facts_sit_below_box_3() -> void:
	var state := _every_fact_at_box(Fixtures.fresh(12), 1)
	assert_eq(TierUnlock.with_unlocked_tiers(state, SchedulerCards.in_play(state)).unlocked_tiers, [1])


func test_returns_the_same_state_when_nothing_unlocks() -> void:
	var state := Fixtures.fresh()
	assert_true(is_same(TierUnlock.with_unlocked_tiers(state, SchedulerCards.in_play(state)), state))


func test_serves_every_fact_of_an_8x8_table_including_6x7_and_7x8() -> void:
	var served := _served_ids(8)
	assert_eq(served.size(), 64)
	for id in ["6x7", "7x6", "6x8", "8x6", "7x8", "8x7"]:
		assert_has(served, id)


func test_serves_every_fact_of_a_table_up_to_every_size() -> void:
	for max_table in range(FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT + 1):
		var expected := Array(Fixtures.ids_of(FactTable.build(max_table).value))
		expected.sort()
		assert_eq(_served_ids(max_table), expected, "max_table %d" % max_table)


func test_every_coverage_run_matches_typescript_step_for_step() -> void:
	for max_table: int in _runs:
		var expected: Dictionary = _oracles.digests.tierCoverage[str(max_table)]
		assert_eq(Digest.of_steps(_runs[max_table], Fixtures.fresh(max_table)), expected, "max_table %d" % max_table)
