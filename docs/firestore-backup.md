# Firestore backup strategy

How a child's farm survives our mistakes. Companion to ADR-0002 (identity, no PII),
`threat-model.md` row 13 (retention and deletion) and `privacy.md`. Implemented in
Phase 4 alongside the save schema; nothing here exists yet.

## 1. What is at stake

A cloud save is one small document per farm — save code, animals, mastery record,
a few KB — written once per session. The data is tiny; the promise is not. "Come
back tomorrow and your farm is here" is the whole reason cloud save exists, and a
child who loses a farm does not read the incident report — they stop playing.

Objectives: **RPO ≤ 24 h** (at most one day of play lost); **RTO ≤ 2 h** for a
full restore, from "we restore" to writes re-enabled; **one farm ≤ 30 min**.

## 2. Two mechanisms

**Point-in-time recovery (PITR).** Firestore keeps every document version for
7 days — minute granularity for the last hour, hourly snapshots after that. A
per-database setting; stale versions are billed as storage (pennies for us). For
oops-deletes, a bad deploy, a migration gone wrong.

**Scheduled backups.** Firestore's built-in `backups schedules` take daily and
weekly snapshots (retention up to 14 weeks), restorable into a *new* database. For
disasters — database deleted, project compromised, PITR window missed. Preferred
over Cloud Scheduler → Function → `gcloud firestore export`: nothing to deploy,
nothing to break silently. Exports to our own bucket are still used on demand —
before a migration, for drills, and because `import` (unlike `databases restore`)
loads into the *existing* database. The bucket's lifecycle matches weekly retention.

Recommendation: PITR on, daily backup kept 14 days, weekly kept 8 weeks, plus the
bucket. `PROJECT_ID` and `REGION` are placeholders; `REGION` is the Firestore
location (a multi-region `nam5` database → bucket location `US`).

```sh
gcloud firestore databases update --database='(default)' --enable-pitr --project=PROJECT_ID
gcloud firestore backups schedules create --database='(default)' --recurrence=daily  --retention=14d --project=PROJECT_ID
gcloud firestore backups schedules create --database='(default)' --recurrence=weekly --day-of-week=SUN --retention=8w --project=PROJECT_ID
gcloud storage buckets create gs://PROJECT_ID-firestore-exports --location=REGION \
  --uniform-bucket-level-access --public-access-prevention --project=PROJECT_ID
gcloud storage buckets update gs://PROJECT_ID-firestore-exports \
  --lifecycle-file=lifecycle.json   # {"rule":[{"action":{"type":"Delete"},"condition":{"age":56}}]}
gcloud firestore export gs://PROJECT_ID-firestore-exports/$(date -u +%Y%m%dT%H%M) --database='(default)' --project=PROJECT_ID
```

Bucket rules: same location as Firestore (cross-region exports are slow and pay
egress), uniform bucket-level access, public-access prevention enforced, 56-day
delete rule, no principals beyond the owner account and the Firestore service agent.

## 3. Restore runbook

**(a) One farm from PITR** — "my farm is gone / broken since yesterday." Needs the
save id and a timestamp from *before* the damage, within 7 days.

1. `functions/scripts/restore-doc.ts` (to be written): a read-only Admin SDK
   transaction with `readTime` set, `tx.get(db.doc('saves/<id>'))`. Eyeball the payload.
2. Write it back with `set()` — overwrite, not merge, so corrupt fields vanish.
   Bump `syncedAt` so clients re-pull.
3. Open it in the game with the save code. Record id, timestamps and cause in the
   ticket. Never ask the child for anything beyond the save code.

**(b) Whole database** — "the collection is gone", "every save since Tuesday is
corrupt." Order matters; do not skip the freeze.

1. **Freeze writes.** Deploy the Hosting maintenance flag (`maintenance.json`; the
   app shows "The farm is resting" and stops syncing) and, as a backstop, the
   read-only variant of `firestore.rules`.
2. **Snapshot the bad state** to the bucket with `gcloud firestore export`, so a
   wrong restore is itself reversible.
3. **Pick the source.** Within 7 days: `gcloud firestore export --snapshot-time=<RFC3339>`.
   Older: `gcloud firestore backups list --location=REGION`, then
   `gcloud firestore databases restore --source-backup=<name> --destination-database=restore-<date>`
   and either repoint the app or export from it.
4. **Import**: `gcloud firestore import gs://…/<path> --database='(default)'`. Import
   overwrites matching ids and leaves other documents alone — delete the corrupted
   collection first if the goal is "exactly as of T."
5. **Verify** with `functions/scripts/count-saves.ts` (aggregate count per collection)
   against the count logged with the backup; open three farms by code.
6. **Replay deletions** made after the snapshot time (§4), then **unfreeze**:
   restore `firestore.rules`, remove the flag. Write up cause and timeline.

**Rehearsal.** Quarterly: restore the newest weekly backup into a scratch project,
run the count script, open a farm. Record it here.

| Drill date | Source | Time to verified | Notes |
| --- | --- | --- | --- |
| — | — | — | first drill is part of the Phase 4 ticket |

## 4. Privacy

Backups contain exactly what production does — save codes, farms, mastery records,
auto-generated usernames, PIN hashes. No PII enters production, so none enters a
backup. Access is the owner account only; no service account, function or CI job
can read the bucket or list backups. Retention deletes automatically.

`privacy.md` promises that "delete my farm" deletes the farm. Plainly: deletion
removes the document from the live database at once and from every backup as
retention expires — 7 days for PITR, 14 for daily backups, 56 for weekly backups
and exports. After 56 days the farm is unrecoverable by anyone, us included.
Deletions are logged (save id and timestamp, nothing else) so a full restore
(step b.6) re-applies them instead of resurrecting a farm a family asked us to
remove. The 12-month inactivity purge (threat model, row 13) takes the same path.

## 5. Cost and monitoring

A few thousand saves at ~5 KB is ~20 MB. Backup storage, PITR versions and the
bucket are billed per GiB-month; an export reads each document once. Order of
magnitude: **cents per month**. Re-check when saves cross ~100 k.

Monitoring: a Cloud Monitoring alert policy on Cloud Audit Logs
(`resource.type="firestore_database"`, `severity>=ERROR`, method matching
`ExportDocuments|Backup`) → email notification channel (owner). Plus a freshness
check, because a schedule that silently stops logs no error: a scheduled function
lists backups daily and logs `ERROR` if the newest is older than 26 h.

## 6. Phase 4 checklist and open questions

- [ ] Enable PITR; create both schedules and the bucket; confirm `backups list` shows a completed backup after 24 h.
- [ ] `functions/scripts/restore-doc.ts` and `count-saves.ts`, each with an emulator test.
- [ ] Hosting maintenance flag + read-only `firestore.rules` variant; the app honours both.
- [ ] Deletion log written by "delete my farm" and by the inactivity purge.
- [ ] Failure alert + freshness check wired to email; trigger one on purpose to prove it.
- [ ] First restore drill into a scratch project; fill in the table in §3.
- [ ] Put the retention numbers into `privacy.md`, kid- and parent-readable.

Open questions: is a 56-day shadow on a deletion promise to a child too long
(shortening weekly retention costs disaster coverage, not money)? Should saves
carry a `schemaVersion` so an older backup can be migrated forward on import?
Does a restored database need the custom-auth token secret rotated, or is that
independent (depends on the Phase 4 auth design)?
