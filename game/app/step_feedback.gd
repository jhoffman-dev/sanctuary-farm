## Read-model: what happened when a training step was answered. Nothing is
## earned and nothing is saved: the step is scaffolding, not recall.
class_name StepFeedback
extends RefCounted

## The step just answered, worked out.
var worked: WorkedStepSummary
## The training after it: the next step, or done.
var training: TrainingSummary
## A Sounds name: CORRECT or WRONG.
var sound: String


static func of(after: Training) -> StepFeedback:
	var feedback := StepFeedback.new()
	feedback.worked = WorkedStepSummary.of_worked(after.worked.back())
	feedback.training = TrainingSummary.of(after)
	feedback.sound = Sounds.CORRECT if feedback.worked.correct else Sounds.WRONG
	return feedback
