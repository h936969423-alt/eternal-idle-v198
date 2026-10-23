# Persistent map access

GM → 地圖開放與關閉 manages selectable villages, hunting maps and world-boss entries. A closed map is omitted from map selection, world-boss rows, town shortcuts, and the related workshop/doll travel buttons. Silver Knight Village remains available as the safe return location. Previously paused dragon versions remain paused.

This setting is independent of monster generation. Closing or reopening does not rewrite monster pools, drops, spawn quantities, respawn periods or entry requirements. Reopening restores the entry on the next game load; live polling also propagates the revision.

Configuration persists in the `map_access` world_settings row. The GM endpoint validates the zone and boolean state, checks GM identity and request origin, and performs an optimistic revision update. Recent toggle summaries are visible in the panel. Runtime state excludes operator identities and is attached before simulation through normal game and GM character requests; shared settings are excluded from player saves.

The engine rejects entry into closed maps before charging any entry fee. Existing characters return to the protected safe village and stop hunting when the map closes. Closure/open timestamps are retained per zone (latest 50 transitions), so offline simulation can retain rewards earned before a closure, then stop on the closure boundary. World-boss participation is abandoned using the existing return-to-village behavior. Reopening does not automatically resume a stopped character.

Verified: TypeScript; test-map-access.cjs covers persistence/restart, reopening, historical closure timing, server entry validation, safe relocation, blocked continued farming, world-boss entry, shared-setting sync, GM/origin validation and revision conflicts. Existing save conflicts, GM grants, combat replay, automatic spell timing and loot presentation tests were also run. No iPhone/browser interaction test is claimed when the browser-control skill is unavailable.
