## Parse, don't trust: every malformed blob decodes to null, never to a
## half-read farm and never to a crash.
extends GutTest


func test_encode_then_decode_round_trips() -> void:
	var decoded := FarmProgressCodec.decode(FarmProgressCodec.encode(FarmProgress.new(3, 8)))
	assert_eq(decoded.coins, 3)
	assert_eq(decoded.questions_answered, 8)


func test_the_blob_carries_its_schema_version() -> void:
	var blob: Dictionary = JSON.parse_string(FarmProgressCodec.encode(FarmProgress.new()))
	assert_eq(int(blob["version"]), FarmProgressCodec.SCHEMA_VERSION)


func test_a_whole_number_written_as_a_float_is_accepted() -> void:
	var decoded := FarmProgressCodec.decode('{"version": 1.0, "coins": 5.0, "questions_answered": 2}')
	assert_eq(decoded.coins, 5)


func test_rejects_text_that_is_not_json() -> void:
	assert_null(FarmProgressCodec.decode("not json at all"))


func test_rejects_json_that_is_not_an_object() -> void:
	assert_null(FarmProgressCodec.decode("[1, 2, 3]"))
	assert_null(FarmProgressCodec.decode("42"))
	assert_null(FarmProgressCodec.decode("null"))


func test_rejects_another_schema_version() -> void:
	assert_null(FarmProgressCodec.decode('{"version": 2, "coins": 5, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"coins": 5, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": "1", "coins": 5, "questions_answered": 2}'))


func test_rejects_counts_of_the_wrong_type() -> void:
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": "5", "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": true, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": null, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": [5], "questions_answered": 2}'))


func test_rejects_a_missing_count() -> void:
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": 5}'))


func test_rejects_negative_fractional_or_absurd_counts() -> void:
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": -1, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": 2.5, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": 1e300, "questions_answered": 2}'))
	assert_null(FarmProgressCodec.decode('{"version": 1, "coins": 5, "questions_answered": 1000000001}'))


func test_ignores_fields_it_does_not_know() -> void:
	var decoded := FarmProgressCodec.decode('{"version": 1, "coins": 5, "questions_answered": 2, "hat": "red"}')
	assert_eq(decoded.coins, 5)
