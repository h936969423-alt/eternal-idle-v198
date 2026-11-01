const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'retired-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),{RETIRED_ITEMS}=require(path.join(dir,'retired-items.js')),loot=require(path.join(dir,'monster-loot.js')),hub=require(path.join(dir,'npc-hub.js')),recipes=require(path.join(dir,'npc-recipes.js')),gm=require(path.join(dir,'gm-item-options.js')),t=1000000;
 const ids=Object.keys(RETIRED_ITEMS);assert.deepEqual(ids.sort(),['afei_drop_wpn_14','afei_drop_wpn_16','afei_drop_wpn_33','afei_drop_wpn_halberd'].sort());
 // Not dropped, sold, crafted or offered to GMs any more.
 const drops=JSON.stringify([loot.PUBLIC_LOOT,loot.PUBLIC_DROP_RATES]);for(const id of ids)assert.ok(!drops.includes(id),id+' drop');
 const data=require(path.join(dir,'npc-hub-data.json'));for(const npc of Object.keys(data.stocks)){const stock=hub.hubDefaultStock(npc,t);assert.ok(stock&&typeof stock==='object');for(const id of ids)assert.ok(!(id in stock),id+' shop '+npc);}
 for(const npc of new Set(recipes.NPC_RECIPES.map(r=>r.npc)))for(const r of recipes.recipesFor(npc))assert.ok(!ids.includes(r.output)&&!Object.keys(r.materials).some(m=>ids.includes(m)),'recipe '+r.id);
 for(const id of ids)assert.ok(!gm.giftOptions.some(o=>o.id===id),id+' gm');
 // Held copies (bag, bank, equipped, enhanced instance) are removed and refunded at sell price.
 const base=e.BASES.knight,al={};let p=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-base[k]);p-=al[k];}
 const c=e.createCharacter('回收','knight','m',al,t),gold=c.gold;c.bag.afei_drop_wpn_33=2;c.bank.afei_drop_wpn_14=1;c.bag['afei_drop_wpn_16@x1']=1;c.enh['afei_drop_wpn_16@x1']=5;c.equipment.weapon={id:'afei_drop_wpn_halberd',en:3};c.locked=['afei_drop_wpn_33'];c.autoSell=['afei_drop_wpn_14'];
 const s={v:1,at:t,characters:[c],active:c.id};e.advance(s,t+1000,()=>.5);
 const price=id=>Math.floor(e.DATA.items[id].sellP??e.DATA.items[id].p*.25);
 assert.equal(c.gold-gold,price('afei_drop_wpn_33')*2+price('afei_drop_wpn_14')+price('afei_drop_wpn_16')+price('afei_drop_wpn_halberd'));
 assert.ok(!Object.keys(c.bag).concat(Object.keys(c.bank)).some(k=>ids.includes(k.split('@')[0])));assert.equal(c.equipment.weapon,undefined);assert.equal(c.enh['afei_drop_wpn_16@x1'],undefined);
 assert.deepEqual(c.locked,[]);assert.deepEqual(c.autoSell,[]);assert.ok(c.logs.some(l=>/已從遊戲移除/.test(l.text)));
 const g2=c.gold;e.advance(s,t+2000,()=>.5);assert.equal(c.gold,g2,'refund only once');
 c.zone='town_silver_knight';c.gold=1e6;assert.throws(()=>e.action(s,{type:'buy',item:'afei_drop_wpn_33',n:1},t+3000),/已從遊戲移除/);
 console.log('PASS retired items: no drops/shops/recipes/GM, held copies refunded once, cannot be bought');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
