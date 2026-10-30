const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'game-cpu-'));
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of ['parsed-save','settings-payload','game-display-text'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/game',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const {parsedSave}=require(path.join(dir,'parsed-save.js')),{settingsPayload}=require(path.join(dir,'settings-payload.js'));
 const row={payload:JSON.stringify({at:1,characters:[],bag:Array.from({length:5000},(_,i)=>({id:i,count:1}))}),revision:1};
 const originalParse=JSON.parse;let parses=0;JSON.parse=(...args)=>{parses++;return originalParse(...args);};
 let first;
 try{first=parsedSave(row);for(let i=0;i<8;i++)assert.equal(parsedSave(row),first);assert.equal(parses,1);}finally{JSON.parse=originalParse;}
 const other=parsedSave({...row});assert.notEqual(other,first,'different reads/players must not share mutable saves');
 row.payload=JSON.stringify({at:2,characters:[]});assert.equal(parsedSave(row).at,2);
 const setting={id:'monsters',revision:1,payload:JSON.stringify({definitions:{mob:{name:'日出帝國 測試',hp:10}},history:[]})};
 parses=0;JSON.parse=(...args)=>{parses++;return originalParse(...args);};
 try{const a=settingsPayload(setting);a.definitions.mob.hp=99;const b=settingsPayload({...setting});assert.equal(b.definitions.mob.hp,10);assert.equal(b.definitions.mob.name,'測試');assert.equal(parses,1);}finally{JSON.parse=originalParse;}
 setting.payload=JSON.stringify({definitions:{mob:{hp:20}}});assert.equal(settingsPayload(setting).definitions.mob.hp,20,'same revision with changed payload invalidates cache');
 setting.revision++;assert.equal(settingsPayload(setting).revision,2);
 console.log('PASS: one parse per save row, row/payload isolation, immediate settings invalidation, private clones and display sanitization');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
