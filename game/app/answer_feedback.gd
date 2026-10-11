## Read-model: what happened when an answer was graded.
class_name AnswerFeedback
extends RefCounted

var question: Question
## An Outcome string.
var outcome: String
var correct: bool
var correct_answer: int
var latency_ms: float
var coins_earned: int
var fact_mastered: bool
## The family this answer completed, or FactTuning.NO_FAMILY.
var family_just_mastered: int
## The question now in flight, or null when the round is complete.
var next: Question
## Sounds to play, in order (names from Sounds). The scene plays them; the
## application decides which, so the same answer always sounds the same.
var sounds: Array[String] = []
