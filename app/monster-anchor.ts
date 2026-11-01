// The element effects, projectiles, pets and summons aim at: the drawn sprite when there is one
// (ordinary monsters draw at native size inside a larger slot), otherwise the whole art slot.
export const MONSTER_ANCHOR=':is(.four-monster-art:not(:has(>.sequence-art)),.four-monster-art>.sequence-art)';
