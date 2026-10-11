## Whether a point stands on a hotspot's footprint (SF-98). A hotspot is a box
## on the ground; only its width and depth count, so a keeper standing a little
## above or below the box's middle (a slope, a step) is still there.
class_name HotspotBounds
extends RefCounted


## `local_point` is in the box's own space (its centre at the origin).
static func contains(local_point: Vector3, size: Vector3) -> bool:
	return absf(local_point.x) <= size.x / 2.0 and absf(local_point.z) <= size.z / 2.0
