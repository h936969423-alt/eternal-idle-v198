const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync('/tmp/cast-handoff-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const f=require(path.join(dir,'cast-feedback.js')),a=require(path.join(dir,'animation-cues.js')),clock=require(path.join(dir,'animation-clock.js'));
 for(const skill of ['sk_shock_stun','sk_heal1','sk_meteor']){
  const intent={id:1,characterId:'test',skill,at:100,afterSeq:10};
  const own={seq:12,at:1000000,kind:'magic',skill,manual:true,visualCastAt:100,hp:100,mp:90,shownAt:150};
  const prior={seq:11,at:999999,kind:'attack',shownAt:160,hp:100,mp:100};
  const next={seq:13,at:1000300,kind:'attack',shownAt:400,hp:100,mp:90};
  const preview=f.castFeedbackPose(intent,'test',400,8,1.3),live={kind:'attack',frame:4};
  assert.ok(preview);assert.equal(f.resolvePlayerPose(preview,live,intent,a.playerCues([prior,own])),preview,'historical normal attack cannot cancel a new cast');
  assert.equal(f.resolvePlayerPose(preview,live,intent,a.playerCues([own,next])),live,'displayed normal attack must own the sprite instead of the click preview');
  const foreign={...next,source:'monster'};assert.equal(f.resolvePlayerPose(preview,live,intent,a.playerCues([own,foreign])),preview,'monster actions cannot cut off the player cast');
  assert.equal(f.resolvePlayerPose(preview,live,intent,a.playerCues([own,{...next,visualPhase:'impact'}])),preview,'an older projectile landing is not a new player action');
  assert.equal(f.resolvePlayerPose(undefined,live,intent,[]),live);
  const cue=a.playerCues([next])[0],state=clock.pushCue({kind:'skill',at:100,duration:1300,pending:[]},cue,400,()=>1300,false,true);
  assert.equal(state.kind,'attack');assert.equal(state.at,400);assert.equal(state.pending.length,0);
 }
 const duration=f.playerCastInterval(.4489,1.3);assert.equal(duration,.4489);assert.ok(clock.durationFor('skill',8,0,duration)<clock.durationFor('skill',8,0,1.3));
 for(const value of [undefined,0,-1,NaN,Infinity])assert.equal(f.playerCastInterval(value,1.3),1.3);
 // Verify the actual component uses the tested selection and server timing path.
 const sprite=fs.readFileSync(path.join(root,'app/combat-sprite.tsx'),'utf8'),arena=fs.readFileSync(path.join(root,'app/battle-arena.tsx'),'utf8'),game=fs.readFileSync(path.join(root,'app/game.tsx'),'utf8');
 assert.ok(sprite.includes('pose=resolvePlayerPose(feedback,confirmedPose,pendingCast,cues)'));assert.ok(sprite.includes('playerCastInterval(serverCastInterval,'));assert.ok(arena.includes('castInterval={castInterval}'));assert.ok(game.includes('castInterval={st.castIntervalMs/1000}'));
 console.log('PASS cast pose: preview relinquishes to confirmed player attack, old/foreign/impact events do not interrupt, and server haste timing reaches the sprite');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
