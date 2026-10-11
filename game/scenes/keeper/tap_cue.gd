## The gentle "she can't go there" cue (SF-89 / SF-98): a soft cream ring on the
## ground where the tap landed, fading out. No sound, no red, no text — and no
## movement, so it is the same under reduced motion.
class_name TapCue
extends MeshInstance3D

## How long the ring takes to fade away, in seconds.
@export var fade_seconds := 0.6
@export var ring_color := Color(1.0, 0.96, 0.84)

var _remaining := 0.0
var _material := StandardMaterial3D.new()


func _ready() -> void:
	# Stays where the tap landed while the keeper walks about.
	top_level = true
	_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_material.albedo_color = ring_color
	material_override = _material
	visible = false


## Shows the ring at `point` on the ground, at full strength.
func show_at(point: Vector3) -> void:
	# Lifted a hair so it never z-fights the ground.
	global_position = point + Vector3.UP * 0.03
	_remaining = fade_seconds
	_set_strength(1.0)
	visible = true


## The ring's opacity now: 1 just shown, 0 gone.
func strength() -> float:
	return _material.albedo_color.a if visible else 0.0


func _process(delta: float) -> void:
	if not visible:
		return
	_remaining -= delta
	if _remaining <= 0.0:
		visible = false
		return
	_set_strength(_remaining / fade_seconds)


func _set_strength(alpha: float) -> void:
	_material.albedo_color = Color(ring_color, alpha)
