## Test fixtures for the scheduler — `packages/domain/test/fixtures.ts`, plus
## the answer policies the TypeScript suites share. Every call returns new
## data; nothing here edits a state it was given.
extends RefCounted

const FLUENT := [900, 900, 900]


## A fresh scheduler state (the call cannot be refused for a valid size).
static func fresh(max_table: int = 12) -> Dictionary:
	return SchedulerState.initial(max_table).value


static func fresh_farm(max_table: int = 12) -> Dictionary:
	return FarmSave.empty(max_table).value


## A copy of `state` with one fact forced into a known, introduced state.
static func with_fact(state: Dictionary, id: String, patch: Dictionary) -> Dictionary:
	assert(state.facts.has(id), 'fixture: state has no fact "%s"' % id)
	var changes := {"introduced": true}
	changes.merge(patch, true)
	return SchedulerState.with_status(state, FactState.patched(state.facts[id], changes))


static func with_facts(state: Dictionary, ids: Array, patch: Dictionary) -> Dictionary:
	var out := state
	for id: String in ids:
		out = with_fact(out, id, patch)
	return out


## A complete, introduced FactState with the given overrides.
static func fact_status(patch: Dictionary) -> Dictionary:
	return FactState.patched(FactState.fresh("1x1", true), patch)


static func introduced_ids(state: Dictionary) -> Array[String]:
	var ids: Array[String] = []
	for status: Dictionary in state.facts.values():
		if status.introduced:
			ids.append(status.id)
	return ids


static func ids_of(facts: Array) -> Array[String]:
	var ids: Array[String] = []
	for fact: Fact in facts:
		ids.append(fact.id)
	return ids


## Makes every nested Dictionary and Array read-only, so any in-place write
## raises an engine error and fails the test — TypeScript's deepFreeze.
static func deep_freeze(value: Variant) -> Variant:
	if value is Dictionary:
		for nested: Variant in value.values():
			deep_freeze(nested)
		value.make_read_only()
	elif value is Array:
		for nested: Variant in value:
			deep_freeze(nested)
		value.make_read_only()
	return value


static func next_of(state: Dictionary, rng: Rng) -> Served:
	return NextFact.pick(state, rng).value


static func next_in_family(state: Dictionary, family: Variant, rng: Rng) -> Served:
	return NextFact.pick_in_family(state, family, rng).value


static func grade(state: Dictionary, fact_id: String, given: float, latency_ms: float) -> Graded:
	return Grading.grade_answer(state, Answer.new(fact_id, given, latency_ms)).value


# ─── Answer policies: (fact, index) -> [given, latency_ms] ───

static func always_fluent(fact: Fact, _index: int) -> Array:
	return [fact.answer, 900]


## Wrong every 7th, labored every 11th, slow every 3rd, fluent otherwise.
static func mixed(fact: Fact, i: int) -> Array:
	var latency := 9000 if i % 11 == 0 else (5000 if i % 3 == 0 else 1200)
	return [fact.answer + 1 if i % 7 == 0 else fact.answer, latency]


## A struggling child: wrong two in five, never fluent.
static func struggling(fact: Fact, i: int) -> Array:
	return [fact.answer - 1 if i % 5 < 2 else fact.answer, 4000 if i % 2 == 0 else 9500]


static func policy(name: String) -> Callable:
	match name:
		"alwaysFluent":
			return always_fluent
		"mixed":
			return mixed
		"struggling":
			return struggling
		"interleave":
			return func(fact: Fact, i: int) -> Array:
				return [fact.answer + 1 if i % 5 == 0 else fact.answer, 5000 if i % 3 == 0 else 1500]
		"determinism":
			return func(fact: Fact, i: int) -> Array: return [fact.answer, 4000 if i % 3 == 0 else 1500]
		"purity":
			return func(fact: Fact, i: int) -> Array:
				return [0 if i % 6 == 0 else fact.answer, 6000 if i % 4 == 0 else 1200]
	assert(false, "fixture: no policy %s" % name)
	return always_fluent


## One step of a driven run, with both intermediate states kept.
class Step:
	var index: int
	var served: Fact
	var outcome: String
	## State returned by the picker: after the serve, before the grade.
	var after_serve: Dictionary
	## State returned by grading.
	var after_grade: Dictionary


## `count` serve → grade cycles. `pick` is (state, rng) -> Served; mixed
## practice when omitted. `answer` is a policy.
static func play(initial: Dictionary, rng: Rng, count: int, answer: Callable, pick: Callable = next_of) -> Array[Step]:
	var steps: Array[Step] = []
	var state := initial
	for i in count:
		var served: Served = pick.call(state, rng)
		var given_and_latency: Array = answer.call(served.fact, i)
		var graded := grade(served.state, served.fact.id, given_and_latency[0], given_and_latency[1])
		var step := Step.new()
		step.index = i
		step.served = served.fact
		step.outcome = graded.result.outcome
		step.after_serve = served.state
		step.after_grade = graded.state
		steps.append(step)
		state = graded.state
	return steps


static func in_family(family: Variant) -> Callable:
	return func(state: Dictionary, rng: Rng) -> Served: return next_in_family(state, family, rng)


static func final_state(steps: Array[Step], initial: Dictionary) -> Dictionary:
	return steps[-1].after_grade if not steps.is_empty() else initial


## "7x8:F" per step, as the oracle file's traces record them.
static func trace_of(steps: Array[Step]) -> Array[String]:
	var trace: Array[String] = []
	for step in steps:
		trace.append("%s:%s" % [step.served.id, step.outcome.left(1)])
	return trace
