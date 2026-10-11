## A place on the farm the keeper can stop at (SF-98). Drop one per hotspot,
## set `hotspot_id` to the id the rules know ("paddock", "barn", …) and size its
## CollisionShape3D box over the ground there. When the keeper stops inside the
## box, the scene root reports her arrival there (HotspotArrivals).
##
## It is an Area3D so the box shows and sizes in the editor like any other
## area; "inside" is worked out from the box itself (HotspotBounds) rather than
## from physics overlap signals, which land a physics frame late.
class_name HotspotArea
extends Area3D

const GROUP := &"hotspot_areas"

## The hotspot id the game rules know, e.g. "paddock".
@export var hotspot_id := ""


func _ready() -> void:
	add_to_group(GROUP)


## Whether `point` (world space) stands on this hotspot's footprint.
func contains_point(point: Vector3) -> bool:
	for child in get_children():
		var shape := child as CollisionShape3D
		if shape == null or not (shape.shape is BoxShape3D):
			continue
		var local := shape.global_transform.affine_inverse() * point
		if HotspotBounds.contains(local, (shape.shape as BoxShape3D).size):
			return true
	return false


## The id of the hotspot under `point`, or "" when she is between places.
static func id_at(tree: SceneTree, point: Vector3) -> String:
	for area: HotspotArea in tree.get_nodes_in_group(GROUP):
		if area.contains_point(point):
			return area.hotspot_id
	return ""
