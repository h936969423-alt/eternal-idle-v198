const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/asset-storage.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const mod={exports:{}};new Function('require','module','exports',code)(name=>name==='./asset-storage-config.json'?{indexKey:'legacy-index.json'}:require(path.join(__dirname,'../lib',name)),mod,mod.exports);
(async()=>{
 let touched=0;const unavailable={get:async()=>{touched++;throw Error('R2 intentionally unavailable');}};
 for(const method of ['GET','HEAD'])for(const name of ['antaras-skill_effect','fafurion-idle','valakas-skill','lindvior-spawn']){
  const request=new Request('https://eternal.test/assets/four-dragons/'+name+'.webp',{method});
  assert.equal(await mod.exports.assetStorageFetch(request),null,'bundled graphics need no R2 binding');
  assert.equal(await mod.exports.assetStorageFetch(request,unavailable),null,'bundled graphics bypass the legacy index');
 }
 assert.equal(touched,0);
 assert.equal((await mod.exports.assetStorageFetch(new Request('https://eternal.test/assets/legacy.webp'))).status,503,'legacy graphics retain their storage boundary');
 assert.equal((await mod.exports.assetStorageFetch(new Request('https://eternal.test/api/internal/asset-storage/x',{method:'POST'}))).status,403,'upload endpoint remains disabled');
 console.log('PASS: four-dragon GET/HEAD reach bundled assets without R2 or legacy index; other asset routes and disabled uploads retain their behavior.');
})().catch(error=>{console.error(error);process.exitCode=1;});
