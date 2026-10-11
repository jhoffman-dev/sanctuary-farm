## A source of numbers in [0, 1). Every random choice in the domain goes through
## one, so tests can seed it. It lives in the domain (not app/ports) because the
## domain's own rules need it and the domain depends on nothing; the application
## takes the same type as its Rng port, as `@sf/application` does in TypeScript.
## The static helpers are `rng.ts`'s weightedPick and shuffle, draw for draw.
class_name Rng
extends RefCounted


## Subclasses override this. The base is never meant to be called.
func next_float() -> float:
	push_error("Rng.next_float() is abstract; inject SeededRng or an adapter")
	return 0.0


## Weighted pick: weights[i] pairs with items[i]. A non-positive total falls back
## to a uniform pick. Refuses an empty list.
static func weighted_pick(items: Array, weights: Array, rng: Rng) -> Result:
	if items.is_empty():
		return Result.failure("weighted_pick: empty items")
	var total := 0.0
	for weight: Variant in weights:
		total += maxf(0.0, float(weight))
	if total <= 0.0:
		return Result.success(items[int(rng.next_float() * items.size())])
	var remaining := rng.next_float() * total
	for i in items.size():
		remaining -= maxf(0.0, float(weights[i]) if i < weights.size() else 0.0)
		if remaining < 0.0:
			return Result.success(items[i])
	return Result.success(items[items.size() - 1])


## Fisher–Yates into a new array; the input is left as it was.
static func shuffle(items: Array, rng: Rng) -> Array:
	var out := items.duplicate()
	for i in range(out.size() - 1, 0, -1):
		var j := int(rng.next_float() * (i + 1))
		var held: Variant = out[i]
		out[i] = out[j]
		out[j] = held
	return out
