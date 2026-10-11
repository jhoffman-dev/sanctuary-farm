extends GutTest


func test_id_uses_the_typescript_format() -> void:
	assert_eq(Fact.new(7, 8).id, "7x8")
	assert_eq(Fact.new(12, 1).id, "12x1")


func test_answer_is_the_product() -> void:
	assert_eq(Fact.new(7, 8).answer, 56)
