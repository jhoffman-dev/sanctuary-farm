## Which fact comes next — `scheduler/next.ts`. Both pickers return a Result
## whose value is a Served; they refuse only a state with nothing to serve
## (Playable.has_playable_fact says the same thing up front).
class_name NextFact
extends RefCounted

const NO_CANDIDATES := "scheduler: no candidate facts"


## One mixed-practice decision in progress.
class _DueRound:
	var state: Dictionary
	var cards: Array[Card]
	var introduced: Array[Card]
	var due: Array[Card]
	var rng: Rng


## The next fact for mixed practice: introduce, or serve what is due, or drill the slowest.
static func pick(initial: Dictionary, rng: Rng) -> Result:
	var cards := SchedulerCards.in_play(initial)
	var state := TierUnlock.with_unlocked_tiers(initial, cards)
	var introduced: Array[Card] = cards.filter(func(card: Card) -> bool: return card.status.introduced)
	var counter: int = state.global_counter
	var due: Array[Card] = introduced.filter(func(card: Card) -> bool: return SchedulerCards.is_due(card, counter))

	if due.size() < FactTuning.MIN_DUE_BEFORE_INTRODUCE:
		var fresh := _introduce_next(state, cards)
		if fresh != null:
			return Result.success(fresh)
	if due.is_empty():
		# Nothing is due and no other family can be introduced: drill the slowest.
		# `introduced` spans the whole board, so relaxing here means a single-family board.
		var pool := Interleave.avoiding_family(introduced, Interleave.blocked_family(state))
		if pool.is_empty():
			return Result.failure(NO_CANDIDATES)
		return Result.success(Interleave.serve(state, Selection.worst_rolling_mean(pool).fact))

	var round := _DueRound.new()
	round.state = state
	round.cards = cards
	round.introduced = introduced
	round.due = due
	round.rng = rng
	return Result.success(_serve_due(round))


## The next fact for practising one family (an egg). Drives the family towards
## mastery with variety: a rotation of its facts, never the same one twice in a
## row. Falls back to mixed practice when the family has no facts in range.
static func pick_in_family(initial: Dictionary, family: Variant, rng: Rng) -> Result:
	var members := SchedulerCards.in_family(initial, family)
	if members.is_empty():
		return pick(initial, rng)
	var state := _top_up_rotation(initial, members)
	var candidates := _rotation_candidates(state, SchedulerCards.in_family(state, family))
	if candidates.is_empty():
		return Result.failure(NO_CANDIDATES)
	return Result.success(Interleave.serve(state, Selection.neediest(candidates, state.global_counter).fact))


static func _introduce_next(state: Dictionary, cards: Array[Card]) -> Served:
	var chosen := Introduction.pick(state, cards)
	if chosen == null:
		return null
	return Interleave.serve(Introduction.introduce(state, chosen), chosen.fact)


static func _serve_due(round: _DueRound) -> Served:
	var state := round.state
	var blocked := Interleave.blocked_family(state)
	var unblocked: Array[Card] = round.due.filter(func(card: Card) -> bool: return card.fact.family != blocked)
	if unblocked.is_empty() and blocked != FactTuning.NO_FAMILY:
		var pulled := _pull_another_family_forward(round, blocked)
		if pulled != null:
			return pulled
	var pool := unblocked if not unblocked.is_empty() else round.due
	# Weight only when comfortably many are due; otherwise the most overdue wins.
	if round.due.size() > FactTuning.DUE_WEIGHTING_THRESHOLD:
		var weights := pool.map(func(card: Card) -> int: return Selection.selection_weight(card, state.global_counter))
		var picked: Card = Rng.weighted_pick(pool, weights, round.rng).value
		return Interleave.serve(state, picked.fact)
	return Interleave.serve(state, Selection.most_overdue(pool, state.global_counter).fact)


## Every due fact is the blocked family. Rather than break the interleave rule,
## introduce another family's fact or pull its soonest-due fact forward. Null
## only when the board has a single family.
static func _pull_another_family_forward(round: _DueRound, blocked: int) -> Served:
	var fresh := _introduce_next(round.state, round.cards)
	if fresh != null:
		return fresh
	var soonest: Card = null
	for card in round.introduced:
		if card.fact.family != blocked and (soonest == null or card.status.due_at < soonest.status.due_at):
			soonest = card
	return Interleave.serve(round.state, soonest.fact) if soonest != null else null


static func _needing_work(cards: Array[Card]) -> Array[Card]:
	return cards.filter(
		func(card: Card) -> bool: return card.status.introduced and not Mastery.is_fact_mastered(card.status)
	)


## Keep ~EGG_ROTATION unmastered facts of the family in play, introducing in table order.
static func _top_up_rotation(state: Dictionary, family: Array[Card]) -> Dictionary:
	if _needing_work(family).size() >= FactTuning.EGG_ROTATION:
		return state
	for card in family:
		if not card.status.introduced:
			return Introduction.introduce(state, card)
	return state


## Unmastered facts not asked last time; else any introduced fact not asked last
## time (mastered ones stand in rather than repeat the sole unmastered one);
## else a repeat, which only a single-fact family (the 1s) ever forces.
static func _rotation_candidates(state: Dictionary, family: Array[Card]) -> Array[Card]:
	var introduced: Array[Card] = family.filter(func(card: Card) -> bool: return card.status.introduced)
	var last_served: Variant = state.last_served
	var not_just_asked := func(cards: Array[Card]) -> Array[Card]:
		return cards.filter(func(card: Card) -> bool: return card.fact.id != last_served)
	for pool: Array[Card] in [not_just_asked.call(_needing_work(introduced)), not_just_asked.call(introduced), introduced]:
		if not pool.is_empty():
			return pool
	return [] as Array[Card]
