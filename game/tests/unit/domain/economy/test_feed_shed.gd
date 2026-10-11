## The feed shed's rules: what is sold, at what price, and the refusals.
extends GutTest

const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


func _farm_with(changes: Dictionary) -> Dictionary:
	return FarmSave.with_changes(Fixtures.fresh_farm(), changes)


# ─── what is on the shelf ───

func test_the_shelf_holds_one_sack_of_10_feed_for_6_coins() -> void:
	assert_eq(FeedShed.offers(), [{"id": FeedShed.FEED_SACK, "feed": 10, "price": 6}])


func test_every_offer_costs_coins_and_gives_feed_so_buying_never_mints() -> void:
	for offer: Dictionary in FeedShed.offers():
		assert_gt(offer.price, 0, offer.id)
		assert_gt(offer.feed, 0, offer.id)


func test_finds_an_offer_by_id() -> void:
	var found := FeedShed.offer(FeedShed.FEED_SACK)
	assert_true(found.ok)
	assert_eq(found.value.price, FeedShed.SACK_PRICE)


func test_an_unknown_offer_is_refused() -> void:
	assert_eq(FeedShed.offer("golden-hay").error, FeedShed.UNKNOWN_OFFER)


# ─── check_buy ───

func test_check_buy_passes_at_exactly_the_price() -> void:
	var allowed := FeedShed.check_buy(_farm_with({"coins": FeedShed.SACK_PRICE}), FeedShed.FEED_SACK)
	assert_true(allowed.ok)
	assert_eq(allowed.value.id, FeedShed.FEED_SACK)


func test_check_buy_one_coin_short_says_earn_coins_in_the_paddock_or_nest() -> void:
	var allowed := FeedShed.check_buy(_farm_with({"coins": FeedShed.SACK_PRICE - 1}), FeedShed.FEED_SACK)
	assert_eq(allowed.error, FeedShed.NOT_ENOUGH_COINS)
	assert_eq(FeedShed.NOT_ENOUGH_COINS, "earn-coins-in-the-paddock-or-nest")


func test_check_buy_refuses_an_unknown_offer_before_looking_at_coins() -> void:
	assert_eq(FeedShed.check_buy(_farm_with({"coins": 1000}), "golden-hay").error, FeedShed.UNKNOWN_OFFER)


# ─── buy ───

func test_buying_takes_exactly_the_price_and_adds_exactly_the_feed() -> void:
	var farm := _farm_with({"coins": FeedShed.SACK_PRICE + 1, "feed": 2})
	var bought := FeedShed.buy(farm, FeedShed.FEED_SACK)
	assert_true(bought.ok)
	assert_eq([bought.value.coins, bought.value.feed], [1, 2 + FeedShed.SACK_FEED])


func test_buying_touches_nothing_but_coins_and_feed() -> void:
	var farm := _farm_with({"coins": 10})
	var bought: Dictionary = FeedShed.buy(farm, FeedShed.FEED_SACK).value
	for key: String in farm.keys():
		if key != "coins" and key != "feed":
			assert_true(is_same(bought[key], farm[key]) or bought[key] == farm[key], key)
	assert_eq(bought.keys().size(), farm.keys().size())


func test_the_last_coins_can_be_spent_exactly() -> void:
	assert_eq(FeedShed.buy(_farm_with({"coins": FeedShed.SACK_PRICE}), FeedShed.FEED_SACK).value.coins, 0)


func test_buying_twice_needs_twice_the_price() -> void:
	var once := FeedShed.buy(_farm_with({"coins": 2 * FeedShed.SACK_PRICE - 1}), FeedShed.FEED_SACK)
	assert_eq(FeedShed.buy(once.value, FeedShed.FEED_SACK).error, FeedShed.NOT_ENOUGH_COINS)


func test_not_enough_coins_changes_nothing() -> void:
	var farm := _farm_with({"coins": FeedShed.SACK_PRICE - 1, "feed": 0})
	var bought := FeedShed.buy(farm, FeedShed.FEED_SACK)
	assert_false(bought.ok)
	assert_eq([farm.coins, farm.feed], [FeedShed.SACK_PRICE - 1, 0])


func test_an_unknown_offer_is_never_bought() -> void:
	assert_eq(FeedShed.buy(_farm_with({"coins": 1000}), "golden-hay").error, FeedShed.UNKNOWN_OFFER)


func test_there_is_no_cap_on_feed_held() -> void:
	var bought := FeedShed.buy(_farm_with({"coins": FeedShed.SACK_PRICE, "feed": 10_000}), FeedShed.FEED_SACK)
	assert_eq(bought.value.feed, 10_000 + FeedShed.SACK_FEED)
