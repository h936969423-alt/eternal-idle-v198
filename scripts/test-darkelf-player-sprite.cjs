// The Dark Elf class uses the original player dark elf art (玩家男黑暗妖精: red cape, two blades),
// not the 黑暗精靈 polymorph archer, in battle and in town. Frames are mirrored to face the monsters.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),frames=require('../lib/game/asset-map.json').frames,meta=require('../lib/game/combat-animation.json')['玩家男黑暗妖精'].root;
for(const kind of ['idle','attack','skill','hurt','death']){
 const list=frames[`darkelf_player/${kind}`];assert.ok(Array.isArray(list),kind);assert.equal(list.length,meta[kind].body.count,kind+' frame count');
 for(const src of list){assert.ok(src.startsWith('/assets/sprites/darkelf_player/'));const file=path.join(root,'public',src);assert.ok(fs.existsSync(file),src);const b=fs.readFileSync(file);assert.equal(b.toString('ascii',1,4),'PNG');assert.equal(b.readUInt32BE(16),meta[kind].body.w);assert.equal(b.readUInt32BE(20),meta[kind].body.h);}
}
const sprite=fs.readFileSync(path.join(root,'app/combat-sprite.tsx'),'utf8'),walker=fs.readFileSync(path.join(root,'app/town-walker.tsx'),'utf8');
assert.ok(sprite.includes(":'darkelf_player',"),'battle uses the player dark elf');assert.ok(!sprite.includes(":'darkelf',"),'not the 黑暗精靈 polymorph art');
assert.ok(walker.includes("'darkelf_player/idle'"),'town uses the player dark elf');
// The 黑暗精靈 polymorph keeps its own art.
assert.ok(frames['darkelf/idle']?.length&&frames['darkelf/attack']?.length);
console.log('PASS dark elf class sprite: original player art in battle and town (idle 13, attack 8, skill 7, hurt 2, death 15), 黑暗精靈 polymorph unchanged');
