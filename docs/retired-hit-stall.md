# Retired-hit queue stall

## Root cause

`beginLocalSwing` marks confirmed targets absent from the visible arena as
retired. Before those results are drained, `useCombatReplay` repopulates pending
targets from its replay queue on each animation frame. The old retired branch
in `allowLocalHit` returned true without calling `complete()`.

If the spawn then becomes visible and the first hit is nonlethal, that drained
event remains at `pending[0]`. All following swings capture its old sequence.
Their contact permits cannot match the new normal damage events, so the local
animation continues while subsequent HP results wait indefinitely.

## Fix

Finalize retired results through the same `complete()` path as other drained
normal results. This removes the old pending target and records its sequence in
the completed ledger, preventing subsequent frame/packet requeues. The next
swing binds the next uncompleted result. Existing one-contact and duplicate-HP
guards are retained.

## Reproduction and validation

A deterministic registry regression reproduces the missing cleanup. An
integration regression executes the actual motion hook and replay functions,
delivers packets over time, queues a spawn behind the 650ms replay offset, and
repopulates targets on every animation frame in the same order as the shipped
hook. The previous code applies only the first of 20 normal attacks; all later
results stall. The fixed code applies all 20 exactly once, reaches HP 80 from
100, and empties the replay queue. All 38 related tests pass locally.

This reproduces a real cause of the reported symptom. It is not a signed-in
mobile runtime verification or proof that no other stall paths exist.
