# Lethal spell visibility and respawn feedback

A supplied phone recording showed damage/MISS text climbing above the scene and an empty arena after lethal area magic. The dead-monster CSS hides non-number children; Meteor and Disintegrate were still rendered inside that hidden host. Target atlases now render at scene level, choose their explicit event slot, snapshot initial placement, and retain their own lifetime independently of death or replacement UIDs. Legacy effect rendering stays attached to the actor.

Floating numbers use two local rows and three horizontal offsets rather than an unbounded upward lane. While hunting with no living ordinary monsters, the scene explains that it is waiting for respawn. Existing configured respawn intervals (including speed modifiers), combat, rewards and saves are unchanged; no fake attack loop is added during the no-target wait.

Validation uses actual engine Meteor damage against three 1-HP targets, death and replacement, retained casts, scene-level host checks, explicit slot selection in the React renderer harness, 60 bounded float lane inputs, and canonical respawn after the configured interval. Existing 93-map respawn, portrait/landscape geometry, cast handoff, continuous polling and triple impact regressions pass. Authenticated live gameplay is not verified by these tests.
