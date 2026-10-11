## The question the player is looking at. There is never more than one, and
## it is compared by identity: a new serve is a new InFlight.
class_name InFlight
extends RefCounted

var question: Question
## Clock reading when served. Latency is measured from here — never by a scene.
var served_at: int
## Scheduler global_counter when served; becomes the session entry's asked_at.
var asked_at: int


func _init(served_question: Question, served_at_msec: int, counter: int) -> void:
	question = served_question
	served_at = served_at_msec
	asked_at = counter
