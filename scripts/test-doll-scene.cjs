const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'doll-scene-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),scene=require(path.join(dir,'doll-scene.js')),cfg=require(path.join(dir,'doll-config.js')),cues=require(path.join(dir,'animation-cues.js'));
try{
 const b=e.BASES.knight,allocation={};let points=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(points,20-b[k]);points-=allocation[k];}
 const c=e.createCharacter('娃娃測試','knight','m',allocation,1000000);
 assert.equal(scene.sceneDoll(c),null);const dolls=Object.values(cfg.defaultDolls()).filter(d=>d.enabled);
 for(const d of dolls){c.doll=d.id;const shown=scene.sceneDoll(c);assert.equal(shown.name,d.name);assert.ok(shown.src,d.name);assert.ok(fs.existsSync(path.join(root,'public',shown.src)),shown.src);}
 const doll=dolls[0];c.doll=doll.id;c.dollDefinitions={[doll.id]:{...doll,enabled:false}};assert.equal(scene.sceneDoll(c),null);c.dollDefinitions[doll.id].enabled=true;
 e.event(c,'magic',1000001,{source:'doll',dollKind:'attack',skill:'sk_blaze',effectName:'烈炎術'});const event=c.events.at(-1);assert.equal(event.dollId,c.doll);assert.ok(scene.isSceneDollEvent(c,event));assert.deepEqual(cues.playerCues([event]),[]);
 const damage={...event,kind:'attack',damage:45,uid:'enemy'};assert.equal(cues.monsterCues([damage],'enemy')[0].kind,'hurt');assert.deepEqual(cues.playerCues([damage]),[]);
 c.doll=dolls[1].id;assert.equal(scene.isSceneDollEvent(c,event),false);c.doll=null;assert.equal(scene.sceneDoll(c),null);
 // Compare the current simulation with and without presentation reads.
 // An old engine also differs in spawn RNG and is not a visual-only baseline.
 const old=e,save=e.emptySave(1000000);save.characters=[c];save.active=c.id;c.doll=doll.id;c.dollStartedAt=save.at;c.dollDefinitions={[doll.id]:{...doll,abilities:[{key:'procBlaze',value:100},{key:'procDamageRate',value:100},{key:'procDamage',value:17},{key:'procReduceRate',value:100},{key:'procReduce',value:9},{key:'healHp',value:5,interval:1},{key:'healMp',value:3,interval:1}]}};c.hp=30;c.mp=0;c.running=true;c.zone='zone_22';c.lv=60;c.attrs.con=40;c.gold=100000000;c.bag.potion_heal=1000;c.autoPotion=true;
 const copy=structuredClone(save);const beforePresentation=JSON.stringify(save);for(let frame=0;frame<60;frame++){scene.sceneDoll(c);cues.playerCues(c.events);cues.monsterCues(c.events,'enemy');}assert.equal(JSON.stringify(save),beforePresentation,'presentation cannot mutate the authoritative save');function rng(){let n=13;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
 const realUUID=crypto.randomUUID;let uid=0;crypto.randomUUID=()=>`test-${uid++}`;e.advance(save,save.at+30000,rng());uid=0;old.advance(copy,copy.at+30000,rng());crypto.randomUUID=realUUID;
 const events=save.characters[0].events.filter(x=>x.source==='doll');assert.ok(events.some(x=>x.dollKind==='recovery'));assert.ok(events.some(x=>x.kind==='attack'));assert.ok(events.every(x=>x.dollId===doll.id));
 function gameplay(s){const v=structuredClone(s);for(const c of v.characters){delete c.events;delete c.eventSeq;}return v;}
 assert.deepEqual(gameplay(save),gameplay(copy),'doll world effects preserve exact combat and rewards');
 console.log(`Doll scene checks passed: ${dolls.length} sprite assets, enable/disable, switching, event ownership, animation cues, recovery/attacks, unchanged combat.`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}

