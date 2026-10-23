const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync('/tmp/character-menu-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync('lib/game')){const from=path.join('lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
 const e=require(path.join(dir,'engine.js')),rules=require(path.join(dir,'character-menu.js')),sync=require(path.join(dir,'state-sync.js'));
 const s=e.emptySave(1000);
 e.action(s,{type:'interfaceTheme',theme:'classic'},1000);
 assert.equal(s.interfaceTheme,'classic','account setting works without a character');
 for(const invalid of ['ocean',null,{},undefined]){assert.throws(()=>e.action(s,{type:'interfaceTheme',theme:invalid},1000),/色系/);assert.equal(s.interfaceTheme,'classic');}
 const stored=JSON.parse(JSON.stringify(sync.persistedSave(s)));assert.equal(stored.interfaceTheme,'classic');
 const full=sync.responseSave(stored,'settings');assert.equal(full.save.interfaceTheme,'classic');
 assert.equal(sync.mergeGameSave(null,full.save,full.sync).interfaceTheme,'classic');
 e.action(stored,{type:'interfaceTheme',theme:'ice'},1000);assert.equal(stored.interfaceTheme,'ice');
 e.action(stored,{type:'interfaceTheme',theme:'classic'},1000);e.advance(stored,2000,()=>.5);assert.equal(stored.interfaceTheme,'classic');
 const another=e.emptySave(1000);assert.equal(another.interfaceTheme,undefined,'preferences remain account-specific');
 console.log('PASS: cloud account theme survives persistence, responses, reconciliation and advance; no-character accounts supported; invalid choices rejected; separate accounts isolated.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
