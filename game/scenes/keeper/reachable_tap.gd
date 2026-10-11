## Whether a tap on the ground is somewhere the keeper can walk (SF-98). The tap
## is moved to the nearest point of the baked navmesh; that point only counts
## when it is close to the tap (not across a fence or off the edge) and the
## route the navmesh finds actually ends there (not on an unconnected island).
class_name ReachableTap
extends RefCounted

## How far, on the ground, the navmesh point may be from the tap, in metres.
var tolerance: float


func _init(within_metres: float) -> void:
	tolerance = within_metres


## Where to walk for a tap at `tapped`, or null when she cannot get there.
## `on_mesh` is the navmesh point nearest the tap; `route` the path to it.
func destination(tapped: Vector3, on_mesh: Vector3, route: PackedVector3Array) -> Variant:
	if route.is_empty():
		return null
	if not _near(tapped, on_mesh) or not _near(route[route.size() - 1], on_mesh):
		return null
	return on_mesh


func _near(a: Vector3, b: Vector3) -> bool:
	return Vector2(a.x - b.x, a.z - b.z).length() <= tolerance
