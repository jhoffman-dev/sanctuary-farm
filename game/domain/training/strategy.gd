## One way to break a fact down, as the steps the child types in order. The
## last step's answer is always the fact's product. `hint` holds the numbers
## the scene's sentence needs ("split 8 into 5 and 3"), never the answers.
class_name Strategy
extends RefCounted

## Break the array apart (the distributive property on an area model).
const AREA_MODEL := "area_model"
## Start from ×10, then take some away or add some.
const TEN_ANCHOR := "ten_anchor"
## Halve and double.
const DOUBLING := "doubling"
## Use a square you know.
const NEAR_SQUARE := "near_square"

var key: String
var steps: Array[StrategyStep] = []
## AREA_MODEL {"parts": [5, 3]}; TEN_ANCHOR and NEAR_SQUARE {"from": 10 or the
## square's side, "by": how far, "direction": "less" | "more"}; DOUBLING {"half": 4}.
var hint: Dictionary


func _init(strategy_key: String, strategy_steps: Array[StrategyStep], strategy_hint: Dictionary) -> void:
	key = strategy_key
	steps = strategy_steps
	hint = strategy_hint
