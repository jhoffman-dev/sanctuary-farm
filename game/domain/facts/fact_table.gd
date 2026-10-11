## The multiplication table the game draws questions from — `facts/table.ts`.
## Every table size funnels through check_size, the one place it is validated.
##
## Family and tier membership is indexed once per table size, the first time a
## size is asked for, instead of on every scheduler step (SF-88). Safe as static
## state in the domain: it is a pure function of the size, never written after
## it is built, and every array it hands out is read-only and holds immutable
## Facts, so no caller can observe or change it.
class_name FactTable
extends RefCounted

## size -> {"all": Array[Fact], "by_family": {int: Array[Fact]}, "by_tier": {int: Array[Fact]}}
static var _index_by_size: Dictionary = {}
static var _by_id: Dictionary = {}
static var _no_facts: Array[Fact] = _read_only([] as Array[Fact])


## Refuses anything but a whole table size the 12×12 table can grade. A larger
## size would make facts get_fact does not know; the value is the size as an int.
static func check_size(max_table: Variant) -> Result:
	var size: Variant = FactTuning.whole_number(max_table)
	if size == null or size < FactTuning.MIN_TABLE or size > FactTuning.MAX_TABLE_DEFAULT:
		return Result.failure(
			"max_table must be a whole number in %d..%d, got %s"
			% [FactTuning.MIN_TABLE, FactTuning.MAX_TABLE_DEFAULT, str(max_table)]
		)
	return Result.success(size)


## Every ordered pair a × b with 1 <= a, b <= max_table, in (a, b) order, as a
## new array the caller may change (the Facts themselves are immutable).
static func build(max_table: Variant = FactTuning.MAX_TABLE_DEFAULT) -> Result:
	var size := check_size(max_table)
	if not size.ok:
		return size
	return Result.success(table_of(size.value).duplicate())


## The shared, read-only facts of a size that is already known to be valid —
## a scheduler state's max_table. Empty for an invalid size; use build or
## check_size where the size comes from outside the rules.
static func table_of(max_table: int) -> Array[Fact]:
	var index: Variant = _index_of(max_table)
	return index.all if index != null else _no_facts


## A fact of the full 12×12 table by id, or null.
static func get_fact(id: String) -> Fact:
	_index_of(FactTuning.MAX_TABLE_DEFAULT)
	return _by_id.get(id)


## The facts whose larger operand is `family`, in (a, b) order; read-only and
## shared between calls. A family with no facts in range is an empty array.
static func facts_in_family(family: Variant, max_table: Variant = FactTuning.MAX_TABLE_DEFAULT) -> Result:
	return _members("by_family", family, max_table)


## The facts of `tier`, in (a, b) order; read-only and shared between calls.
static func facts_in_tier(tier: Variant, max_table: Variant = FactTuning.MAX_TABLE_DEFAULT) -> Result:
	return _members("by_tier", tier, max_table)


static func _members(grouping: String, key: Variant, max_table: Variant) -> Result:
	var size := check_size(max_table)
	if not size.ok:
		return size
	var groups: Dictionary = _index_of(size.value)[grouping]
	return Result.success(groups.get(FactTuning.whole_number(key), _no_facts))


static func _index_of(size: int) -> Variant:
	if size < FactTuning.MIN_TABLE or size > FactTuning.MAX_TABLE_DEFAULT:
		return null
	if not _index_by_size.has(size):
		_index_by_size[size] = _indexed(size)
	return _index_by_size[size]


static func _indexed(size: int) -> Dictionary:
	var all: Array[Fact] = []
	var by_family := {}
	var by_tier := {}
	for a in range(1, size + 1):
		for b in range(1, size + 1):
			var fact := _shared_fact(a, b)
			all.append(fact)
			_group(by_family, fact.family, fact)
			_group(by_tier, fact.tier, fact)
	for groups: Dictionary in [by_family, by_tier]:
		for key: int in groups:
			_read_only(groups[key])
		groups.make_read_only()
	return {"all": _read_only(all), "by_family": by_family, "by_tier": by_tier}


## One Fact instance per id across every table size, so a size's facts are
## the very ones get_fact returns.
static func _shared_fact(a: int, b: int) -> Fact:
	var id := FactTuning.fact_id(a, b)
	if not _by_id.has(id):
		_by_id[id] = Fact.new(a, b)
	return _by_id[id]


static func _group(groups: Dictionary, key: int, fact: Fact) -> void:
	if not groups.has(key):
		groups[key] = [] as Array[Fact]
	groups[key].append(fact)


static func _read_only(facts: Array[Fact]) -> Array[Fact]:
	facts.make_read_only()
	return facts
