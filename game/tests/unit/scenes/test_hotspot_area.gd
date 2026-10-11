## Where the keeper stopped (SF-98): a hotspot is its box's footprint on the
## ground, whatever the box's height, wherever the area is placed.
extends GutTest

const HotspotAreaScript := preload("res://scenes/hotspot/hotspot_area.gd")


func _area(id: String, at: Vector3, size: Vector3) -> HotspotArea:
	var area: HotspotArea = HotspotAreaScript.new()
	area.hotspot_id = id
	area.position = at
	var shape := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = size
	shape.shape = box
	shape.position = Vector3(0, size.y / 2, 0)
	area.add_child(shape)
	add_child_autofree(area)
	return area


func test_the_footprint_is_width_by_depth_and_height_does_not_count() -> void:
	assert_true(HotspotBounds.contains(Vector3(1.9, 0, -1.9), Vector3(4, 2, 4)))
	assert_true(HotspotBounds.contains(Vector3(0, 30, 0), Vector3(4, 2, 4)))
	assert_false(HotspotBounds.contains(Vector3(2.1, 0, 0), Vector3(4, 2, 4)))
	assert_false(HotspotBounds.contains(Vector3(0, 0, -2.1), Vector3(4, 2, 4)))


func test_an_area_contains_the_points_over_its_box_in_world_space() -> void:
	var paddock := _area("paddock", Vector3(-4, 0, -2), Vector3(4, 2, 4))
	assert_true(paddock.contains_point(Vector3(-4, 0, -2)))
	assert_true(paddock.contains_point(Vector3(-2.2, 0, -0.2)))
	assert_false(paddock.contains_point(Vector3(0, 0, 1)))


func test_a_turned_area_turns_its_footprint() -> void:
	var paddock := _area("paddock", Vector3.ZERO, Vector3(6, 2, 1))
	paddock.rotation.y = PI / 2
	assert_true(paddock.contains_point(Vector3(0, 0, 2.5)))
	assert_false(paddock.contains_point(Vector3(2.5, 0, 0)))


func test_the_scene_names_the_hotspot_she_stopped_on_or_none() -> void:
	_area("paddock", Vector3(-4, 0, -2), Vector3(4, 2, 4))
	_area("barn", Vector3(6, 0, 0), Vector3(3, 2, 3))
	assert_eq(HotspotArea.id_at(get_tree(), Vector3(-4, 0, -2)), "paddock")
	assert_eq(HotspotArea.id_at(get_tree(), Vector3(6.5, 0, 1)), "barn")
	assert_eq(HotspotArea.id_at(get_tree(), Vector3(1, 0, 1)), "")
