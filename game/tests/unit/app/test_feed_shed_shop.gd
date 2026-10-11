## FarmGame's feed shed use-cases with fake adapters: shop() is the read-model
## the shed scene binds to, and buy() spends coins through the serialised save.
extends GutTest

const Harness := preload("res://tests/support/app_harness.gd")
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _loaded(farm: Variant = null) -> Harness:
	var built := Harness.new(farm)
	await built.game.load_farm()
	return built


func _farm_with(changes: Dictionary) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


func _sack(shop: ShopSummary) -> OfferSummary:
	return shop.offers[0]


# ─── the read-model ───

func test_the_shop_is_refused_before_load() -> void:
	assert_string_contains(Harness.new().game.shop().error, "load_farm()")


func test_the_shop_shows_coins_feed_and_the_sack_with_its_price() -> void:
	var built := await _loaded(_farm_with({"coins": 9, "feed": 4}))
	var shop: ShopSummary = built.game.shop().value
	assert_eq([shop.coins, shop.feed, shop.offers.size()], [9, 4, 1])
	var sack := _sack(shop)
	assert_eq([sack.id, sack.feed, sack.price], [FeedShed.FEED_SACK, 10, 6])
	assert_eq([sack.affordable, sack.reason], [true, ""])


func test_the_sack_is_affordable_at_exactly_its_price() -> void:
	var built := await _loaded(_farm_with({"coins": FeedShed.SACK_PRICE}))
	assert_true(_sack(built.game.shop().value).affordable)


func test_one_coin_short_the_sack_says_earn_coins_in_the_paddock_or_nest() -> void:
	var built := await _loaded(_farm_with({"coins": FeedShed.SACK_PRICE - 1}))
	var sack := _sack(built.game.shop().value)
	assert_eq([sack.affordable, sack.reason], [false, FeedShed.NOT_ENOUGH_COINS])


func test_the_shop_lists_every_offer_on_the_shelf_in_order() -> void:
	var shop := ShopSummary.of(_farm_with({"coins": 0}))
	var ids := shop.offers.map(func(o: OfferSummary) -> String: return o.id)
	assert_eq(ids, FeedShed.offers().map(func(o: Dictionary) -> String: return o.id))


func test_an_offer_summary_carries_the_offer_and_the_reason_it_cannot_be_bought() -> void:
	var sack := OfferSummary.of(_farm_with({"coins": 0}), FeedShed.offers()[0])
	assert_eq([sack.id, sack.feed, sack.price], [FeedShed.FEED_SACK, FeedShed.SACK_FEED, FeedShed.SACK_PRICE])
	assert_eq([sack.affordable, sack.reason], [false, FeedShed.NOT_ENOUGH_COINS])


# ─── buy ───

func test_buying_spends_the_price_adds_the_feed_and_persists() -> void:
	var built := await _loaded(_farm_with({"coins": 10, "feed": 1}))
	var bought: Result = await built.game.buy(FeedShed.FEED_SACK)
	assert_true(bought.ok, bought.error)
	var shop: ShopSummary = bought.value
	assert_eq([shop.coins, shop.feed], [4, 11])
	assert_false(_sack(shop).affordable, "4 coins no longer buys a sack")
	assert_eq([built.store.stored.coins, built.store.stored.feed], [4, 11])
	assert_eq([built.game.shop().value.coins, built.game.shop().value.feed], [4, 11])


func test_buying_never_asks_a_question_or_starts_a_round() -> void:
	var built := await _loaded(_farm_with({"coins": 10}))
	await built.game.buy(FeedShed.FEED_SACK)
	assert_null(built.game.current_question())
	assert_eq(built.store.stored.sessions.size(), 0)


func test_not_enough_coins_is_refused_and_writes_nothing() -> void:
	var built := await _loaded(_farm_with({"coins": FeedShed.SACK_PRICE - 1}))
	var bought: Result = await built.game.buy(FeedShed.FEED_SACK)
	assert_eq(bought.error, FeedShed.NOT_ENOUGH_COINS)
	assert_eq(built.store.saved.size(), 0)
	assert_eq(built.game.shop().value.coins, FeedShed.SACK_PRICE - 1)


func test_an_unknown_offer_is_refused_and_writes_nothing() -> void:
	var built := await _loaded(_farm_with({"coins": 100}))
	assert_eq((await built.game.buy("golden-hay")).error, FeedShed.UNKNOWN_OFFER)
	assert_eq(built.store.saved.size(), 0)


func test_a_failed_save_leaves_coins_and_feed_as_they_were() -> void:
	var built := await _loaded(_farm_with({"coins": 10, "feed": 1}))
	built.store.refuse_writes = true
	var bought: Result = await built.game.buy(FeedShed.FEED_SACK)
	assert_string_contains(bought.error, "could not be saved")
	var shop: ShopSummary = built.game.shop().value
	assert_eq([shop.coins, shop.feed], [10, 1])


func test_buy_before_load_is_refused() -> void:
	assert_string_contains((await Harness.new().game.buy(FeedShed.FEED_SACK)).error, "load_farm()")


func test_two_taps_while_the_first_save_is_pending_buy_only_what_is_paid_for() -> void:
	var built := await _loaded(_farm_with({"coins": 2 * FeedShed.SACK_PRICE - 1, "feed": 0}))
	built.store.hold_writes = true
	var outcomes := []
	_buy_into(built.game, outcomes)
	_buy_into(built.game, outcomes)
	assert_eq(built.store.held, 1, "the second tap waits its turn")
	built.store.hold_writes = false
	built.store.release()
	await built.game.when_saved()
	assert_eq(outcomes.map(func(r: Result) -> String: return r.error), ["", FeedShed.NOT_ENOUGH_COINS])
	assert_eq([built.store.stored.coins, built.store.stored.feed], [FeedShed.SACK_PRICE - 1, FeedShed.SACK_FEED])


func test_buy_feed_is_buying_the_sack() -> void:
	var built := await _loaded(_farm_with({"coins": 10}))
	var bought: Result = await built.game.buy_feed()
	assert_eq([bought.value.coins, bought.value.feed], [4, Coins.STARTING_FEED + 10])


func _buy_into(game: FarmGame, outcomes: Array) -> void:
	outcomes.append(await game.buy(FeedShed.FEED_SACK))
