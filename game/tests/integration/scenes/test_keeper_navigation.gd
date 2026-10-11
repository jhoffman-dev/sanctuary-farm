## The keeper on a real baked navmesh (SF-98): she reaches a tapped point in
## the time her speed allows, turns to the camera when she gets there, ignores
## taps she cannot reach, and walks with the keys without leaving the mesh.
## Deterministic: the keeper's own physics step is switched off and driven here
## with fixed ticks, so no real time passes between assertions.
extends GutTest

const KeeperScene := preload("res://scenes/keeper/keeper.tscn")
const TICK := 1.0 / 60.0
## Half the side of the square of walkable ground.
const HALF_GROUND := 10.0
const CAMERA_AT := Vector3(13, 12.5, 18.5)

var _keeper: KeeperController
var _tap: TapToWalk


func before_each() -> void:
	var world := Node3D.new()
	add_child_autofree(world)
	world.add_child(_walkable_square())
	var camera := Camera3D.new()
	world.add_child(camera)
	camera.look_at_from_position(CAMERA_AT, Vector3(0, 0.6, 1))
	camera.current = true
	_keeper = KeeperScene.instantiate()
	world.add_child(_keeper)
	_tap = _keeper.get_node("TapToWalk")
	(world.get_child(0) as NavigationRegion3D).bake_navigation_mesh(false)
	await _navmesh_served()
	_keeper.set_physics_process(false)


func after_each() -> void:
	Input.action_release(&"keeper_right")


## A 20 x 20 m slab of ground, baked as the farm's navmesh is.
func _walkable_square() -> NavigationRegion3D:
	var region := NavigationRegion3D.new()
	var mesh := NavigationMesh.new()
	mesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	mesh.agent_radius = 0.5
	mesh.agent_height = 1.75
	region.navigation_mesh = mesh
	var body := StaticBody3D.new()
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(HALF_GROUND * 2, 0.2, HALF_GROUND * 2)
	shape.shape = box
	shape.position.y = -0.1
	body.add_child(shape)
	region.add_child(body)
	return region


## The navigation map picks up a bake on one of the engine's physics frames
## (the first one of a run takes longer); wait for it, by frames, not time.
func _navmesh_served() -> void:
	var map := _keeper.get_world_3d().navigation_map
	var probe := Vector3(HALF_GROUND / 2, 0, HALF_GROUND / 2)
	for frame in 120:
		if _ground_distance(NavigationServer3D.map_get_closest_point(map, probe), probe) < 0.01:
			return
		await wait_physics_frames(1)
	fail_test("the navmesh never reached the navigation map")


## Steps her physics until she stands still or `budget` seconds pass; returns
## the simulated seconds taken.
func _run_until_standing(budget: float) -> float:
	var elapsed := 0.0
	while _keeper.is_walking() and elapsed < budget:
		_keeper._physics_process(TICK)
		elapsed += TICK
	return elapsed


func _run(seconds: float) -> void:
	for tick in roundi(seconds / TICK):
		_keeper._physics_process(TICK)


func _blend() -> float:
	return _keeper.find_child("LocomotionTree", true, false).get(KeeperAnimation.BLEND)


func _ground_distance(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


func test_reaches_a_tapped_point_within_the_time_her_speed_allows() -> void:
	watch_signals(_keeper)
	var target := Vector3(6, 0, -5)
	_tap.tap_ground(target)
	assert_true(_keeper.is_walking())
	var expected := _ground_distance(Vector3.ZERO, target) / _keeper.walk_speed
	var took := _run_until_standing(expected * 1.2 + 0.2)
	assert_false(_keeper.is_walking(), "arrived within %.2f s (took %.2f s)" % [expected * 1.2 + 0.2, took])
	assert_lt(_ground_distance(_keeper.global_position, target), _keeper.arrival_radius + 0.05)
	assert_almost_eq(_keeper.global_position.y, 0.0, 0.05, "feet on the ground, not on the floating navmesh")
	assert_signal_emitted(_keeper, "set_off")
	assert_signal_emitted(_keeper, "stopped")


func test_faces_where_she_walks_and_blends_into_the_walk_clip() -> void:
	_tap.tap_ground(Vector3(8, 0, 0))
	_run(0.5)
	assert_almost_eq(_keeper.rotation.y, PI / 2, 0.01, "facing +X")
	assert_gt(_blend(), 0.9, "walking")


func test_turns_a_three_quarter_view_to_the_camera_after_arriving() -> void:
	_tap.tap_ground(Vector3(-6, 0, -6))
	_run_until_standing(4.0)
	var at := _keeper.global_position
	var expected := KeeperHeading.three_quarter_yaw(at, CAMERA_AT, _keeper.rotation.y)
	_run(1.5)
	assert_almost_eq(KeeperHeading.shortest_turn(_keeper.rotation.y, expected), 0.0, 0.001)
	assert_eq(_blend(), 0.0, "back to idle")


func test_under_reduced_motion_she_turns_at_once_and_holds_still_poses() -> void:
	_keeper.reduced_motion = KeeperController.ReducedMotion.ALWAYS
	_tap.tap_ground(Vector3(-6, 0, -6))
	_run_until_standing(4.0)
	var expected := KeeperHeading.three_quarter_yaw(_keeper.global_position, CAMERA_AT, _keeper.rotation.y)
	_run(TICK)
	assert_almost_eq(KeeperHeading.shortest_turn(_keeper.rotation.y, expected), 0.0, 0.001, "one tick")
	assert_false(_keeper.find_child("LocomotionTree", true, false).active, "no walk bob")


func test_the_page_setting_turns_reduced_motion_on_unless_overridden() -> void:
	_keeper.page_prefers_reduced_motion = true
	assert_true(_keeper.reduces_motion())
	_keeper.reduced_motion = KeeperController.ReducedMotion.NEVER
	assert_false(_keeper.reduces_motion())


func test_a_tap_off_the_walkable_ground_shows_the_cue_and_she_stays_put() -> void:
	var cue: TapCue = _keeper.get_node("TapCue")
	_tap.tap_ground(Vector3(30, 0, 30))
	assert_false(_keeper.is_walking())
	assert_true(cue.visible)
	_run(0.5)
	assert_eq(_keeper.global_position, Vector3.ZERO)


func test_a_held_key_walks_screen_right_and_releasing_it_stops_her() -> void:
	watch_signals(_keeper)
	Input.action_press(&"keeper_right")
	_run(0.5)
	Input.action_release(&"keeper_right")
	_run(TICK)
	assert_false(_keeper.is_walking())
	assert_signal_emitted(_keeper, "stopped")
	var camera_forward := (Vector3(0, 0.6, 1) - CAMERA_AT).normalized()
	var screen_right := KeyboardWalk.world_direction(Vector2.RIGHT, camera_forward)
	var walked := Vector3(_keeper.global_position.x, 0, _keeper.global_position.z)
	assert_almost_eq(walked.normalized().dot(screen_right), 1.0, 0.01)
	assert_almost_eq(walked.length(), _keeper.walk_speed * 0.5, 0.1)


func test_a_held_key_never_walks_her_off_the_navmesh() -> void:
	Input.action_press(&"keeper_right")
	_run(10.0)
	assert_lt(absf(_keeper.global_position.x), HALF_GROUND)
	assert_lt(absf(_keeper.global_position.z), HALF_GROUND)
