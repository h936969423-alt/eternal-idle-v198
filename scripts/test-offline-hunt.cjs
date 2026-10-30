const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'measured-offline-'));
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const p=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(p,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const h=require(path.join(dir,'offline-hunt.js')),e=require(path.join(dir,'engine.js')),sample=require(path.join(dir,'offline-hunt-sample.js'));
 const now=1000000,p=h.newHuntProfile('training','test',now);Object.assign(p,{sampleMs:60000,kills:10,xp:1000,gold:100,lastKillAt:now,mobs:{test:10}});
 const safe={hp:100,maxHp:100,potions:{},gold:100};
 assert.equal(h.planOfflineHunt(p,59,safe,()=>.5).xp,0);
 const hour=h.planOfflineHunt(p,3600,safe,()=>.5);assert.equal(hour.xp,42000);assert.equal(hour.gold,4200);assert.equal(hour.kills,420);assert.equal(hour.activeSeconds,3600);
 const cap=h.planOfflineHunt(p,25*3600,safe,()=>.5);assert.equal(cap.seconds,43200);assert.equal(cap.xp,504000);assert.equal(cap.kills,5040);
 assert(h.eligibleHunt(p,'training','test',now));assert(!h.eligibleHunt(p,'other','test',now));assert(!h.eligibleHunt(p,'training','changed',now));assert(!h.eligibleHunt(p,'training','test',now+300001));
 const thirsty={...p,damage:600,healing:600,potionHealing:600,potions:{potion:10}};
 const plan=h.planOfflineHunt(thirsty,3600,{...safe,potions:{potion:{stock:10,price:5,buy:true}}},()=>.99);
 assert.equal(plan.isDead,true);assert.equal(plan.potions.potion.used,26);assert.equal(plan.potions.potion.bought,16);assert.equal(plan.potionCost,80);assert(Math.abs(plan.combatSeconds-166)<1e-7);
 const budget=h.planOfflineHunt({...thirsty,potions:{a:10,b:10}},3600,{...safe,potions:{a:{stock:0,price:5,buy:true},b:{stock:0,price:5,buy:true}}},()=>.99);assert(budget.potionCost<=80);
 const lethal=h.planOfflineHunt({...p,minHpPct:0},3600,safe,()=>0);assert.equal(lethal.isDead,true);assert.equal(lethal.kills,0);
 function fixture(){const s=e.emptySave(now),base=e.BASES.knight,allocation={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}e.action(s,{type:'create',name:'實測收益',cls:'knight',gender:'m',allocation},now);const c=s.characters[0];c.lv=60;c.attrs.con=40;c.attrs.str=40;c.gold=1000000;c.bag.potion_heal=100000;c.autoSell=[];c.hp=e.stats(c,now).maxHp;e.action(s,{type:'run',value:true},now);return {s,c};}
 const fresh=fixture(),empty=e.advance(fresh.s,now+3600000,()=>.5);assert.equal(empty.xp,0);assert.match(empty.reason,/實戰紀錄不足/);assert.equal(fresh.s.offlineIncome.reason,empty.reason);
 const {s,c}=fixture();e.advance(s,s.at+15000,()=>.5);e.advance(s,s.at+15000,()=>.5);
 const measured=structuredClone(sample.huntProfile(c));assert(measured.kills>=3);assert.equal(measured.sampleMs,30000);assert(measured.xp>0);assert(Object.keys(measured.mobs).length>0);
 // Actual server combat, not fixture rates, determines the next offline reward.
 const expected=h.planOfflineHunt(measured,3600,{hp:c.hp,maxHp:e.stats(c,s.at).maxHp,potions:Object.fromEntries(Object.keys(measured.potions).map(id=>[id,{stock:c.bag[id]||0,price:e.DATA.items[id]?.p||0,buy:true}])),gold:c.gold},()=>.99);
 const result=e.advance(s,s.at+3600000,()=>.99);assert.equal(result.xp,expected.xp);assert.equal(result.kills,expected.kills);assert.equal(result.potionCost,expected.potionCost);assert.equal(result.grossGold-result.potionCost,result.gold);
 const stored=JSON.stringify(s),receipt=s.offlineIncome.id;e.advance(s,s.at,()=>0);assert.equal(JSON.stringify(s),stored);assert.equal(s.offlineIncome.id,receipt);
 const changed=fixture();e.advance(changed.s,now+15000,()=>.5);e.advance(changed.s,now+30000,()=>.5);changed.c.attrs.str++;const invalid=e.advance(changed.s,changed.s.at+3600000,()=>.99);assert.equal(invalid.xp,0);assert.match(invalid.reason,/實戰紀錄不足/);
 const speed=fixture(),mob=e.DATA.maps.training[0];speed.c.mapPools={training:{enabled:true,count:5,respawnSeconds:5,entries:[{id:mob,enabled:true,weight:1}]}};speed.c.monsterDefinitions={[mob]:{...require(path.join(dir,'monster-config.js')).defaultMonster(mob),dropsMode:'custom',drops:[{item:'scroll_weapon',chance:100,min:2,max:2,enabled:true}]}};
 const start=performance.now(),loot=e.settleOfflineLoot(speed.c,1000000,()=>.5,now,{...p,mobs:{[mob]:1}});assert.equal(loot.drops.scroll_weapon,2000000);assert(performance.now()-start<1500);
 console.log('PASS: measured combat rates, 70%, 12h, eligibility, setup changes, stock/budget exhaustion, death cutoff, receipts/retries, and one-million-kill batch loot.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
