## Arrow keys / WASD are screen-relative (SF-98): "up" walks away from the camera
## whatever way the camera looks along the ground.
extends GutTest

const EPSILON := 0.0001
const UP := Vector2(0, -1)
const RIGHT := Vector2(1, 0)


func test_up_walks_the_way_the_camera_looks_along_the_ground() -> void:
	var forward := Vector3(-13, -12, -18).normalized()
	var walked := KeyboardWalk.world_direction(UP, forward)
	var ground_forward := Vector3(-13, 0, -18).normalized()
	assert_almost_eq(walked.distance_to(ground_forward), 0.0, EPSILON)


func test_right_is_screen_right_for_a_camera_looking_down_minus_z() -> void:
	var walked := KeyboardWalk.world_direction(RIGHT, Vector3.FORWARD)
	assert_almost_eq(walked.distance_to(Vector3.RIGHT), 0.0, EPSILON)


func test_down_and_left_are_the_opposites() -> void:
	var forward := Vector3(1, -1, 0)
	assert_almost_eq(KeyboardWalk.world_direction(-UP, forward).distance_to(Vector3(-1, 0, 0)), 0.0, EPSILON)
	assert_almost_eq(KeyboardWalk.world_direction(-RIGHT, forward).distance_to(Vector3(0, 0, -1)), 0.0, EPSILON)


func test_a_diagonal_keeps_the_length_it_was_given() -> void:
	var diagonal := Vector2(1, -1).normalized()
	assert_almost_eq(KeyboardWalk.world_direction(diagonal, Vector3.FORWARD).length(), 1.0, EPSILON)


func test_a_camera_looking_straight_down_still_maps_up_to_minus_z() -> void:
	var walked := KeyboardWalk.world_direction(UP, Vector3.DOWN)
	assert_almost_eq(walked.distance_to(Vector3.FORWARD), 0.0, EPSILON)
