// Pure mechanics need controllable equipment/materials. These definitions are
// written only into a disposable test directory, never the production catalog.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function addTestItems(dir,definitions){
 const file=path.join(dir,'gamedata.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const [id,item] of Object.entries(definitions)){
  assert.ok(id.startsWith('qa_'),'fixture IDs must be visibly test-only');
  assert.equal(data.items[id],undefined,'fixtures cannot override real equipment');
  data.items[id]=item;
 }
 fs.writeFileSync(file,JSON.stringify(data));
};
