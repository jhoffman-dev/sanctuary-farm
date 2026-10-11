## The multiplication table the game draws questions from.
class_name FactTable
extends RefCounted

const MIN_TABLE := 1
const MAX_TABLE := 12


static func is_valid_size(max_table: int) -> bool:
	return max_table >= MIN_TABLE and max_table <= MAX_TABLE


## Every ordered pair a × b with 1 <= a, b <= max_table, in (a, b) order.
## GDScript has no exceptions, so an out-of-range size yields an empty table;
## callers check is_valid_size first (the use-case refuses to start without it).
static func build(max_table: int = MAX_TABLE) -> Array[Fact]:
	var facts: Array[Fact] = []
	if not is_valid_size(max_table):
		return facts
	for a in range(1, max_table + 1):
		for b in range(1, max_table + 1):
			facts.append(Fact.new(a, b))
	return facts
