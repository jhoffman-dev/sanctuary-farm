extends GutTest

## The first five draws of the TypeScript domain's createRng(seed) times 2^32,
## produced by running packages/domain/src/rng.ts under Node. Compared as
## integers because a long decimal literal can round differently in each
## language's parser; draw * 2^32 is exact in both. The two clients must agree.
const TYPESCRIPT_DRAWS_TIMES_2_POW_32 := {
	0: [1144304738, 1416247, 958946056, 627933444, 2007157716],
	42: [2581720956, 1925393290, 3661312704, 2876485805, 750819978],
	4294967295: [3850105811, 813802916, 3073704848, 4054706436, 3630262831],
}


func _draws(rng: Rng, count: int) -> Array[float]:
	var out: Array[float] = []
	for i in count:
		out.append(rng.next_float())
	return out


func test_matches_the_typescript_mulberry32_bit_for_bit() -> void:
	for seed_value: int in TYPESCRIPT_DRAWS_TIMES_2_POW_32:
		var draws := _draws(SeededRng.new(seed_value), 5)
		var expected: Array = TYPESCRIPT_DRAWS_TIMES_2_POW_32[seed_value]
		for i in expected.size():
			assert_eq(int(draws[i] * 4294967296.0), expected[i], "seed %d draw %d" % [seed_value, i])


func test_the_same_seed_replays_the_same_sequence() -> void:
	assert_eq(_draws(SeededRng.new(7), 50), _draws(SeededRng.new(7), 50))


func test_different_seeds_diverge() -> void:
	assert_ne(_draws(SeededRng.new(1), 5), _draws(SeededRng.new(2), 5))


func test_a_negative_seed_wraps_like_javascripts_unsigned_shift() -> void:
	assert_eq(_draws(SeededRng.new(-1), 5), _draws(SeededRng.new(4294967295), 5))


func test_every_draw_is_in_zero_to_one_exclusive() -> void:
	var out_of_range: Array[float] = []
	for value in _draws(SeededRng.new(123), 10000):
		if value < 0.0 or value >= 1.0:
			out_of_range.append(value)
	assert_eq(out_of_range, [] as Array[float])
