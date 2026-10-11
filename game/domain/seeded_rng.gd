## mulberry32, bit-for-bit the TypeScript domain's `createRng(seed)`, so a seed
## replays the same sequence in both clients (the SF-94 port relies on it).
## GDScript ints are 64-bit, so every step masks back to 32 bits.
class_name SeededRng
extends Rng

const _MASK_32 := 0xFFFFFFFF
const _TWO_POW_32 := 4294967296.0

var _state: int


func _init(seed_value: int) -> void:
	_state = seed_value & _MASK_32


func next_float() -> float:
	_state = (_state + 0x6D2B79F5) & _MASK_32
	var t := _imul(_state ^ (_state >> 15), 1 | _state)
	t = ((t + _imul(t ^ (t >> 7), 61 | t)) & _MASK_32) ^ t
	return float((t ^ (t >> 14)) & _MASK_32) / _TWO_POW_32


## JavaScript's Math.imul on unsigned 32-bit operands. Split in 16-bit halves:
## a full 32 x 32 product can overflow a signed 64-bit int.
static func _imul(x: int, y: int) -> int:
	var low := (x * (y & 0xFFFF)) & _MASK_32
	var high := ((x * (y >> 16)) & 0xFFFF) << 16
	return (low + high) & _MASK_32
