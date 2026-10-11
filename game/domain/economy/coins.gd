## The coin economy — `economy/coins.ts`. Speed pays; a wrong answer pays
## nothing; and coins come only from the paddock and the nest (game rule 2).
class_name Coins
extends RefCounted

const COINS_PER_CORRECT := 1
## Total coins for a fluent answer — not added on top of COINS_PER_CORRECT.
const COINS_PER_FLUENT := 2
## Feed granted on a fresh save so day one can begin.
const STARTING_FEED := 12
## Feed shed: this many feed units for this many coins, fixed price.
const FEED_BUNDLE_UNITS := 10
const FEED_BUNDLE_PRICE := 6
## Feed consumed by one feeding. Watering / cleaning / play cost no feed.
const FEED_PER_FEEDING := 3
const NOT_ENOUGH_COINS := "not-enough-coins"


## Coins minted by one graded answer.
static func coins_for(outcome: String) -> int:
	match outcome:
		Outcome.FLUENT:
			return COINS_PER_FLUENT
		Outcome.SLOW, Outcome.LABORED:
			return COINS_PER_CORRECT
		_:
			return 0


## Coins come only from the paddock and the nest — care tasks and free play never mint.
static func context_earns_coins(context: String) -> bool:
	return context == SessionContext.PADDOCK or context == SessionContext.EGG


## The farm after buying one feed bundle, or a refusal (NOT_ENOUGH_COINS)
## that leaves the farm as it was.
static func buy_feed_bundle(farm: Dictionary) -> Result:
	if farm.coins < FEED_BUNDLE_PRICE:
		return Result.failure(NOT_ENOUGH_COINS)
	return Result.success(FarmSave.with_changes(farm, {
		"coins": farm.coins - FEED_BUNDLE_PRICE,
		"feed": farm.feed + FEED_BUNDLE_UNITS,
	}))
