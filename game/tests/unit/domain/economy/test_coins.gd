## economy/coins.test.ts
extends GutTest


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

