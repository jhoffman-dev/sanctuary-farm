## Read-model: one question as the pad shows it. The same instance is handed
## out until the question is answered.
class_name Question
extends RefCounted

var fact_id: String
var a: int
var b: int
var family: int
## 0-based position in the round.
var index: int


static func of(fact: Fact, position: int) -> Question:
	var question := Question.new()
	question.fact_id = fact.id
	question.a = fact.a
	question.b = fact.b
	question.family = fact.family
	question.index = position
	return question
