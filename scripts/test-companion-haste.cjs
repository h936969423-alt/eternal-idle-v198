const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'companion-haste-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),h=require(path.join(dir,'companion-haste.js')),roster=require(path.join(dir,'pet-roster.js')),status=require(path.join(dir,'active-status.js')),t=1000000;
 function make(){const base=e.BASES.knight,al={};let p=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-base[k]);p-=al[k];}const c=e.createCharacter('綠水','knight','m',al,t);c.lv=60;c.attrs.cha=60;c.attrs.con=10000;c.hp=e.stats(c,t).maxHp;c.autoPotion=false;c.zone='training';e.ensureArena(c,()=>.5,t);return {c,s:{v:1,at:t,characters:[c],active:c.id}};}
 // Without companions the potion is refused and nothing is spent.
 let {c,s}=make();c.gold=1000;assert.throws(()=>e.action(s,{type:'companionHaste',kind:'pet'},t),/沒有出戰中的寵物/);assert.equal(c.gold,1000);
 assert.throws(()=>e.action(s,{type:'companionHaste',kind:'summon'},t),/沒有出戰中的召喚物/);
 // With a pet: bag potion first, then gold; refresh not stack; player stats untouched.
 const pet=roster.acquirePet(c,'狼',t);e.action(s,{type:'petSummon',pet:pet.id||Object.keys(c.pets)[0]},t);
 assert.ok((c.petActives||[]).length>0,'pet deployed');
 const before=e.stats(c,t).attackInterval;c.bag.potion_haste=1;e.action(s,{type:'companionHaste',kind:'pet'},t);
 assert.equal(c.bag.potion_haste,undefined);assert.equal(c.gold,1000);assert.equal(h.companionHasteUntil(c,'pet'),t+h.COMPANION_HASTE_MS);
 e.action(s,{type:'companionHaste',kind:'pet'},t+1000);assert.equal(c.gold,1000-h.COMPANION_HASTE_PRICE);assert.equal(h.companionHasteUntil(c,'pet'),t+1000+h.COMPANION_HASTE_MS,'refreshes');
 assert.equal(e.stats(c,t+2000).attackInterval,before,'player attack speed unchanged');
 assert.ok(!status.activeStatuses(c,t+2000).some(x=>x.id.startsWith('companion_haste_')),'not shown as a player buff');
 c.gold=0;assert.throws(()=>e.action(s,{type:'companionHaste',kind:'pet'},t+3000),/金幣不足/);
 assert.equal(h.companionHasteFactor(c,'pet',t+2000),1.33);assert.equal(h.companionHasteFactor(c,'pet',t+1000+h.COMPANION_HASTE_MS),1);
 // Real combat against monsters that cannot die (player stunned): a hasted pet attacks about 33% more often.
 function petHits(haste){const {c,s}=make();const p=roster.acquirePet(c,'狼',t);e.action(s,{type:'petSummon',pet:p.id||Object.keys(c.pets)[0]},t);c.running=true;c.buffs.status_stun={until:t+10e6,d:{stun:1}};for(const m of c.arena){m.hp=1e9;m.maxHp=1e9;}if(haste)c.buffs.companion_haste_pet={until:t+10e6,d:{}};const seen=new Map();for(let i=0;i<60;i++){e.advance(s,s.at+1000,()=>.5);for(const x of c.events||[])seen.set(x.seq,x);}return [...seen.values()].filter(x=>x.kind==='attack'&&x.source==='pet').length;}
 const slow=petHits(false),fast=petHits(true);assert.ok(slow>5,'pet attacks: '+slow);assert.ok(fast/slow>1.2&&fast/slow<1.45,`hasted ${fast} vs ${slow}`);
 // Auto renew while hunting, paying gold when the bag is empty.
 ({c,s}=make());const p2=roster.acquirePet(c,'狼',t);e.action(s,{type:'petSummon',pet:p2.id||Object.keys(c.pets)[0]},t);c.running=true;c.gold=500;
 e.action(s,{type:'companionHasteAuto',kind:'pet',value:true},t);e.advance(s,s.at+1000,()=>.5);assert.ok(h.companionHasteUntil(c,'pet')>t,'auto applied');assert.equal(c.gold>=500-h.COMPANION_HASTE_PRICE-1,true);
 console.log(`PASS companion haste: refused without companions, bag then gold, refresh, player untouched, pet attacks ${slow}→${fast} in 60s, auto renew`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
