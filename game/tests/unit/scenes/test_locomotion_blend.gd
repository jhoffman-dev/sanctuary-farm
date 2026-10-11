## The idle ↔ walk blend comes from her ground speed (ADR-0004) and eases over
## the crossfade time.
extends GutTest


func test_standing_still_or_creeping_is_idle() -> void:
	assert_eq(LocomotionBlend.target(0.0, 3.75), 0.0)
	assert_eq(LocomotionBlend.target(LocomotionBlend.STANDING_SPEED, 3.75), 0.0)


func test_walking_pace_is_the_full_walk_and_never_beyond() -> void:
	assert_eq(LocomotionBlend.target(3.75, 3.75), 1.0)
	assert_eq(LocomotionBlend.target(9.0, 3.75), 1.0)
	assert_almost_eq(LocomotionBlend.target(1.875, 3.75), 0.5, 0.0001)


func test_a_keeper_with_no_walk_speed_stays_idle() -> void:
	assert_eq(LocomotionBlend.target(2.0, 0.0), 0.0)


func test_a_full_crossfade_takes_the_fade_time() -> void:
	var step := LocomotionBlend.fade_step(1.0 / 60.0, 0.25)
	var blend := 0.0
	for frame in 15:
		blend = move_toward(blend, 1.0, step)
	assert_almost_eq(blend, 1.0, 0.0001, "15 frames at 60 Hz is 0.25 s")


func test_a_zero_fade_snaps() -> void:
	assert_eq(LocomotionBlend.fade_step(1.0 / 60.0, 0.0), INF)
