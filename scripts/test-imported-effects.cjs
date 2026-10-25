const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const fx=require('../lib/game/imported-effects.ts'),raw=require('../lib/game/gamedata.json'),magic=require('../lib/game/magic-fx.json');
const initial=fx.initialCombatEffects(),valid=fx.validateCombatEffects(initial),entries=Object.values(fx.importedEffects.entries);
assert.equal(entries.filter(e=>e.category==='weapon').length,208);assert.equal(entries.filter(e=>e.category==='spell').length,139);assert.equal(fx.importedEffects.hurt.length,5);
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
console.log('PASS: all 351 SPR variants decoded; 208 weapon variants; 5 hurt choices; one triple set; mapped spell frames exist; impact-only filtering, item overrides, disable, persistence, invalid IDs, GM checks and revision conflicts.');
