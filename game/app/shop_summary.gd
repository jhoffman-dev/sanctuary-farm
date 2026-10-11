## Read-model: the feed shed as its scene renders it — the coins to spend, the
## feed held, and each offer with whether it can be bought now.
class_name ShopSummary
extends RefCounted

var coins: int
var feed: int
## In FeedShed shelf order.
var offers: Array[OfferSummary] = []


## `closed_because` (PlaySession.GOODNIGHT) shuts every offer; empty while
## the shed is open.
static func of(farm: Dictionary, closed_because: String = "") -> ShopSummary:
	var summary := ShopSummary.new()
	summary.coins = farm.coins
	summary.feed = farm.feed
	for offer: Dictionary in FeedShed.offers():
		summary.offers.append(OfferSummary.of(farm, offer, closed_because))
	return summary
