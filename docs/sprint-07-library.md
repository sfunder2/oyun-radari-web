# Sprint 07 — Personal Game Library (first increment)

This migration introduces a **manual** private per-user multi-store game library.
It does not connect to platform accounts or infer ownership from account linking.

## Deployment
1. Apply `supabase/sprint-07-library.sql` in staging SQL Editor.
2. Test authenticated insert/select/update/delete for owner A; confirm user B and anon cannot read or mutate user A's rows.
3. Apply to production only after verification. No front-end use is enabled by this PR.

## Schema
- Unique row for each `(user_id, platform, game_id)`
- `play_status`: backlog, playing, completed, paused, dropped
- Index optimizes private per-user listing by status and update time
- RLS prevents cross-account access; no public sharing without future opt-in

## Future deliverables
A library UI, status editor, duplicates/edition resolution, data export,
Steam synchronization with opt-in, and reliable RLS integration tests.
