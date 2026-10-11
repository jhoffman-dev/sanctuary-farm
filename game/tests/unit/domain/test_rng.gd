## rng.test.ts — weighted_pick and shuffle (create_rng is test_seeded_rng.gd).
extends GutTest

const Digest := preload("res://tests/support/oracle_digest.gd")

var _oracles: Dictionary


func before_all() -> void:
	_oracles = Digest.oracles()


func _picks(count: int, weights: Array, rng: Rng) -> String:
	var out := ""
	for i in count:
		out += Rng.weighted_pick(["a", "b", "c"], weights, rng).value
	return out


func test_is_deterministic_for_a_seed_and_stays_in_0_1() -> void:
	var a := SeededRng.new(7)
	var b := SeededRng.new(7)
	for i in 100:
		var value := a.next_float()
		assert_eq(value, b.next_float())
		assert_true(value >= 0.0 and value < 1.0, str(value))


func test_different_seeds_diverge() -> void:
	assert_ne(SeededRng.new(1).next_float(), SeededRng.new(2).next_float())


func test_never_picks_a_zero_weight_item_when_a_positive_one_exists() -> void:
	var rng := SeededRng.new(3)
	for i in 200:
		assert_eq(Rng.weighted_pick(["a", "b"], [0, 5], rng).value, "b")


func test_falls_back_to_uniform_when_every_weight_is_non_positive() -> void:
	var rng := SeededRng.new(11)
	var seen := {}
	for i in 100:
		seen[Rng.weighted_pick(["a", "b", "c"], [0, -1, 0], rng).value] = true
	assert_eq(seen.size(), 3)


func test_throws_on_an_empty_list() -> void:
	var picked := Rng.weighted_pick([], [], SeededRng.new(1))
	assert_false(picked.ok)
	assert_string_contains(picked.error, "empty")


func test_returns_a_permutation_and_leaves_the_input_untouched() -> void:
	var input := [1, 2, 3, 4, 5, 6, 7, 8]
	var out := Rng.shuffle(input, SeededRng.new(5))
	assert_eq(input, [1, 2, 3, 4, 5, 6, 7, 8])
	var sorted := out.duplicate()
	sorted.sort()
	assert_eq(sorted, input)
	assert_ne(out, input)


# ─── Equivalence: the same draws pick the same items as rng.ts ───

func test_shuffle_matches_typescript_for_seed_5() -> void:
	var expected: Array = _oracles.rng.shuffle5.map(func(n: float) -> int: return int(n))
	assert_eq(Rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8], SeededRng.new(5)), expected)


func test_weighted_pick_matches_typescript_draw_for_draw() -> void:
	assert_eq(_picks(20, [1, 2, 3], SeededRng.new(3)), _oracles.rng.weightedPick3)
	assert_eq(_picks(20, [0, -1, 0], SeededRng.new(11)), _oracles.rng.uniformPick11)
