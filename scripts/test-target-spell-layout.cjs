const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),crypto=require('node:crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {targetSpellLayout}=require('../lib/game/spell-effect-layout.ts'),{magicVisual,magicVisualPaths}=require('../lib/game/magic-visuals.ts'),{playerCues}=require('../lib/game/animation-cues.ts'),{pushCue,durationFor}=require('../lib/game/animation-clock.ts');
const integrity=require('../lib/game/target-spell-assets.json');
let cases=0;
for(const skill of ['sk_meteor','sk_disintegrate']){
 const {config}=magicVisual({skill}),a=config.atlas;assert.ok(a);assert.deepEqual(magicVisualPaths(config),[a.src],'one resource rather than per-frame layer requests');
 const body=fs.readFileSync('public'+a.src);assert.equal(crypto.createHash('sha256').update(body).digest('hex'),integrity.files[a.src.split('/').at(-1)]);
 for(const [width,height]of [[320,210],[390,305],[720,280],[960,420]])for(const [xp,yp]of [[.68,.7],[.82,.43],[.84,.83],[.5,.5]]){
  const arena={left:17,top:30,width,height},actor={left:arena.left+width*xp-30,top:arena.top+height*yp-36,width:60,height:60},parent={left:actor.left-12,top:actor.top-8,width:90,height:100};
  const v=targetSpellLayout(a,parent,actor,arena,config.targetVc),x=parent.left+v.left,y=parent.top+v.top;
  assert.ok(v.scale>0);assert.ok(Math.abs(x+a.pivotX*v.scale-(actor.left+30))<1e-6,'impact pixel stays on monster X');assert.ok(Math.abs(y+a.pivotY*v.scale-(actor.top+60*config.targetVc))<1e-6,'impact pixel stays on monster Y');
  assert.ok(x>=arena.left-1e-6&&y>=arena.top-1e-6&&x+v.width<=arena.left+width+1e-6&&y+v.height<=arena.top+height+1e-6,'whole effect fits portrait/landscape scene');cases++;
 }
 const hits=[0,1,2].map((slot,i)=>({seq:i+1,at:1000,kind:'attack',skill,source:'magic',slot,uid:'m'+slot,damage:10,hp:100,mp:50}));hits.push({seq:4,at:1000,kind:'magic',skill,hp:100,mp:50});
 const cues=playerCues(hits);assert.equal(new Set(cues.map(e=>e.key)).size,1,'one cast pose even for multiple meteor targets');
 const duration=k=>durationFor(k,12,1.2,1);let state={kind:'idle',at:0,duration:Infinity,pending:[]};
 for(const cue of cues)if(!cues.some(x=>x.seq<cue.seq&&x.key===cue.key))state=pushCue(state,cue,0,duration,false,true);
 state=pushCue(state,{seq:5,at:1200,kind:'attack'},200,duration,false,true);assert.equal(state.kind,'skill');assert.equal(state.pending.length,1,'normal attack waits for the cast pose');
}
console.log(`PASS: ${cases} phone/landscape target placements; exact impact pivots; shared source-layer clock; one resource per spell; one cast for meteor targets; immediate confirmed normal attack after either spell.`);

