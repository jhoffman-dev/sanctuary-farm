## SystemClock against the real system clock.
extends GutTest


func test_reads_epoch_milliseconds() -> void:
	var expected := int(Time.get_unix_time_from_system() * 1000.0)
	assert_almost_eq(SystemClock.new().now_msec(), expected, 1000)


func test_two_readings_in_a_row_do_not_go_backwards_in_normal_running() -> void:
	var clock := SystemClock.new()
	var first := clock.now_msec()
	assert_gte(clock.now_msec(), first)


## Real zones run from UTC-12 to UTC+14.
func test_reads_the_system_time_zone_as_a_whole_number_of_minutes_from_utc() -> void:
	var offset := SystemClock.new().utc_offset_minutes()
	assert_between(offset, -12 * 60, 14 * 60)
	assert_eq(offset, int(Time.get_time_zone_from_system().bias))
