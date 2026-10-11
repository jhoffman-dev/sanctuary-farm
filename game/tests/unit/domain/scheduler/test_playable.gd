## scheduler/playable.test.ts
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


## A state knowing exactly one fact, un-introduced: 7×8, family 8, tier 5.
func _only_unintroduced_78(changes: Dictionary = {}) -> Dictionary:
	var lone := {"7x8": Fixtures.fact_status({"id": "7x8", "box": 0, "introduced": false})}
	var state := SchedulerState.with_changes(Fixtures.fresh(12), {"facts": lone})
	return SchedulerState.with_changes(state, changes)


func test_is_true_for_a_fresh_state_which_has_the_cold_start_families_introduced() -> void:
	assert_true(Playable.has_playable_fact(Fixtures.fresh()))


func test_is_true_when_a_fact_can_still_be_introduced_from_an_unlocked_tier() -> void:
	assert_true(Playable.has_playable_fact(_only_unintroduced_78({"unlocked_tiers": [1, 2, 3, 4, 5]})))


func test_is_false_when_every_known_fact_sits_in_a_tier_the_state_has_not_unlocked() -> void:
	# Judged as stored: NextFact would unlock its way down to tier 5 first, but a
	# save whose own tiers reach none of its own facts is not one the game wrote.
	assert_false(Playable.has_playable_fact(_only_unintroduced_78({"unlocked_tiers": [1]})))


func test_is_false_when_the_only_introducible_fact_is_in_the_blocked_family() -> void:
	var state := _only_unintroduced_78({"unlocked_tiers": [1, 2, 3, 4, 5], "recent_families": [8, 8]})
	assert_false(Playable.has_playable_fact(state))


func test_is_false_for_a_state_with_no_facts_at_all() -> void:
	assert_false(Playable.has_playable_fact(SchedulerState.with_changes(Fixtures.fresh(), {"facts": {}})))


func test_is_true_once_a_fact_is_introduced_even_with_every_tier_locked_away() -> void:
	var state := Fixtures.with_facts(_only_unintroduced_78({"unlocked_tiers": [1]}), ["7x8"], {"box": 1})
	assert_true(Playable.has_playable_fact(state))


func test_says_false_for_exactly_the_states_next_fact_refuses() -> void:
	var unplayable := {
		"no facts at all": SchedulerState.with_changes(Fixtures.fresh(), {"facts": {}}),
		"the only introducible fact blocked by the interleave rule":
			_only_unintroduced_78({"unlocked_tiers": [1, 2, 3, 4, 5], "recent_families": [8, 8]}),
	}
	for label: String in unplayable:
		assert_false(Playable.has_playable_fact(unplayable[label]), label)
		var picked := NextFact.pick(unplayable[label], SeededRng.new(1))
		assert_false(picked.ok, label)
		assert_string_contains(picked.error, "no candidate facts", label)
