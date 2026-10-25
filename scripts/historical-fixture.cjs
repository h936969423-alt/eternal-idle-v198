const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
let snapshots,manifest;
module.exports=function historicalFixture(ref){
 if(!snapshots){
  const dir=path.join(__dirname,'../tests/fixtures');
  manifest=JSON.parse(fs.readFileSync(path.join(dir,'legacy-baselines.manifest.json'),'utf8'));
  const archive=fs.readFileSync(path.join(dir,'legacy-baselines.json.gz'));
  if(crypto.createHash('sha256').update(archive).digest('hex')!==manifest.compressedSha256)throw Error('Historical fixture archive checksum mismatch');
  snapshots=JSON.parse(zlib.gunzipSync(archive,{maxOutputLength:25*1024*1024}).toString('utf8'));
 }
 const row=snapshots[ref];if(!row||!manifest.snapshots[ref])throw Error('Missing historical fixture: '+ref);
 const bytes=Buffer.from(row.content,'utf8');
 const sha=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
 if(sha!==row.blobSha1||sha!==manifest.snapshots[ref])throw Error('Historical Git blob checksum mismatch: '+ref);
 return row.content;
};
