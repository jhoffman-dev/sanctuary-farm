## economy/coins.test.ts
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _farm_with(changes: Dictionary) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


func test_maps_every_outcome() -> void:
	assert_eq(Coins.coins_for(Outcome.FLUENT), 2)
	assert_eq(Coins.coins_for(Outcome.SLOW), 1)
	assert_eq(Coins.coins_for(Outcome.LABORED), 1)
	assert_eq(Coins.coins_for(Outcome.WRONG), 0)


func test_paddock_and_egg_earn_stall_and_free_play_do_not() -> void:
	assert_true(Coins.context_earns_coins(SessionContext.PADDOCK))
	assert_true(Coins.context_earns_coins(SessionContext.EGG))
	assert_false(Coins.context_earns_coins(SessionContext.STALL))
	assert_false(Coins.context_earns_coins(SessionContext.FREE))


func test_swaps_the_fixed_price_for_the_bundle() -> void:
	var farm := _farm_with({"coins": Coins.FEED_BUNDLE_PRICE + 1, "feed": 2})
	var bought := Coins.buy_feed_bundle(farm)
	assert_true(bought.ok)
	assert_eq(bought.value.coins, 1)
	assert_eq(bought.value.feed, 2 + Coins.FEED_BUNDLE_UNITS)
	assert_true(is_same(bought.value.scheduler, farm.scheduler))


func test_refuses_when_the_farm_cannot_afford_it() -> void:
	var bought := Coins.buy_feed_bundle(_farm_with({"coins": Coins.FEED_BUNDLE_PRICE - 1}))
	assert_false(bought.ok)
	assert_eq(bought.error, Coins.NOT_ENOUGH_COINS)


func test_can_spend_the_last_coin_exactly() -> void:
	assert_eq(Coins.buy_feed_bundle(_farm_with({"coins": Coins.FEED_BUNDLE_PRICE})).value.coins, 0)
