## Angle maths for the keeper's facing (SF-98), ported from the web client's
## `keeper-walk.ts` and `keeper-facing.ts`. Yaw is the turn about +Y; the
## Kenney models face +Z on import, so yaw 0 looks down +Z.
class_name KeeperHeading
extends RefCounted

## A three-quarter view rather than dead-on: her face and one side both read,
## the way a storybook figure stands.
const THREE_QUARTER := PI / 6


## The yaw that looks along `direction` on the ground (its height is ignored).
static func yaw_facing(direction: Vector3) -> float:
	return atan2(direction.x, direction.z)


## The signed turn from one yaw to another the short way round, in [-PI, PI).
static func shortest_turn(from_yaw: float, to_yaw: float) -> float:
	return wrapf(to_yaw - from_yaw, -PI, PI)


## One step of turning from `current` toward `desired`, at most `max_step`
## radians. Pass INF to turn at once (reduced motion).
static func turn_toward(current: float, desired: float, max_step: float) -> float:
	var turn := shortest_turn(current, desired)
	if absf(turn) <= max_step:
		return current + turn
	return current + signf(turn) * max_step


## The yaw that shows the camera a three-quarter view of the keeper: toward the
## camera's spot on the ground, turned a little to whichever side is the
## shorter turn from `current`.
static func three_quarter_yaw(keeper: Vector3, camera: Vector3, current: float) -> float:
	var straight := yaw_facing(camera - keeper)
	var left := wrapf(straight + THREE_QUARTER, -PI, PI)
	var right := wrapf(straight - THREE_QUARTER, -PI, PI)
	if absf(shortest_turn(current, left)) <= absf(shortest_turn(current, right)):
		return left
	return right
