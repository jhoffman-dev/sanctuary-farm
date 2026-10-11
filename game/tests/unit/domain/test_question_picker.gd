extends GutTest

const ScriptedRng := preload("res://tests/fakes/scripted_rng.gd")


func test_never_asks_the_same_fact_twice_in_a_row() -> void:
	var facts := FactTable.build(2)
	var rng := SeededRng.new(99)
	var previous := ""
	for i in 500:
		var fact := QuestionPicker.pick(facts, previous, rng)
		assert_ne(fact.id, previous, "draw %d" % i)
		previous = fact.id


func test_reaches_every_fact_of_the_table() -> void:
	var facts := FactTable.build(3)
	var rng := SeededRng.new(5)
	var seen := {}
	var previous := ""
	for i in 300:
		previous = QuestionPicker.pick(facts, previous, rng).id
		seen[previous] = true
	assert_eq(seen.size(), 9)


func test_a_one_fact_table_repeats_rather_than_running_dry() -> void:
	var facts := FactTable.build(1)
	assert_eq(QuestionPicker.pick(facts, "1x1", SeededRng.new(1)).id, "1x1")


func test_an_empty_table_has_no_question() -> void:
	var empty: Array[Fact] = []
	assert_null(QuestionPicker.pick(empty, "", SeededRng.new(1)))


func test_the_draw_maps_onto_the_remaining_candidates_in_order() -> void:
	var facts := FactTable.build(2)  # 1x1, 1x2, 2x1, 2x2
	assert_eq(QuestionPicker.pick(facts, "1x1", ScriptedRng.new([0.0])).id, "1x2")
	assert_eq(QuestionPicker.pick(facts, "1x1", ScriptedRng.new([0.99])).id, "2x2")


func test_a_draw_of_exactly_one_still_lands_on_the_last_fact() -> void:
	var facts := FactTable.build(2)
	assert_eq(QuestionPicker.pick(facts, "", ScriptedRng.new([1.0])).id, "2x2")
