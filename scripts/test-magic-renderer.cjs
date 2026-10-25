const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const visuals=require('../lib/game/magic-visuals.ts');
const source=ts.transpileModule(fs.readFileSync('app/magic-effect.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function harness(){
 let hooks=[],cursor=0,effects=[],deps=[],clock=0,epoch=1000000,next=0,raf=new Map(),listeners=new Map();
 const rect={left:20,top:20,width:100,height:100};
 const sprite={getBoundingClientRect:()=>rect},root={querySelector:()=>sprite},parent={getBoundingClientRect:()=>rect,querySelector:()=>sprite,closest:()=>root};
 const document={hidden:false,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:(n)=>listeners.delete(n)};
 const react={useRef:v=>{const i=cursor++;return hooks[i]??(hooks[i]={current:{parentElement:parent}});},useState:v=>{const i=cursor++;if(!(i in hooks))hooks[i]=v;return [hooks[i],v=>{hooks[i]=v;}];},useEffect:(f,d)=>{const i=cursor++;if(!deps[i]||d.some((v,j)=>v!==deps[i][j])){effects.push(f);deps[i]=d;}}};
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},mod={exports:{}};
 const ctx={exports:mod.exports,document,performance:{now:()=>clock},Date:{now:()=>epoch},requestAnimationFrame:f=>{raf.set(++next,f);return next;},cancelAnimationFrame:id=>raf.delete(id),require:id=>{
  if(id==='react')return react;if(id==='react/jsx-runtime')return jsx;
  if(id.includes('magic-visuals'))return visuals;
  if(id.includes('scene-presentation'))return {sceneBlend:v=>v==='screen'?'screen':'normal'};
  if(id.includes('lineagew-equipment-effects'))return {lineageWEffectDefinition:()=>null};
  if(id.includes('lineagew-mythic-procs'))return {mythicProcDefinition:()=>null};
  return ()=>null;
 }};
 vm.runInNewContext(source,ctx);let cleanup=[];
 const render=props=>{cursor=0;const tree=mod.exports.default(props);for(const effect of effects.splice(0))cleanup.push(effect());return tree;};
 const advance=ms=>{clock=ms;epoch=1000000+ms;const jobs=[...raf.values()];raf.clear();for(const fn of jobs)fn(clock);};
 const images=node=>!node?[]:Array.isArray(node)?node.flatMap(images):node.type==='img'?[node]:images(node.props?.children);
 return {render,advance,images,raf,document,listeners,unmount:()=>cleanup.forEach(f=>f?.())};
}
const h=harness(),props={event:{seq:1,kind:'attack',skill:'sk_disintegrate',hp:100,mp:50}};
assert.equal(visuals.magicVisual(props.event).name,'究極光裂術');
h.render(props);assert.equal(h.images(h.render(props)).length,3,'all three source layers render together');
h.advance(100);assert.ok(h.images(h.render(props)).every(im=>im.props.src.endsWith('_1.png')),'layers share one frame clock');
h.advance(1400);assert.equal(h.render(props),null,'one-shot removes every layer at the end');assert.equal(h.raf.size,0);h.unmount();assert.equal(h.listeners.size,0);
const loop=harness(),lp={event:{seq:2,kind:'magic',skill:'sk_shock_stun',hp:100,mp:10},loopUntil:1003000};
loop.render(lp);loop.advance(1200);assert.ok(loop.images(loop.render(lp)).length);
loop.document.hidden=true;loop.listeners.get('visibilitychange')();assert.equal(loop.raf.size,0);assert.equal(loop.render(lp),null);
loop.document.hidden=false;loop.listeners.get('visibilitychange')();loop.advance(1500);assert.ok(loop.images(loop.render(lp)).length,'live status resumes after visibility restore');
loop.advance(3001);assert.equal(loop.render(lp),null);assert.equal(loop.raf.size,0);loop.unmount();
console.log('PASS: actual React spell renderer shares one rAF clock for three layers, removes completed images, cancels hidden animations, restores active status and cleans up on unmount.');
