## Builds the keeper's AnimationTree for whatever model she wears (SF-98): one
## BlendSpace1D from the idle clip (0) to the walk clip (1), so the controller
## sets a single blend value from her speed. Built in code, not saved in the
## scene, because the model is swappable in the inspector.
class_name KeeperAnimation
extends RefCounted

const BLEND := &"parameters/blend_position"


## The tree driving `model`'s AnimationPlayer, or null (with a warning) when
## the model has no player or lacks a clip — she then walks unanimated.
static func build(model: Node, idle_clip: StringName, walk_clip: StringName) -> AnimationTree:
	var players := model.find_children("*", "AnimationPlayer", true, false)
	if players.is_empty():
		push_warning("Keeper model %s has no AnimationPlayer; she will not animate." % model.name)
		return null
	var player: AnimationPlayer = players[0]
	for clip in [idle_clip, walk_clip]:
		if not player.has_animation(clip):
			push_warning("Keeper model %s has no '%s' clip; she will not animate." % [model.name, clip])
			return null
		# Kenney's clips import without a loop flag (see scenes/farm/farm.gd).
		player.get_animation(clip).loop_mode = Animation.LOOP_LINEAR
	var tree := AnimationTree.new()
	tree.name = "LocomotionTree"
	tree.tree_root = _idle_to_walk(idle_clip, walk_clip)
	player.add_sibling(tree)
	tree.root_node = tree.get_path_to(player.get_node(player.root_node))
	tree.anim_player = tree.get_path_to(player)
	tree.active = true
	return tree


static func _idle_to_walk(idle_clip: StringName, walk_clip: StringName) -> AnimationNodeBlendSpace1D:
	var space := AnimationNodeBlendSpace1D.new()
	space.min_space = 0.0
	space.max_space = 1.0
	space.add_blend_point(_clip(idle_clip), 0.0, -1, &"idle")
	space.add_blend_point(_clip(walk_clip), 1.0, -1, &"walk")
	return space


static func _clip(clip: StringName) -> AnimationNodeAnimation:
	var node := AnimationNodeAnimation.new()
	node.animation = clip
	return node
