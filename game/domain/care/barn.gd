## The barn's care rules — the prototype's `completeCare` and `primeSave`,
## made pure. The farm keeps `animals`, an Array of plain records:
##   {"id": String, "species": a Species, "home": a Zoo home (barn or zoo),
##    "health": int (FLOOR..MAX), "done": {task: day number or null, for each CareTask}}
## `health` is the health on the animal's last care day; decay since then is
## worked out on read (AnimalHealth.on_day), so loading a farm twice never
## decays it twice. Care follows the animal: one visiting the petting zoo is
## cared for, and decays, exactly as one in the barn.
class_name Barn
extends RefCounted

const UNKNOWN_ANIMAL := "unknown-animal"
const UNKNOWN_TASK := "unknown-task"
const ALREADY_DONE_TODAY := "already-done-today"
## Not a failure the child sees as one: the barn says "visit the feed shed".
const NEED_FEED := "visit-the-feed-shed"


## The animals already living in the barn on day one — never an empty barn.
static func starting_animals() -> Array:
	return Species.STARTING.map(func(species: String) -> Dictionary: return new_animal(species, species))


static func new_animal(id: String, species: String) -> Dictionary:
	var done := {}
	for task in CareTask.ALL:
		done[task] = null
	return {"id": id, "species": species, "home": Zoo.BARN, "health": AnimalHealth.START, "done": done}


## The most recent day any task was done, or null when never cared for.
static func last_cared_day(animal: Dictionary) -> Variant:
	var last: Variant = null
	for day: Variant in animal.done.values():
		if day != null and (last == null or day > last):
			last = day
	return last


static func health_on(animal: Dictionary, today: int) -> int:
	return AnimalHealth.on_day(animal.health, last_cared_day(animal), today)


## Tasks not yet done today, in CareTask order: every animal, every task, once a day.
static func tasks_due(animal: Dictionary, today: int) -> Array[String]:
	var due: Array[String] = []
	for task in CareTask.ALL:
		if animal.done[task] != today:
			due.append(task)
	return due


## The animal the order is for, or why its round may not start: an unknown
## animal or task, a task already done today, or too little feed (NEED_FEED).
static func check_care(farm: Dictionary, order: CareOrder, today: int) -> Result:
	if not CareTask.is_task(order.task):
		return Result.failure(UNKNOWN_TASK)
	var index := _index_of(farm.animals, order.animal_id)
	if index < 0:
		return Result.failure(UNKNOWN_ANIMAL)
	var animal: Dictionary = farm.animals[index]
	if animal.done[order.task] == today:
		return Result.failure(ALREADY_DONE_TODAY)
	if farm.feed < CareTask.feed_cost(order.task):
		return Result.failure(NEED_FEED)
	return Result.success(animal)


## The farm once the order's round is complete: health restored on top of
## today's (decayed) health, the task marked done today, feed used. Refused,
## changing nothing, for anything check_care refuses.
static func apply_care(farm: Dictionary, order: CareOrder, today: int) -> Result:
	var checked := check_care(farm, order, today)
	if not checked.ok:
		return checked
	var animal: Dictionary = checked.value.duplicate(true)
	animal.health = AnimalHealth.restored(health_on(checked.value, today), order.task)
	animal.done[order.task] = today
	var animals: Array = farm.animals.duplicate()
	animals[_index_of(animals, order.animal_id)] = animal
	return Result.success(FarmSave.with_changes(farm, {
		"animals": animals,
		"feed": farm.feed - CareTask.feed_cost(order.task),
	}))


static func _index_of(animals: Array, animal_id: String) -> int:
	for i in animals.size():
		if animals[i].id == animal_id:
			return i
	return -1
