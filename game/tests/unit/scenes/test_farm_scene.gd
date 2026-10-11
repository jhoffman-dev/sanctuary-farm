## Component test: the placeholder farm boots and animates, and the keeper
## stopping on the paddock opens the pad on a question (SF-98).
extends GutTest

const FarmScene := preload("res://scenes/farm/farm.tscn")

var _farm: Node3D


func before_each() -> void:
	_farm = FarmScene.instantiate()
	add_child_autofree(_farm)


func _animation_players() -> Array[Node]:
	return _farm.find_children("*", "AnimationPlayer", true, false)


func test_the_keeper_and_three_pets_are_on_the_farm() -> void:
	for character in ["Keeper", "Cow", "Pig", "Chick"]:
		assert_not_null(_farm.get_node_or_null(character), character)


func test_every_animal_loops_its_idle_clip_and_the_keeper_blends_hers() -> void:
	var keeper := _farm.get_node("Keeper")
	var players := _animation_players().filter(func(player: Node) -> bool: return not keeper.is_ancestor_of(player))
	assert_eq(players.size(), 3)
	for player: AnimationPlayer in players:
		assert_eq(player.current_animation, "idle", str(player.get_path()))
		assert_eq(player.get_animation("idle").loop_mode, Animation.LOOP_LINEAR)
	assert_true(keeper.find_child("LocomotionTree", true, false).active)


func _pad() -> NumberPad:
	return _farm.get_node("%NumberPad")


func _keeper() -> KeeperController:
	return _farm.get_node("%Keeper")


## The farm loads its save on the first frames; a stop before that is refused.
func _loaded() -> void:
	await wait_process_frames(5)


func test_the_pad_stays_closed_until_the_keeper_reaches_the_paddock() -> void:
	await _loaded()
	assert_false(_pad().visible)


func test_stopping_on_the_paddock_opens_the_pad_on_a_question() -> void:
	await _loaded()
	_keeper().stopped.emit(_farm.get_node("Paddock").global_position)
	await wait_process_frames(2)
	assert_true(_pad().visible)
	assert_string_contains(_pad().get_node("%QuestionLabel").text, " × ")


func test_stopping_between_places_opens_nothing() -> void:
	await _loaded()
	_keeper().stopped.emit(Vector3(4, 0, 4))
	await wait_process_frames(2)
	assert_false(_pad().visible)
