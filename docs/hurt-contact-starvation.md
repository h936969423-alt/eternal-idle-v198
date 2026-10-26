# Incoming damage starved local attack contacts

## Reproduction

The browser hook drives normal attacks every 100 ms and samples their poses every
125 ms. The previous source priority let hurt replace an in-progress attack or
cast. Every reduction in replayed player HP triggered another hurt action and
restarted its clock. Under sustained incoming hits (five-monster arena), an attack
could never reach its sampled contact frame. The real-hook regression reproduces
zero contacts in 3 seconds on the previous implementation.

`allowLocalHit` then held confirmed normal damage until another contact or a
2–5-second fallback. That fallback was not a contact: multiple overdue results
for the current UID could pass in one display frame. A separate 80 ms token
expiry discarded genuine contacts before buffered/delayed results arrived.

These are reproduced presentation defects. They do not prove every observed
five-victim update had this cause. In particular, background/gap restore and
independent damage sources remain separate paths.

## Change

- Hurt no longer interrupts an active attack/cast or continually restarts itself.
  Normal attack can replace hurt; death remains authoritative.
- Retain exactly one real contact until consumed, replaced, stopped or reset.
  Target UID and confirmed event sequence still have to match.
- Elapsed time alone cannot release an active normal hit. Stop/visibility/gap
  restoration retain their existing canonical-state reconciliation behavior.
- Server damage, equipment, monster sizing, buttons, skills and rewards unchanged.

## Validation

The original Sunrise fixture is preserved. Its differential test now explicitly
separates the intentional hurt arbitration from the unchanged attack/cast/frame
behavior. A dedicated comparison reproduces original hurt starvation and checks
that the adapter preserves contacts.

An integration test executes the real motion hook and replay functions together:
five incoming attackers, 90–260 ms packet jitter, 15 normal attacks progressing
across five victims. Each event displays once, at most one normal hit per frame,
no hit waits 1.6 seconds, all final HP values agree, and no queue remains.
An additional regression prevents five overdue results bypassing one contact.

No signed-in iPhone gameplay verification was performed. Deployment target is
the Cloudflare test Worker, not the original Sites-hosted version.
