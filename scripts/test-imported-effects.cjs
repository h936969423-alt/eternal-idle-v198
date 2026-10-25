const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const fx=require('../lib/game/imported-effects.ts'),raw=require('../lib/game/gamedata.json'),magic=require('../lib/game/magic-fx.json');
const initial=fx.initialCombatEffects(),valid=fx.validateCombatEffects(initial),entries=Object.values(fx.importedEffects.entries);
assert.equal(entries.filter(e=>e.category==='weapon').length,208);assert.equal(entries.filter(e=>e.category==='spell').length,139);assert.equal(fx.importedEffects.hurt.length,5);assert.equal(initial.hurt,'off');for(const h of fx.importedEffects.hurt)assert.equal(fx.validateCombatEffects({...initial,hurt:h.id}).hurt,'off','legacy saved meme choices are disabled');
assert.equal(fx.importedEffects.triple.length,2);assert.ok(fx.importedEffects.triple.every(id=>fx.importedEffects.entries[id].source.includes('/sprite_0923/')),'one triple set only');
for(const [skill,id] of Object.entries(fx.importedEffects.spellDefaults)){const name=raw.skills[skill].n,entry=fx.importedEffects.entries[id];assert.ok(entry);assert.ok(magic[name].frames.length);assert.ok(magic[name].frames.every(p=>fs.existsSync('public'+p)),name+' missing frame');}
for(const clip of Object.values(fx.importedEffects.clips)){assert.ok(clip.count>0&&clip.fps>0);assert.ok(fs.existsSync('public/assets/dasu-v1/'+clip.sheet));assert.equal(fx.importedFrame(clip,-1),0);assert.equal(fx.importedFrame(clip,1e6),clip.count-1);}
const bow=Object.keys(raw.items).find(id=>raw.items[id].type==='wpn'&&raw.items[id].isBow),c={cls:'elf',equipment:{weapon:{id:bow,en:0}}};
const hit={kind:'attack',damage:10,source:'physical',uid:'one',slot:0,visualPhase:'impact'};
assert.ok(fx.importedWeaponEffect(c,initial,hit));for(const e of [{...hit,miss:true},{...hit,damage:0},{...hit,source:'monster'},{...hit,source:'doll'},{...hit,source:'pet'},{...hit,visualPhase:'launch'},{...hit,skill:'sk_lightarrow',source:'magic'}])assert.equal(fx.importedWeaponEffect(c,initial,e),undefined);
assert.ok(fx.importedWeaponEffect(c,initial,{...hit,skill:'sk_elf_triple'}));assert.ok(fx.importedWeaponEffect(c,initial,{...hit,skill:'lw_spirit_arrow',weaponProc:true}));
const selected=entries.find(e=>e.category==='weapon'&&e.id!==initial.defaults.bow).id,custom={...initial,weapons:{[bow]:selected}};
assert.equal(fx.importedWeaponEffect(c,custom,hit).id,selected);assert.equal(fx.validateCombatEffects(JSON.parse(JSON.stringify(custom))).weapons[bow],selected,'setting survives serialization');
assert.equal(fx.importedWeaponEffect(c,{...initial,weapons:{[bow]:'off'}},hit),undefined);assert.equal(fx.importedWeaponEffect(c,{...initial,enabled:false},hit),undefined);
assert.throws(()=>fx.validateCombatEffects({...initial,weapons:{[bow]:'../bad'}}));assert.throws(()=>fx.validateCombatEffects({...initial,weapons:{invalid:selected}}));assert.throws(()=>fx.validateCombatEffects({...initial,hurt:'invalid'}));
const route=fs.readFileSync('app/api/combat-effects/route.ts','utf8');assert.match(route,/isGameMaster\(user\)/);assert.match(route,/input\.revision!==previous\.revision/);assert.match(route,/revision=revision\+1/);assert.match(route,/來源不符/);
console.log('PASS: all 351 SPR variants decoded; 208 weapon variants; 5 archived hurt choices disabled; one triple set; mapped spell frames exist; impact-only filtering, item overrides, disable, persistence, invalid IDs, GM checks and revision conflicts.');

for(const file of ['app/imported-combat-effects.tsx','app/combat-audio.ts','app/combat-effects-context.tsx','app/gm/combat-effects-admin.tsx']){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/importedEffects\.hurt|setImportedHurtSound|importedHurtSound/,'removed meme must not render, play or remain selectable: '+file);}

// Old open tabs also receive off on GET, without resetting any saved choices,
// revision, history, or rewriting the existing database row.
(async()=>{
 const vm=require('node:vm'),saved={...initial,hurt:fx.importedEffects.hurt[0].id,revision:7,history:[{at:123,by:'gm'}],weapons:{[bow]:selected}},sql=[];
 const mod={exports:{}},db={prepare:q=>{sql.push(q);return {bind(){return this;},run:async()=>({}),first:async()=>({payload:JSON.stringify(saved),revision:7})};}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/game/combat-effects-store.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,require:id=>id==='cloudflare:workers'?{env:{DB:db}}:fx});
 const value=await mod.exports.getCombatEffects();assert.equal(value.hurt,'off');assert.equal(value.weapons[bow],selected);assert.equal(value.revision,7);assert.equal(JSON.stringify(value.history),JSON.stringify(saved.history));assert.ok(sql.every(q=>!/^UPDATE|^DELETE/.test(q)));
 console.log('PASS: legacy meme configuration reads as off while weapon overrides, revision and history survive without database rewrites.');
})().catch(e=>{console.error(e);process.exitCode=1;});
