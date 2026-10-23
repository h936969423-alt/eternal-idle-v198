const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'eternal-night-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),gm=require(path.join(dir,'gm-grants.js')),options=require(path.join(dir,'gm-item-options.js')),magic=require(path.join(dir,'weapon-magic.js')),affix=require(path.join(dir,'affix-rules.js')),gear=require(path.join(dir,'gear.js')),sync=require(path.join(dir,'state-sync.js')),id='wpn_eternal_night_dual',item=e.DATA.items[id],now=1000000;
function character(cls='dark'){const b=e.BASES[cls],a={};let left=b.pts;for(const key of ['str','dex','con','int','wis','cha']){a[key]=Math.min(left,20-b[key]);left-=a[key];}return e.createCharacter('武器測試',cls,'m',a,now);}
try{
 assert.deepEqual([item.n,item.req,item.wcat,item.dmgS,item.dmgL,item.hit,item.str,item.dex,item.safe],['永夜雙刀','dark','雙刀',200,200,5,100,100,6]);
 assert.ok(options.weaponOptions.some(i=>i.id===id));assert.ok(item.noShop&&item.gachaWeight===0&&item._noGacha&&item.p===0);assert.ok(!(item.p>0&&!item.noSell&&!item.source),'excluded from generic equipment drops');
 const art=require(path.join(dir,'asset-map.json'));assert.equal(art.icons.items[item.n],art.icons.items['黑暗雙刀']);assert.ok(fs.existsSync(path.join(root,'public',item.sourceIcon)));
 assert.ok(!Object.values(e.DATA.maps).flat().includes(id));
 const c=character(),s=e.emptySave(now);s.characters=[c];s.active=c.id;const before=e.stats(c,now);gm.applyGrant(s,gm.validateGrant({characterId:c.id,type:'weapon',itemId:id,quantity:1,enhancement:0}),now);e.action(s,{type:'equip',item:id},now);const after=e.stats(c,now);assert.equal(after.str-before.str,100);assert.equal(after.dex-before.dex,100);assert.equal(c.equipment.weapon.id,id);assert.equal(e.usable(c,item),true);for(const cls of ['knight','elf','mage'])assert.equal(e.usable(character(cls),item),false);
 c.mp=0;c.skills=[];for(const en of [0,6,12,100]){c.enh[id]=en;c.equipment.weapon.en=en;assert.equal(magic.triggeredWeaponMagic(c,()=>.099999).skill,'sk_blaze');assert.equal(magic.triggeredWeaponMagic(c,()=>.1),null);assert.equal(magic.triggeredWeaponMagic(c,()=>.999),null);}assert.equal(c.mp,0);assert.ok(affix.weaponHasTriggeredSkill(item,id));
 // Exercise the actual battle loop with a durable world boss and deterministic randomness.
 c.enh[id]=0;c.equipment.weapon.en=0;c.zone='wb_sema';c.running=true;c.autoSkills=[];c.lv=99;c.hp=e.stats(c,now).maxHp;c.mp=0;e.ensureArena(c,()=>.5,now);const oldHp=c.arena[0].hp;
 let n=37;const rng=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};for(let second=1;second<=30;second++)e.advance(s,now+second*1000,rng);const proc=c.events.filter(x=>x.skill==='sk_blaze');assert.ok(proc.some(x=>x.kind==='magic'&&x.effectName==='烈炎術'));assert.ok(proc.some(x=>x.kind==='attack'&&x.source==='magic'&&x.damage>0));assert.ok(c.arena[0].hp<oldHp);assert.ok(!c.skills.includes('sk_blaze'));
 const cues=require(path.join(dir,'animation-cues.js'));
 assert.ok(proc.every(x=>x.weaponProc),'all weapon magic visuals and damage are tagged');
 assert.deepEqual(cues.playerCues(proc),[],'weapon magic never starts a player pose');
 const physical=c.events.find(x=>x.kind==='attack'&&x.source==='physical'&&!x.skill);assert.ok(physical);assert.equal(cues.playerCues([physical])[0].kind,'attack','normal swing remains');
 assert.equal(cues.playerCues([{...proc[0],weaponProc:undefined}])[0].kind,'skill','ordinary spell still animates');
 assert.ok(cues.monsterCues(proc,c.arena[0].uid).some(x=>x.kind==='hurt'),'weapon magic still animates monster damage');
 const restored=JSON.parse(JSON.stringify(sync.persistedSave(s)));assert.equal(restored.characters[0].equipment.weapon.id,id);
 assert.throws(()=>e.action(s,{type:'buy',item:id,n:1},s.at),/購買/);c.bag.scroll_weapon=10;assert.equal(gear.enhancementInfo(c,id,'safe').need,6);
 const other=character(),bow=Object.keys(e.DATA.items).find(k=>e.DATA.items[k].type==='wpn'&&e.DATA.items[k].isBow);other.equipment.weapon={id:bow,en:0};other.affixes={[bow]:{key:'families',name:'',value:0,element:{element:'fire',tier:5},attrMagic:'sk_blaze',attrMagicStar:1}};assert.equal(magic.triggeredWeaponMagic(other,()=>0).skill,'sk_blaze','existing affix magic remains active');
 console.log('PASS: exact weapon stats; black-elf restriction; GM grant/equip; reused art; fixed 10% proc at +0/+6/+12/+100; real fire damage and animation events without learning; save persistence; safe +6; shop/drop/gacha exclusion; existing affix magic.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
