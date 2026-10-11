## The care tables and the health rules (domain/care/): what each task costs,
## asks and restores, how health decays over real days with a fixed clock,
## and that the floor is glum — never zero, never gone (game rule 6).
extends GutTest

const DAY := 20_000


# ─── the four tasks ───

func test_there_are_exactly_four_care_tasks() -> void:
	assert_eq(CareTask.ALL, [CareTask.FEED, CareTask.WATER, CareTask.CLEAN, CareTask.PLAY] as Array[String])
	assert_true(CareTask.ALL.all(CareTask.is_task))
	for not_a_task: Variant in ["sleep", "", null, 3, "Feed"]:
		assert_false(CareTask.is_task(not_a_task), str(not_a_task))


func test_each_task_is_earned_by_the_prototypes_number_of_questions() -> void:
	var asked := CareTask.ALL.map(CareTask.questions_for)
	assert_eq(asked, [5, 4, 4, 3])
	assert_eq(CareTask.questions_for("sleep"), 0)


func test_feeding_restores_most_and_the_rest_restore_alike() -> void:
	assert_eq(CareTask.ALL.map(CareTask.health_bonus), [16, 12, 12, 12])
	assert_eq(CareTask.health_bonus("sleep"), 0)


func test_only_feeding_uses_feed() -> void:
	assert_eq(CareTask.feed_cost(CareTask.FEED), Coins.FEED_PER_FEEDING)
	assert_eq(Coins.FEED_PER_FEEDING, 3)
	for task in [CareTask.WATER, CareTask.CLEAN, CareTask.PLAY]:
		assert_eq(CareTask.feed_cost(task), 0, task)


# ─── health over time ───

func test_never_cared_for_means_no_decay() -> void:
	assert_eq(AnimalHealth.on_day(AnimalHealth.START, null, DAY + 400), AnimalHealth.START)


func test_the_day_of_care_and_the_day_after_cost_nothing() -> void:
	assert_eq(AnimalHealth.on_day(80, DAY, DAY), 80)
	assert_eq(AnimalHealth.on_day(80, DAY, DAY + 1), 80)


func test_each_further_day_without_care_costs_decay_per_day() -> void:
	assert_eq(AnimalHealth.on_day(80, DAY, DAY + 2), 80 - AnimalHealth.DECAY_PER_DAY)
	assert_eq(AnimalHealth.on_day(80, DAY, DAY + 3), 80 - 2 * AnimalHealth.DECAY_PER_DAY)
	assert_eq(AnimalHealth.DECAY_PER_DAY, 14)


func test_decay_is_capped_so_a_month_away_costs_no_more_than_five_days() -> void:
	var capped := 100 - AnimalHealth.MAX_DECAY_DAYS * AnimalHealth.DECAY_PER_DAY
	assert_eq(AnimalHealth.on_day(100, DAY, DAY + 1 + AnimalHealth.MAX_DECAY_DAYS), capped)
	assert_eq(AnimalHealth.on_day(100, DAY, DAY + 31), capped)
	assert_eq(AnimalHealth.on_day(100, DAY, DAY + 3650), capped)


func test_health_never_falls_below_the_floor() -> void:
	for health in [AnimalHealth.FLOOR, 20, 34, 50, 70, 100]:
		for away in [2, 5, 30, 1000]:
			assert_gte(AnimalHealth.on_day(health, DAY, DAY + away), AnimalHealth.FLOOR, "%d after %d" % [health, away])
	assert_eq(AnimalHealth.on_day(AnimalHealth.START, DAY, DAY + 30), AnimalHealth.FLOOR)


func test_the_floor_is_glum_and_never_zero() -> void:
	assert_eq(AnimalHealth.FLOOR, 15)
	assert_gt(AnimalHealth.FLOOR, 0)
	assert_eq(AnimalHealth.band(AnimalHealth.FLOOR), AnimalHealth.GLUM)


func test_a_clock_stepped_backwards_costs_nothing() -> void:
	assert_eq(AnimalHealth.on_day(80, DAY, DAY - 10), 80)


func test_care_restores_its_bonus_capped_at_max() -> void:
	assert_eq(AnimalHealth.restored(50, CareTask.FEED), 66)
	assert_eq(AnimalHealth.restored(50, CareTask.PLAY), 62)
	assert_eq(AnimalHealth.restored(95, CareTask.FEED), AnimalHealth.MAX)


func test_bands_split_at_66_and_34() -> void:
	assert_eq(AnimalHealth.band(AnimalHealth.MAX), AnimalHealth.HAPPY)
	assert_eq(AnimalHealth.band(66), AnimalHealth.HAPPY)
	assert_eq(AnimalHealth.band(65), AnimalHealth.OKAY)
	assert_eq(AnimalHealth.band(34), AnimalHealth.OKAY)
	assert_eq(AnimalHealth.band(33), AnimalHealth.GLUM)
	assert_eq(AnimalHealth.band(AnimalHealth.START), AnimalHealth.HAPPY)


# ─── days ───

func test_a_care_day_turns_over_at_local_midnight() -> void:
	var utc_midnight := DAY * CareDay.MSEC_PER_DAY
	assert_eq(CareDay.of(utc_midnight, 0), DAY)
	assert_eq(CareDay.of(utc_midnight - 1, 0), DAY - 1)
	# 23:00 UTC is already tomorrow two hours east, and still today five hours west.
	var late := utc_midnight + 23 * 3_600_000
	assert_eq(CareDay.of(late, 120), DAY + 1)
	assert_eq(CareDay.of(late, -300), DAY)


func test_a_care_day_floors_before_1970() -> void:
	assert_eq(CareDay.of(-1, 0), -1)
	assert_eq(CareDay.of(0, 0), 0)
