## Production seeds the domain's SeededRng from engine entropy; tests seed it
## by hand. This is the only place the game touches engine randomness.
class_name EntropySeed
extends RefCounted


static func fresh_rng() -> Rng:
	var entropy := RandomNumberGenerator.new()
	entropy.randomize()
	return SeededRng.new(entropy.randi())
