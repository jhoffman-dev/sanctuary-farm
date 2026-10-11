## Read-model: an answered step, worked out — shown whether it was right or
## not, so a wrong answer still ends on the right sum (no punishment framing).
class_name WorkedStepSummary
extends StepPrompt

var answer: int
var given: float
var correct: bool


static func of_worked(worked: WorkedStep) -> WorkedStepSummary:
	var summary := WorkedStepSummary.new()
	summary.left = worked.step.left
	summary.op = worked.step.op
	summary.right = worked.step.right
	summary.answer = worked.step.answer
	summary.given = worked.given
	summary.correct = worked.correct
	return summary
