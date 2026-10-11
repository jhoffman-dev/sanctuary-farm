## The coin economy — `economy/coins.ts`. Speed pays; a wrong answer pays
## nothing; and coins come only from the paddock and the nest (game rule 2).
class_name Coins
extends RefCounted

const COINS_PER_CORRECT := 1
## Total coins for a fluent answer — not added on top of COINS_PER_CORRECT.
const COINS_PER_FLUENT := 2
## Feed granted on a fresh save so day one can begin.
const STARTING_FEED := 12
## Feed consumed by one feeding. Watering / cleaning / play cost no feed.
const FEED_PER_FEEDING := 3


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

