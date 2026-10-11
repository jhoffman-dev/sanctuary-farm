## scheduler/invariants.adversarial.test.ts — every invariant at every step of
## long seeded runs. The runs are played once per file (before_all), and each
## is checked against the TypeScript trace and final state for its seed.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")
const POLICIES := ["alwaysFluent", "mixed", "struggling"]
const SEEDS := [1, 42, 98765]
const RUN_LENGTH := 500
const EGG_FAMILIES := [2, 3, 7, 12]

var _oracles: Dictionary
## max_table -> {"policy/seed": Array[Step]}
var _runs := {}
## "family/policy" -> Array[Step] of 400 questions of egg practice.
var _egg_runs := {}
var _all_facts: Array


func before_all() -> void:
	_oracles = Digest.oracles()
	_all_facts = FactTable.build().value
	_runs[12] = _runs_for(12, RUN_LENGTH)
	_runs[3] = _runs_for(3, 300)
	_runs[2] = _runs_for(2, 300)
	for family: int in EGG_FAMILIES:
		for name: String in POLICIES:
			var egg_rng := SeededRng.new(family)
			_egg_runs["%d/%s" % [family, name]] = Fixtures.play(Fixtures.fresh(), egg_rng, 400, Fixtures.policy(name), Fixtures.in_family(family))


func _runs_for(max_table: int, length: int) -> Dictionary:
	var runs := {}
	for name: String in POLICIES:
		for seed_value: int in SEEDS:
			var key := "%s/%d" % [name, seed_value]
			runs[key] = Fixtures.play(Fixtures.fresh(max_table), SeededRng.new(seed_value), length, Fixtures.policy(name))
	return runs


## First violation across every step of every run, or "". Plain loops: an
## assert per fact per step would flood the log.
func _first_step_violation(runs: Dictionary, check: Callable) -> String:
	for label: String in runs:
		var steps: Array = runs[label]
		for step: Fixtures.Step in steps:
			var violation: String = check.call(step, steps)
			if violation != "":
				return "%s @ step %d (served %s): %s" % [label, step.index, step.served.id, violation]
	return ""


## Applies a per-fact check to both states of every step.
func _first_fact_violation(runs: Dictionary, check: Callable) -> String:
	return _first_step_violation(runs, func(step: Fixtures.Step, _steps: Array) -> String:
		for state: Dictionary in [step.after_serve, step.after_grade]:
			for status: Dictionary in state.facts.values():
				var violation: String = check.call(status)
				if violation != "":
					return "%s: %s" % [status.id, violation]
		return "")


func _previous_grade(step: Fixtures.Step, steps: Array, initial: Dictionary) -> Dictionary:
	return steps[step.index - 1].after_grade if step.index > 0 else initial


func _first_interleave_break(steps: Array) -> String:
	var limit := FactTuning.INTERLEAVE_MAX_CONSECUTIVE
	for i in range(limit, steps.size()):
		var window := steps.slice(i - limit, i + 1).map(func(step: Fixtures.Step) -> int: return step.served.family)
		if window.all(func(family: int) -> bool: return family == window[0]):
			return "step %d served families %s" % [i, window]
	return ""


func _longest_run(families: Array) -> int:
	var longest := 0
	var current := 0
	var previous: Variant = null
	for family: int in families:
		current = current + 1 if family == previous else 1
		previous = family
		longest = maxi(longest, current)
	return longest


# ─── determinism and purity ───

func test_a_500_question_mixed_run_played_twice_ends_in_deep_equal_states_with_identical_traces() -> void:
	var first := Fixtures.play(Fixtures.fresh(), SeededRng.new(2024), 500, Fixtures.mixed)
	var second := Fixtures.play(Fixtures.fresh(), SeededRng.new(2024), 500, Fixtures.mixed)
	assert_eq(Fixtures.trace_of(first), Fixtures.trace_of(second))
	assert_eq(Fixtures.final_state(first, {}), Fixtures.final_state(second, {}))
	assert_eq(Digest.of_steps(first, {}), _oracles.digests.mixed2024, "the TypeScript run for seed 2024")


func test_a_300_question_family_egg_run_played_twice_ends_in_deep_equal_states() -> void:
	var first := Fixtures.play(Fixtures.fresh(), SeededRng.new(77), 300, Fixtures.mixed, Fixtures.in_family(7))
	var second := Fixtures.play(Fixtures.fresh(), SeededRng.new(77), 300, Fixtures.mixed, Fixtures.in_family(7))
	assert_eq(Fixtures.trace_of(first), Fixtures.trace_of(second))
	assert_eq(Fixtures.final_state(first, {}), Fixtures.final_state(second, {}))
	assert_eq(Digest.of_steps(first, {}), _oracles.digests.egg7seed77, "the TypeScript run for seed 77")


func test_a_state_that_survived_a_save_round_trip_continues_identically_to_the_original() -> void:
	var midway := Fixtures.final_state(Fixtures.play(Fixtures.fresh(), SeededRng.new(5), 200, Fixtures.mixed), {})
	var farm := FarmSave.with_changes(Fixtures.fresh_farm(), {"scheduler": midway})
	var reloaded: Dictionary = FarmSaveCodec.decode(FarmSaveCodec.encode(farm)).scheduler
	var from_original := Fixtures.play(midway, SeededRng.new(6), 200, Fixtures.mixed)
	var from_reloaded := Fixtures.play(reloaded, SeededRng.new(6), 200, Fixtures.mixed)
	assert_eq(Fixtures.trace_of(from_reloaded), Fixtures.trace_of(from_original))
	assert_eq(Fixtures.final_state(from_reloaded, {}), Fixtures.final_state(from_original, {}))
	assert_eq(Digest.of_steps(from_original, {}), _oracles.digests.continued5then6, "the TypeScript continuation")


func test_every_exported_function_leaves_a_frozen_mid_run_state_deep_equal_to_its_snapshot() -> void:
	var played := Fixtures.final_state(Fixtures.play(Fixtures.fresh(), SeededRng.new(9), 250, Fixtures.mixed), {})
	assert_eq(Digest.canonical_state(played).sha256_text(), _oracles.digests.purityMidway9)
	var midway: Dictionary = Fixtures.deep_freeze(played)
	var snapshot := midway.duplicate(true)
	NextFact.pick(midway, SeededRng.new(1))
	for family in [1, 2, 7, 12, 13, 0]:
		NextFact.pick_in_family(midway, family, SeededRng.new(1))
		Mastery.family_progress(midway, family)
		Mastery.is_family_mastered(midway, family)
	for status: Dictionary in midway.facts.values():
		if status.introduced:
			var fact := FactTable.get_fact(status.id)
			for latency_ms in [900, 5000, 9000]:
				Grading.grade_answer(midway, Answer.new(fact.id, fact.answer, latency_ms))
			Grading.grade_answer(midway, Answer.new(fact.id, -1, 900))
	assert_eq(midway, snapshot)


func test_a_500_step_run_alternating_mixed_and_egg_practice_over_deep_frozen_states_never_fails() -> void:
	var state: Dictionary = Fixtures.deep_freeze(Fixtures.fresh())
	var rng := SeededRng.new(31)
	var trace: Array[String] = []
	for i in 500:
		var picked := NextFact.pick(state, rng) if i % 2 == 0 else NextFact.pick_in_family(state, 1 + (i % 12), rng)
		assert_true(picked.ok)
		var served: Served = picked.value
		var reply := Fixtures.mixed(served.fact, i)
		var graded := Fixtures.grade(Fixtures.deep_freeze(served.state), served.fact.id, reply[0], reply[1])
		trace.append("%s:%s" % [served.fact.id, graded.result.outcome.left(1)])
		state = Fixtures.deep_freeze(graded.state)
	assert_eq(state.global_counter, 500)
	assert_eq(",".join(trace).sha256_text(), _oracles.digests.alternating31.trace, "the TypeScript run for seed 31")
	assert_eq(Digest.canonical_state(state).sha256_text(), _oracles.digests.alternating31.state)


# ─── every long run is the TypeScript run ───

func test_every_invariant_run_matches_typescript_step_for_step() -> void:
	for max_table: int in _runs:
		var expected: Dictionary = _oracles.digests["invariants%d" % max_table]
		for label: String in _runs[max_table]:
			assert_eq(Digest.of_steps(_runs[max_table][label], {}), expected[label], "%d-table %s" % [max_table, label])


# ─── structural invariants (max_table 12) ───

func test_box_is_always_an_integer_in_0_to_mastery_box() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		return "" if typeof(status.box) == TYPE_INT and status.box >= 0 and status.box <= FactTuning.MASTERY_BOX else "box=%s" % status.box), "")


func test_box_0_if_and_only_if_the_fact_is_not_introduced() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		return "" if (status.box == 0) == (not status.introduced) else "box=%d introduced=%s" % [status.box, status.introduced]), "")


func test_due_at_is_a_finite_non_negative_integer() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		return "" if typeof(status.due_at) == TYPE_INT and status.due_at >= 0 else "due_at=%s" % status.due_at), "")


func test_a_graded_fact_is_always_re_queued_strictly_after_the_counter_it_was_graded_at() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var status: Dictionary = step.after_grade.facts[step.served.id]
		return "" if status.due_at > step.after_grade.global_counter else "due_at=%d" % status.due_at), "")


func test_unlocked_tiers_always_contains_1_is_sorted_ascending_and_only_ever_grows() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, steps: Array) -> String:
		var previous: Array = _previous_grade(step, steps, Fixtures.fresh()).unlocked_tiers
		for tiers: Array in [step.after_serve.unlocked_tiers, step.after_grade.unlocked_tiers]:
			var sorted := tiers.duplicate()
			sorted.sort()
			if not tiers.has(1) or tiers != sorted or tiers.slice(0, previous.size()) != previous:
				return "tiers %s after %s" % [tiers, previous]
		return ""), "")


func test_a_tier_only_ever_unlocks_when_its_predecessor_sits_at_80_percent_box_3() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, steps: Array) -> String:
		var before := _previous_grade(step, steps, Fixtures.fresh())
		var after := step.after_grade
		for tier: int in after.unlocked_tiers:
			if before.unlocked_tiers.has(tier):
				continue
			var predecessor := _all_facts.filter(func(fact: Fact) -> bool: return fact.tier == tier - 1)
			var at_box3 := predecessor.filter(func(fact: Fact) -> bool: return after.facts[fact.id].box >= 3).size()
			if float(at_box3) / predecessor.size() < FactTuning.TIER_UNLOCK_BOX3_SHARE:
				return "tier %d unlocked at %d/%d" % [tier, at_box3, predecessor.size()]
		return ""), "")


func test_commute_credit_values_are_always_in_0_to_1() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		for id: String in step.after_grade.commute_credit:
			var credit: float = step.after_grade.commute_credit[id]
			if not (credit >= 0.0 and credit < 1.0):
				return "commute_credit[%s]=%f" % [id, credit]
		return ""), "")


func test_commutative_credit_never_lowers_a_twins_box() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var twin_id := "%dx%d" % [step.served.b, step.served.a]
		if twin_id == step.served.id:
			return ""
		var before: int = step.after_serve.facts[twin_id].box
		var after: int = step.after_grade.facts[twin_id].box
		return "" if after >= before else "twin %s went %d -> %d" % [twin_id, before, after]), "")


func test_is_fact_mastered_agrees_with_box_5_and_the_last_3_latencies_fluent_for_every_fact() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		var recent: Array = status.recent_latencies.slice(-FactTuning.MASTERY_RECENT_FLUENT_COUNT)
		var expected: bool = (
			status.box == FactTuning.MASTERY_BOX and recent.size() == FactTuning.MASTERY_RECENT_FLUENT_COUNT
			and recent.all(func(ms: float) -> bool: return ms < FactTuning.FLUENT_MAX_MS)
		)
		return "" if Mastery.is_fact_mastered(status) == expected else "box=%d recent=%s" % [status.box, recent]), "")


func test_a_family_is_mastered_progress_exactly_1_only_when_every_fact_in_it_is_mastered() -> void:
	var members := {}
	for family in [1, 2, 3, 10, 12]:
		members[family] = FactTable.facts_in_family(family).value
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var state := step.after_grade
		for family: int in members:
			var expected: bool = members[family].all(func(fact: Fact) -> bool: return Mastery.is_fact_mastered(state.facts[fact.id]))
			if Mastery.is_family_mastered(state, family) != expected:
				return "family %d mastered != %s" % [family, expected]
			if (Mastery.family_progress(state, family) == 1.0) != expected:
				return "family %d progress" % family
		return ""), "")


func test_family_progress_is_always_in_0_to_1_and_below_1_while_unmastered() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		for family in range(1, 13):
			var progress := Mastery.family_progress(step.after_grade, family)
			if not (progress >= 0.0 and progress <= 1.0):
				return "family %d progress=%f" % [family, progress]
			if progress == 1.0 and not Mastery.is_family_mastered(step.after_grade, family):
				return "family %d full early" % family
		return ""), "")


func test_recent_latencies_never_exceeds_max_recent_latencies_and_holds_only_finite_numbers() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		var recent: Array = status.recent_latencies
		var finite := recent.all(func(ms: float) -> bool: return is_finite(ms))
		return "" if recent.size() <= FactTuning.MAX_RECENT_LATENCIES and finite else "recent=%s" % [recent]), "")


func test_attempt_counters_are_consistent_streak_le_correct_le_attempts() -> void:
	assert_eq(_first_fact_violation(_runs[12], func(status: Dictionary) -> String:
		var ok: bool = status.correct_streak <= status.total_correct and status.total_correct <= status.total_attempts
		return "" if ok else "streak=%d correct=%d attempts=%d" % [status.correct_streak, status.total_correct, status.total_attempts]), "")


func test_global_counter_counts_graded_answers_exactly_and_never_moves_on_a_serve() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var ok: bool = step.after_serve.global_counter == step.index and step.after_grade.global_counter == step.index + 1
		return "" if ok else "counter %d / %d" % [step.after_serve.global_counter, step.after_grade.global_counter]), "")


func test_last_served_is_always_the_fact_just_served() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		return "" if step.after_serve.last_served == step.served.id else "last_served=%s" % step.after_serve.last_served), "")


func test_the_served_fact_is_always_introduced_by_the_time_it_is_graded() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		return "" if step.after_serve.facts[step.served.id].introduced else "served un-introduced"), "")


func test_nothing_is_ever_introduced_from_a_locked_tier() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var state := step.after_serve
		for fact: Fact in _all_facts:
			if state.facts[fact.id].introduced and not state.unlocked_tiers.has(fact.tier):
				return "%s (tier %d) introduced with tiers %s" % [fact.id, fact.tier, state.unlocked_tiers]
		return ""), "")


func test_the_fact_table_is_never_grown_shrunk_or_re_keyed() -> void:
	var ids := Fixtures.ids_of(_all_facts)
	for label: String in _runs[12]:
		var final := Fixtures.final_state(_runs[12][label], {})
		assert_eq(final.facts.keys(), Array(ids), label)
		for key: String in final.facts:
			assert_eq(final.facts[key].id, key, label)


# ─── interleaving — never the same family more than INTERLEAVE_MAX_CONSECUTIVE in a row ───

func test_holds_over_500_question_mixed_practice_runs_for_every_policy_and_seed_max_table_12() -> void:
	for label: String in _runs[12]:
		assert_eq(_first_interleave_break(_runs[12][label]), "", label)


func test_holds_on_a_three_family_board_max_table_3() -> void:
	for label: String in _runs[3]:
		assert_eq(_first_interleave_break(_runs[3][label]), "", label)


func test_holds_on_a_two_family_board_max_table_2_where_family_1_is_a_single_fact() -> void:
	for label: String in _runs[2]:
		assert_eq(_first_interleave_break(_runs[2][label]), "", label)


func test_is_relaxed_only_on_a_single_family_board_max_table_1() -> void:
	var steps := Fixtures.play(Fixtures.fresh(1), SeededRng.new(3), 20, Fixtures.mixed)
	assert_true(steps.all(func(step: Fixtures.Step) -> bool: return step.served.id == "1x1"))
	assert_eq(_longest_run(steps.map(func(step: Fixtures.Step) -> int: return step.served.family)), 20)


func test_recent_families_always_ends_with_the_served_family_and_stays_short() -> void:
	assert_eq(_first_step_violation(_runs[12], func(step: Fixtures.Step, _steps: Array) -> String:
		var recent: Array = step.after_serve.recent_families
		return "" if recent[-1] == step.served.family and recent.size() <= 4 else "recent_families=%s" % [recent]), "")


# ─── egg practice — the family rotation over long runs ───

func test_never_serves_the_same_fact_twice_running_for_a_family_with_more_than_one_fact() -> void:
	var expected: Dictionary = _oracles.digests.eggRotation
	for label: String in _egg_runs:
		var steps: Array = _egg_runs[label]
		var repeats := range(1, steps.size()).filter(func(i: int) -> bool: return steps[i].served.id == steps[i - 1].served.id)
		assert_eq(repeats, [], label)
		assert_eq(Digest.of_steps(steps, {}), expected[label], "the TypeScript run, family/policy %s" % label)


func test_only_ever_serves_facts_of_the_requested_family() -> void:
	for family: int in EGG_FAMILIES:
		var steps := Fixtures.play(Fixtures.fresh(), SeededRng.new(1), 200, Fixtures.struggling, Fixtures.in_family(family))
		assert_true(steps.all(func(step: Fixtures.Step) -> bool: return step.served.family == family), "family %d" % family)


func test_never_has_more_than_egg_rotation_unmastered_facts_of_the_family_introduced() -> void:
	# A struggling child never masters anything, so the rotation must not keep growing.
	var steps := Fixtures.play(Fixtures.fresh(), SeededRng.new(2), 300, Fixtures.struggling, Fixtures.in_family(7))
	var final := Fixtures.final_state(steps, {})
	var introduced: Array = FactTable.facts_in_family(7).value.filter(func(fact: Fact) -> bool: return final.facts[fact.id].introduced)
	assert_lte(introduced.size(), FactTuning.EGG_ROTATION)
