## The unreachable-tap cue (SF-98): a ring that appears where the tap landed
## and fades away on its own.
extends GutTest

const KeeperScene := preload("res://scenes/keeper/keeper.tscn")

var _cue: TapCue


func before_each() -> void:
	var keeper: Node3D = KeeperScene.instantiate()
	add_child_autofree(keeper)
	_cue = keeper.get_node("TapCue")


func test_hidden_until_a_tap_needs_it() -> void:
	assert_false(_cue.visible)
	assert_eq(_cue.strength(), 0.0)


func test_appears_at_the_tap_at_full_strength() -> void:
	_cue.show_at(Vector3(5, 0, -3))
	assert_true(_cue.visible)
	assert_eq(_cue.strength(), 1.0)
	assert_almost_eq(_cue.global_position.x, 5.0, 0.001)
	assert_almost_eq(_cue.global_position.z, -3.0, 0.001)


func test_fades_and_then_hides_itself() -> void:
	_cue.show_at(Vector3.ZERO)
	_cue._process(_cue.fade_seconds / 2)
	assert_almost_eq(_cue.strength(), 0.5, 0.001)
	_cue._process(_cue.fade_seconds)
	assert_false(_cue.visible)


func test_is_never_red() -> void:
	_cue.show_at(Vector3.ZERO)
	var colour: Color = _cue.material_override.albedo_color
	assert_true(colour.r - colour.g < 0.1 and colour.r - colour.b < 0.2, str(colour))
