## A source of numbers in [0, 1). Every random choice in the domain goes through
## one, so tests can seed it. It lives in the domain (not app/ports) because the
## domain's own rules need it and the domain depends on nothing; the application
## takes the same type as its Rng port, as `@sf/application` does in TypeScript.
class_name Rng
extends RefCounted


## Subclasses override this. The base is never meant to be called.
func next_float() -> float:
	push_error("Rng.next_float() is abstract; inject SeededRng or an adapter")
	return 0.0
