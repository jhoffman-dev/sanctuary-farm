## Days for the care rules: a whole-number day that turns over at the
## player's local midnight, so "fed today" means today where the child is.
class_name CareDay
extends RefCounted

const MSEC_PER_DAY := 86_400_000
const _MSEC_PER_MINUTE := 60_000


## The day number of an epoch-ms instant at a given offset from UTC.
## Floored, so an instant before 1970 still lands on its own day.
static func of(epoch_msec: int, utc_offset_minutes: int) -> int:
	var local := epoch_msec + utc_offset_minutes * _MSEC_PER_MINUTE
	return floori(float(local) / MSEC_PER_DAY)
