const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync('/tmp/character-menu-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync('lib/game')){const from=path.join('lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),rules=require(path.join(dir,'character-menu.js')),sync=require(path.join(dir,'state-sync.js'));
 const now=1_000_000,s=e.emptySave(now),base=e.BASES.knight,allocation={};let left=base.pts;
 for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-base[k]);left-=allocation[k];}
 const create=name=>e.action(s,{type:'create',name,cls:'knight',gender:'m',allocation},now);
 create('甲');create('乙');create('丙');assert.equal(s.characters.length,3);assert.throws(()=>create('丁'),/三位/);
 const [a,b,c]=s.characters;const original=JSON.stringify(a);e.action(s,{type:'deleteCharacter',id:a.id},now);
 const first=structuredClone(s.characterDeletions[a.id]);assert.equal(first.deleteAt,now+10_000);assert.equal(JSON.stringify(a),original,'scheduling preserves the character and possessions');
 e.action(s,{type:'deleteCharacter',id:a.id},now+2000);assert.deepEqual(s.characterDeletions[a.id],first,'a duplicate request never extends the deadline');
 assert.throws(()=>e.action(s,{type:'select',id:a.id},now),/取消刪除/);
 let reload=JSON.parse(JSON.stringify(sync.persistedSave(s)));rules.settleCharacterDeletions(reload,now+9999);assert.equal(reload.characters.length,3);
 e.action(reload,{type:'cancelCharacterDeletion',id:a.id,token:first.token},now+9999);e.advance(reload,now+10001,()=>.5);assert.equal(reload.characters.length,3);assert.equal(reload.characterDeletions,undefined,'cancel survives reload and the old deadline');
 e.action(reload,{type:'deleteCharacter',id:a.id},now+11000);const second=reload.characterDeletions[a.id];assert.notEqual(second.token,first.token);assert.throws(()=>e.action(reload,{type:'cancelCharacterDeletion',id:a.id,token:first.token},now+12000),/狀態已更新/);
 assert.throws(()=>e.action(reload,{type:'cancelCharacterDeletion',id:a.id,token:second.token},second.deleteAt),/倒數已結束/);
 reload.active=a.id;e.advance(reload,second.deleteAt,()=>.5);assert.deepEqual(reload.characters.map(x=>x.id),[b.id,c.id]);assert.equal(reload.active,null);assert.equal(reload.characterDeletions,undefined);
 e.action(reload,{type:'select',id:b.id},second.deleteAt);assert.equal(reload.active,b.id,'selection works when the previous active character was deleted');
 e.action(reload,{type:'create',name:'丁',cls:'knight',gender:'m',allocation},second.deleteAt);assert.equal(reload.characters.length,3,'only committed deletion frees a slot');
 for(const ch of [...reload.characters])e.action(reload,{type:'deleteCharacter',id:ch.id},second.deleteAt);
 const disconnected=JSON.parse(JSON.stringify(sync.persistedSave(reload)));e.advance(disconnected,second.deleteAt+30000,()=>.5);assert.equal(disconnected.characters.length,0);assert.equal(disconnected.active,null);
 e.action(disconnected,{type:'create',name:'新角色',cls:'knight',gender:'m',allocation},second.deleteAt+30000);assert.equal(disconnected.characters.length,1);
 assert.throws(()=>e.action(disconnected,{type:'deleteCharacter',id:'other-account-id'},now),/角色不存在/);
 // Legacy accounts exceeding the new limit retain every character.
 const legacy=e.emptySave(now);legacy.characters=[a,b,c,{...structuredClone(a),id:'legacy-fourth'}];e.advance(legacy,now,()=>.5);assert.equal(legacy.characters.length,4);assert.throws(()=>e.action(legacy,{type:'create',name:'五',cls:'knight',gender:'m',allocation},now),/三位/);
 console.log('PASS: server three-character limit; 10-second boundary; cancel/reload; stale/duplicate requests; committed deletion frees slot; active/all deletion and recreation; foreign IDs; legacy preservation.');
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),module={exports:{}};
 const compiled=ts.transpileModule(fs.readFileSync('app/character-menu.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('module','exports','require',compiled)(module,module.exports,n=>n==='@/components/ui/button'?{Button:({children,...p})=>React.createElement('button',p,children)}:n==='@/lib/game/character-menu'?rules:require(n));
 const props={save:s,busy:false,error:'',serverOffset:0,onEnter:async()=>{},onCreate:()=>{},act:async()=>{},onRefresh:()=>{}};
 const html=renderToStaticMarkup(React.createElement(module.exports.default,props));assert.match(html,/人物選單/);assert.match(html,/取消刪除/);assert.match(html,/進入遊戲/);assert.ok(!html.includes('尚可建立'));
 const empty=renderToStaticMarkup(React.createElement(module.exports.default,{...props,save:e.emptySave(now)}));assert.match(empty,/建立角色/);assert.match(empty,/尚可建立 3 位/);
 console.log('PASS: actual menu markup renders empty/full slots, character selection and cancellation.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
