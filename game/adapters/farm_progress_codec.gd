## Text <-> FarmProgress for the save file. Parse, don't trust: anything that
## is not exactly a version-1 save decodes to null (a fresh farm), never to a
## half-read value and never to a crash — `@sf/persistence`'s rule in miniature.
class_name FarmProgressCodec
extends RefCounted

const SCHEMA_VERSION := 1
## A ceiling well past any real farm, so a tampered blob cannot overflow the HUD.
const MAX_COUNT := 1_000_000_000


static func encode(progress: FarmProgress) -> String:
	return JSON.stringify({
		"version": SCHEMA_VERSION,
		"coins": progress.coins,
		"questions_answered": progress.questions_answered,
	})


static func decode(text: String) -> FarmProgress:
	var json := JSON.new()
	if json.parse(text) != OK:
		return null
	return _from_value(json.data)


static func _from_value(value: Variant) -> FarmProgress:
	if typeof(value) != TYPE_DICTIONARY:
		return null
	var saved: Dictionary = value
	if _count(saved.get("version")) != SCHEMA_VERSION:
		return null
	var coins := _count(saved.get("coins"))
	var answered := _count(saved.get("questions_answered"))
	if coins < 0 or answered < 0:
		return null
	return FarmProgress.new(coins, answered)


## A whole number in 0..MAX_COUNT, or -1. JSON numbers arrive as floats, and
## a string or bool must not reach `==` against an int (GDScript errors on it).
static func _count(value: Variant) -> int:
	if typeof(value) != TYPE_FLOAT and typeof(value) != TYPE_INT:
		return -1
	var number := float(value)
	if not is_finite(number) or number < 0.0 or number > MAX_COUNT or number != floorf(number):
		return -1
	return int(number)
