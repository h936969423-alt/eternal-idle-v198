// 三重矢氣壓環: one ring per cast, starting on the first arrow's frame, gone after 460ms, centred
// above the real head of an object-fit:contain sprite.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'pressure-ring-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of ['triple-pressure-ring.ts','projectile-timing.ts'])fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(path.join(root,'lib/game',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const R=require(path.join(dir,'triple-pressure-ring.js'));
 const shot=(seq,shownAt,skill='lw_skill_450',phase='launch')=>({seq,kind:'attack',skill,visualPhase:phase,shownAt});
 // One cast = three launches 70ms apart → one ring, at the first arrow.
 assert.deepEqual(R.pressureRingStarts([shot(1,1000),shot(2,1070),shot(3,1140)],-Infinity,1150),[1000]);
 // Already started: the 2nd/3rd arrows of the same cast do not restart it.
 assert.deepEqual(R.pressureRingStarts([shot(1,1000),shot(2,1070),shot(3,1140)],1000,1150),[]);
 // Old id works too; impacts, normal arrows and other skills never start a ring.
 assert.deepEqual(R.pressureRingStarts([shot(1,1000,'sk_elf_triple')],-Infinity,1010),[1000]);
 assert.deepEqual(R.pressureRingStarts([shot(1,1000,'lw_skill_450','impact'),shot(2,1000,null),shot(3,1000,'lw_skill_10')],-Infinity,1010),[]);
 // Launches older than the ring itself (e.g. on remount) are not replayed late.
 assert.deepEqual(R.pressureRingStarts([shot(1,1000)],-Infinity,1000+R.PRESSURE_RING_MS+1),[]);
 // The next cast gets its own ring.
 assert.deepEqual(R.pressureRingStarts([shot(4,2400)],1000,2410),[2400]);
 // Drawing: active for 0..459ms, then nothing.
 const calls=[];const ctx=new Proxy({},{get:(t,k)=>k in t?t[k]:(...a)=>{calls.push(k);},set:(t,k,v)=>{t[k]=v;return true;}});
 for(const t of [0,50,110,159,160,300,459])assert.equal(R.drawPressureRing(ctx,t,50,30,1),true,'drawn at '+t);
 assert.ok(calls.includes('ellipse')&&calls.includes('stroke'));
 calls.length=0;assert.equal(R.drawPressureRing(ctx,460,50,30,1),false);assert.equal(R.drawPressureRing(ctx,-1,50,30,1),false);assert.equal(calls.length,0,'nothing drawn outside 0..460ms');
 // object-fit:contain head mapping: a 100×200 frame shown in a 110×140 box scales by 0.7 and is centred.
 const p=R.containedHeadPoint({left:10,top:20,width:110,height:140},{width:100,height:200},{row:30,column:50});
 assert.equal(p.y,20+0+30*.7);assert.equal(p.x,10+(110-70)/2+50*.7);
 console.log('PASS pressure ring: one ring per cast on the first arrow, 460ms long, no ring for impacts/other skills/stale launches, head point under object-fit:contain');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
