## Which strategies break a fact a × b down, and their steps — the prototype's
## `strategiesFor` (`TrainingScreen.tsx`), made pure. Always b is broken down,
## as the prototype did; a × b and b × a are separate facts. Deterministic:
## the same fact always gives the same strategies in the same order.
## The numbers and their sources are in docs/training-ring.md.
class_name Strategies
extends RefCounted

## b at or above this splits at 5 ("5 and the rest"); below it, into halves.
const SPLIT_AT_FIVE_FROM := 6
const FIVE := 5
const TEN := 10
## ×10 anchors b in this range, except 10 itself.
const TEN_ANCHOR_MIN := 6
const TEN_ANCHOR_MAX := 12
## Near-square: b is this far from a.
const NEAR_SQUARE_DISTANCE := 1
const LESS := "less"
const MORE := "more"


## In the prototype's order: area model, ×10 anchor, doubling, near-square —
## each only when it suits the fact. Empty for a × 1 (other than 2 × 1): there
## is nothing to break down.
static func for_fact(a: int, b: int) -> Array[Strategy]:
	var found: Array[Strategy] = []
	if not area_split(b).is_empty():
		found.append(_area_model(a, b))
	if b >= TEN_ANCHOR_MIN and b <= TEN_ANCHOR_MAX and b != TEN:
		found.append(_ten_anchor(a, b))
	if b % 2 == 0:
		found.append(_doubling(a, b))
	if absi(b - a) == NEAR_SQUARE_DISTANCE:
		found.append(_near_square(a, b))
	return found


## How b splits on the area model: [5, b − 5] from 6 up, halves below
## (smaller half first), and [] for 1 — which does not split.
static func area_split(b: int) -> Array[int]:
	if b >= SPLIT_AT_FIVE_FROM:
		return [FIVE, b - FIVE]
	if b < 2:
		return []
	return [floori(b / 2.0), ceili(b / 2.0)]


static func _area_model(a: int, b: int) -> Strategy:
	var parts := area_split(b)
	var steps: Array[StrategyStep] = [
		StrategyStep.times(a, parts[0]),
		StrategyStep.times(a, parts[1]),
		StrategyStep.plus(a * parts[0], a * parts[1]),
	]
	return Strategy.new(Strategy.AREA_MODEL, steps, {"parts": parts})


static func _ten_anchor(a: int, b: int) -> Strategy:
	var by := absi(TEN - b)
	var last := StrategyStep.minus(a * TEN, a * by) if b < TEN else StrategyStep.plus(a * TEN, a * by)
	var steps: Array[StrategyStep] = [StrategyStep.times(a, TEN), StrategyStep.times(a, by), last]
	return Strategy.new(Strategy.TEN_ANCHOR, steps, _offset_hint(TEN, b))


static func _doubling(a: int, b: int) -> Strategy:
	var half := floori(b / 2.0)
	var steps: Array[StrategyStep] = [StrategyStep.times(a, half), StrategyStep.double(a * half)]
	return Strategy.new(Strategy.DOUBLING, steps, {"half": half})


static func _near_square(a: int, b: int) -> Strategy:
	var by := absi(b - a)
	var last := StrategyStep.plus(a * a, a * by) if b > a else StrategyStep.minus(a * a, a * by)
	var steps: Array[StrategyStep] = [StrategyStep.times(a, a), StrategyStep.times(a, by), last]
	return Strategy.new(Strategy.NEAR_SQUARE, steps, _offset_hint(a, b))


## b is `by` less or more than `from`.
static func _offset_hint(from: int, b: int) -> Dictionary:
	return {"from": from, "by": absi(b - from), "direction": LESS if b < from else MORE}
