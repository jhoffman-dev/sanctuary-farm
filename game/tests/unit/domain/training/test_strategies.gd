## The strategies a fact breaks down into (the prototype's `strategiesFor`):
## which apply, their typed steps, and — over every fact of the 12×12 table —
## that every step is right and the last one lands on the product.
extends GutTest


## [left, op, right, answer] per step, for comparing a strategy in one assert.
func _sums(strategy: Strategy) -> Array:
	return strategy.steps.map(func(step: StrategyStep) -> Array: return [step.left, step.op, step.right, step.answer])


func _keys(a: int, b: int) -> Array:
	return Strategies.for_fact(a, b).map(func(way: Strategy) -> String: return way.key)


func _strategy(a: int, b: int, key: String) -> Strategy:
	for way in Strategies.for_fact(a, b):
		if way.key == key:
			return way
	return null


# ─── the step sums ───

func test_a_step_answers_its_own_sum() -> void:
	assert_eq(StrategyStep.times(7, 5).answer, 35)
	assert_eq(StrategyStep.plus(35, 21).answer, 56)
	assert_eq(StrategyStep.minus(70, 14).answer, 56)
	var doubled := StrategyStep.double(28)
	assert_eq([doubled.op, doubled.left, doubled.right, doubled.answer], [StrategyStep.DOUBLE, 28, 2, 56])


# ─── which strategies, in the prototype's order ───

func test_7x8_has_all_four_in_the_prototypes_order() -> void:
	assert_eq(_keys(7, 8), [Strategy.AREA_MODEL, Strategy.TEN_ANCHOR, Strategy.DOUBLING, Strategy.NEAR_SQUARE])


func test_the_area_model_splits_b_at_5_then_adds_the_parts() -> void:
	var area := _strategy(7, 8, Strategy.AREA_MODEL)
	assert_eq(_sums(area), [[7, "times", 5, 35], [7, "times", 3, 21], [35, "plus", 21, 56]])
	assert_eq(area.hint, {"parts": [5, 3]})


func test_below_6_the_area_model_splits_b_in_halves_smaller_first() -> void:
	assert_eq(Strategies.area_split(6), [5, 1])
	assert_eq(Strategies.area_split(5), [2, 3])
	assert_eq(Strategies.area_split(4), [2, 2])
	assert_eq(Strategies.area_split(2), [1, 1])
	assert_eq(Strategies.area_split(12), [5, 7])
	assert_eq(_sums(_strategy(3, 5, Strategy.AREA_MODEL)), [[3, "times", 2, 6], [3, "times", 3, 9], [6, "plus", 9, 15]])


func test_1_does_not_split() -> void:
	assert_eq(Strategies.area_split(1), [])
	assert_false(_keys(7, 1).has(Strategy.AREA_MODEL))


func test_the_ten_anchor_takes_away_below_10() -> void:
	var nines := _strategy(7, 9, Strategy.TEN_ANCHOR)
	assert_eq(_sums(nines), [[7, "times", 10, 70], [7, "times", 1, 7], [70, "minus", 7, 63]])
	assert_eq(nines.hint, {"from": 10, "by": 1, "direction": Strategies.LESS})
	assert_eq(_sums(_strategy(9, 6, Strategy.TEN_ANCHOR)), [[9, "times", 10, 90], [9, "times", 4, 36], [90, "minus", 36, 54]])


func test_the_ten_anchor_adds_above_10() -> void:
	var twelves := _strategy(9, 12, Strategy.TEN_ANCHOR)
	assert_eq(_sums(twelves), [[9, "times", 10, 90], [9, "times", 2, 18], [90, "plus", 18, 108]])
	assert_eq(twelves.hint, {"from": 10, "by": 2, "direction": Strategies.MORE})
	assert_eq(_sums(_strategy(4, 11, Strategy.TEN_ANCHOR)), [[4, "times", 10, 40], [4, "times", 1, 4], [40, "plus", 4, 44]])


func test_the_ten_anchor_suits_only_b_from_6_to_12_but_not_10() -> void:
	for b in range(1, 13):
		var anchored := _keys(3, b).has(Strategy.TEN_ANCHOR)
		assert_eq(anchored, b >= 6 and b != 10, "3x%d" % b)


func test_doubling_halves_an_even_b_then_doubles() -> void:
	var fours := _strategy(6, 4, Strategy.DOUBLING)
	assert_eq(_sums(fours), [[6, "times", 2, 12], [12, "double", 2, 24]])
	assert_eq(fours.hint, {"half": 2})
	assert_eq(_sums(_strategy(7, 8, Strategy.DOUBLING)), [[7, "times", 4, 28], [28, "double", 2, 56]])
	assert_false(_keys(6, 7).has(Strategy.DOUBLING))


func test_the_near_square_adds_on_from_the_square_below() -> void:
	var near := _strategy(7, 8, Strategy.NEAR_SQUARE)
	assert_eq(_sums(near), [[7, "times", 7, 49], [7, "times", 1, 7], [49, "plus", 7, 56]])
	assert_eq(near.hint, {"from": 7, "by": 1, "direction": Strategies.MORE})


func test_the_near_square_takes_away_from_the_square_above() -> void:
	var near := _strategy(8, 7, Strategy.NEAR_SQUARE)
	assert_eq(_sums(near), [[8, "times", 8, 64], [8, "times", 1, 8], [64, "minus", 8, 56]])
	assert_eq(near.hint, {"from": 8, "by": 1, "direction": Strategies.LESS})


func test_the_near_square_suits_only_neighbours() -> void:
	assert_false(_keys(6, 8).has(Strategy.NEAR_SQUARE))
	assert_false(_keys(7, 7).has(Strategy.NEAR_SQUARE))
	assert_true(_keys(11, 12).has(Strategy.NEAR_SQUARE))


# ─── edge facts ───

func test_squares_have_no_near_square() -> void:
	assert_eq(_keys(6, 6), [Strategy.AREA_MODEL, Strategy.TEN_ANCHOR, Strategy.DOUBLING])
	assert_eq(_keys(3, 3), [Strategy.AREA_MODEL])


func test_the_tens_have_no_ten_anchor() -> void:
	assert_eq(_keys(7, 10), [Strategy.AREA_MODEL, Strategy.DOUBLING])
	assert_eq(_sums(_strategy(7, 10, Strategy.AREA_MODEL)), [[7, "times", 5, 35], [7, "times", 5, 35], [35, "plus", 35, 70]])


func test_the_12s_have_every_strategy_that_suits_them() -> void:
	assert_eq(_keys(12, 12), [Strategy.AREA_MODEL, Strategy.TEN_ANCHOR, Strategy.DOUBLING])
	assert_eq(_sums(_strategy(12, 12, Strategy.DOUBLING)), [[12, "times", 6, 72], [72, "double", 2, 144]])


func test_the_1s_have_nothing_to_break_down_except_2x1() -> void:
	assert_eq(_keys(1, 1), [])
	assert_eq(_keys(7, 1), [])
	assert_eq(_keys(2, 1), [Strategy.NEAR_SQUARE])
	assert_eq(_keys(1, 7), [Strategy.AREA_MODEL, Strategy.TEN_ANCHOR])


# ─── every fact (property) ───

func test_every_step_of_every_strategy_of_every_fact_adds_up() -> void:
	for a in range(1, 13):
		for b in range(1, 13):
			for way in Strategies.for_fact(a, b):
				_assert_adds_up(a, b, way)


func test_only_the_1s_but_2x1_have_no_strategy() -> void:
	for a in range(1, 13):
		for b in range(1, 13):
			var none := Strategies.for_fact(a, b).is_empty()
			assert_eq(none, b == 1 and a != 2, "%dx%d" % [a, b])


func test_the_same_fact_always_breaks_down_the_same_way() -> void:
	assert_eq(_keys(8, 9), _keys(8, 9))
	assert_eq(_sums(Strategies.for_fact(8, 9)[0]), _sums(Strategies.for_fact(8, 9)[0]))


## The last step is the product, each earlier step's answer feeds the last,
## and every sum is the arithmetic its op says.
func _assert_adds_up(a: int, b: int, way: Strategy) -> void:
	var label := "%dx%d %s" % [a, b, way.key]
	var steps := way.steps
	var last := steps.back() as StrategyStep
	assert_eq(last.answer, a * b, label)
	for step in steps:
		assert_eq(step.answer, _arithmetic(step), label)
	if way.key == Strategy.DOUBLING:
		assert_eq(steps.size(), 2, label)
		assert_eq(last.left, steps[0].answer, label)
	else:
		assert_eq(steps.size(), 3, label)
		assert_eq([last.left, last.right], [steps[0].answer, steps[1].answer], label)


func _arithmetic(step: StrategyStep) -> int:
	match step.op:
		StrategyStep.TIMES:
			return step.left * step.right
		StrategyStep.PLUS:
			return step.left + step.right
		StrategyStep.MINUS:
			return step.left - step.right
		StrategyStep.DOUBLE:
			return step.left + step.left
	return -1
