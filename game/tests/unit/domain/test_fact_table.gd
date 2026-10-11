extends GutTest


func _ids(facts: Array[Fact]) -> Array[String]:
	var ids: Array[String] = []
	for fact in facts:
		ids.append(fact.id)
	return ids


func test_the_12_table_has_every_ordered_pair_in_a_then_b_order() -> void:
	var facts := FactTable.build(12)
	assert_eq(facts.size(), 144)
	assert_eq(facts[0].id, "1x1")
	assert_eq(facts[1].id, "1x2")
	assert_eq(facts[12].id, "2x1")
	assert_eq(facts[143].id, "12x12")


func test_the_default_size_is_the_full_12_table() -> void:
	assert_eq(FactTable.build().size(), 144)


func test_seven_eights_and_eight_sevens_are_distinct_facts() -> void:
	var ids := _ids(FactTable.build(12))
	assert_has(ids, "7x8")
	assert_has(ids, "8x7")


func test_every_answer_is_the_product() -> void:
	for fact in FactTable.build(12):
		assert_eq(fact.answer, fact.a * fact.b, fact.id)


func test_every_id_is_unique() -> void:
	var ids := _ids(FactTable.build(12))
	var unique := {}
	for id in ids:
		unique[id] = true
	assert_eq(unique.size(), ids.size())


func test_the_smallest_table_is_one_fact() -> void:
	assert_eq(_ids(FactTable.build(1)), ["1x1"] as Array[String])


func test_sizes_outside_1_to_12_build_nothing() -> void:
	assert_true(FactTable.build(0).is_empty(), "0")
	assert_true(FactTable.build(13).is_empty(), "13")
	assert_true(FactTable.build(-5).is_empty(), "-5")


func test_valid_sizes_are_exactly_1_to_12() -> void:
	assert_false(FactTable.is_valid_size(0))
	assert_true(FactTable.is_valid_size(1))
	assert_true(FactTable.is_valid_size(12))
	assert_false(FactTable.is_valid_size(13))
