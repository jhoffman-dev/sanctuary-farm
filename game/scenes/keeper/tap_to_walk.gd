## Tap or click the ground and the keeper walks there (SF-98). The tap is cast
## onto the ground's colliders, moved to the nearest point of the baked
## navmesh, and walked to when ReachableTap says she can get there; otherwise
## the TapCue fades in where she cannot go.
##
## Listens to left mouse buttons only: touch is turned into mouse clicks by the
## engine (`emulate_mouse_from_touch`, on by default), so a tap counts once.
class_name TapToWalk
extends Node

@export var keeper: KeeperController
@export var cue: TapCue
## The physics layers the ground's colliders are on; the tap ignores the rest.
@export_flags_3d_physics var ground_layers := 1
## How far the nearest walkable point may be from the tap, in metres.
@export var reach_tolerance := 0.75


func _unhandled_input(event: InputEvent) -> void:
	var click := event as InputEventMouseButton
	if click == null or not click.pressed or click.button_index != MOUSE_BUTTON_LEFT:
		return
	var tapped: Variant = _ground_under(click.position)
	if tapped == null:
		return
	get_viewport().set_input_as_handled()
	tap_ground(tapped)


## A tap that landed on the ground at `tapped`: walk there or show the cue.
func tap_ground(tapped: Vector3) -> void:
	var map := keeper.get_world_3d().navigation_map
	var on_mesh := NavigationServer3D.map_get_closest_point(map, tapped)
	var route := NavigationServer3D.map_get_path(map, keeper.global_position, on_mesh, true)
	var destination: Variant = ReachableTap.new(reach_tolerance).destination(tapped, on_mesh, route)
	if destination == null:
		cue.show_at(tapped)
		return
	keeper.walk_to(destination)


## Where a screen point's ray first meets the ground, or null (the sky).
func _ground_under(screen_point: Vector2) -> Variant:
	var camera := get_viewport().get_camera_3d()
	if camera == null:
		return null
	var from := camera.project_ray_origin(screen_point)
	var to := from + camera.project_ray_normal(screen_point) * camera.far
	var query := PhysicsRayQueryParameters3D.create(from, to, ground_layers)
	var hit := keeper.get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return null
	return hit.position
