## The feed shed — the prototype's `buyFeed`, made pure. Coins are spent here
## and nowhere else; no questions are asked, because spending is not a learning
## action. Nothing here costs real money (game rule 7): coins come only from
## graded answers in the paddock and the nest.
##
## An offer is a plain record: {"id": String, "feed": int, "price": int (coins)}.
## There is no cap on feed held; the prototype and the redesign notes set none.
class_name FeedShed
extends RefCounted

## A sack of feed: 10 feed for 6 coins, a fixed price (redesign-notes.md:45).
const FEED_SACK := "feed-sack"
const SACK_FEED := 10
const SACK_PRICE := 6
## Not a failure the child sees as one: the shed says "earn coins in the
## paddock or the nest", the only places coins come from.
const NOT_ENOUGH_COINS := "earn-coins-in-the-paddock-or-nest"
const UNKNOWN_OFFER := "unknown-offer"


## Everything the shed sells, in shelf order.
static func offers() -> Array[Dictionary]:
	return [{"id": FEED_SACK, "feed": SACK_FEED, "price": SACK_PRICE}]


## The offer with this id, or UNKNOWN_OFFER.
static func offer(offer_id: String) -> Result:
	for candidate: Dictionary in offers():
		if candidate.id == offer_id:
			return Result.success(candidate)
	return Result.failure(UNKNOWN_OFFER)


## The offer, when the farm can buy it now; otherwise why not: UNKNOWN_OFFER,
## or NOT_ENOUGH_COINS when its coins fall short of the price.
static func check_buy(farm: Dictionary, offer_id: String) -> Result:
	var found := offer(offer_id)
	if not found.ok:
		return found
	if farm.coins < found.value.price:
		return Result.failure(NOT_ENOUGH_COINS)
	return found


## The farm after buying the offer: exactly its price in coins out, exactly its
## feed in, nothing else touched. Refused, changing nothing, for anything
## check_buy refuses.
static func buy(farm: Dictionary, offer_id: String) -> Result:
	var checked := check_buy(farm, offer_id)
	if not checked.ok:
		return checked
	return Result.success(FarmSave.with_changes(farm, {
		"coins": farm.coins - checked.value.price,
		"feed": farm.feed + checked.value.feed,
	}))
