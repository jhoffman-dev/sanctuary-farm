@tool
## The keeper, ready to drop into any farm scene (SF-98). She walks the
## NavigationRegion3D the scene bakes at art-direction §2's constant speed,
## turns to face where she is going and, when a walk to a tap ends, turns a
## three-quarter view toward the camera. Her ground speed, not the input, sets
## the idle ↔ walk blend (ADR-0004), so taps and keys animate the same.
##
## Decides nothing about the game: it says when she sets off and where she
## stopped. The scene root turns a stop into a HotspotArrivals call.
##
## A tool script only so the chosen model shows in the editor; walking,
## input and animation run in the game alone.
class_name KeeperController
extends Node3D

## She started walking (a tap's route or a held key).
signal set_off
## She stopped walking at `at` (world space).
signal stopped(at: Vector3)

enum ReducedMotion { FOLLOW_PAGE, ALWAYS, NEVER }
enum Mode { STANDING, ROUTE, KEYS }

const KENNEY_KEEPER := preload("res://assets/kenney/mini-characters/character-female-a.glb")

## Ground speed in metres per second. Art-direction §2: the ~30 m farm crossed in 8 s.
@export var walk_speed := 3.75
## How fast she turns toward where she walks, in radians per second.
@export var turn_rate := 10.0
## How fast she turns to face the camera after a walk, in radians per second:
## an unhurried look round, not a spin.
@export var facing_turn_rate := 4.0
## How close to the destination counts as arrived, in metres.
@export var arrival_radius := 0.25:
	set(value):
		arrival_radius = value
		if is_node_ready():
			_agent.target_desired_distance = value
## Turn a three-quarter view to the camera when a walk to a tap ends.
@export var face_camera_on_arrival := true
## FOLLOW_PAGE uses the browser's prefers-reduced-motion (set by the scene
## root); ALWAYS / NEVER override it. Reduced motion: no walk bob, instant turns.
@export var reduced_motion := ReducedMotion.FOLLOW_PAGE

@export_group("Model")
## The character she wears; it needs an AnimationPlayer with the two clips below.
@export var model_scene: PackedScene = KENNEY_KEEPER:
	set(value):
		model_scene = value
		if is_node_ready():
			_wear_model()
## Kenney's Mini Characters are ~0.78 m; art-direction §2 wants a 1.6 m keeper.
@export var model_scale := 2.06:
	set(value):
		model_scale = value
		if is_node_ready():
			_pivot.scale = Vector3.ONE * value
@export var idle_clip := &"idle"
@export var walk_clip := &"walk"
## How long the idle ↔ walk crossfade takes, in seconds.
@export var crossfade_seconds := 0.25

## The page's prefers-reduced-motion, handed in by the scene root (WebPage).
var page_prefers_reduced_motion := false

var _mode := Mode.STANDING
var _facing_camera := false
var _camera_yaw := 0.0
var _blend := 0.0
var _animation: AnimationTree

@onready var _agent: NavigationAgent3D = $NavigationAgent3D
@onready var _pivot: Node3D = $Model


func _ready() -> void:
	_pivot.scale = Vector3.ONE * model_scale
	_wear_model()
	if Engine.is_editor_hint():
		return
	_agent.target_desired_distance = arrival_radius


## Walks to `point` along the navmesh. Held keys still win while held.
func walk_to(point: Vector3) -> void:
	_agent.target_position = point
	_mode = Mode.ROUTE
	_facing_camera = false
	set_off.emit()


func is_walking() -> bool:
	return _mode != Mode.STANDING


## Whether she moves without the walk bob and turns at once.
func reduces_motion() -> bool:
	match reduced_motion:
		ReducedMotion.ALWAYS:
			return true
		ReducedMotion.NEVER:
			return false
	return page_prefers_reduced_motion


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint() or delta <= 0.0:
		return
	var before := global_position
	var keys := _keyboard_direction()
	if keys != Vector3.ZERO:
		_walk_by_keys(keys, delta)
	elif _mode == Mode.KEYS:
		_stop(false)
	elif _mode == Mode.ROUTE:
		_follow_route(delta)
	var moved := global_position - before
	moved.y = 0.0
	_turn(moved, delta)
	_animate(moved.length() / delta, delta)


func _follow_route(delta: float) -> void:
	var next := _agent.get_next_path_position()
	if _agent.is_navigation_finished():
		_stop(face_camera_on_arrival)
		return
	global_position = global_position.move_toward(next, walk_speed * delta)


func _walk_by_keys(direction: Vector3, delta: float) -> void:
	if _mode != Mode.KEYS:
		_mode = Mode.KEYS
		_facing_camera = false
		set_off.emit()
	global_position = _on_navmesh(global_position + direction * walk_speed * delta)


func _stop(face_camera: bool) -> void:
	_mode = Mode.STANDING
	var camera := get_viewport().get_camera_3d()
	_facing_camera = face_camera and camera != null
	if _facing_camera:
		_camera_yaw = KeeperHeading.three_quarter_yaw(global_position, camera.global_position, rotation.y)
	stopped.emit(global_position)


func _turn(moved: Vector3, delta: float) -> void:
	var instant := reduces_motion()
	if moved.length_squared() > 0.000001:
		var step := INF if instant else turn_rate * delta
		rotation.y = KeeperHeading.turn_toward(rotation.y, KeeperHeading.yaw_facing(moved), step)
	elif _facing_camera:
		var step := INF if instant else facing_turn_rate * delta
		rotation.y = KeeperHeading.turn_toward(rotation.y, _camera_yaw, step)
		_facing_camera = absf(KeeperHeading.shortest_turn(rotation.y, _camera_yaw)) > 0.0001


## Reduced motion holds the rest pose, as the farm's other characters do.
func _animate(speed: float, delta: float) -> void:
	if _animation == null:
		return
	_animation.active = not reduces_motion()
	var wanted := LocomotionBlend.target(speed, walk_speed)
	_blend = move_toward(_blend, wanted, LocomotionBlend.fade_step(delta, crossfade_seconds))
	_animation.set(KeeperAnimation.BLEND, _blend)


## The held arrow keys / WASD as a ground direction, relative to the camera.
func _keyboard_direction() -> Vector3:
	var screen := Input.get_vector(&"keeper_left", &"keeper_right", &"keeper_up", &"keeper_down")
	var camera := get_viewport().get_camera_3d()
	if screen == Vector2.ZERO or camera == null:
		return Vector3.ZERO
	return KeyboardWalk.world_direction(screen, -camera.global_basis.z)


## Keys walk freely but never off the baked navmesh.
func _on_navmesh(point: Vector3) -> Vector3:
	var map := get_world_3d().navigation_map
	if NavigationServer3D.map_get_iteration_id(map) == 0:
		return point
	# The baked mesh floats above the ground; her feet do not.
	return NavigationServer3D.map_get_closest_point(map, point) - Vector3.UP * _agent.path_height_offset


func _wear_model() -> void:
	for child in _pivot.get_children():
		_pivot.remove_child(child)
		child.queue_free()
	_animation = null
	if model_scene == null:
		return
	var model := model_scene.instantiate()
	_pivot.add_child(model)
	if not Engine.is_editor_hint():
		_animation = KeeperAnimation.build(model, idle_clip, walk_clip)
