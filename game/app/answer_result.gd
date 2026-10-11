## Read-model: what happened when an answer was submitted.
class_name AnswerResult
extends RefCounted

var correct: bool
var outcome: AnswerGrading.Outcome
var correct_answer: int
var coins_awarded: int
var total_coins: int
## False when the save store refused the write; the loop carries on regardless.
var saved: bool
