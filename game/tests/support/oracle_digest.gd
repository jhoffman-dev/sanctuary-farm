## Rebuilds, byte for byte, the canonical strings that
## game/tools/oracles/print-oracles.test.ts hashes from the TypeScript rules,
## and reads the oracle file it writes. Equal digests mean the port reached the
## same state by the same path.
extends RefCounted

const ORACLE_PATH := "res://tests/oracles/typescript_oracles.json"
const Fixtures := preload("res://tests/support/scheduler_fixtures.gd")


static func oracles() -> Dictionary:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(ORACLE_PATH))
	assert(parsed is Dictionary, "the oracle file is missing; run the generator")
	return parsed


static func of_steps(steps: Array[Fixtures.Step], initial: Dictionary) -> Dictionary:
	return {
		"trace": ",".join(Fixtures.trace_of(steps)).sha256_text(),
		"state": canonical_state(Fixtures.final_state(steps, initial)).sha256_text(),
	}


static func canonical_state(state: Dictionary) -> String:
	var facts: Array[String] = []
	for fact in FactTable.table_of(state.max_table):
		var status: Variant = state.facts.get(fact.id)
		if status != null:
			facts.append(_canonical_status(status))
	var credit: Array[String] = []
	var credit_ids: Array = state.commute_credit.keys()
	credit_ids.sort()
	for id: String in credit_ids:
		credit.append("%s=%d" % [id, roundi(state.commute_credit[id] * 2.0)])
	return ";".join([
		",".join(facts),
		str(state.global_counter),
		_joined(state.unlocked_tiers, "."),
		_joined(state.recent_families, "."),
		state.last_served if state.last_served != null else "n",
		".".join(credit),
		str(state.max_table),
	])


static func canonical_farm(farm: Dictionary) -> String:
	var sessions: Array[String] = []
	for session: Dictionary in farm.sessions:
		var entries: Array[String] = []
		for entry: Dictionary in session.entries:
			entries.append(":".join([
				entry.fact_id, str(roundi(entry.given)), "1" if entry.correct else "0",
				str(roundi(entry.latency_ms)), entry.outcome, str(entry.asked_at),
			]))
		var family: String = str(session.family) if session.family != null else "n"
		sessions.append("|".join([str(session.started_at), str(session.ended_at), session.context, family, "/".join(entries)]))
	return "#".join([
		canonical_state(farm.scheduler), str(farm.coins), str(farm.feed), ",".join(sessions),
		"1" if farm.settings.muted else "0",
	])


static func _canonical_status(status: Dictionary) -> String:
	var recent: Array[String] = []
	for ms: Variant in status.recent_latencies:
		recent.append(str(roundi(ms)))
	var last: String = str(roundi(status.last_latency_ms)) if status.last_latency_ms != null else "n"
	return "|".join([
		status.id, str(status.box), str(status.due_at), last, ".".join(recent),
		str(status.correct_streak), str(status.total_attempts), str(status.total_correct),
		"1" if status.introduced else "0",
	])


static func _joined(values: Array, separator: String) -> String:
	var parts: Array[String] = []
	for value: Variant in values:
		parts.append(str(value))
	return separator.join(parts)
