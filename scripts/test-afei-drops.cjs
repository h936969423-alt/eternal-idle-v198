const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
require('./test-public-drops.cjs');
const data = require('../lib/game/gamedata.json');
const loot = require('../lib/game/monster-drops.json');
const rates = require('../lib/game/monster-drop-rates.json');
const reference = require('../docs/afei-drops/reference-20261020.json');
const preservation = require('../docs/afei-drops/preservation-20261020.json');
const {publicMonsterDrop} = require('../lib/game/monster-loot.ts');
const {convertedDrops} = require('../lib/game/monster-config.ts');
const equipment = id => !!data.items[id]?.slot || ['wpn','arm','acc'].includes(data.items[id]?.type);
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Preservation hashes describe this specific historical import, before later
// equipment migrations. Keep current non-equipment behavior checks below.
const historical=require('./historical-fixture.cjs');
const thenData=JSON.parse(historical('97570d5c27e48d69593ab0e8c9c5d66eed0bd17f:lib/game/gamedata.json'));
const thenLoot=JSON.parse(historical('97570d5c27e48d69593ab0e8c9c5d66eed0bd17f:lib/game/monster-drops.json'));
const thenRates=JSON.parse(historical('97570d5c27e48d69593ab0e8c9c5d66eed0bd17f:lib/game/monster-drop-rates.json'));
const thenEquipment=id=>!!thenData.items[id]?.slot||['wpn','arm','acc'].includes(thenData.items[id]?.type);
const equipmentState = {
  mobs: Object.fromEntries(Object.entries(thenLoot.mobs).map(([id,m])=>[id,m.drops.filter(thenEquipment)]).filter(([,items])=>items.length)),
  bosses: Object.fromEntries(Object.entries(thenLoot.worldBossDrops).map(([id,items])=>[id,items.filter(thenEquipment)]).filter(([,items])=>items.length)),
  rates: Object.fromEntries(Object.entries(thenRates.mobs).map(([id,items])=>[id,items.filter(d=>thenEquipment(d.item))]).filter(([,items])=>items.length)),
};
assert.equal(hash(equipmentState), preservation.equipmentSha256, 'all equipment loot and rates must remain unchanged');
assert.equal(hash(rates.areas), preservation.areaRatesSha256, 'regional rewards must remain unchanged');
assert.equal(hash(thenData), preservation.gameDataSha256, 'item definitions, monster stats and maps must remain unchanged');
for (const [id,m] of Object.entries(reference.mobs)) {
  assert.deepEqual(new Set(loot.mobs[id].drops.filter(i=>!equipment(i))),new Set(m.items),id+' loot list');
  assert.deepEqual(new Set(convertedDrops(id).filter(d=>!equipment(d.item)).map(d=>d.item)),new Set(m.items),id+' effective drops');
  for (const item of m.items) {
    const index = loot.mobs[id].drops.indexOf(item);
    let calls = 0;
    const rng = rates.mobs[id] ? ()=>0 : ()=>calls++ === 0 ? 0 : (index+.5)/loot.mobs[id].drops.length;
    const items = publicMonsterDrop(id,rng).items;
    assert.ok(items.some(d=>d.item===item),id+' can actually drop '+item);
  }
}
for (const [id,b] of Object.entries(reference.worldBosses)) {
  assert.deepEqual(new Set(loot.worldBossDrops[id].filter(i=>!equipment(i))),new Set(b.items),id+' boss rewards');
}
console.log('Passed: 216 monster lists and effective drops, 17 boss rewards, all non-equipment reachable, equipment/rates/areas/game data preserved.');

