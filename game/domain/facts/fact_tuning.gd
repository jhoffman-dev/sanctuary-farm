## Every learning tuning number in one place, and the rules that name a fact —
## `facts/tuning.ts`, value for value. World and UI constants belong to scenes.
class_name FactTuning
extends RefCounted

# ─── Latency grading ───
const FLUENT_MAX_MS := 3000
const LABORED_MIN_MS := 8000

# ─── Leitner schedule, counted in questions asked (global_counter), never wall-clock ───
const LEITNER_INTERVALS := {1: 3, 2: 8, 3: 20, 4: 60, 5: 150}
const MASTERY_BOX := 5
## A fact is mastered at MASTERY_BOX with its last N latencies all < FLUENT_MAX_MS.
const MASTERY_RECENT_FLUENT_COUNT := 3
const MAX_RECENT_LATENCIES := 5

# ─── Commutativity ───
## A correct a×b promotes b×a by this fraction of a box; it never demotes.
const COMMUTATIVE_PROMOTION := 0.5

# ─── Interleaving ───
const INTERLEAVE_MAX_CONSECUTIVE := 2

# ─── Selection weighting ───
## Weighted pick only when more than this many facts are due; otherwise the most overdue.
const DUE_WEIGHTING_THRESHOLD := 6
const MIN_DUE_BEFORE_INTRODUCE := 2
const WEIGHT_OVERDUE_MULTIPLIER := 2
const WEIGHT_HARD_CORE_BONUS := 3
const WEIGHT_LOW_BOX_BONUS := 2
const WEIGHT_LOW_BOX_MAX := 2

# ─── Introduction tiers ───
## The next tier unlocks once this share of the current tier sits at box 3 or higher.
const TIER_UNLOCK_BOX3_SHARE := 0.8
const MAX_TABLE_DEFAULT := 12
const MIN_TABLE := 1

const TIER_NAMES := {
	1: "Anchors",
	2: "Easy patterns",
	3: "The 3s and 4s",
	4: "The 9s",
	5: "The 6s, 7s, 8s",
	6: "The 12s",
}

# ─── Cold start ───
## Families whose facts start introduced on a fresh save (the Anchors tier).
const COLD_START_FAMILIES: Array[int] = [1, 2, 10]

# ─── Family (egg) practice ───
## How many of a family's facts to keep in active rotation, so a round has variety.
const EGG_ROTATION := 4

const ALL_FAMILIES: Array[int] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
## Stands for "no family" where TypeScript uses null; real families are 1..12.
const NO_FAMILY := 0

# Canonical listing from the spec; is_hard_core matches either operand order.
const _HARD_CORE_CANONICAL := [
	[7, 8], [6, 8], [7, 6], [8, 9], [7, 9], [6, 7], [8, 8], [7, 7], [12, 7], [12, 8],
]


## Which tier a fact belongs to. The FIRST matching rule wins, evaluated 1 → 6,
## so the function is total over 1..12 × 1..12.
static func tier_of(a: int, b: int) -> int:
	var has := func(n: int) -> bool: return a == n or b == n
	if has.call(1) or has.call(2) or has.call(10):
		return 1
	if has.call(5) or a == b or (has.call(11) and mini(a, b) <= 9):
		return 2
	if has.call(3) or has.call(4):
		return 3
	if has.call(9):
		return 4
	if has.call(6) or has.call(7) or has.call(8):
		return 5
	return 6


static func is_hard_core(id: String) -> bool:
	for pair: Array in _HARD_CORE_CANONICAL:
		if id == fact_id(pair[0], pair[1]) or id == fact_id(pair[1], pair[0]):
			return true
	return false


## "7x8" — operands are ordered, so 7×8 and 8×7 are distinct facts.
static func fact_id(a: int, b: int) -> String:
	return "%dx%d" % [a, b]


static func family_of(a: int, b: int) -> int:
	return maxi(a, b)


## "7x8" → "8x7". Refuses an id with no "x" in it.
static func commute_id(id: String) -> Result:
	var parts := id.split("x")
	if parts.size() < 2:
		return Result.failure('commute_id: malformed fact id "%s"' % id)
	return Result.success("%sx%s" % [parts[1], parts[0]])


## The int a number stands for when it is a whole, finite number (as
## TypeScript's Number.isInteger), else null. JSON numbers arrive as floats,
## and a float key never finds an int key in a Dictionary.
static func whole_number(value: Variant) -> Variant:
	if typeof(value) == TYPE_INT:
		return value
	if typeof(value) != TYPE_FLOAT or not is_finite(value) or value != floorf(value):
		return null
	return int(value)
