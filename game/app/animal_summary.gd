## Read-model: one barn animal as the barn scene renders it, on today's date.
class_name AnimalSummary
extends RefCounted

var id: String
## A Species.
var species: String
## AnimalHealth.FLOOR..MAX, decay since the last care included.
var health: int
## An AnimalHealth band: "happy", "okay" or "glum" — posture and face, never colour.
var band: String
## The CareTasks not yet done today, in CareTask order.
var tasks_due: Array[String] = []


static func of(animal: Dictionary, today: int) -> AnimalSummary:
	var summary := AnimalSummary.new()
	summary.id = animal.id
	summary.species = animal.species
	summary.health = Barn.health_on(animal, today)
	summary.band = AnimalHealth.band(summary.health)
	summary.tasks_due = Barn.tasks_due(animal, today)
	return summary
