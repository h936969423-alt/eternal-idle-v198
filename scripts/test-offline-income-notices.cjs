const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const dir=fs.mkdtempSync('/tmp/offline-notices-');
try{
 fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
 for(const name of ['offline-income','offline-income-notices'])fs.writeFileSync(path.join(dir,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/game',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
 const {createOfflineIncomeNotices,OFFLINE_NOTICE_KEY}=require(path.join(dir,'offline-income-notices.js')),income=require(path.join(dir,'offline-income.js'));
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const receipt={id:'receipt-one',seen:false,gold:200,drops:{arrow:5}},before=JSON.stringify(receipt);
 const first=createOfflineIncomeNotices(storage,new Set());assert.equal(first.claim(receipt),true);assert.equal(first.claim({...receipt}),false,'repeated responses do not schedule another dialog');assert.equal(JSON.stringify(receipt),before,'notification tracking must not mutate earned income');
 // Component remount/reload while the server acknowledgement is still in flight.
 const reload=createOfflineIncomeNotices(storage,new Set());assert.equal(reload.claim({...receipt}),false);reload.remember(receipt.id);assert.equal(createOfflineIncomeNotices(storage,new Set()).claim(receipt),false);
 const next={...receipt,id:'receipt-two'};assert.equal(reload.claim(next),true);assert.equal(reload.claim(receipt),false,'an older response cannot reopen the previous receipt');assert.equal(reload.claim(next),false);
 // A second browser view re-reads the notification marker written by the first.
 const other=createOfflineIncomeNotices(storage,new Set());assert.equal(other.claim(next),false);assert.equal(other.claim({...next,id:'receipt-three'}),true);
 assert.equal(other.claim({...next,id:'already-seen',seen:true}),false);assert.equal(other.claim(null),false);
 values.set(OFFLINE_NOTICE_KEY,'invalid json');const corrupt=createOfflineIncomeNotices(storage,new Set());assert.equal(corrupt.claim({id:'corrupt-fallback',seen:false}),true);assert.equal(corrupt.claim({id:'corrupt-fallback',seen:false}),false);
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(createOfflineIncomeNotices(blocked).claim({id:'memory-fallback',seen:false}),true);assert.equal(createOfflineIncomeNotices(blocked).claim({id:'memory-fallback',seen:false}),false,'blocked storage still deduplicates within the running app');
 const many=createOfflineIncomeNotices(storage,new Set());for(let i=0;i<100;i++)many.remember('history-'+i);const ids=JSON.parse(values.get(OFFLINE_NOTICE_KEY));assert.equal(ids.length,64);assert.equal(ids.at(-1),'history-99');
 const save={v:1,characters:[],active:null,at:10000};const report={offline:true,pendingSeconds:0,seconds:120,kills:2,gold:100,xp:20,drops:{arrow:3}};
 income.rememberOfflineIncome(save,report,10000);const settled=structuredClone(save.offlineIncome);income.rememberOfflineIncome(save,report,10000);assert.deepEqual(save.offlineIncome,settled,'same settlement retains one receipt ID');income.acknowledgeOfflineIncome(save,settled.id);income.rememberOfflineIncome(save,report,10000);assert.equal(save.offlineIncome.seen,true,'replaying settlement cannot clear its read marker');
 save.offlineIncome.seen=false;save.catchup={seconds:120,kills:2,gold:100};assert.equal(income.unreadOfflineIncome(save),null,'unfinished catch-up must not auto-open the old receipt');delete save.catchup;assert.equal(income.unreadOfflineIncome(save).id,settled.id);
 income.rememberOfflineIncome(save,report,130000);assert.notEqual(save.offlineIncome.id,settled.id);assert.equal(save.offlineIncome.seen,false);assert.equal(save.offlineIncome.gold,100);assert.deepEqual(save.offlineIncome.drops,{arrow:3});
 console.log('PASS: one auto-dialog per receipt across retries, remount/reload, delayed acknowledgement and stale responses; pending catch-up waits for final settlement; stable receipt identity/read state; storage fallback and bounded history; real new income remains visible.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
