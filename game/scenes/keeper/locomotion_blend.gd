## The idle ↔ walk blend picked by the keeper's own ground speed (ADR-0004:
## velocity, not input, decides the clip), eased (with move_toward and fade_step) so a start or stop crossfades
## instead of snapping.
class_name LocomotionBlend
extends RefCounted

## Below this the walk cycle would foot-slide, so it reads as standing.
const STANDING_SPEED := 0.05


## The blend a speed asks for: 0 standing (idle), 1 at walking pace (walk).
static func target(speed: float, walk_speed: float) -> float:
	if speed <= STANDING_SPEED or walk_speed <= 0.0:
		return 0.0
	return clampf(speed / walk_speed, 0.0, 1.0)



## How far the blend may move in one frame so a full change takes
## `fade_seconds`; a zero fade snaps.
static func fade_step(delta: float, fade_seconds: float) -> float:
	if fade_seconds <= 0.0:
		return INF
	return delta / fade_seconds
