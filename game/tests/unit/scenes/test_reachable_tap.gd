## Which taps the keeper walks to (SF-98): the nearest navmesh point, but only
## when it is near the tap and the route really ends there.
extends GutTest

var _reach := ReachableTap.new(0.75)


func _route(points: Array) -> PackedVector3Array:
	return PackedVector3Array(points)


func test_walks_to_the_navmesh_point_under_a_tap_on_walkable_ground() -> void:
	var on_mesh := Vector3(3, 0.3, 2)
	var tapped := Vector3(3, 0, 2)
	assert_eq(_reach.destination(tapped, on_mesh, _route([Vector3.ZERO, on_mesh])), on_mesh)


func test_a_tap_just_off_the_edge_still_walks_to_the_edge() -> void:
	var on_mesh := Vector3(10, 0.3, 0)
	assert_eq(_reach.destination(Vector3(10.6, 0, 0), on_mesh, _route([Vector3.ZERO, on_mesh])), on_mesh)


func test_a_tap_far_from_any_walkable_ground_goes_nowhere() -> void:
	var on_mesh := Vector3(10, 0.3, 0)
	assert_null(_reach.destination(Vector3(14, 0, 0), on_mesh, _route([Vector3.ZERO, on_mesh])))


func test_a_tap_on_an_island_with_no_route_to_it_goes_nowhere() -> void:
	var island := Vector3(20, 0.3, 0)
	var route_stops_at_the_shore := _route([Vector3.ZERO, Vector3(10, 0.3, 0)])
	assert_null(_reach.destination(Vector3(20, 0, 0), island, route_stops_at_the_shore))


func test_no_route_at_all_goes_nowhere() -> void:
	assert_null(_reach.destination(Vector3.ZERO, Vector3.ZERO, PackedVector3Array()))
