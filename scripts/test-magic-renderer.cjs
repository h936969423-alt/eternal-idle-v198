const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const visuals=require('../lib/game/magic-visuals.ts');
const source=ts.transpileModule(fs.readFileSync('app/magic-effect.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function harness(withActor=true){
 let hooks=[],cursor=0,effects=[],deps=[],clock=0,epoch=1000000,next=0,raf=new Map(),listeners=new Map();
 const queries=[];
 const rect={left:20,top:20,width:100,height:100};
 const sprite={getBoundingClientRect:()=>rect},root={querySelector:()=>withActor?sprite:null,getBoundingClientRect:()=>({left:0,top:0,width:400,height:300})},parent={getBoundingClientRect:()=>rect,querySelector:selector=>{queries.push(selector);return withActor?sprite:null;},closest:()=>root};
 const document={hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n)=>listeners.delete(n)};
 const react={useRef:v=>{const i=cursor++;return hooks[i]??(hooks[i]={current:{parentElement:parent}});},useState:v=>{const i=cursor++;if(!(i in hooks))hooks[i]=v;return [hooks[i],v=>{hooks[i]=v;}];},useEffect:(f,d)=>{const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){effects.push(f);deps[i]=d;}}};
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},mod={exports:{}};
 const ctx={exports:mod.exports,document,performance:{now:()=>clock},Date:{now:()=>epoch},requestAnimationFrame:f=>{raf.set(++next,f);return next;},cancelAnimationFrame:id=>raf.delete(id),require:id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return jsx;
  if(id.includes('magic-visuals'))return visuals;
  if(id.includes('spell-effect-layout'))return require('../lib/game/spell-effect-layout.ts');
  if(id.includes('scene-presentation'))return {sceneBlend:v=>v==='screen'?'screen':'normal'};
  if(id.includes('lineagew-equipment-effects'))return {lineageWEffectDefinition:()=>null};
  if(id.includes('lineagew-mythic-procs'))return {mythicProcDefinition:()=>null};
  return ()=>null;
 }};
 vm.runInNewContext(source,ctx);let cleanup=[];
 const render=props=>{cursor=0;const tree=mod.exports.default(props);for(const effect of effects.splice(0))cleanup.push(effect());return tree;};
 const advance=ms=>{clock=ms;epoch=1000000+ms;const jobs=[...raf.values()];raf.clear();for(const fn of jobs)fn(clock);};
 const images=node=>!node?[]:Array.isArray(node)?node.flatMap(images):node.type==='img'?[node]:images(node.props?.children);
 const atlases=node=>!node?[]:Array.isArray(node)?node.flatMap(atlases):node.props?.className?.includes('magic-target-atlas')?[node]:atlases(node.props?.children);
 return {render,advance,images,atlases,queries,raf,document,listeners,unmount:()=>cleanup.forEach(f=>f?.())};
}
for(const skill of ['sk_meteor','sk_disintegrate']){
 const h=harness(),props={event:{seq:1,kind:'attack',skill,slot:2,uid:'m2',hp:100,mp:50}};
 h.render(props);assert.ok(h.queries.includes('[data-monster-slot="2"] .four-monster-art'),'root-mounted spell targets its own monster slot');let nodes=h.atlases(h.render(props));assert.equal(nodes.length,1,'composited source layers render in one atlas');assert.equal(h.images(h.render(props)).length,0,'frames do not swap image URLs');
 const start=nodes[0].props.style.backgroundPosition;h.advance(100);nodes=h.atlases(h.render(props));assert.notEqual(nodes[0].props.style.backgroundPosition,start,'atlas advances on the shared clock');
 assert.equal(nodes[0].props.style.transform,'none');assert.equal(nodes[0].props.style.maxWidth,'none');
 h.advance(1400);assert.equal(h.render(props),null,'completed effect is removed');assert.equal(h.raf.size,0);h.unmount();assert.equal(h.listeners.size,0);
}
const gm=harness(false),gp={event:{seq:9,kind:'magic',source:'monster',skill:'sk_meteor',hp:100,mp:0}};gm.render(gp);assert.equal(gm.atlases(gm.render(gp)).length,1,'GM preview works without an actor element');gm.unmount();
const loop=harness(),lp={event:{seq:2,kind:'magic',skill:'sk_shock_stun',hp:100,mp:10},loopUntil:1003000};
loop.render(lp);loop.advance(1200);assert.ok(loop.images(loop.render(lp)).length);
loop.document.hidden=true;loop.listeners.get('visibilitychange')();assert.equal(loop.raf.size,0);assert.equal(loop.render(lp),null);
loop.document.hidden=false;loop.listeners.get('visibilitychange')();loop.advance(1500);assert.ok(loop.images(loop.render(lp)).length,'live status resumes after visibility restore');
loop.advance(3001);assert.equal(loop.render(lp),null);assert.equal(loop.raf.size,0);loop.unmount();
console.log('PASS: actual React spell renderer plays both composed atlases on one rAF clock, removes completed images, cancels hidden animations, restores active status and cleans up on unmount.');

