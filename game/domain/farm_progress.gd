## What the placeholder loop saves: coins and how many questions were answered.
## Immutable — with_answer returns a new value. SF-94 grows this into the full
## FarmSave (scheduler state, feed, eggs).
class_name FarmProgress
extends RefCounted

var coins: int
var questions_answered: int


func _init(coin_count: int = 0, answered_count: int = 0) -> void:
	coins = coin_count
	questions_answered = answered_count


func with_answer(outcome: AnswerGrading.Outcome) -> FarmProgress:
	return FarmProgress.new(coins + AnswerGrading.coins_for(outcome), questions_answered + 1)
