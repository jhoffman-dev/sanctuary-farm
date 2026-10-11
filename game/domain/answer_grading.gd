## How an answer is graded and what it pays — the TypeScript domain's
## classifyOutcome and coinsFor, unchanged. Latency drives the outcome, so
## correctness alone never earns the fluent rate.
class_name AnswerGrading
extends RefCounted

enum Outcome { FLUENT, SLOW, LABORED, WRONG }

const FLUENT_MAX_MS := 3000
const LABORED_MIN_MS := 8000
const COINS_PER_CORRECT := 1
## Total coins for a fluent answer, not a bonus on top of COINS_PER_CORRECT.
const COINS_PER_FLUENT := 2


## latency_ms must be >= 0; the use-case substitutes a slow latency for a clock
## that ran backwards before calling this.
static func classify(correct: bool, latency_ms: int) -> Outcome:
	if not correct:
		return Outcome.WRONG
	if latency_ms < FLUENT_MAX_MS:
		return Outcome.FLUENT
	if latency_ms <= LABORED_MIN_MS:
		return Outcome.SLOW
	return Outcome.LABORED


static func coins_for(outcome: Outcome) -> int:
	match outcome:
		Outcome.FLUENT:
			return COINS_PER_FLUENT
		Outcome.SLOW, Outcome.LABORED:
			return COINS_PER_CORRECT
		_:
			return 0
