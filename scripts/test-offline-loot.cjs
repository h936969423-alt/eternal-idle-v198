const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'offline-income-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),sync=require(path.join(dir,'state-sync.js')),monster=require(path.join(dir,'monster-config.js')),gear=require(path.join(dir,'gear.js')),{baseItem}=gear,h=require(path.join(dir,'offline-hunt.js')),sample=require(path.join(dir,'offline-hunt-sample.js'));
function roundTrip(save){return JSON.parse(JSON.stringify(sync.persistedSave(save)));}

try{

function fixture(zone='training'){
 const now=1_000_000,s=e.emptySave(now),base=e.BASES.knight,allocation={};let left=base.pts;
 for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}
 e.action(s,{type:'create',name:'離線掉落測試',cls:'knight',gender:'m',allocation},now);
 const c=s.characters[0],mob=e.DATA.maps.training[0];c.lv=60;c.zone=zone;c.running=true;c.hp=e.stats(c,now).maxHp;c.gold=10000;c.autoSell=[];
 c.mapPools={[zone]:{enabled:true,count:5,respawnSeconds:5,entries:[{id:mob,enabled:true,weight:1}]}};
 c.monsterDefinitions={[mob]:{...monster.defaultMonster(mob),dropsMode:'custom',drops:[{item:'scroll_weapon',chance:100,min:2,max:2,enabled:true}]}};
 const profile=h.newHuntProfile(zone,sample.huntSetupKey(c),now);Object.assign(profile,{sampleMs:60000,kills:10,xp:100,gold:50,lastKillAt:now,minHpPct:zone==='dragon_valley'?0:1,mobs:{[mob]:10}});c.offlineHunt=[profile];
 return {s,c,mob,now,drop:c.monsterDefinitions[mob].drops[0]};
}
{
 const {s,c,now}=fixture(),before=c.bag.scroll_weapon||0,originalGold=c.gold,r=e.advance(s,now+300000,()=>.5);
 assert.equal(r.drops.scroll_weapon,70);assert.equal(c.bag.scroll_weapon,before+70);assert.equal(r.gold,175);assert.equal(c.gold,originalGold+175);
 assert.deepEqual(s.offlineIncome.drops,r.drops);assert.equal(r.kills,35,'offline kills follow the measured kill rate at 70%');
 const snapshot=JSON.stringify(sync.persistedSave(s)),retry=JSON.parse(snapshot);e.advance(retry,retry.at,()=>0);assert.equal(JSON.stringify(sync.persistedSave(retry)),snapshot,'retry cannot reroll or reaward');
 e.action(retry,{type:'offlineIncomeDismiss',id:retry.offlineIncome.id},retry.at);assert.equal(retry.characters[0].bag.scroll_weapon,before+70);assert.equal(retry.offlineIncome.drops.scroll_weapon,70);
}
for(const mode of ['zero','disabled']){
 const {s,c,now,drop}=fixture();if(mode==='zero')drop.chance=0;else drop.enabled=false;
 const before=c.bag.scroll_weapon||0,r=e.advance(s,now+300000,()=>.5);assert.equal(r.drops.scroll_weapon,undefined);assert.equal(c.bag.scroll_weapon||0,before);
}
for(const mode of ['town','boss','stopped','closed','subminute']){
 const {s,c,now}=fixture(mode==='town'?'town_silver_knight':mode==='boss'?'wb_sema':'training');
 if(mode==='stopped')c.running=false;if(mode==='closed')c.mapAccess={revision:1,closed:{training:1},changes:{}};
 const before=c.bag.scroll_weapon||0,r=e.advance(s,now+(mode==='subminute'?59000:300000),()=>.5);
 assert.equal(r.drops.scroll_weapon,undefined,mode);assert.equal(c.bag.scroll_weapon||0,before,mode);
}
{
 const {s,c,now}=fixture('dragon_valley'),r=e.advance(s,now+3600000,()=>0);assert.equal(r.isDead,true);assert.deepEqual(r.drops,{});assert.equal(c.running,false);
}
{
 const {s,c,now,drop}=fixture(),item=e.DATA.items.scroll_weapon,old=item.availFrom;item.availFrom=now+180000;
 try{const r=e.advance(s,now+300000,()=>.5);assert.equal(r.drops.scroll_weapon,28,'availability checked at the available fraction of the offline interval');}finally{if(old===undefined)delete item.availFrom;else item.availFrom=old;}
}
{
 const {s,c,now,drop}=fixture(),id=Object.keys(e.DATA.items).find(id=>gear.canAutoSell(id)&&e.DATA.items[id].type==='wpn'&&!Object.values(c.equipment).some(x=>baseItem(x.id)===id)&&!e.DATA.items[id].availFrom);
 assert(id);drop.item=id;c.autoSell=[id];const before=c.gold,quantity=c.bag[id]||0,price=Math.floor(e.DATA.items[id].sellP??e.DATA.items[id].p*.25);
 const r=e.advance(s,now+300000,()=>.5);assert.equal(r.drops[id],70);assert.equal(c.bag[id]||0,0);assert.equal(c.gold-before,175+(quantity+70)*price);assert.equal(r.gold,c.gold-before);assert.equal(s.offlineIncome.drops[id],70);
}
{
 const {s,c,now,drop}=fixture(),id=Object.keys(e.DATA.items).find(id=>e.DATA.items[id].eff==='dollCard'&&e.DATA.items[id].cardTier===1);
 assert(id);drop.item=id;const item=e.DATA.items[id],before=c.dollCardDex?.[item.cardMob]||0,r=e.advance(s,now+300000,()=>.5);
 assert.equal(r.drops[id],70);assert.equal(c.dollCardDex[item.cardMob],Math.min(100,before+70));assert.equal(s.offlineIncome.drops[id],70);
}
{
 const {s,c,now}=fixture();c.bag.arrow=(c.bag.arrow||0)+2;s.catchup={seconds:120,kills:7,gold:9,xp:33,drops:{arrow:2},characterId:c.id,characterName:c.name};
 const before=c.bag.arrow,r=e.advance(s,now+120000,()=>.5);assert.equal(r.drops.arrow,2);assert.equal(r.drops.scroll_weapon,28);assert.equal(c.bag.arrow,before,'legacy items are not granted twice');
}
{
 const {s,c,now}=fixture(),before=c.bag.scroll_weapon||0,start=performance.now(),r=e.advance(s,now+48*3600000,()=>.5),elapsed=performance.now()-start;
 assert.equal(r.seconds,43200);assert.equal(r.drops.scroll_weapon,10080);assert.equal(c.bag.scroll_weapon,before+10080);assert(elapsed<1500,'12h drop settlement remains bounded');console.log('12-hour loot settlement:',elapsed.toFixed(1),'ms');
}
console.log('PASS: offline loot enters inventory and receipt; custom rates, exclusions, death, future availability, autosell, card registration, legacy receipts, retries and 12h cap verified.');

}finally{fs.rmSync(dir,{recursive:true,force:true});}

