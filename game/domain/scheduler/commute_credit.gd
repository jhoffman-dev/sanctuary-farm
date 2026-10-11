## Commutativity — `scheduler/commute.ts`.
class_name CommuteCredit
extends RefCounted


## Bank half a box of credit for a×b's twin b×a; apply it as a real promotion
## once a whole box is owed. Never demotes, never touches an un-introduced or
## already-mastered twin. The fractional remainder stays in the state so a
## reload cannot lose a half-earned promotion.
static func credit_twin(state: Dictionary, fact: Fact) -> Dictionary:
	if fact.a == fact.b:
		return state
	var twin_id := FactTuning.fact_id(fact.b, fact.a)
	var twin: Variant = state.facts.get(twin_id)
	if twin == null or not twin.introduced or twin.box >= FactTuning.MASTERY_BOX:
		return state

	var credit: float = state.commute_credit.get(twin_id, 0.0) + FactTuning.COMMUTATIVE_PROMOTION
	var whole_boxes := int(floorf(credit))
	var owed: Dictionary = state.commute_credit.duplicate()
	owed[twin_id] = credit - whole_boxes
	var credited := SchedulerState.with_changes(state, {"commute_credit": owed})
	if whole_boxes == 0:
		return credited

	var box := Leitner.clamp_box(twin.box + whole_boxes)
	var due_at: int = state.global_counter + Leitner.interval_for(box)
	return SchedulerState.with_status(credited, FactState.patched(twin, {"box": box, "due_at": due_at}))
