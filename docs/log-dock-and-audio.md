# Log dock, logout footer removal and audio activation

## Layout

The existing drop-log component is shared between layouts. Map-first mode places
it in a 112px dock below skill shortcuts and above navigation (58px on short
landscape screens). Its own list scrolls through the latest 30 item drops.
Other layouts keep the original log location. The standalone account-logout
button after GameLogin's children is removed, including its layout footprint.
Authentication endpoints, session state and saved characters are not changed.

## Audio evidence and change

The read-only CI asset inspection restored the existing four bundles: all 316
mapped .ogg sound IDs exist, including attack_sword2.ogg. No missing-file cause
was reproduced. The existing browser audio code did not select an AudioSession
type and swallowed activation errors. WebKit's own issue explains that default
Web Audio can follow iPhone silent mode and recommends playback sessions:
https://bugs.webkit.org/show_bug.cgi?id=237322#c6

Enabling combat audio now selects playback when supported before constructing
or resuming AudioContext. Disabling releases it back to auto and suspends the
context. Touch-end and visibility-return paths retry interruption recovery.
Closed contexts can be recreated, and context creation failure does not crash
the UI. A guarded two-note confirmation uses Web Audio directly, so it does not
depend on sound-file loading latency. Switching off while resume is pending
prevents a late tone. The existing original combat files remain in use.

Both speaker controls use the same handler. Explicitly enabling at 0% volume
restores 70%, updates the audio gain immediately, and persists the new setting.
If confirmation cannot start, a short actionable message is shown.

## Validation limits

Six deterministic audio tests cover session order, absent API support,
interruption recovery, disable/resume race, original weapon asset playback, and
blocked context creation/resume. The real audio module was also transpiled into
a local Chromium fixture: clicking enable successfully resumed the context and
scheduled the confirmation tones. This does not establish iPhone audibility.

The CSS/DOM layout fixture at 400x844 places the skill dock at y=598..674, the
log at y=674..786, then navigation. Its log viewport is 85px high with 444px of
scrollable sample content. This is not signed-in game verification.
Full combat regressions, type checks and Worker build are checked in CI.
