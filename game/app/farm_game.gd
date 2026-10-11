## The one stateful entry point the scenes talk to — `farm-game.ts`. Owns "one
## fact in flight": the scheduler is asked exactly once per question, the same
## question is returned until it is answered, and latency is read from the
## injected clock, never from the caller.
##
## Every persisting call (load_farm, answer, end_round, buy, buy_feed, hatch,
## move_to_zoo, move_to_barn, set_muted) is a coroutine — always `await` it. It saves first and commits
## to memory only once the store has accepted the farm, so a refused save
## leaves the game exactly where the caller last saw it. Those calls run one
## at a time, in the order they were made, each against what the previous one
## committed.
##
## Sessions end on time (PlaySession): once a session's time is used, starting
## a round, care or an egg and buying feed are refused with
## PlaySession.GOODNIGHT — the scene's cue to say goodnight — while a round
## already running still finishes. The petting zoo settles down for the night
## too: moving animals is refused the same way.
class_name FarmGame
extends RefCounted

## Emitted each time a queued call has finished, whether its save landed or not.
signal _settled

const NOT_LOADED := "FarmGame: call load_farm() first"
const NO_ACTIVE_ROUND := "FarmGame: no active round"
## Animals stay put while a round runs: the round's screen is in front of the
## farm, and the animal being cared for stays where its care began.
const ROUND_IS_ACTIVE := "round-is-active"
const _FAMILY_CONTEXTS: Array[String] = [SessionContext.EGG, SessionContext.STALL]


## The farm and round as they will stand once the store has accepted the farm,
## and the question that will then be in flight (null when none was served).
class _Snapshot:
	var farm: Dictionary
	var active: ActiveRound
	var question: Question

	func _init(next_farm: Dictionary, next_round: ActiveRound, served: Question) -> void:
		farm = next_farm
		active = next_round
		question = served


## A persisting call waiting for its turn.
class _Queued:
	signal finished
	var run: Callable
	var outcome: Variant
	var done := false

	func _init(call_to_run: Callable) -> void:
		run = call_to_run


var _save_store: SaveStore
var _clock: Clock
var _rng: Rng
var _farm: Variant = null
var _active: ActiveRound = null
var _queue: Array[_Queued] = []
var _draining := false
var _pending := 0


func _init(save_store: SaveStore, clock: Clock, rng: Rng) -> void:
	_save_store = save_store
	_clock = clock
	_rng = rng


## Loads the save, or starts a fresh farm. Must run before anything else; a
## second call (mid-round, say) reloads and leaves no round active.
func load_farm() -> FarmSummary:
	return await _serialized(_load)


## The value is a FarmSummary; refused before load_farm.
func summary() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(FarmSummary.of(_farm))


## Serves the round's first question (the value). Refused before load_farm,
## while a round is active (a finished round stays active until end_round),
## while a save is still in progress, after goodnight (PlaySession.GOODNIGHT),
## and for a plan that cannot be played.
func start_round(plan: RoundPlan) -> Result:
	var ready := _ready_to_start("start_round")
	if not ready.ok:
		return ready
	var checked := _checked_plan(plan, _farm.scheduler.max_table)
	if not checked.ok:
		return checked
	return _begin(PracticeRound.begin(checked.value, _clock.now_msec()))


## Starts the care round for one animal's task and serves its first question
## (the value): mixed facts in the stall, no coins. The care itself — health,
## the task marked done, feed used — lands only when end_round closes the
## round with every question graded. Refused as start_round is, and with a
## Barn reason (Barn.NEED_FEED: "visit the feed shed") that writes nothing.
func start_care(animal_id: String, task: String) -> Result:
	var ready := _ready_to_start("start_care")
	if not ready.ok:
		return ready
	var order := CareOrder.new(animal_id, task)
	var allowed := Barn.check_care(_farm, order, _today())
	if not allowed.ok:
		return allowed
	var active := PracticeRound.begin(RoundPresets.care(task), _clock.now_msec())
	active.care = order
	return _begin(active)


## What the active round is caring for, or null (no round, or not a care round).
func care_in_progress() -> CareOrder:
	return _active.care if _active != null else null


## The value is a BarnSummary for today; refused before load_farm.
func barn() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(BarnSummary.of(_farm, _today()))


## The value is a NestSummary: the eggs and their progress, the egg waiting
## for its hatch ceremony (never while a round runs), and the animals hatched.
## Refused before load_farm.
func nest() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(NestSummary.of(_farm, _active != null))


## Starts a round practising one egg's family and serves its first question
## (the value): the family's facts in rotation, at the nest, earning coins.
## Refused as start_round is, and with a Nest reason (Nest.UNKNOWN_EGG,
## Nest.READY_TO_HATCH) that writes nothing.
func start_egg(egg_id: String) -> Result:
	var ready := _ready_to_start("start_egg")
	if not ready.ok:
		return ready
	var egg := Nest.check_practice(_farm, egg_id)
	if not egg.ok:
		return egg
	return _begin(PracticeRound.begin(RoundPresets.egg(egg.value.family), _clock.now_msec()))


## Confirms the hatch once the scene's ceremony has played: the egg's animal
## joins the barn and the egg leaves the nest. The value is the new animal's
## AnimalSummary. Allowed after goodnight — the egg was earned by answers
## already given. Refused before load_farm, while a round is active, with
## Nest.UNKNOWN_EGG or Nest.NOT_READY (writing nothing), or when the save fails.
func hatch(egg_id: String) -> Result:
	return await _serialized(_hatch.bind(egg_id))


## The value is a ZooSummary: the visitors, the barn animals that could come
## over, the room left, and which moves would be accepted now. Refused before
## load_farm.
func zoo() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(ZooSummary.of(_farm, _today(), _zoo_closed_because()))


## Sends a barn animal to visit the petting zoo; the value is the new
## ZooSummary. Free — it costs, earns and asks nothing, and is not play that
## keeps the session clock running. Refused, writing nothing, before
## load_farm, while a round is active (ROUND_IS_ACTIVE), after goodnight
## (PlaySession.GOODNIGHT), with a Zoo reason (Zoo.ZOO_FULL,
## Zoo.ALREADY_THERE, Barn.UNKNOWN_ANIMAL), or when the save fails.
func move_to_zoo(animal_id: String) -> Result:
	return await _serialized(_move.bind(animal_id, Zoo.ZOO))


## Brings a visiting animal home to the barn; refused as move_to_zoo is
## (the barn always has room).
func move_to_barn(animal_id: String) -> Result:
	return await _serialized(_move.bind(animal_id, Zoo.BARN))


## The value is a SessionSummary: time used and left, winding down, goodnight,
## and today's tally for the goodnight summary. Refused before load_farm.
func session() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(SessionSummary.of(_farm, _clock.now_msec(), _clock.utc_offset_minutes()))


## The question in flight, or null.
func current_question() -> Question:
	if _active == null or _active.in_flight == null:
		return null
	return _active.in_flight.question


## Idle (0 of 0) when no round is active.
func round_progress() -> RoundProgress:
	return PracticeRound.progress(_active) if _active != null else RoundProgress.new()


## Grades the question that was in flight when the call was made; the value is
## an AnswerFeedback. Refused if there was none, if that question has since
## been graded and replaced (a double tap), or if the save fails.
func answer(given: float) -> Result:
	# Captured now, not when the turn comes: this is the question on screen.
	var tapped: InFlight = _active.in_flight if _active != null else null
	return await _serialized(_grade.bind(given, tapped))


## Closes the round — early is fine — appends its session log (the value) to
## the save and persists. A care round closed with every question graded also
## applies its care; closed early, it applies none and uses no feed. Refused
## when no round is active or the save fails.
func end_round() -> Result:
	return await _serialized(_end_round)


## The value is a ShopSummary — coins, feed, and each feed shed offer with
## whether it can be bought now (after goodnight, none can); refused before
## load_farm.
func shop() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	return Result.success(ShopSummary.of(_farm, _shed_closed_because()))


## Spends coins on a feed shed offer; the value is the new ShopSummary. No
## question is asked: spending is not a learning action, nor play that keeps
## the session clock running. Refused, writing nothing, with
## FeedShed.NOT_ENOUGH_COINS ("earn coins in the paddock or the nest") or
## FeedShed.UNKNOWN_OFFER, after goodnight (PlaySession.GOODNIGHT), and when
## the save fails. Allowed mid-round: the round's question stays in flight.
func buy(offer_id: String) -> Result:
	return await _serialized(_buy.bind(offer_id))


## Buys the feed sack, the one offer today: buy(FeedShed.FEED_SACK).
func buy_feed() -> Result:
	return await buy(FeedShed.FEED_SACK)


func set_muted(muted: bool) -> Result:
	return await _serialized(_set_muted.bind(muted))


## Returns once no save is in progress — every persisting call made so far has
## landed or failed — so start_round can follow it directly. A failed save is
## its own caller's to handle; this never reports it.
func when_saved() -> void:
	while _pending > 0:
		await _settled


func _load() -> FarmSummary:
	var loaded: Variant = await _save_store.load_farm()
	if loaded == null:
		loaded = FarmSave.empty().value
	_farm = loaded
	_active = null
	return FarmSummary.of(loaded)


func _grade(given: float, tapped: InFlight) -> Result:
	var still := _still_in_flight(tapped)
	if not still.ok:
		return still
	if _farm == null:
		return Result.failure(NOT_LOADED)
	var reply := Answer.new(tapped.question.fact_id, given, _latency_since(tapped.served_at))
	var graded := Grading.grade_answer(_farm.scheduler, reply)
	if not graded.ok:
		return graded
	var moment := _moment(tapped, reply, graded.value.result)
	var active: ActiveRound = still.value
	var coins := AnswerFeedbacks.coins_earned_for(active.plan.context, moment.result)
	var answered := PracticeRound.record_answer(active, AnswerFeedbacks.session_entry_for(moment))
	var changes := {"scheduler": graded.value.state, "coins": _farm.coins + coins, "play_session": _played_now()}
	var advanced := _advance(answered, FarmSave.with_changes(_farm, changes))
	if not advanced.ok:
		return advanced
	var committed: Result = await _commit(advanced.value)
	if not committed.ok:
		return committed
	return Result.success(AnswerFeedbacks.feedback_for(moment, coins, advanced.value.question))


func _end_round() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	if _active == null:
		return Result.failure(NO_ACTIVE_ROUND)
	var session_log := PracticeRound.session_log(_active, _clock.now_msec())
	var sessions: Array = _farm.sessions.duplicate()
	sessions.append(session_log)
	var closed := FarmSave.with_changes(_farm, {"sessions": sessions, "play_session": _played_now()})
	var cared := _with_care_applied(closed, _active)
	if not cared.ok:
		return cared
	var committed: Result = await _commit(_Snapshot.new(cared.value, null, null))
	if not committed.ok:
		return committed
	return Result.success(session_log)


func _buy(offer_id: String) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	if _is_goodnight():
		return Result.failure(PlaySession.GOODNIGHT)
	var bought := FeedShed.buy(_farm, offer_id)
	if not bought.ok:
		return bought
	var committed: Result = await _commit(_Snapshot.new(bought.value, _active, null))
	if not committed.ok:
		return committed
	return Result.success(ShopSummary.of(bought.value))


func _hatch(egg_id: String) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	if _active != null:
		return Result.failure("hatch: a round is active")
	var hatched := Nest.hatch(_farm, egg_id)
	if not hatched.ok:
		return hatched
	var committed: Result = await _commit(_Snapshot.new(hatched.value, null, null))
	if not committed.ok:
		return committed
	return Result.success(AnimalSummary.of(hatched.value.animals.back(), _today()))


func _move(animal_id: String, home: String) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	var closed := _zoo_closed_because()
	if not closed.is_empty():
		return Result.failure(closed)
	var moved := Zoo.move(_farm, animal_id, home)
	if not moved.ok:
		return moved
	var committed: Result = await _commit(_Snapshot.new(moved.value, null, null))
	if not committed.ok:
		return committed
	return Result.success(ZooSummary.of(moved.value, _today(), ""))


## Why no animal may move now, or empty when the zoo is open.
func _zoo_closed_because() -> String:
	if _active != null:
		return ROUND_IS_ACTIVE
	if _is_goodnight():
		return PlaySession.GOODNIGHT
	return ""


func _shed_closed_because() -> String:
	return PlaySession.GOODNIGHT if _is_goodnight() else ""


func _set_muted(muted: bool) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	var settings: Dictionary = _farm.settings.duplicate()
	settings["muted"] = muted
	return await _commit(_Snapshot.new(FarmSave.with_changes(_farm, {"settings": settings}), _active, null))


## Why no round may start now, if anything stops it.
func _ready_to_start(caller: String) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	if _active != null:
		return Result.failure("%s: a round is already active" % caller)
	# Serving is synchronous and unsaved; a commit landing afterwards would overwrite it.
	if _pending > 0:
		return Result.failure("%s: a save is still in progress" % caller)
	if _is_goodnight():
		return Result.failure(PlaySession.GOODNIGHT)
	return Result.success()


func _begin(active: ActiveRound) -> Result:
	var served := _serve(active, FarmSave.with_changes(_farm, {"play_session": _played_now()}))
	if not served.ok:
		return served
	var snapshot: _Snapshot = served.value
	_farm = snapshot.farm
	_active = snapshot.active
	return Result.success(snapshot.question)


## The farm with the round's care applied, when it is a care round whose every
## question was graded. start_care checked the order and nothing else spends
## feed or does a task while the round runs, so a refusal here is a bug, and
## is passed on rather than dropped.
func _with_care_applied(farm: Dictionary, finished: ActiveRound) -> Result:
	if finished.care == null or not PracticeRound.is_complete(finished):
		return Result.success(farm)
	return Barn.apply_care(farm, finished.care, _today())


## The session after play now. Starting a round counts as play (and starts a
## session); a refusal does not, so asking after goodnight never delays the next.
func _played_now() -> Dictionary:
	var now := _clock.now_msec()
	return PlaySession.played(_farm.play_session, now, CareDay.of(now, _clock.utc_offset_minutes()))


func _is_goodnight() -> bool:
	var now := _clock.now_msec()
	return PlaySession.is_goodnight(_farm.play_session, now, CareDay.of(now, _clock.utc_offset_minutes()))


func _today() -> int:
	return CareDay.of(_clock.now_msec(), _clock.utc_offset_minutes())


## The plan with its numbers as ints, or why it cannot be played: questions
## must be a whole number >= 1, a nest or stall round needs a family, and a
## family must be one in play (1..max_table) — never silently mixed practice.
static func _checked_plan(plan: RoundPlan, max_table: int) -> Result:
	var questions: Variant = FactTuning.whole_number(plan.questions)
	if questions == null or questions < 1:
		return Result.failure("start_round: questions must be a positive integer, got %s" % str(plan.questions))
	if plan.family == null:
		if _FAMILY_CONTEXTS.has(plan.context):
			return Result.failure("start_round: a '%s' round needs a family" % plan.context)
		return Result.success(RoundPlan.new(plan.context, questions))
	var family: Variant = FactTuning.whole_number(plan.family)
	if family == null or family < FactTuning.MIN_TABLE or family > max_table:
		return Result.failure(
			"start_round: family must be a whole number in [%d, %d], got %s"
			% [FactTuning.MIN_TABLE, max_table, str(plan.family)]
		)
	return Result.success(RoundPlan.new(plan.context, questions, family))


## The round, once the question the caller answered is confirmed still in
## flight. A queued second answer finds its question already graded and
## replaced; grading the replacement would score a fact the player never saw.
func _still_in_flight(tapped: InFlight) -> Result:
	if _active == null:
		return Result.failure(NO_ACTIVE_ROUND)
	if tapped == null or not is_same(_active.in_flight, tapped):
		return Result.failure("answer: that question is no longer in flight")
	return Result.success(_active)


## A clock stepped backwards (a corrected system clock, a resumed tab) leaves
## the real latency unknown. The rules refuse a negative one, and 0 would hand
## out fluency and coins for free, so it grades as correct-but-not-fluent.
func _latency_since(served_at: int) -> int:
	var elapsed := _clock.now_msec() - served_at
	return elapsed if elapsed >= 0 else FactTuning.FLUENT_MAX_MS


func _moment(tapped: InFlight, reply: Answer, result: GradeResult) -> GradedAnswer:
	var moment := GradedAnswer.new()
	moment.question = tapped.question
	moment.result = result
	moment.given = reply.given
	moment.latency_ms = reply.latency_ms
	moment.asked_at = tapped.asked_at
	return moment


## The next question unless the round is done; either way, the state to commit.
func _advance(answered: ActiveRound, save: Dictionary) -> Result:
	if not PracticeRound.is_complete(answered):
		return _serve(answered, save)
	return Result.success(_Snapshot.new(save, answered, null))


func _serve(active: ActiveRound, save: Dictionary) -> Result:
	var turn := PracticeRound.Turn.new()
	turn.active = active
	turn.scheduler = save.scheduler
	turn.rng = _rng
	turn.now = _clock.now_msec()
	var served := PracticeRound.serve_question(turn)
	if not served.ok:
		return served
	var serving: PracticeRound.Serving = served.value
	var next_farm := FarmSave.with_changes(save, {"scheduler": serving.scheduler})
	return Result.success(_Snapshot.new(next_farm, serving.active, serving.question))


## The store must accept the farm before the game moves; a refusal leaves
## everything as it was.
func _commit(snapshot: _Snapshot) -> Result:
	var saved: Error = await _save_store.save_farm(snapshot.farm)
	if saved != OK:
		return Result.failure("the farm could not be saved: %s" % error_string(saved))
	_farm = snapshot.farm
	_active = snapshot.active
	return Result.success()


## Runs `call` after every persisting call made before it, and returns what it
## returned. A refusal reaches its own caller; the queue carries on.
func _serialized(call: Callable) -> Variant:
	_pending += 1
	var queued := _Queued.new(call)
	_queue.append(queued)
	if not _draining:
		_drain()
	if not queued.done:
		await queued.finished
	return queued.outcome


func _drain() -> void:
	_draining = true
	while not _queue.is_empty():
		var queued: _Queued = _queue.pop_front()
		queued.outcome = await queued.run.call()
		queued.done = true
		_pending -= 1
		queued.finished.emit()
		_settled.emit()
	_draining = false
