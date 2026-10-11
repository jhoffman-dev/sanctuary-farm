## Read-model: one offer on the feed shed's shelf, as its scene renders it.
class_name OfferSummary
extends RefCounted

## A FeedShed offer id; pass it to FarmGame.buy.
var id: String
## Feed the offer adds.
var feed: int
## Coins it costs.
var price: int
## True when it can be bought now: the shed is open and the farm has the coins.
var affordable: bool
## Why it cannot be bought now (PlaySession.GOODNIGHT, or
## FeedShed.NOT_ENOUGH_COINS: "earn coins in the paddock or the nest"), or ""
## when affordable.
var reason: String


static func of(farm: Dictionary, offer: Dictionary, closed_because: String = "") -> OfferSummary:
	var summary := OfferSummary.new()
	summary.id = offer.id
	summary.feed = offer.feed
	summary.price = offer.price
	var allowed := Result.failure(closed_because) if closed_because != "" else FeedShed.check_buy(farm, offer.id)
	summary.affordable = allowed.ok
	summary.reason = "" if allowed.ok else allowed.error
	return summary
