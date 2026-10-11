## SystemClock against the real system clock.
extends GutTest


func test_reads_epoch_milliseconds() -> void:
	var expected := int(Time.get_unix_time_from_system() * 1000.0)
	assert_almost_eq(SystemClock.new().now_msec(), expected, 1000)


func test_two_readings_in_a_row_do_not_go_backwards_in_normal_running() -> void:
	var clock := SystemClock.new()
	var first := clock.now_msec()
	assert_gte(clock.now_msec(), first)
