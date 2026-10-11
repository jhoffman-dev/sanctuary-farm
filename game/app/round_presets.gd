## Round shapes that are game rules — `round-presets.ts`. Scenes ask for these
## rather than choosing their own lengths.
class_name RoundPresets
extends RefCounted

const PADDOCK_QUESTIONS := 5


static func paddock() -> RoundPlan:
	return RoundPlan.new(SessionContext.PADDOCK, PADDOCK_QUESTIONS)


## A care task's round: mixed practice in the stall (curriculum.md), as long
## as the task asks for.
static func care(task: String) -> RoundPlan:
	return RoundPlan.new(SessionContext.STALL, CareTask.questions_for(task))
