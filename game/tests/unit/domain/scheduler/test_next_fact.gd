## scheduler/next.test.ts — NextFact.pick, mixed practice. Seeded traces are
## compared with the TypeScript traces for the same seed, entry for entry.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")
const FAR_FUTURE := 9999

var _oracles: Dictionary


func before_all() -> void:
	_oracles = Digest.oracles()


## Every introduced fact pushed out of reach, so nothing is due.
func _nothing_due(state: Dictionary) -> Dictionary:
	return Fixtures.with_facts(state, Fixtures.introduced_ids(state), {"due_at": FAR_FUTURE})


func _with(state: Dictionary, changes: Dictionary) -> Dictionary:
	return SchedulerState.with_changes(state, changes)


func _ids_below_tier_5_except_9x8() -> Array:
	var ids := []
	for fact: Fact in FactTable.build().value:
		if fact.tier <= 4 and fact.id != "9x8":
			ids.append(fact.id)
	return ids


func _trace(seed_value: int, count: int, policy: String) -> Array:
	return Array(Fixtures.trace_of(Fixtures.play(Fixtures.fresh(), SeededRng.new(seed_value), count, Fixtures.policy(policy))))


# ─── introduction ───

func test_introduces_a_fact_when_fewer_than_min_due_before_introduce_are_due() -> void:
	var state := _nothing_due(Fixtures.fresh())
	var before := Fixtures.introduced_ids(state).size()
	var served := Fixtures.next_of(state, SeededRng.new(1))
	assert_eq(Fixtures.introduced_ids(served.state).size(), before + 1)
	var status: Dictionary = served.state.facts[served.fact.id]
	assert_true(status.introduced)
	assert_eq(status.box, 1)
	assert_eq(status.due_at, served.state.global_counter)


func test_introduces_from_the_lowest_unlocked_tier_in_table_order() -> void:
	var served := Fixtures.next_of(_nothing_due(Fixtures.fresh()), SeededRng.new(1))
	assert_eq(served.fact.tier, 1)
	assert_eq(served.fact.id, "1x3")


func test_does_not_introduce_when_enough_facts_are_already_due() -> void:
	var state := Fixtures.fresh()
	var before := Fixtures.introduced_ids(state).size()
	assert_eq(Fixtures.introduced_ids(Fixtures.next_of(state, SeededRng.new(1)).state).size(), before)


func test_does_not_reach_into_a_locked_tier() -> void:
	var tier1 := Fixtures.ids_of(FactTable.facts_in_tier(1, 3).value)
	var all_introduced := Fixtures.with_facts(_nothing_due(Fixtures.fresh(3)), tier1, {"due_at": FAR_FUTURE, "box": 1})
	var served := Fixtures.next_of(all_introduced, SeededRng.new(1))
	assert_eq(served.state.unlocked_tiers, [1])
	assert_eq(served.fact.tier, 1)


# ─── choosing among due facts ───

func test_serves_the_most_overdue_when_due_weighting_threshold_or_fewer_are_due() -> void:
	var due_ids := ["1x1", "1x2", "2x1", "2x2", "1x10", "10x1"].slice(0, FactTuning.DUE_WEIGHTING_THRESHOLD)
	var state := _with(Fixtures.with_facts(_nothing_due(Fixtures.fresh()), due_ids, {"due_at": 50}), {"global_counter": 100})
	var most_overdue := Fixtures.with_fact(state, "2x2", {"due_at": 10})
	for seed_value in [1, 2, 3, 4, 5]:
		assert_eq(Fixtures.next_of(most_overdue, SeededRng.new(seed_value)).fact.id, "2x2")


func test_picks_by_weight_so_the_choice_depends_on_the_rng_when_more_are_due() -> void:
	var due_ids := ["1x1", "1x2", "2x1", "2x2", "1x10", "10x1", "2x10", "10x2"]
	var state := _with(Fixtures.with_facts(_nothing_due(Fixtures.fresh()), due_ids, {"due_at": 50}), {"global_counter": 100})
	var picks := {}
	for seed_value in range(1, 9):
		picks[Fixtures.next_of(state, SeededRng.new(seed_value)).fact.id] = true
	assert_gt(picks.size(), 1)
	for id: String in picks:
		assert_has(due_ids, id)


func test_falls_back_to_the_worst_rolling_mean_latency_when_nothing_is_due_and_nothing_can_be_introduced() -> void:
	var state := Fixtures.with_fact(Fixtures.fresh(2), "1x1", {"recent_latencies": [1000]})
	state = Fixtures.with_fact(state, "1x2", {"recent_latencies": [5000, 4000]})
	state = Fixtures.with_fact(state, "2x1", {"recent_latencies": [2000]})
	state = Fixtures.with_fact(state, "2x2", {"recent_latencies": [3000]})
	var served := Fixtures.next_of(_nothing_due(state), SeededRng.new(1))
	assert_eq(served.fact.id, "1x2")
	assert_eq(Fixtures.introduced_ids(served.state).size(), 4)


func test_a_fact_with_no_latency_history_counts_as_the_slowest() -> void:
	var state := Fixtures.with_facts(Fixtures.fresh(2), ["1x1", "1x2", "2x1"], {"recent_latencies": [9000]})
	assert_eq(Fixtures.next_of(_nothing_due(state), SeededRng.new(1)).fact.id, "2x2")


# ─── interleaving — never the same family three times in a row ───

func test_holds_across_200_seeded_next_grade_cycles_with_mixed_answers() -> void:
	var steps := Fixtures.play(Fixtures.fresh(), SeededRng.new(12345), 200, Fixtures.policy("interleave"))
	for i in range(2, steps.size()):
		var run := [steps[i - 2].served.family, steps[i - 1].served.family, steps[i].served.family]
		assert_false(run[0] == run[1] and run[1] == run[2], "families[%d..%d] = %s" % [i - 2, i, run])
	assert_eq(Array(Fixtures.trace_of(steps)), _oracles.traces.interleave12345, "the TypeScript trace for seed 12345")


func test_prefers_introducing_another_family_when_every_due_fact_is_the_blocked_one() -> void:
	# 3×3 table: families 1 and 2 are cold-start; family 3 waits in tier 1.
	var state := _with(Fixtures.with_fact(Fixtures.fresh(3), "1x1", {"due_at": FAR_FUTURE}), {"recent_families": [2, 2]})
	var served := Fixtures.next_of(state, SeededRng.new(1))
	assert_eq(served.fact.family, 3)
	assert_true(served.state.facts[served.fact.id].introduced)


func test_pulls_another_familys_soonest_due_fact_forward_when_nothing_can_be_introduced() -> void:
	# 2×2 table: everything is introduced; only family 2 is due and it is blocked.
	var state := _with(Fixtures.with_fact(Fixtures.fresh(2), "1x1", {"due_at": FAR_FUTURE}), {"recent_families": [2, 2]})
	assert_eq(Fixtures.next_of(state, SeededRng.new(1)).fact.id, "1x1")


func test_among_other_families_it_pulls_the_soonest_due_fact_not_the_first_in_table_order() -> void:
	# 3×3 table with tier 1 fully introduced and tier 2 locked, so nothing can be introduced.
	var waiting := Fixtures.with_facts(
		Fixtures.with_fact(Fixtures.fresh(3), "1x1", {"due_at": 200}), ["1x3", "2x3", "3x1", "3x2"], {"box": 1, "due_at": 150}
	)
	var state := _with(Fixtures.with_fact(waiting, "3x1", {"due_at": 120}), {"recent_families": [2, 2]})
	var served := Fixtures.next_of(state, SeededRng.new(1))
	assert_eq(served.fact.id, "3x1")
	assert_eq(Fixtures.introduced_ids(served.state).size(), Fixtures.introduced_ids(state).size())


func test_introduces_from_a_higher_unlocked_tier_when_the_lowest_tier_has_only_the_blocked_family_left() -> void:
	# Tiers 1–4 unlocked; 9×8 is the last un-introduced tier-4 fact and family 9 is blocked.
	var waiting := Fixtures.with_facts(Fixtures.fresh(), _ids_below_tier_5_except_9x8(), {"box": 2, "due_at": FAR_FUTURE})
	var state := _with(waiting, {"unlocked_tiers": [1, 2, 3, 4, 5], "recent_families": [9, 9]})
	var served := Fixtures.next_of(state, SeededRng.new(1))
	assert_eq(served.fact.tier, 5)
	assert_ne(served.fact.family, 9)
	assert_true(served.state.facts[served.fact.id].introduced)
	assert_false(served.state.facts["9x8"].introduced)


func test_serves_another_familys_due_fact_instead_of_introducing_the_blocked_family() -> void:
	# Review repro: recent_families [9, 9], 9×8 is the only introducible fact, 2×2 is due.
	var waiting := Fixtures.with_facts(Fixtures.fresh(), _ids_below_tier_5_except_9x8(), {"box": 2, "due_at": FAR_FUTURE})
	var state := _with(Fixtures.with_fact(waiting, "2x2", {"due_at": 0}), {"unlocked_tiers": [1, 2, 3, 4], "recent_families": [9, 9]})
	var served := Fixtures.next_of(state, SeededRng.new(1))
	assert_eq(served.fact.id, "2x2")
	assert_false(served.state.facts["9x8"].introduced)


func test_only_a_single_family_board_forces_a_repeat() -> void:
	var state := Fixtures.fresh(1)
	var families: Array[int] = []
	for i in 4:
		var served := Fixtures.next_of(state, SeededRng.new(i))
		families.append(served.fact.family)
		state = Fixtures.grade(served.state, served.fact.id, 1, 900).state
	assert_eq(families, [1, 1, 1, 1] as Array[int])


func test_records_the_served_family_and_fact_in_the_returned_state() -> void:
	var served := Fixtures.next_of(Fixtures.fresh(), SeededRng.new(1))
	assert_eq(served.state.recent_families, [served.fact.family])
	assert_eq(served.state.last_served, served.fact.id)


# ─── introduction tiers ───

func test_tier_3_does_not_unlock_while_tier_2_is_below_80_percent_at_box_3() -> void:
	var tier1 := Fixtures.ids_of(FactTable.facts_in_tier(1).value)
	var tier2 := Fixtures.ids_of(FactTable.facts_in_tier(2).value)
	var rng := SeededRng.new(1)

	var after_tier1 := Fixtures.next_of(Fixtures.with_facts(Fixtures.fresh(), tier1, {"box": 4}), rng).state
	assert_has(after_tier1.unlocked_tiers, 2)
	assert_does_not_have(after_tier1.unlocked_tiers, 3)

	var half_tier2 := Fixtures.with_facts(after_tier1, tier2.slice(0, floori(tier2.size() * 0.5)), {"box": 3})
	assert_does_not_have(Fixtures.next_of(half_tier2, rng).state.unlocked_tiers, 3)

	var most_tier2 := Fixtures.with_facts(after_tier1, tier2.slice(0, ceili(tier2.size() * 0.85)), {"box": 3})
	assert_has(Fixtures.next_of(most_tier2, rng).state.unlocked_tiers, 3)


func test_unlocks_several_tiers_at_once_when_they_are_all_ready() -> void:
	var ready := Fixtures.with_facts(Fixtures.fresh(), Fixtures.ids_of(FactTable.build().value), {"box": 5})
	assert_eq(Fixtures.next_of(ready, SeededRng.new(1)).state.unlocked_tiers, [1, 2, 3, 4, 5, 6])


# ─── determinism ───

func test_a_seeded_run_is_reproducible() -> void:
	assert_eq(_trace(4242, 150, "determinism"), _trace(4242, 150, "determinism"))
	assert_eq(_trace(4242, 150, "determinism"), _oracles.traces.determinism4242, "the TypeScript trace for seed 4242")


func test_different_seeds_diverge() -> void:
	var other := _trace(9999, 150, "determinism")
	assert_ne(_trace(4242, 150, "determinism"), other)
	assert_eq(other, _oracles.traces.determinism9999, "the TypeScript trace for seed 9999")


func test_a_long_run_keeps_the_full_fact_table_and_keeps_the_counter_in_step() -> void:
	var steps := Fixtures.play(Fixtures.fresh(), SeededRng.new(1), 300, Fixtures.always_fluent)
	var state := Fixtures.final_state(steps, {})
	assert_eq(state.facts.size(), 144)
	assert_eq(state.global_counter, 300)
	assert_eq(Digest.of_steps(steps, {}), _oracles.digests.long300, "the TypeScript run for seed 1")
