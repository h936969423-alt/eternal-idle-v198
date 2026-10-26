# Player normal-attack target ownership

Each local swing now captures an immutable target UID, slot and confirmed normal
attack sequence at its start. The earliest pending normal hit owns the next
swing; pet, summon, poison, spell and weapon-proc events cannot enter this list.
The contact sampler uses that captured UID/sequence instead of reading the
latest selection halfway through the animation. A fallback may not release a
different live target while the player is visibly swinging at another UID.
Normal results remain globally ordered across victims. Replaced/dead target
results cannot put a new damage number onto the replacement's body.

Presentation target selection now changes only on normal attacks or an explicit
target-selected confirmation. Other events previously copied their temporary
arenaTarget snapshots into the player's selection. The server's actual damage
and automatic selection rules remain unchanged.

The current swing also owns the target marker. Facing is measured from the
displayed player and target rectangles and maps through the source NW/N/NE
three-folder fold, or the untransformed male knight's eight directional clips.
Attack and casting folders must agree; unavailable directional art retains its
existing fallback. Single-direction base sprites may mirror toward the left.

Validation includes a real-hook mid-swing selection change, non-player target
snapshots, exact sequence matching, global result ordering, stale replacements,
timeout isolation and all eight facing vectors. Damage values, spell AoE and
pet/summon victims are not rewritten.
