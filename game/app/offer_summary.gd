## Read-model: one offer on the feed shed's shelf, as its scene renders it.
class_name OfferSummary
extends RefCounted

## A FeedShed offer id; pass it to FarmGame.buy.
var id: String
## Feed the offer adds.
var feed: int
## Coins it costs.
var price: int
## True when the farm has the coins for it now.
var affordable: bool
## Why it cannot be bought now (FeedShed.NOT_ENOUGH_COINS: "earn coins in the
## paddock or the nest"), or "" when affordable.
var reason: String


static func of(farm: Dictionary, offer: Dictionary) -> OfferSummary:
	var summary := OfferSummary.new()
	summary.id = offer.id
	summary.feed = offer.feed
	summary.price = offer.price
	var allowed := FeedShed.check_buy(farm, offer.id)
	summary.affordable = allowed.ok
	summary.reason = "" if allowed.ok else allowed.error
	return summary
