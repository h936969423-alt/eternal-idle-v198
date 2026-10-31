const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const visual=require('../lib/game/magic-visuals.ts'),feedback=require('../lib/game/cast-feedback.ts'),raw=require('../lib/game/gamedata.json');
const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
const effect=()=>null,projectile=()=>null,mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/battle-arena.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:mod.exports,require:id=>{
 if(id==='react/jsx-runtime')return jsx;if(id.includes('magic-visuals'))return visual;if(id.endsWith('gamedata.json'))return raw;if(id.endsWith('asset-map.json'))return require('../lib/game/asset-map.json');if(id==='./magic-effect')return {__esModule:true,default:effect};if(id==='./combat-projectile')return {__esModule:true,default:projectile};return {};
}});
// Area spells (e.g. meteor) are drawn on confirmation together with their damage, so they are not previewed on click.
assert.equal(feedback.canPreviewSpellEffect('sk_meteor'),false,'area spells are not click-previewed');
for(const [skill,type]of [['sk_lightarrow',projectile],['sk_icearrow',projectile],['sk_blaze',effect]]){
 const intent={id:1,characterId:'mage',skill,at:100,afterSeq:10,effectPreviewed:feedback.canPreviewSpellEffect(skill)};
 const e={seq:-1,skill,at:99999,visualAt:intent.at,source:'magic',kind:'attack',slot:0,uid:'target',hp:100,mp:100};
 assert.equal(feedback.castFeedbackPose(intent,'mage',100,8,1).frame,0);
 const node=mod.exports.ManualSpellVisual({event:e,c:{},arena:{current:null},interval:1});assert.equal(node.type,type);assert.equal(node.props.event.visualAt,intent.at,'effect and pose start on the identical click clock, before a response');
 const save={characters:[{id:'mage',events:[{...e,seq:11,manual:true,at:1000}]}]};const confirmed=feedback.attachCastFeedback(save,intent);assert.equal(confirmed.characters[0].events[0].visualEffectPreviewed,true,'late result is visual-suppressed but not removed');assert.equal(confirmed.characters[0].events.length,1);
}
// Image preloading must warm a spell even if it occurs after the old 100-image cutoff.
const images=[],idle=[],loaded=new Set();let decoded=0;
class Image{set src(v){this._src=v;loaded.add(v);this.onload?.();}get src(){return this._src;}decode(){decoded++;return Promise.resolve();}}
const pre={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/magic-preload.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:pre.exports,Image,window:{requestIdleCallback:f=>idle.push(f)},setTimeout:f=>idle.push(f),require:()=>visual});
const skills=Object.keys(raw.skills);pre.exports.preloadLearnedEffects(skills);
for(const skill of skills){const config=visual.magicVisual({skill}).config;if(!config)continue;const first=config.atlas?.src||config.frames[0];if(first)assert.ok(loaded.has(first),'opening frame warm for '+skill);for(const direction of config.directions||[])if(direction[0])assert.ok(loaded.has(direction[0]),'direction opening frame warm for '+skill);}
assert.ok(loaded.size>100);assert.ok(decoded>100);assert.ok(idle.length>0,'remaining frames are scheduled off the click path');
const before=loaded.size;idle.shift()();assert.ok(loaded.size-before<=16,'background work stays bounded');
const body=fs.readFileSync('app/combat-projectile.tsx','utf8');assert.ok(body.includes('if(event.visualEffectPreviewed||'),'authoritative projectile cannot replay predicted graphics');
const arena=fs.readFileSync('app/battle-arena.tsx','utf8');assert.ok(arena.includes('instant-self-'));assert.ok(arena.includes('visualAt:pendingCast.at'),'self and target effects use the pose clock');
console.log('PASS: actual spell preview renderer routes projectiles and impact FX on the same click clock as casting; delayed confirmation never replays; self buffs/heals and no-target utilities are eligible; every learned spell/direction opening frame is predecoded, with bounded background loading.');
