## Component test: the placeholder farm boots, asks a question and animates.
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


func test_every_character_loops_its_idle_clip() -> void:
	var players := _animation_players()
	assert_eq(players.size(), 4)
	for player: AnimationPlayer in players:
		assert_eq(player.current_animation, "idle", str(player.get_path()))
		assert_eq(player.get_animation("idle").loop_mode, Animation.LOOP_LINEAR)


func test_the_pad_opens_on_a_question() -> void:
	var question: String = _farm.get_node("%NumberPad").get_node("%QuestionLabel").text
	assert_string_contains(question, " × ")
