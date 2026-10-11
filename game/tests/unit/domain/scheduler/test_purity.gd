## scheduler/purity.test.ts — inputs are never changed. States are deep-frozen
## (read-only at every depth), so any in-place write is an engine error that
## fails the test, as a write to a frozen object throws in TypeScript.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")
const Digest := preload("res://tests/support/oracle_digest.gd")


func test_next_fact_pick_in_family_and_grading_leave_a_frozen_state_untouched() -> void:
	var played := Fixtures.final_state(Fixtures.play(Fixtures.fresh(), SeededRng.new(3), 40, Fixtures.always_fluent), {})
	var state: Dictionary = Fixtures.deep_freeze(Fixtures.with_fact(played, "7x8", {"box": 1}))
	var snapshot := state.duplicate(true)

	var mixed := Fixtures.next_of(state, SeededRng.new(1))
	var family := Fixtures.next_in_family(state, 8, SeededRng.new(1))
	Fixtures.grade(state, "7x8", 56, 900)
	Fixtures.grade(state, "7x8", 0, 900)
	Mastery.family_progress(state, 8)
	Mastery.is_family_mastered(state, 8)

	assert_eq(state, snapshot)
	assert_false(is_same(mixed.state, state))
	assert_false(is_same(family.state, state))


func test_a_long_driven_run_never_mutates_any_intermediate_state() -> void:
	var state: Dictionary = Fixtures.deep_freeze(Fixtures.fresh())
	var rng := SeededRng.new(99)
	var answer := Fixtures.policy("purity")
	var trace: Array[String] = []
	for i in 120:
		var served := Fixtures.next_of(state, rng)
		var reply: Array = answer.call(served.fact, i)
		var graded := Fixtures.grade(served.state, served.fact.id, reply[0], reply[1])
		trace.append("%s:%s" % [served.fact.id, graded.result.outcome.left(1)])
		state = Fixtures.deep_freeze(graded.state)
	assert_eq(state.global_counter, 120)
	var expected: Dictionary = Digest.oracles().digests.purityRun99
	assert_eq(",".join(trace).sha256_text(), expected.trace, "the same run as TypeScript")
	assert_eq(Digest.canonical_state(state).sha256_text(), expected.state)


func test_buying_feed_returns_a_new_save_and_leaves_the_old_one_alone() -> void:
	var farm: Dictionary = Fixtures.deep_freeze(FarmSave.with_changes(Fixtures.fresh_farm(), {"coins": 10}))
	var bought := FeedShed.buy(farm, FeedShed.FEED_SACK)
	assert_true(bought.ok)
	assert_eq(farm.coins, 10)
	assert_eq(farm.feed, 12)
