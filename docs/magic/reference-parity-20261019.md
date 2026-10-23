# Magic rules correction — 2026-10-19

Reference: pp771007/idle-lineage-class commit 5f00f4a86389aaa7309c24d7a7c1ab060c47b500, js/00-data.js, 01-drops-config.js, 02-stats-recompute.js, 03-combat-core.js, 04-combat-attack.js, 06-status-allies.js, 07-skills-cast.js.

Scope: the four existing playable classes (knight, mage, elf, dark). Retain the current 3.81 equipment catalog, sprite presentation, and 90ms triple-arrow events.

- Align all existing spell definitions and add the 12 missing definitions available to these classes (135 total definitions including seven equipment-granted spells).
- Learn through an unlocked matching skillbook; remove the gold-without-book bypass. Add dark class common tier 1/2 at Lv12/Lv24.
- Select elf fire/water/wind/earth while stopped. Validate element at learning and casting; retain previously learned spells when changing element, and clear incompatible elemental buffs.
- Use element/target/damage dice from spell data, with per-segment magic damage, SP, elemental resistance, elemental counters and MR scaling. Status spells use d20 abnormal hit and boss control immunity.
- Classic healing follows INT dice bonuses rather than a tier formula. Group healing reaches living player, pets and summon-contract entities. Life spring restores missing HP. Per-skill 3/6/20s cooldowns coexist with the normal heal channel. Purification uses an independent channel and preserves beneficial buffs.
- HP-to-MP spells use their defined costs/gains. Mana drain requires a target and abnormal hit; keep the existing trained drain bonus. Dark critical spends half max HP and all MP, forces a heavy critical hit and applies remaining-MP scaling.
- Refresh automatic buffs every second. Implement no-refresh guards, periodic fire prison/blizzard storm, water vitality consumption/cooldown, absolute barrier and its post-effect cooldown, selected element resistance, load-up duration, level-based reduction armor, 30% holy barrier, poison resistance, dark burn/double probabilities, dark stealth/dodge consumption, mirror and counter barrier.
- Persist new clocks and elf element through the existing save serializer. Re-evaluate active legacy buff modifiers under corrected rules rather than keeping old inflated values.

Verification: TypeScript check; scripts/test-magic-reference.cjs; test-auto-spell-timing.cjs; test-manual-triple-latency.cjs; test-mastery.cjs; test-offline-catchup.cjs. The new tests exercise server actions, rejected-cast resource conservation, spellbook completeness, actual targets/HP/MP, long cooldown coexistence, periodic damage and automatic buff activation.

Remaining differences (do not claim complete parity): royal, illusion, dragon and warrior are not playable and their 50 exclusive definitions are not imported. The reference's 13 equipment/proc-only definitions are not added to the player spellbook; retain the separate weapon-proc catalog. Resurrection and dark stone refinement remain unsupported. Zombie/elemental summons retain the existing simplified companion implementation; summon-contract summoning retains its current independent entity system. The reference's justice/PvP, eight-class mastery, special item/set hooks, summon variants, poison mastery stacking and every regional teleport exception are not fully ported. This update is not a claim of 198-spell live-test parity.
