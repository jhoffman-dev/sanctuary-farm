## The four care tasks — the prototype's `contracts/care.ts`. Each one is
## earned by a short graded round (stall care mints no coins); feeding also
## uses feed bought at the feed shed. The numbers are tuned in docs/barn-care.md.
class_name CareTask
extends RefCounted

const FEED := "feed"
const WATER := "water"
const CLEAN := "clean"
const PLAY := "play"
const ALL: Array[String] = [FEED, WATER, CLEAN, PLAY]

## How many graded answers earn the task.
const _QUESTIONS := {FEED: 5, WATER: 4, CLEAN: 4, PLAY: 3}
## Health the task restores once its round is complete.
const _HEALTH_BONUS := {FEED: 16, WATER: 12, CLEAN: 12, PLAY: 12}


static func is_task(value: Variant) -> bool:
	return value is String and ALL.has(value)


## Questions in the task's round; 0 for something that is not a task.
static func questions_for(task: String) -> int:
	return _QUESTIONS.get(task, 0)


static func health_bonus(task: String) -> int:
	return _HEALTH_BONUS.get(task, 0)


## Feed units the task uses: feeding costs Coins.FEED_PER_FEEDING, the rest are free.
static func feed_cost(task: String) -> int:
	return Coins.FEED_PER_FEEDING if task == FEED else 0
