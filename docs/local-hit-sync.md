# Local swing and confirmed damage rendezvous

Local 100ms attacks formerly ran independently of the buffered server-event
clock, so normal hit numbers and HP could land between visible swings.
The 125ms player-frame sampler now publishes one contact per visible attack,
scoped to character, map and living target UID. Confirmed normal physical hits
wait for a matching contact; numbers and HP still use the same authoritative
event. A contact expires after 80ms and cannot be consumed twice. Fast attacks
use a reachable contact frame for the 125ms display sampler.

Weapon procs cannot overtake a waiting normal hit. Existing lethal-loot/spawn
ordering and 200ms arrow flights remain; bow detection now reads isBow, matching
the player sprite and engine. Monster HP bars no longer add a 250ms CSS tween.
Spells, summons, pets and poison retain their independent timing.

Stopping, map/form changes, unmount and background transitions clear contacts.
Missing animation/target contact has a bounded 2–5 second canonical fallback,
so presentation cannot indefinitely freeze the server-confirmed game state.
No local damage, reward or save mutation is introduced.

Validation: local-hit-sync.test.mjs exercises early/late results, one-time HP and
number updates, stale targets, lethal replacement, weapon procs, bow impacts and
fallback. local-player-attack.test.mjs also runs the real frame hook with fake
timers and verifies a contact emitted at its displayed frame, not before it.
