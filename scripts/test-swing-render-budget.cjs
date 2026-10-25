const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {pushCue,advanceMotion,durationFor}=require('../lib/game/animation-clock.ts'),{playerCues}=require('../lib/game/animation-cues.ts');
const duration=k=>durationFor(k,5,1.2,1),base={hp:100,mp:0,source:'physical',damage:10,kind:'attack'};
let state={kind:'idle',at:0,duration:Infinity,pending:[]};
// Real display cues, with a delayed rAF and changing React commit delays. A
// hundred swings cannot accumulate another animation queue or clock drift.
for(let n=0;n<200;n++){
 const shownAt=n*1200,cue=playerCues([{...base,seq:n,at:1700000000000+shownAt,shownAt}])[0];
 const rendered=shownAt+[8,29,4,41,15][n%5];
 state=advanceMotion(state,rendered,duration);
 state=pushCue(state,cue,rendered,duration,false,true);
 assert.equal(state.at,shownAt);assert.equal(state.pending.length,0);
 assert.equal(Math.floor((rendered-state.at)/state.duration*5),0);
 assert.equal(advanceMotion(state,shownAt+1199,duration).kind,'attack');
}
assert.equal(pushCue({...state,kind:'death'},{...playerCues([{...base,seq:201,at:1,shownAt:240000}])[0]},240010,duration,false,true).kind,'death');
const src=ts.transpileModule(fs.readFileSync('app/imported-combat-effects.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
let hooks=[],deps=[],cleanup=[],cursor=0,effects=[],time=0,next=0,updates=0,reads=0,queries=0,raf=new Map();
const changed=(i,d)=>!deps[i]||d.some((v,j)=>v!==deps[i][j]);
const effect=(f,d)=>{const i=cursor++;if(changed(i,d)){effects.push(()=>{cleanup[i]?.();cleanup[i]=f();});deps[i]=d;}};
const react={useRef:v=>{const i=cursor++;return hooks[i]??(hooks[i]={current:v});},useMemo:(f,d)=>{const i=cursor++;if(changed(i,d)){hooks[i]=f();deps[i]=d;}return hooks[i];},useState:v=>{const i=cursor++;if(!(i in hooks))hooks[i]=v;return [hooks[i],v=>{if(hooks[i]!==v)updates++;hooks[i]=v;}];},useEffect:effect,useLayoutEffect:effect};
const rect={left:10,top:10,width:80,height:80},arena={current:{getBoundingClientRect:()=>{reads++;return {left:0,top:0,width:400,height:300};},querySelector:()=>{queries++;return {getBoundingClientRect:()=>{reads++;return rect;}};}}};
const config={enabled:true},clip={width:80,height:80,cols:4,count:12,fps:12,sheet:'test.webp'},mod={exports:{}};
vm.runInNewContext(src,{exports:mod.exports,performance:{now:()=>time},requestAnimationFrame:f=>{raf.set(++next,f);return next;},cancelAnimationFrame:id=>raf.delete(id),require:id=>id==='react'?react:id==='react/jsx-runtime'?{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}:id.includes('combat-effects-context')?{useCombatEffects:()=>config}:{importedEffects:{entries:{test:{clip:'test',code:'test'}},clips:{test:clip},triple:[],hurt:[]},importedWeaponEffect:(_c,_cfg,e)=>e.kind==='attack'?{id:'test'}:undefined,importedFrame:(clip,age)=>Math.min(clip.count-1,Math.floor(age*clip.fps/1000))}});
const props={c:{},arena,view:{actions:[...Array.from({length:150},(_,seq)=>({seq,kind:'state',shownAt:0})),{...base,seq:151,shownAt:0,slot:0}]}};
const render=()=>{cursor=0;const tree=mod.exports.default(props);for(const f of effects.splice(0))f();return tree;};
render();render();assert.equal(queries,1,'only one visual event measures an actor');assert.equal(reads,2);
updates=0;
for(let frame=1;frame<=70;frame++){time=frame*1000/60;const jobs=[...raf.values()];raf.clear();for(const f of jobs)f(time);render();}
assert.ok(updates<=14,`12fps effect caused ${updates} React updates`);assert.equal(reads,2,'atlas animation never rereads layout');assert.equal(queries,1);assert.equal(raf.size,0,'completed effects stop the animation clock');
props.view={actions:props.view.actions.map(e=>({...e}))};render();render();assert.equal(reads,2,'expired effects from a new packet do not measure layout');
for(const f of cleanup)f?.();assert.equal(raf.size,0);
console.log('PASS: 200 confirmed swings keep their display origin with no deferred attacks; 150 nonvisual events cause no actor reads; 12fps atlas updates stay bounded, anchors survive rerenders and expired effects stop.');
