const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync('/tmp/character-menu-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync('lib/game')){const from=path.join('lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),rules=require(path.join(dir,'character-menu.js')),sync=require(path.join(dir,'state-sync.js'));
 const now=1_000_000,make=name=>{const b=e.BASES.knight,allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}return e.createCharacter(name,'knight','m',allocation,now);};
 const rewards={potion_greater_haste:10,scroll_poly:5,potion_heal:500};
 const s=e.emptySave(now),a=make('甲'),b=make('乙');s.characters=[a,b];s.active=a.id;
 const before=structuredClone(a.bag),other=structuredClone(b.bag);
 for(const code of ['VIP888','.VIP888 extra','bad',null,{},888]){const snapshot=JSON.stringify({bag:a.bag,claims:s.codeRedemptions});assert.throws(()=>e.action(s,{type:'redeemCode',code},now),/無效/);assert.equal(JSON.stringify({bag:a.bag,claims:s.codeRedemptions}),snapshot);}
 e.action(s,{type:'redeemCode',code:'  .vip888  ',items:{potion_heal:999999}},now);
 for(const [id,n]of Object.entries(rewards))assert.equal(a.bag[id],(before[id]||0)+n);assert.deepEqual(b.bag,other);assert.equal(s.codeRedemptions.VIP888.characterId,a.id);
 const claimed=JSON.stringify(s);assert.throws(()=>e.action(s,{type:'redeemCode',code:'.VIP888'},now),/限領一次/);assert.equal(JSON.stringify(s),claimed);
 const reload=JSON.parse(JSON.stringify(sync.persistedSave(s)));reload.active=b.id;assert.throws(()=>e.action(reload,{type:'redeemCode',code:'.VIP888'},now),/限領一次/);assert.deepEqual(sync.responseSave(reload,'settings').save.codeRedemptions,s.codeRedemptions);
 for(const c of [...reload.characters])e.action(reload,{type:'deleteCharacter',id:c.id},now);e.advance(reload,now+10000,()=>.5);assert.equal(reload.characters.length,0);reload.characters=[make('新角色')];reload.active=reload.characters[0].id;assert.throws(()=>e.action(reload,{type:'redeemCode',code:'.VIP888'},now+10001),/限領一次/);
 const fresh=e.emptySave(now);fresh.characters=[make('獨立帳號')];fresh.active=fresh.characters[0].id;e.action(fresh,{type:'redeemCode',code:'.VIP888'},now);assert.ok(fresh.codeRedemptions.VIP888);
 const c=fresh.characters[0],base=e.stats(c,now).attackInterval;e.potion(c,'potion_greater_haste',now);assert.equal(c.bag.potion_greater_haste,9);assert.equal(c.buffs.potion_greater_haste.until,now+1800000);assert.ok(e.stats(c,now).attackInterval<base);assert.equal(e.stats(c,now+1800000).attackInterval,base);c.bag.potion_haste=1;e.potion(c,'potion_haste',now+1000);assert.equal(c.buffs.potion_greater_haste,undefined,'same-type haste potions replace rather than stack');e.potion(c,'potion_greater_haste',now+2000);assert.equal(c.buffs.potion_haste,undefined);assert.equal(c.bag.potion_greater_haste,8);
 console.log('PASS: exact server awards, additive inventory, case/whitespace normalization, invalid/tampered inputs, repeat/other-character/reload/deletion denial, separate accounts and consumable strong haste.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
