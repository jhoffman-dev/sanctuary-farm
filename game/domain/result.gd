## The answer from a call that may refuse. GDScript has no exceptions, so every
## rule that throws in the TypeScript domain returns one of these instead:
## `ok` with a `value`, or not `ok` with an `error` that says why. A caller
## reads `value` only after checking `ok`; a refused call changed nothing.
class_name Result
extends RefCounted

var ok: bool
var value: Variant
var error: String


static func success(result_value: Variant = null) -> Result:
	var result := Result.new()
	result.ok = true
	result.value = result_value
	return result


static func failure(reason: String) -> Result:
	var result := Result.new()
	result.ok = false
	result.error = reason
	return result
