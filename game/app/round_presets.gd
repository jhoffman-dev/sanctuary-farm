## Round shapes that are game rules — `round-presets.ts`. Scenes ask for these
## rather than choosing their own lengths.
class_name RoundPresets
extends RefCounted

const PADDOCK_QUESTIONS := 5


static func paddock() -> RoundPlan:
	return RoundPlan.new(SessionContext.PADDOCK, PADDOCK_QUESTIONS)
