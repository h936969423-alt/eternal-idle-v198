const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/magic-rules-');fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),r=require(path.join(dir,'spell-rules.js')),book=require(path.join(dir,'skill-book.js')),npc=require(path.join(dir,'npc-config.js')),teacher=require(path.join(dir,'npc-magic.js')),t=1000000;
function fixture(cls='mage'){const b=e.BASES[cls],allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}const c=e.createCharacter('魔法稽核',cls,'m',allocation,t);c.lv=80;c.attrs.wis=80;c.hp=e.stats(c,t).maxHp;c.mp=e.stats(c,t).maxMp;c.autoPotion=false;const save=e.emptySave(t);save.characters=[c];save.active=c.id;return {c,save};}

try {
 const stock=teacher.gilenBookStock();assert.equal(Object.keys(stock).length,24);
 const tiers={1:0,2:0,3:0};for(const [id,price] of Object.entries(stock)){const item=e.DATA.items[id],s=e.DATA.skills[item.sk];assert.equal(price,2000);assert.equal(item.type,'skillbk');assert.ok(s.reqM!==undefined);assert.ok([1,2,3].includes(s.tier));tiers[s.tier]++;}assert.deepEqual(tiers,{1:8,2:8,3:8});
 assert.deepEqual(npc.merchantInventory(teacher.GILEN_ZONE,teacher.GILEN_ID),stock);assert.equal(npc.findNpc(teacher.GILEN_ZONE,teacher.GILEN_ID).type,'shop');
 let {c,save}=fixture();c.zone=teacher.GILEN_ZONE;c.skills=[];c.bag={};c.gold=10000;
 const item='bk_heal1',buy={type:'buy',npc:teacher.GILEN_ID,item,n:1,price:0};
 e.action(save,buy,t);assert.equal(c.gold,8000,'client-supplied price is ignored');assert.equal(c.bag[item],1);assert.ok(!c.skills.includes('sk_heal1'),'purchase adds a book rather than teaching');
 e.action(save,{type:'useItem',item},t);assert.ok(c.skills.includes('sk_heal1'));assert.equal(c.bag[item]||0,0);assert.equal(c.gold,8000);
 e.action(save,{...buy,n:2},t);assert.equal(c.gold,4000);assert.equal(c.bag[item],2);
 c.gold=1999;assert.throws(()=>e.action(save,buy,t),/金幣不足/);assert.equal(c.gold,1999);assert.equal(c.bag[item],2);
 c.gold=10000;for(const bad of [{item:r.skillBooks('sk_blaze')[0][0]},{item:r.skillBooks('sk_elf_triple')[0][0]},{item:'__proto__'},{n:0},{n:1.2},{n:1001}]){assert.throws(()=>e.action(save,{...buy,...bad},t));assert.equal(c.gold,10000);assert.equal(c.bag[item],2);}
 c.zone='town_silver_knight';assert.throws(()=>e.action(save,buy,t),/沒有販售/);assert.equal(c.gold,10000);c.zone=teacher.GILEN_ZONE;
 c.npcConfig=npc.updateNpcConfig(npc.initialNpcConfig(),{action:'visibility',zone:c.zone,npc:teacher.GILEN_ID,visible:false},'gm',t);assert.throws(()=>e.action(save,buy,t),/沒有販售/);assert.equal(c.gold,10000);
 c.npcConfig=npc.updateNpcConfig(c.npcConfig,{action:'visibility',zone:c.zone,npc:teacher.GILEN_ID,visible:true},'gm',t);
 c.npcConfig=npc.updateNpcConfig(c.npcConfig,{action:'updateNpc',zone:c.zone,npc:teacher.GILEN_ID,name:'新吉倫',title:'老師',description:'販售',function:'skill'},'gm',t);assert.equal(npc.findNpc(c.zone,teacher.GILEN_ID,c.npcConfig).type,'shop','legacy GM profile now resolves to book shop');assert.deepEqual(npc.merchantInventory(c.zone,teacher.GILEN_ID,c.npcConfig),stock);e.action(save,buy,t);assert.equal(c.gold,8000);
 c.npcConfig=npc.updateNpcConfig(c.npcConfig,{action:'updateNpc',zone:c.zone,npc:teacher.GILEN_ID,name:'新吉倫',title:'老師',description:'說明',function:'info'},'gm',t);assert.throws(()=>e.action(save,buy,t),/沒有販售/);
 assert.throws(()=>e.action(save,{type:'learn',npc:teacher.GILEN_ID,skill:'sk_shield'},t),/吉倫/);
 ({c,save}=fixture('knight'));c.zone=teacher.GILEN_ZONE;c.skills=[];c.bag={};c.gold=2000;const book2=r.skillBooks('sk_antidote')[0][0];e.action(save,{...buy,item:book2},t);assert.equal(c.gold,0);assert.equal(c.bag[book2],1);assert.throws(()=>e.action(save,{type:'useItem',item:book2},t),/職業或等級/);assert.equal(c.bag[book2],1);

 ({c,save}=fixture('elf'));c.zone=teacher.GILEN_ZONE;c.skills=[];c.bag={};c.gold=10000;c.lv=8;
 const learn={type:'learn',npc:teacher.GILEN_ID,skill:'sk_heal1',price:0};
 e.action(save,learn,t);assert.equal(c.gold,8000,'NPC learning uses the server price');assert.ok(c.skills.includes('sk_heal1'));assert.deepEqual(c.bag,{},'direct learning needs no book and grants no duplicate book');
 assert.throws(()=>e.action(save,learn,t),/已學會/);assert.equal(c.gold,8000,'repeated/duplicate learning never charges twice');
 c.gold=1999;assert.throws(()=>e.action(save,{...learn,skill:'sk_shield'},t),/金幣不足/);assert.equal(c.gold,1999);assert.ok(!c.skills.includes('sk_shield'));
 c.gold=10000;assert.throws(()=>e.action(save,{...learn,skill:'sk_antidote'},t),/等級需求/);assert.equal(c.gold,10000);
 c.lv=80;assert.throws(()=>e.action(save,{...learn,skill:'sk_blaze'},t),/1～3/);assert.equal(c.gold,10000);
 assert.throws(()=>e.action(save,{...learn,npc:'npc_linda',skill:'sk_shield'},t),/吉倫/);assert.equal(c.gold,10000);
 c.zone='town_silver_knight';assert.throws(()=>e.action(save,{...learn,skill:'sk_shield'},t),/吉倫/);assert.equal(c.gold,10000);c.zone=teacher.GILEN_ZONE;
 c.npcConfig=npc.updateNpcConfig(npc.initialNpcConfig(),{action:'visibility',zone:c.zone,npc:teacher.GILEN_ID,visible:false},'gm',t);assert.throws(()=>e.action(save,{...learn,skill:'sk_shield'},t),/沒有販售/);assert.equal(c.gold,10000);
 c.npcConfig=npc.initialNpcConfig();c.npcConfig=npc.updateNpcConfig(c.npcConfig,{action:'upsertItem',zone:c.zone,npc:teacher.GILEN_ID,item:'bk_shield',price:125},'gm',t);e.action(save,{...learn,skill:'sk_shield'},t);assert.equal(c.gold,9875,'GM price overrides stay authoritative');
 c.npcConfig=npc.updateNpcConfig(c.npcConfig,{action:'removeItem',zone:c.zone,npc:teacher.GILEN_ID,item:'bk_sunlight'},'gm',t);assert.throws(()=>e.action(save,{...learn,skill:'sk_sunlight'},t),/沒有販售/);assert.equal(c.gold,9875);
 ({c,save}=fixture('knight'));c.zone=teacher.GILEN_ZONE;c.skills=[];c.bag={};c.gold=10000;assert.throws(()=>e.action(save,{...learn,skill:'sk_antidote'},t),/職業或等級/);assert.equal(c.gold,10000);
 assert.deepEqual(teacher.gilenBookIds().slice(0,8).map(id=>e.DATA.items[id].sk),['sk_heal1','sk_sunlight','sk_shield','sk_lightarrow','sk_teleport','sk_icearrow','sk_windblade','sk_holy_wpn']);
 
 const customId='gm_npc_f8883be777664a43b19c48321820974f',customZone='town_silver_knight';
 const custom=npc.initialNpcConfig();custom.custom[customZone]=[{id:customId,n:'吉倫',title:'魔法學習',d:'',type:'skill'}];
 assert.equal(npc.findNpc(customZone,customId,custom).type,'shop');assert.ok(teacher.isGilenTeacher(customZone,npc.findNpc(customZone,customId,custom)));assert.deepEqual(npc.merchantInventory(customZone,customId,custom),stock);
 ({c,save}=fixture('elf'));c.zone=customZone;c.npcConfig=custom;c.skills=[];c.bag={};c.gold=10000;
 e.action(save,{type:'learn',npc:customId,skill:'sk_shield'},t);assert.ok(c.skills.includes('sk_shield'));assert.equal(c.gold,8000);
 assert.throws(()=>e.action(save,{type:'learn',npc:customId,skill:'sk_shield'},t),/已學會/);assert.equal(c.gold,8000);
 c.zone=teacher.GILEN_ZONE;assert.throws(()=>e.action(save,{type:'learn',npc:customId,skill:'sk_sunlight'},t),/目前村莊/);assert.equal(c.gold,8000);c.zone=customZone;
 c.npcConfig=npc.updateNpcConfig(custom,{action:'visibility',zone:customZone,npc:customId,visible:false},'gm',t);assert.throws(()=>e.action(save,{type:'learn',npc:customId,skill:'sk_sunlight'},t),/沒有販售/);assert.equal(c.gold,8000);
 assert.ok(!teacher.isGilenTeacher('town_silent',npc.findNpc('town_silent','npc_saedia')),'other teachers keep their original service');
  const publicMirror=path.join(root,'public/gamedata.json');if(fs.existsSync(publicMirror)){const publicRaw=JSON.parse(fs.readFileSync(publicMirror));assert.deepEqual(publicRaw.towns.town_talking.npcs.find(n=>n.id===teacher.GILEN_ID),npc.findNpc(teacher.GILEN_ZONE,teacher.GILEN_ID));}
 console.log('PASS: Gilen sells 24 general spellbooks (8 per tier), 2000 gold each; direct learning, duplicate/no-book guards, level/class/tier checks; authoritative GM/single/bulk prices; atomic insufficient-gold failures; book delivery/use and class checks; wrong-town, hidden/service guards; legacy GM profile compatibility.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}

