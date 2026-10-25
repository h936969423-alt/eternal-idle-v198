const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lethal-spell-'));fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync('lib/game')){const from=path.join('lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),presentation=require(path.join(dir,'combat-presentation.js')),layout=require(path.join(dir,'combat-float-layout.js')),time=1000000;
 const allocation={},base=e.BASES.mage;let left=base.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-base[key]);left-=allocation[key];}
 const c=e.createCharacter('錄影驗證','mage','m',allocation,time),save=e.emptySave(time);save.characters=[c];save.active=c.id;c.lv=99;c.attrs.con=1000;c.attrs.wis=100;c.skills=['sk_meteor','sk_disintegrate'];c.running=true;c.autoPotion=false;c.autoConfig={attack:'',heal:'',convert:'',opener:'',aux:{},buffs:[]};
 e.ensureArena(c,()=>.5,time);for(const target of c.arena)target.hp=1;c.hp=e.stats(c,time).maxHp;c.mp=e.stats(c,time).maxMp;
 const before=c.arena.map(m=>({...m}));c.events=[];e.cast(c,'sk_meteor',time,()=>.5);const hits=c.events.filter(x=>x.kind==='attack'&&x.skill==='sk_meteor');assert.equal(hits.length,3);
 let view={hp:c.hp,mp:c.mp,arena:before,floats:[]};for(const event of c.events)view=presentation.applyCombatViewEvent(view,event,100);
 assert.equal(view.casts.filter(x=>x.skill==='sk_meteor').length,3,'lethal meteor keeps three target effects');assert.ok(view.arena.every(m=>m.hp===0));
 const arena=fs.readFileSync('app/battle-arena.tsx','utf8');assert.match(arena,/key=\{`target-spell-\$\{e\.seq\}`\}/);assert.match(arena,/e\.slot===slot&&e\.uid===m\.uid[^\n]*&&!magicVisual\(e\)\.config\?\.atlas/,'target atlases are not duplicated inside dead monster hosts');
 // The standalone effect list survives a respawn changing the current occupant UID.
 const spell=view.casts.find(x=>x.skill==='sk_meteor');view=presentation.applyCombatViewEvent(view,{seq:999,at:time+600,kind:'spawn',slot:spell.slot,uid:'replacement',spawn:{...before[spell.slot],uid:'replacement',hp:99},hp:c.hp,mp:c.mp},700);
 assert.ok(view.casts.some(x=>x.seq===spell.seq),'respawn retains the old hit effect until its own lifetime expires');
 for(let lane=0;lane<60;lane++){const p=layout.combatFloatLayout(lane);assert.equal(p.top,'10%');assert.ok([0,18].includes(parseInt(p.marginTop)),'rapid damage never grows an unbounded vertical lane');assert.ok(Math.abs(parseInt(p.marginLeft))<=22);}
 const deadline=Math.max(...c.arena.map(m=>m.respawnAt||time));assert.ok(deadline>time,'lethal spell retains the configured respawn wait');
 for(let now=time+350;now<=deadline+700;now+=350)e.advance(save,now,()=>.5);
 assert.ok(c.arena.some(m=>m.hp>0),'canonical monsters resume after the configured respawn wait');
 assert.match(arena,/等待怪物重生/,'an empty arena explains the respawn wait');
 console.log('PASS: lethal 3-target meteor, effects survive death/respawn, standalone render host, no duplicate child effect, 60 bounded number lanes and canonical monster respawn.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
