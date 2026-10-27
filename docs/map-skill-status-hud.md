# Map skill/status HUD and larger ordinary monsters

Map-first battle screens keep the existing cast buttons in a dedicated 76px dock
between the battlefield and bottom navigation (60px on short landscape screens).
The existing cast action, MP check, pending indicator, icon/name and skill list
are reused. The dock scrolls horizontally and remains mounted while tool panels
open/close. Non-map-first layouts keep their original quick-magic placement.

The existing ActiveStatusBar is placed above the battlefield on the right, below
the map label and beside the HP/MP area. Icons wrap downward, retain clickable
details, and show duration. The status viewport is capped at 96px (100px on short
landscape screens) and scrolls vertically when more rows are present. The hidden
hunt-tools status copy is suppressed in map-first mode.

Ordinary monster art is enlarged. Five-monster formations use
clamp(76px,22vw,140px), versus the old mobile clamp(38px,10vw,56px), approximately
doubling the art box. Other ordinary formations use clamp(140px,35vw,180px).
Short landscape screens cap art at 90px. Names and HP bars remain separate from
the art; encounter UID, positions, damage, attack speed, sprite animation and
boss/dragon sizing rules are unchanged.

## Validation

The same local CSS/DOM fixture used for the map-first trial was updated with a
scrolling skill dock, 22 synthetic status icons and five placeholder monsters.
At 400x844 the skill dock sits at y=710..786 above navigation, status rows wrap
and the 96px viewport scrolls over 187px of content. At 844x390 the dock is 60px
high and art is capped at 90px. This checks CSS geometry, not real game assets or
signed-in React gameplay. Full repository checks/build/deploy run in CI.
