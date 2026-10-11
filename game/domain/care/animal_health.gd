## Health and mood — the prototype's `HEALTH_*` rules. Care raises health;
## days with no care at all lower it, a capped number of days at most, and
## never below FLOOR: a neglected animal is glum, never sick, starving or gone
## (game rule 6). The numbers are tuned in docs/barn-care.md.
class_name AnimalHealth
extends RefCounted

const MAX := 100
const START := 70
## The lowest health can go — and it is still only "glum".
const FLOOR := 15
const DECAY_PER_DAY := 14
## A month away costs no more than this many days of decay.
const MAX_DECAY_DAYS := 5
const HAPPY_AT := 66
## Below this the animal looks glum.
const GLUM_BELOW := 34

const HAPPY := "happy"
const OKAY := "okay"
const GLUM := "glum"


## Health on `today` for an animal last cared for on `last_cared_day` (null
## when never cared for, which does not decay). The day after care is free;
## each further day with no care costs DECAY_PER_DAY. A clock that stepped
## backwards costs nothing.
static func on_day(health: int, last_cared_day: Variant, today: int) -> int:
	if last_cared_day == null:
		return health
	var missed := clampi(today - int(last_cared_day) - 1, 0, MAX_DECAY_DAYS)
	return maxi(FLOOR, health - missed * DECAY_PER_DAY)


## Health after a care task's bonus, capped at MAX.
static func restored(health: int, task: String) -> int:
	return mini(MAX, health + CareTask.health_bonus(task))


static func band(health: int) -> String:
	if health >= HAPPY_AT:
		return HAPPY
	if health < GLUM_BELOW:
		return GLUM
	return OKAY
