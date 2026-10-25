const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync('/tmp/retired-dual-');fs.writeFileSync(path.join(dir,'package.json'),'{\"type\":\"commonjs\"}');
for(const name of fs.readdirSync(path.join(__dirname,'../lib/game'))){const from=path.join(__dirname,'../lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),gm=require(path.join(dir,'gm-grants.js')),options=require(path.join(dir,'gm-item-options.js')),migration=require(path.join(dir,'equipment381-migration.js'));
try{
const id='wpn_eternal_night_dual',now=1000000;
// This weapon was explicitly removed by catalog replacement. Validate that
// replacement contract, rather than silently restoring an obsolete weapon.
assert.ok(require('../lib/game/equipment381-legacy-ids.json').includes(id));
assert.equal(e.DATA.items[id],undefined);
assert.ok(!options.weaponOptions.some(i=>i.id===id));
const b=e.BASES.dark,allocation={};let left=b.pts;for(const key of ['str','dex','con','int','wis','cha']){allocation[key]=Math.min(left,20-b[key]);left-=allocation[key];}
const c=e.createCharacter('舊雙刀保護測試','dark','m',allocation,now),save=e.emptySave(now);save.characters=[c];save.active=c.id;
const original=JSON.stringify(save);
assert.throws(()=>gm.validateGrant({characterId:c.id,type:'weapon',itemId:id,quantity:1,enhancement:0}),/武器|裝備|物品|道具|不存在/);
assert.equal(JSON.stringify(save),original,'a rejected retired grant cannot change the save');
const key=id+'@old';c.bag[key]=1;c.bank[key]=2;c.enh[key]=100;c.affixes||={};c.affixes[key]={key:'families',name:'',value:0,ancient:'eternal'};c.equipment.weapon={id:key,en:100};c.running=true;
delete save.equipmentCatalogVersion; // Model a real pre-replacement save, not a new v198 save.
const before=JSON.stringify(save),result=migration.prepareEquipment381Migration(save,now+1);
assert.equal(result.backup,before);assert.equal(JSON.stringify(save),before);
const after=result.save.characters[0];assert.equal(after.bag[key],undefined);assert.equal(after.bank[key],undefined);assert.equal(after.enh[key],undefined);assert.equal(after.affixes[key],undefined);assert.equal(after.equipment.weapon,undefined);assert.equal(after.running,false);
for(const field of ['id','name','lv','xp','gold','attrs','skills'])assert.deepEqual(after[field],c[field],field+' progress preserved');
assert.equal(migration.prepareEquipment381Migration(result.save,now+2).changed,false);
const backup=JSON.parse(result.backup).characters[0];assert.equal(backup.bag[key],1);assert.equal(backup.bank[key],2);assert.equal(backup.enh[key],100);assert.deepEqual(backup.affixes[key],c.affixes[key]);
console.log('PASS: retired Eternal Night dual cannot be newly granted; catalog replacement backs up exact ownership, enhancement and affixes; current character progress preserved; replacement is immutable and idempotent.');

}finally{fs.rmSync(dir,{recursive:true,force:true});}
