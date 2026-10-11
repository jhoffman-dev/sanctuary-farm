## The coin counter in the corner.
class_name Hud
extends PanelContainer

@onready var _coins_label: Label = %CoinsLabel


func show_coins(coins: int) -> void:
	_coins_label.text = "Coins: %d" % coins
