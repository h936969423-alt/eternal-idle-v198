# Map-first battle layout trial

When a selected character enters a non-town battlefield, the layout uses the
available viewport for one persistent BattleArena. A compact header and identity
strip remain above it, and seven function buttons remain below it. Landscape
screens below 500px tall omit the top brand strip. Safe-area insets and dynamic
viewport height are respected.

Existing tools enter MapFunctionPanel, a Radix dialog with a close button, Escape
and outside-dismiss support, focus handling, and an independently scrolling
body. Desktop uses a right-side panel; narrow mobile viewports use a full-screen
panel. The background map keeps its size. BattleArena and the motion hooks stay
outside the panel and do not change key or remount on tab selection. Login,
character selection, lobbies and towns retain the existing layout.

The hunt function panel contains the existing map selector, manual magic,
potions, status, companion controls, boss roster and drop log. Existing other
tabs are retained. Selecting a destination closes the tools. Start/stop hunt and
lobby actions retain their existing map-floor placement. Sprite asset dimensions
are not rescaled with map height; the percentage-based portrait player container
is capped at 160px so it cannot grow with desktop map width.

## Validation scope

A local CSS/DOM layout fixture uses the real stylesheet with representative
markup and placeholder actors (not a signed-in game or the real React dialog).
Cloud-browser measurements:

- 400x844 portrait: map 398x694; bottom navigation fully in view.
- 844x390 landscape: map 841x300; old 65/35 column constraint removed.
- 1280x800 desktop: map 1277x650; opening a 580px tool panel leaves its map bounds
  unchanged; close restores the map view. Mobile overlay scrolls independently.

Full repository TypeScript, existing combat regressions and the Worker build
are checked in CI. Signed-in mobile gameplay and actual React dialog interaction
remain unverified. Deployment is the isolated Cloudflare test Worker.
