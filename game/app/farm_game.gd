## The one stateful entry point the scenes talk to — `farm-game.ts`. Owns "one
## fact in flight": the scheduler is asked exactly once per question, the same
## question is returned until it is answered, and latency is read from the
## injected clock, never from the caller.
##
## Every persisting call (load_farm, answer, end_round, buy_feed, set_muted) is
## a coroutine — always `await` it. It saves first and commits to memory only
## once the store has accepted the farm, so a refused save leaves the game
## exactly where the caller last saw it. Those calls run one at a time, in the
## order they were made, each against what the previous one committed.
class_name FarmGame
extends RefCounted

## Emitted each time a queued call has finished, whether its save landed or not.
signal _settled

const NOT_LOADED := "FarmGame: call load_farm() first"
const NO_ACTIVE_ROUND := "FarmGame: no active round"
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
## while a save is still in progress, and for a plan that cannot be played.
func start_round(plan: RoundPlan) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	if _active != null:
		return Result.failure("start_round: a round is already active")
	# Serving is synchronous and unsaved; a commit landing afterwards would overwrite it.
	if _pending > 0:
		return Result.failure("start_round: a save is still in progress")
	var checked := _checked_plan(plan, _farm.scheduler.max_table)
	if not checked.ok:
		return checked
	var served := _serve(PracticeRound.begin(checked.value, _clock.now_msec()), _farm)
	if not served.ok:
		return served
	var snapshot: _Snapshot = served.value
	_farm = snapshot.farm
	_active = snapshot.active
	return Result.success(snapshot.question)


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
## the save and persists. Refused when no round is active or the save fails.
func end_round() -> Result:
	return await _serialized(_end_round)


## Trades coins for a feed bundle; the value is the new FarmSummary. Refused
## with Coins.NOT_ENOUGH_COINS (writing nothing), or when the save fails.
func buy_feed() -> Result:
	return await _serialized(_buy_feed)


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
	var changes := {"scheduler": graded.value.state, "coins": _farm.coins + coins}
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
	var committed: Result = await _commit(_Snapshot.new(FarmSave.with_changes(_farm, {"sessions": sessions}), null, null))
	if not committed.ok:
		return committed
	return Result.success(session_log)


func _buy_feed() -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	var bought := Coins.buy_feed_bundle(_farm)
	if not bought.ok:
		return bought
	var committed: Result = await _commit(_Snapshot.new(bought.value, _active, null))
	if not committed.ok:
		return committed
	return Result.success(FarmSummary.of(bought.value))


func _set_muted(muted: bool) -> Result:
	if _farm == null:
		return Result.failure(NOT_LOADED)
	var settings: Dictionary = _farm.settings.duplicate()
	settings["muted"] = muted
	return await _commit(_Snapshot.new(FarmSave.with_changes(_farm, {"settings": settings}), _active, null))


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
