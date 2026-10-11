## The keeper's facing maths (SF-98): yaw from a direction, turning the short
## way round at a capped rate, and the three-quarter view of the camera.
extends GutTest

const EPSILON := 0.0001


func test_yaw_zero_looks_down_plus_z_as_the_kenney_models_do() -> void:
	assert_almost_eq(KeeperHeading.yaw_facing(Vector3(0, 0, 1)), 0.0, EPSILON)
	assert_almost_eq(KeeperHeading.yaw_facing(Vector3(1, 0, 0)), PI / 2, EPSILON)
	assert_almost_eq(KeeperHeading.yaw_facing(Vector3(-1, 5, 0)), -PI / 2, EPSILON, "height is ignored")


func test_the_shortest_turn_goes_the_short_way_across_the_seam() -> void:
	assert_almost_eq(KeeperHeading.shortest_turn(PI - 0.1, -PI + 0.1), 0.2, EPSILON)
	assert_almost_eq(KeeperHeading.shortest_turn(0.0, -PI / 2), -PI / 2, EPSILON)


func test_turning_is_capped_per_step_and_lands_exactly_on_the_goal() -> void:
	assert_almost_eq(KeeperHeading.turn_toward(0.0, 1.0, 0.25), 0.25, EPSILON)
	assert_almost_eq(KeeperHeading.turn_toward(0.0, -1.0, 0.25), -0.25, EPSILON)
	assert_almost_eq(KeeperHeading.turn_toward(0.9, 1.0, 0.25), 1.0, EPSILON)


func test_an_unlimited_step_turns_at_once_for_reduced_motion() -> void:
	var turned := KeeperHeading.turn_toward(0.0, 3.0, INF)
	assert_almost_eq(KeeperHeading.shortest_turn(turned, 3.0), 0.0, EPSILON)


func test_three_quarter_view_is_thirty_degrees_off_the_camera_line() -> void:
	var keeper := Vector3.ZERO
	var camera := Vector3(0, 10, 10)  # straight down +Z from her
	var yaw := KeeperHeading.three_quarter_yaw(keeper, camera, 0.0)
	assert_almost_eq(absf(yaw), KeeperHeading.THREE_QUARTER, EPSILON)


func test_three_quarter_view_picks_the_side_nearer_her_current_facing() -> void:
	var camera := Vector3(0, 10, 10)
	assert_almost_eq(KeeperHeading.three_quarter_yaw(Vector3.ZERO, camera, 1.0), KeeperHeading.THREE_QUARTER, EPSILON)
	assert_almost_eq(KeeperHeading.three_quarter_yaw(Vector3.ZERO, camera, -1.0), -KeeperHeading.THREE_QUARTER, EPSILON)
