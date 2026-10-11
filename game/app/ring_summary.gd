## Read-model: the training ring — the facts it offers, and the training under
## way (null when none).
class_name RingSummary
extends RefCounted

## Fact ids, in the order to lay them out. Pass one to FarmGame.start_training.
var offered_facts: Array[String] = []
var training: TrainingSummary


static func of(max_table: int, under_way: Training) -> RingSummary:
	var summary := RingSummary.new()
	summary.offered_facts = TrainingRing.offered_facts(max_table)
	summary.training = TrainingSummary.of(under_way) if under_way != null else null
	return summary
