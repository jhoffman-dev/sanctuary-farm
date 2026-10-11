## Arrow keys / WASD as a walking direction (SF-98, ADR-0004's keyboard
## fallback). Keys are screen-relative — "up" walks away from the camera — so
## the held direction is turned into the camera's ground frame.
class_name KeyboardWalk
extends RefCounted


## The ground direction for a screen direction (`Input.get_vector`'s: x right,
## y down the screen) seen from a camera looking along `camera_forward`.
## Length is kept, so a diagonal pair of keys is no faster than one key.
static func world_direction(screen: Vector2, camera_forward: Vector3) -> Vector3:
	var forward := Vector3(camera_forward.x, 0.0, camera_forward.z)
	if forward.length_squared() < 0.000001:
		# A camera looking straight down: screen up is world -Z.
		forward = Vector3.FORWARD
	forward = forward.normalized()
	var right := forward.cross(Vector3.UP)
	return right * screen.x - forward * screen.y
