## Turning a graded answer into coins, a log entry and feedback — `feedback.ts`.
class_name AnswerFeedbacks
extends RefCounted


## Coins come only from a graded answer, and only where the context earns
## them: the paddock and the nest (game rule 2).
static func coins_earned_for(context: String, result: GradeResult) -> int:
	return Coins.coins_for(result.outcome) if Coins.context_earns_coins(context) else 0


static func session_entry_for(graded: GradedAnswer) -> Dictionary:
	return {
		"fact_id": graded.question.fact_id,
		"given": graded.given,
		"correct": graded.result.correct,
		"latency_ms": graded.latency_ms,
		"outcome": graded.result.outcome,
		"asked_at": graded.asked_at,
	}


static func feedback_for(graded: GradedAnswer, coins_earned: int, next: Question) -> AnswerFeedback:
	var feedback := AnswerFeedback.new()
	feedback.question = graded.question
	feedback.outcome = graded.result.outcome
	feedback.correct = graded.result.correct
	feedback.correct_answer = graded.result.correct_answer
	feedback.latency_ms = graded.latency_ms
	feedback.coins_earned = coins_earned
	feedback.fact_mastered = graded.result.fact_mastered
	feedback.family_just_mastered = graded.result.family_just_mastered
	feedback.next = next
	feedback.sounds = Sounds.for_graded(graded.result.outcome, graded.result.family_just_mastered)
	return feedback
