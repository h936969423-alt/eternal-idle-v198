const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'pet-lure-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),{lureAvailability}=require(path.join(dir,'pet-lure-availability.js')),roster=require(path.join(dir,'pet-roster.js')),t=1000000;
 // Default world: dogs, wolves and bears spawn; the rest of the general list does not.
 const general=lureAvailability('general',{},t);
 assert.deepEqual(general.available.map(x=>x.mob).sort(),['哈士奇','杜賓狗','牧羊犬','熊','狼'].sort());
 assert.ok(general.missing.includes('貓')&&general.missing.includes('柯利'));
 assert.ok(general.available.find(x=>x.mob==='狼').zones.includes('說話之島周邊'));
 for(const key of ['rabbit','tiger','kangaroo','panda','monkey','korea'])assert.equal(lureAvailability(key,{},t).available.length,0,key);
 // A closed map no longer counts; a GM pool that adds a cat makes it catchable.
 const raw=require(path.join(dir,'gamedata.json'));
 const allClosed={revision:1,closed:Object.fromEntries(Object.keys(raw.maps).map(z=>[z,1])),changes:{}};
 assert.equal(lureAvailability('general',{mapAccess:allClosed},t).available.length,0);
 const zone=Object.keys(raw.maps).find(z=>!raw.towns[z]&&raw.maps[z].length);
 const custom={c1:{custom:{name:'貓'}}};assert.ok(lureAvailability('general',{mapPools:{[zone]:{enabled:true,count:3,respawnSeconds:5,respawnRulesVersion:2,layoutVersion:3,entries:[{id:'c1',weight:1,enabled:true}]}},monsterDefinitions:custom},t).available.some(x=>x.mob==='貓'));
 // Meat now grants the general lure, and a wolf kill with it captures a pet.
 const base=e.BASES.knight,allocation={};let points=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(points,20-base[k]);points-=allocation[k];}
 const c=e.createCharacter('誘捕','knight','m',allocation,t);c.bag.new_item_143=1;
 e.potion(c,'new_item_143',t);assert.equal(c.bag.new_item_143,undefined);assert.equal(c.buffs.sunrise_pet_lure_general.until,t+300000);
 assert.ok(c.buffs.new_item_143===undefined,'old placeholder buff is gone');
 const pet=roster.capturePet(c,'狼',t+1000);assert.ok(pet,'wolf captured');assert.equal(c.buffs.sunrise_pet_lure_general,undefined);
 // A longer potion lure is not shortened by meat.
 c.buffs.sunrise_pet_lure_general={until:t+600000,d:{}};c.bag.new_item_143=1;e.potion(c,'new_item_143',t);assert.equal(c.buffs.sunrise_pet_lure_general.until,t+600000);
 // Lures with nothing to catch cannot be bought.
 c.zone='town_silver_knight';c.gold=1e6;const s={v:1,at:t,characters:[c],active:c.id};
 assert.throws(()=>e.action(s,{type:'petBuy',item:'sunrise_pet_lure_rabbit'},t),/沒有可誘捕/);
 e.action(s,{type:'petBuy',item:'sunrise_pet_lure_general'},t);assert.equal(c.bag.sunrise_pet_lure_general,1);
 console.log('PASS pet lure: availability by map/GM pool/closure, meat grants general lure and captures, unavailable lures not sold');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
