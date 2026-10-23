# GM item classification and monster-drop presentation

The new GM panel at `/gm` manages normal, legend and relic labels independently from drop odds and Pandora weights. Default styles and per-item overrides live under the `item_appearance` row in `world_settings`. Existing item flags supply classification until overridden. No equipment stats, icons, loot tables, sale rules or gacha weights are rewritten.

The GM-only `/api/gm/item-appearance` endpoint supports defaults, 1–500 selected item patches and reset-to-default operations. Validate item IDs, enum values, 500–5000ms durations and name/count templates. Reject non-GM users, foreign origins, unknown fields and stale revisions. Writes use the existing database revision compare-and-swap pattern. History retains the latest 30 operation summaries.

Game settings include this configuration in their existing single settings read. Its revision invalidates client definition reuse. Attach settings while advancing both normal game requests and GM grant requests, and exclude shared configuration from persisted player saves.

Monster reward code records a classified loot log after actual item credit. Enabled effects capture item name, quantity, classification, style and scene placement in an ordered combat event. Pending world-boss drops produce no notice; the final combined settlement produces one notice per credited item entry and cannot repeat. Purchases, crafting and GM grants do not call this path. Automatic card registration still counts as an acquired drop.

The scene consumes confirmed replay events, queues notices and deduplicates by sequence. A bounded 80-notice animation queue protects the UI during large bursts; the authoritative inventory, reward ledger and drop logs remain independent. Switching character/zone resets the overlay. Reloading does not replay historical drops. Hidden-page transitions clear visual queues. Name formatting uses plain React text, not HTML. Reduced-motion settings remove particle animation. Preview uses the same visual component and grants no inventory.

The shared GearName component, item detail classification, inventory cell borders and classified drop log colors reflect the configured rarity. Existing affix prefixes remain present.

Validation: TypeScript; test-loot-appearance.cjs (pure validation, actual monster/boss grants, authenticated endpoint, revision conflict, queue and sync checks); test-world-boss-loot.cjs; test-save-conflicts.cjs; test-gm-grant-conflicts.cjs; test-auto-spell-timing.cjs; test-combat-smoothness.cjs. Browser/iPhone visual interaction is not claimed when the browser-control skill is unavailable.
