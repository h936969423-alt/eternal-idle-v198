const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'lw-removal-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
try{
 for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts')&&!name.endsWith('-store.ts')&&name!=='game-settings.ts')fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),m=require(path.join(dir,'lineagew-equipment-removal.js')),removal=require(path.join(dir,'lineagew-equipment-removal.json')),hub=require(path.join(dir,'npc-hub-data.json')),drops=require(path.join(dir,'monster-drops.json')),rates=require(path.join(dir,'monster-drop-rates.json')),icons=require(path.join(dir,'gm-icon-library.json')),t=1000000;
 const W=/^lw_(equipment|weapon)_\d+$/;
 // Catalog: no W gear anywhere, the old equipment is back, the W icons stay available to GMs.
 assert.deepEqual(Object.keys(e.DATA.items).filter(k=>W.test(k)),[]);assert.equal(Object.keys(removal.items).length,784);assert.equal(icons.length,784);
 for(const old of ['lineagew-retired','lineagew-hl-retired','lineagew-mythic-retired'])for(const id of Object.keys(require(path.join(dir,old+'.json')).items))assert.ok(e.DATA.items[id],id);
 for(const data of [hub,drops,rates])assert.ok(!/"lw_(equipment|weapon)_\d+"/.test(JSON.stringify(data)));
 for(const [w,o]of Object.entries(removal.replace)){assert.ok(e.DATA.items[o],o);assert.equal(e.DATA.items[o].slot,removal.items[w].slot,w);}
 // Every drop and shop reference points at a real item.
 for(const npc of Object.values(hub.stocks))for(const id of Object.keys(npc))assert.ok(e.DATA.items[id]||!/^(lw_|ap381_)/.test(id),id);
 assert.ok(Object.values(hub.recipes).every(r=>!/^ap381_/.test(r.output)||e.DATA.items[r.output]));
 // Held gear.
 const sameName=Object.keys(removal.replace)[0],target=removal.replace[sameName],refund=Object.keys(removal.items).find(id=>!removal.replace[id]&&id.startsWith('lw_equipment')),proto=Object.keys(removal.items).find(id=>id.startsWith('lw_weapon')&&!removal.replace[id]),base=e.BASES.knight,al={};let p=base.pts;for(const k of ['str','dex','con','int','wis','cha']){al[k]=Math.min(p,20-base[k]);p-=al[k];}
 const c=e.createCharacter('下架','knight','m',al,t),inst=sameName+'@x1',gold=c.gold;
 Object.assign(c.bag,{[inst]:1,[sameName]:3,[refund]:2,[refund+'@y']:1});c.bank[sameName]=1;c.enh[inst]=7;c.enh[refund+'@y']=4;c.equipment.armor={id:inst,en:7};c.locked=[inst,refund];c.autoSell=[refund];
 let s={v:1,at:t,characters:[c],active:c.id};const out=m.prepareLineageWRemoval(s,t);assert.equal(out.changed,true);const r=out.save.characters[0],key=target+'@lw2_'+encodeURIComponent(inst);
 assert.equal(r.bag[key],1);assert.equal(r.enh[key],7,'enhancement kept');assert.deepEqual(r.equipment.armor,{id:key,en:7},'still worn');assert.ok(r.locked.includes(key));assert.equal(r.bag[target],3,'plain stack merges');assert.equal(r.bank[target],1);
 const sell=removal.items[refund].sellP;assert.ok(sell>0);assert.equal(r.gold-gold,sell*3);
 assert.ok(!Object.keys({...r.bag,...r.bank,...r.enh}).some(k=>removal.items[k.split('@')[0]]));assert.deepEqual(r.autoSell,[]);assert.ok(!r.locked.includes(refund));assert.ok(/天堂W裝備已下架/.test(r.logs[0].text));
 // Runs once.
 const again=m.prepareLineageWRemoval(out.save,t+1);assert.equal(again.changed,false);assert.equal(again.save.characters[0].gold,r.gold);
 // The four prototype mythic weapons had no sell price; they refund like catalog mythics.
 assert.equal(removal.items[proto].sellP,750000);const c2=e.createCharacter('神話','knight','m',al,t),g2=c2.gold;c2.bag[proto]=1;c2.equipment.weapon={id:proto,en:5};c2.enh[proto]=5;
 const r2=m.prepareLineageWRemoval({v:1,at:t,characters:[c2],active:c2.id},t).save.characters[0];assert.equal(r2.gold-g2,750000,'worn copy paid once');assert.equal(r2.equipment.weapon,undefined);
 // The migrated character keeps simulating with its replacement gear.
 const live={...out.save};e.advance(live,t+5000,()=>.5);assert.ok(e.stats(r,t+5000));
 console.log('PASS W equipment removal: catalog, drops, shops, conversion keeps enhancement, refunds once');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
