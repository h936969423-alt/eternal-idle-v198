const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'offline-check-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}

const e=require(path.join(dir,'engine.js')),r=require(path.join(dir,'respawn-rules.js')),g=require(path.join(dir,'gm-item-options.js')),t=1000000;
function character(){const base=e.BASES.knight,a={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){a[k]=Math.min(left,20-base[k]);left-=a[k];}return e.createCharacter('加速測試','knight','m',a,t);}
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
try{
 const ids=[44075,350706,350704,350705,67003].map(n=>'ap381_supply_'+n);
 for(const id of ids){const c=character();c.bag[id]=1;c.bag.token=5;const bag=structuredClone(c.bag),gold=c.gold,blue=c.blueDiamonds,base=e.stats(c,t).attackInterval,move=r.moveDelayMultiplier(c,t);
 assert.ok(g.itemOptions.some(o=>o.id===id&&o.category==='potion'));
 for(const cls of Object.keys(e.BASES)){c.cls=cls;assert.ok(e.usable(c,e.DATA.items[id]));}c.cls='knight';
 for(let n=0;n<5;n++)e.potion(c,id,t+n*1000);
 assert.deepEqual(c.bag,bag);assert.equal(c.gold,gold);assert.equal(c.blueDiamonds,blue);
 close(e.stats(c,t+4000).attackInterval,base/1.33);close(r.moveDelayMultiplier(c,t+4000),move/1.33);
 const expiry=t+4000+e.DATA.items[id].dur*1000;close(e.stats(c,expiry).attackInterval,base);close(r.moveDelayMultiplier(c,expiry),move);
 c.locked=[id];assert.throws(()=>e.potion(c,id,t),/鎖定/);c.locked=[];delete c.bag[id];assert.throws(()=>e.potion(c,id,t),/用完/);
 }
 const c=character(),base=e.stats(c,t).attackInterval;for(const id of ids)c.bag[id]=1;
 e.potion(c,ids[0],t);e.potion(c,ids[3],t);close(e.stats(c,t).attackInterval,base/1.33);assert.equal(Object.keys(c.buffs).length,1);
 e.potion(c,ids[1],t);e.potion(c,ids[2],t);e.potion(c,ids[4],t);close(e.stats(c,t).attackInterval,base/Math.pow(1.33,3));close(r.moveDelayMultiplier(c,t),1/Math.pow(1.33,3));assert.equal(Object.keys(c.buffs).length,3);
 c.buffs.potion_haste={until:t+300000,d:{atkSpdPct:33}};c.buffs.sk_haste_spell={until:t+300000,d:{atkSpdPct:33}};c.buffs.potion_brave={until:t+300000,d:{atkSpdPct:33}};close(e.stats(c,t).attackInterval,base/Math.pow(1.33,3));close(r.moveDelayMultiplier(c,t),1/Math.pow(1.33,3));
 const saved=JSON.parse(JSON.stringify(c));close(e.stats(saved,t).attackInterval,e.stats(c,t).attackInterval);
 console.log('PASS: five GM items, all classes, zero resource consumption, repeated use, same-tier replacement, three-tier stacking, legacy overlap, expiry, lock/ownership and persistence.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
