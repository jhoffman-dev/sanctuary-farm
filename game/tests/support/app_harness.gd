## A FarmGame wired to fakes only: seeded RNG, settable clock, in-memory store
## — `packages/application/src/test-fakes.ts`'s harness. Sounds are data on
## the feedback; FarmAudio's tests wire their own RecordingAudioBus.
extends RefCounted

const FakeClock := preload("res://tests/fakes/fake_clock.gd")
const InMemorySaveStore := preload("res://tests/fakes/in_memory_save_store.gd")

var game: FarmGame
var clock: FakeClock
var store: InMemorySaveStore


func _init(farm: Variant = null, seed_value: int = 1, start_at: int = 0) -> void:
	clock = FakeClock.new(start_at)
	store = InMemorySaveStore.new(farm)
	game = FarmGame.new(store, clock, SeededRng.new(seed_value))


static func correct_answer_to(question: Question) -> int:
	return question.a * question.b


## [asked, total, complete], for comparing a RoundProgress in one assert.
static func progress_of(progress: RoundProgress) -> Array:
	return [progress.asked, progress.total, progress.complete]


## The summary's fields as one dictionary, for comparing two summaries.
static func summary_fields(summary: FarmSummary) -> Dictionary:
	return {"coins": summary.coins, "feed": summary.feed, "muted": summary.muted, "families": summary.families}
