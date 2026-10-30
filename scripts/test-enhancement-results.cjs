const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'enhancement-result-'));
const compile=(source,jsx=false)=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.ReactJSX:undefined,esModuleInterop:true}}).outputText;
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),compile(fs.readFileSync(from,'utf8')));}
const e=require(path.join(dir,'engine.js')),gear=require(path.join(dir,'gear.js')),sync=require(path.join(dir,'state-sync.js')),comparison=require(path.join(dir,'enhancement-comparison.js'));
try{

const now=Date.now();
function fixture(source='apang381'){
 const s=e.emptySave(now),b=e.BASES.knight,allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}
 e.action(s,{type:'create',name:'強化動畫測試',cls:'knight',gender:'m',allocation},now);const c=s.characters[0];c.lv=60;c.zone='town_silver_knight';c.running=false;
 const id=Object.keys(e.DATA.items).find(id=>{const i=e.DATA.items[id];return i.type==='wpn'&&i.source===source&&!i.noEnh&&!i.noEquip&&!i.isArrow&&i.safe>0&&i.safe<10&&i.p>0&&(!i.bless||i.bless<128);});assert(id);
 c.bag[id]=2;c.enh[id]=0;c.equipment.weapon={id,en:0};for(const scroll of ['scroll_weapon','scroll_weapon_b','scroll_weapon_s'])c.bag[scroll]=100;
 return {s,c,id};
}
function request(c,item,mode='normal'){return {type:'enhance',item,mode,expectedEn:c.enh[item]||0,requestId:crypto.randomUUID(),sequence:(c.enhancement?.sequence||0)+1};}
function money(c){return JSON.stringify({gold:c.gold,bag:c.bag,enh:c.enh,equipment:c.equipment,affixes:c.affixes,history:c.enhancement});}
for(const source of ['apang381','lineagew']){
 const {s,c,id}=fixture(source),a=request(c,id),before=c.bag.scroll_weapon,originalRates=gear.enhancementInfo(c,id);
 e.action(s,a,now,()=>0);const r=c.enhancement.history[0];
 assert.equal(r.outcome,'success');assert.equal(r.from,0);assert.equal(r.to,1);assert.equal(r.consumed,1);assert.equal(r.scroll,'scroll_weapon');assert.equal(r.originalKey,id);assert(r.key.includes('@'));assert.equal(c.bag[r.key],1);assert.equal(c.bag[id],1);assert.equal(c.enh[r.key],1);assert.equal(c.enh[id]||0,0);assert.equal(c.equipment.weapon.id,r.key);assert.equal(c.bag.scroll_weapon,before-1);
 assert.equal(c.lastGear.enhancement.outcome,r.outcome);assert.equal(c.lastGear.nonce,r.id);assert.equal(originalRates.chance,1);
 const changes=comparison.enhancementChanges(c,r,now);assert(changes.some(row=>row.before!==row.after));
 const restored=JSON.parse(JSON.stringify(sync.persistedSave(s))),ch=restored.characters[0],snapshot=money(ch);
 e.action(restored,a,now,()=>.999);assert.equal(money(ch),snapshot,'success retry returns its receipt even after item split');
 assert.throws(()=>e.action(restored,{...a,mode:'blessed'},now,()=>0),/內容不符/);assert.equal(money(ch),snapshot);
}
{
 const {s,c,id}=fixture(),a=request(c,id,'blessed'),before=c.bag.scroll_weapon_b;
 e.action(s,a,now,()=>.31);const r=c.enhancement.history[0];assert.equal(r.outcome,'hold');assert.equal(r.from,0);assert.equal(r.to,0);assert.equal(c.bag[r.key],1);assert.equal(c.bag.scroll_weapon_b,before-1);assert.deepEqual(comparison.enhancementChanges(c,r),[]);
 const snapshot=money(c);e.action(s,a,now,()=>0);assert.equal(money(c),snapshot,'holding the same +level must never allow another deduction');
}
for(const source of ['apang381','lineagew']){
 const {s,c,id}=fixture(source),safe=e.DATA.items[id].safe;c.enh[id]=safe;c.equipment.weapon.en=safe;c.bag.scroll_weapon_s=0;
 const a=request(c,id),before=c.bag.scroll_weapon;e.action(s,a,now,()=>.9999);const r=c.enhancement.history[0];
 assert.equal(r.outcome,'destroyed');assert.equal(r.to,null);assert.equal(c.bag[r.key],undefined);assert.equal(c.bag[id],1);assert.equal(c.enh[id],safe);assert.equal(c.bag.scroll_weapon,before-1);assert.equal(c.equipment.weapon,undefined);
 const snapshot=money(c);e.action(s,a,now,()=>0);assert.equal(money(c),snapshot,'destroyed-item retries cannot touch the remaining same-name copy');
}
{
 const {s,c,id}=fixture(),a=request(c,id,'blessed');e.action(s,a,now,()=>.99);const r=c.enhancement.history[0];assert.equal(r.outcome,'success');assert.equal(r.to,3,'blessing jump remains unchanged');
}
{
 const {s,c,id}=fixture(),a=request(c,id,'safe'),safe=e.DATA.items[id].safe,before=c.bag.scroll_weapon;e.action(s,a,now,()=>.99);const r=c.enhancement.history[0];assert.equal(r.to,safe);assert.equal(r.consumed,safe);assert.equal(c.bag.scroll_weapon,before-safe);
}
{
 const {s,c,id}=fixture('lineagew');c.enh[id]=e.DATA.items[id].safe;c.equipment.weapon.en=c.enh[id];const a=request(c,id,'refined'),before=c.bag.scroll_weapon_s;e.action(s,a,now,()=>.99);const r=c.enhancement.history[0];assert.equal(r.outcome,'success');assert.equal(r.scroll,'scroll_weapon_s');assert.equal(c.bag.scroll_weapon_s,before-1);
}
for(const kind of ['scroll','locked','stale-en','stale-sequence','bad-id']){
 const {s,c,id}=fixture(),a=request(c,id);
 if(kind==='scroll')c.bag.scroll_weapon=0;if(kind==='locked')c.locked=[id];if(kind==='stale-en')a.expectedEn=4;if(kind==='stale-sequence')a.sequence=0;if(kind==='bad-id')a.requestId='bad';
 const before=money(c);assert.throws(()=>e.action(s,a,now,()=>0));assert.equal(money(c),before,kind);
}
{
 const {s,c,id}=fixture(),a=request(c,id);e.action(s,a,now,()=>0);let key=c.enhancement.history[0].key;
 for(let n=0;n<33;n++){c.enh[key]=0;c.equipment.weapon.en=0;e.action(s,request(c,key),now,()=>0);key=c.enhancement.history[0].key;}
 assert.equal(c.enhancement.history.length,32);const before=money(c);assert.throws(()=>e.action(s,a,now,()=>0),/狀態已更新/);assert.equal(money(c),before);
}
console.log('PASS: success/hold/destruction receipts, actual consumption, same-name isolation, +3 blessing, safe/refined modes, comparison, saved retries and stale-sequence fencing.');

const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const tag=name=>({children,variant,...props})=>React.createElement(name,props,children);
function loadUI(hooks=React){
 const moduleObject={exports:{}};
 new Function('require','module','exports','performance','setTimeout','clearTimeout',compile(fs.readFileSync(path.join(root,'app/item-enhancement.tsx'),'utf8'),true))(id=>{
  if(id==='react')return hooks;if(id.endsWith('.css'))return {};
  if(id==='@/components/ui/button')return {Button:tag('button')};
  if(id==='@/components/ui/alert-dialog')return {AlertDialog:({open,children})=>open?React.createElement('div',null,children):null,AlertDialogContent:tag('section'),AlertDialogTitle:tag('h2'),AlertDialogDescription:tag('p'),AlertDialogFooter:tag('footer'),AlertDialogCancel:tag('button')};
  if(id==='./item-icon')return {__esModule:true,default:({src,alt})=>React.createElement('img',{src,alt})};
  if(id==='./enhancement-safety')return {__esModule:true,default:()=>null};
  if(id.startsWith('@/lib/game/'))return require(path.join(dir,id.slice(11)));return require(id);
 },moduleObject,moduleObject.exports,hooks.clock||performance,hooks.schedule||setTimeout,hooks.cancel||clearTimeout);
 return moduleObject.exports;
}
{
 const UI=loadUI(),{s,c,id}=fixture();
 const html=renderToStaticMarkup(React.createElement(UI.default,{c,item:id,busy:false,act:async()=>{},onDone:()=>{}}));
 for(const label of ['一般強化','祝福強化','一鍵安定','精煉強化','開始強化','更換裝備'])assert(html.includes(label));
 for(const kind of ['success','hold','destroyed']){
  const result={id:kind,item:id,key:id,originalKey:id,outcome:kind,from:6,to:kind==='destroyed'?null:kind==='success'?7:6,scroll:'scroll_weapon',consumed:1,mode:'normal',requestId:'receipt-test',sequence:1,at:now,message:''};
  const h=renderToStaticMarkup(React.createElement(UI.EnhancementResultPanel,{result,changes:kind==='success'?[{label:'命中',before:6,after:7}]:[]}));
  assert(h.includes({success:'強化成功',hold:'強化維持',destroyed:'強化失敗'}[kind]));
  assert(h.includes(kind==='destroyed'?'裝備消失':kind==='hold'?'裝備保留':'命中'));assert(h.includes('×1'));
 }
}
function harness(source,mode,rng,lost=false,stalled=false){
 const {s,c,id}=fixture(source);c.bag[id]=1;
 if(mode==='destroyed'){c.enh[id]=e.DATA.items[id].safe;c.equipment.weapon.en=c.enh[id];c.bag.scroll_weapon_s=0;}
 let clock=0,index=0,timerId=0,slots=[],effects=[],tree;
 const timers=new Map(),calls=[],done=[];
 const changed=(a,b)=>!a||b.some((v,n)=>!Object.is(v,a[n]));
 const hooks={...React,clock:{now:()=>clock},
  useRef:value=>{const i=index++;return slots[i]??={current:value};},
  useState:value=>{const i=index++;slots[i]??={value};return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;}];},
  useCallback:(fn,deps)=>{const i=index++;if(changed(slots[i]?.deps,deps))slots[i]={deps,callback:fn};return slots[i].callback;},
  useEffect:(fn,deps)=>{const i=index++,old=slots[i];if(changed(old?.deps,deps))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
  schedule:(fn,ms)=>{const id=++timerId;timers.set(id,{at:clock+ms,fn});return id;},cancel:id=>timers.delete(id)
 };
 const UI=loadUI(hooks).default;
 const render=()=>{index=0;tree=UI({c,item:id,busy:false,act:async a=>{calls.push(a);if(stalled)return new Promise(()=>{});e.action(s,a,now,rng);if(lost&&calls.length===1)return null;return {save:s};},onDone:key=>done.push(key)});const pending=effects;effects=[];pending.forEach(fn=>fn());return tree;};
 function text(node){if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join('');return node?.props?text(node.props.children):'';}
 function find(node,label){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const result=find(child,label);if(result)return result;}return null;}if(node.props?.open===false)return null;if(typeof node.props?.onClick==='function'&&text(node.props.children)===label)return node;return find(node.props?.children,label);}
 const click=label=>{const button=find(tree,label);assert(button,'missing '+label);assert(!button.props.disabled,'disabled '+label);button.props.onClick();};
 const advance=to=>{while(true){const row=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!row||row[1].at>to)break;clock=row[1].at;timers.delete(row[0]);row[1].fn();}clock=to;};
 render();if(mode==='hold'){click('祝福強化');render();}
 return {s,c,id,calls,done,click,render,advance,get tree(){return tree;},find:label=>find(tree,label)};
}
const flush=async()=>{for(let n=0;n<5;n++)await Promise.resolve();};
async function exercise(){
 for(const kind of ['success','hold','destroyed']){
  const h=harness('apang381',kind,()=>kind==='hold'?.31:kind==='destroyed'?.9999:0);
  h.click('開始強化');h.render();h.click('確認衝裝');h.click('確認衝裝');await flush();h.render();
  assert.equal(h.calls.length,1,'rapid repeat cannot issue another mutation');assert.equal(h.tree.props['data-phase'],'charging');assert.equal(h.tree.props['data-outcome'],'hidden');assert.equal(h.done.length,0);
  h.advance(1000);h.render();assert.equal(h.tree.props['data-phase'],'ready');assert.equal(h.tree.props['data-outcome'],'hidden');
  h.click('點擊揭曉');h.render();assert.equal(h.tree.props['data-phase'],'revealing');assert.equal(h.tree.props['data-outcome'],kind);
  h.advance(2200);h.render();assert.equal(h.tree.props['data-phase'],'result');assert.equal(h.done.length,0,'item destruction must not dismiss the outcome');
  if(kind==='destroyed'){assert(h.find('繼續強化').props.disabled);h.click('關閉強化');assert.equal(h.done[0],null);}
  else{const key=h.c.enhancement.history[0].key;h.click('繼續強化');h.render();assert.equal(h.tree.props['data-phase'],'select');h.click('開始強化');h.render();h.click('確認衝裝');await flush();assert.equal(h.calls[1].item,key,'continue selects the actual split equipment instance');}
 }
 const stalled=harness('apang381','success',()=>0,false,true);stalled.click('開始強化');stalled.render();stalled.click('確認衝裝');stalled.render();stalled.advance(15000);stalled.render();assert.equal(stalled.tree.props['data-phase'],'retry','stalled network recovery must unlock charging');assert(stalled.find('關閉強化'));assert.equal(stalled.calls.length,1);
 const h=harness('apang381','hold',()=>.31,true);h.click('開始強化');h.render();h.click('確認衝裝');await flush();h.render();assert.equal(h.tree.props['data-phase'],'retry');
 const before=money(h.c);h.click('確認上次強化結果');await flush();h.render();assert.equal(h.calls[1].requestId,h.calls[0].requestId);assert.equal(money(h.c),before,'lost response confirmation cannot consume another scroll');
 console.log('PASS: real enhancement UI lifecycle, click-to-reveal, three outcomes, result retention, continuation with the actual item key, double-click lock and lost-response confirmation.');
}
exercise().finally(()=>fs.rmSync(dir,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});

}catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error;}

