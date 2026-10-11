## One answer to grade. `given` and `latency_ms` are floats so a caller's
## nonsense (NaN, a fraction, a negative duration) reaches the rules that
## refuse or grade it, rather than being rounded into something plausible.
class_name Answer
extends RefCounted

var fact_id: String
var given: float
var latency_ms: float


func _init(answered_id: String, given_value: float, latency: float) -> void:
	fact_id = answered_id
	given = given_value
	latency_ms = latency
