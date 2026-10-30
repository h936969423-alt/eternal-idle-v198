const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'black-market-'));
fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const name of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',name);if(name.endsWith('.json'))fs.copyFileSync(from,path.join(dir,name));else if(name.endsWith('.ts'))fs.writeFileSync(path.join(dir,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
const e=require(path.join(dir,'engine.js')),market=require(path.join(dir,'black-market.js')),loot=require(path.join(dir,'loot-appearance.js')),sync=require(path.join(dir,'state-sync.js'));
try{

const now=Date.now();
function fixture(){const s=e.emptySave(now),b=e.BASES.knight,allocation={};let left=b.pts;for(const k of ['str','dex','con','int','wis','cha']){allocation[k]=Math.min(left,20-b[k]);left-=allocation[k];}e.action(s,{type:'create',name:'黑市測試',cls:'knight',gender:'m',allocation},now);const c=s.characters[0];c.lv=60;c.zone='town_silver_knight';c.gold=100000000;c.running=false;return {s,c};}
function request(c,n=1,id=crypto.randomUUID()){return {type:'gacha',npc:'npc_pandora',n,requestId:id,sequence:(c.blackMarket?.sequence||0)+1};}
function money(c){return JSON.stringify({gold:c.gold,bag:c.bag,market:c.blackMarket});}
{
 const pools=market.blackMarketPools(undefined,now);for(const rank of market.BLACK_MARKET_RANKS){assert(pools[rank].length);for(const id of pools[rank]){assert.equal(loot.itemRarity(id),rank);assert(e.DATA.items[id].gachaWeight>0);assert(!e.DATA.items[id]._noGacha);}}
 assert.deepEqual(Object.keys(pools),['normal','advanced','rare']);
 const {s,c}=fixture();for(const [r,expected]of [[0,'normal'],[.33333334,'advanced'],[.66666667,'rare']]){let first=true;e.action(s,request(c),now,()=>first?(first=false,r):.5);assert.equal(c.blackMarket.history[0].items[0].rank,expected);}
 const id=pools.normal[0],old=e.DATA.items[id].availFrom;e.DATA.items[id].availFrom=now+60000;try{assert(!market.blackMarketPools(undefined,now).normal.includes(id));}finally{if(old===undefined)delete e.DATA.items[id].availFrom;else e.DATA.items[id].availFrom=old;}
}
{
 const {s,c}=fixture(),gold=c.gold;for(let i=0;i<10;i++)e.action(s,request(c),now,()=>.5);
 assert.equal(c.gold,gold-3000000);assert.equal(c.blackMarket.progress,10);
 e.action(s,request(c),now,()=>.5);assert.equal(c.gold,gold-3000000);assert.equal(c.blackMarket.progress,0);assert.equal(c.blackMarket.history[0].free,1);
 e.action(s,request(c),now,()=>.5);assert.equal(c.gold,gold-3300000);assert.equal(c.blackMarket.progress,1);
}
{
 const {s,c}=fixture();c.blackMarket={progress:2,sequence:0,history:[]};const gold=c.gold,before={...c.bag};e.action(s,request(c,10),now,()=>.5);
 const r=c.blackMarket.history[0];assert.equal(r.items.length,10);assert.equal(r.paid,9);assert.equal(r.free,1);assert.equal(r.cost,2700000);assert.equal(c.gold,gold-r.cost);assert.equal(c.blackMarket.progress,1);
 const counts={};for(const prize of r.items)counts[prize.item]=(counts[prize.item]||0)+1;for(const [id,n]of Object.entries(counts))assert.equal(c.bag[id],(before[id]||0)+n);
}
{
 const {s,c}=fixture();c.gold=0;c.blackMarket={progress:10,sequence:0,history:[]};e.action(s,request(c),now,()=>.5);assert.equal(c.gold,0);assert.equal(c.blackMarket.progress,0);assert.equal(c.blackMarket.history[0].cost,0);
}
for(const kind of ['poor','level','away','hidden','wrong-npc','missing-id','stale','bad-rng','count']){
 const {s,c}=fixture(),a=request(c,10);let rng=()=>.5;
 if(kind==='poor')c.gold=2999999;if(kind==='level')c.lv=40;if(kind==='away')c.zone='training';
 if(kind==='hidden')c.npcConfig={revision:0,hidden:{'town_silver_knight:npc_pandora':true},shops:{},history:[]};
 if(kind==='wrong-npc')a.npc='npc_glin';if(kind==='missing-id')delete a.requestId;if(kind==='stale')a.sequence=0;if(kind==='bad-rng')rng=()=>1;if(kind==='count')a.n=2;
 const before=money(c);assert.throws(()=>e.action(s,a,now,rng),kind);assert.equal(money(c),before,kind+' cannot charge or grant items');
}
{
 const {s,c}=fixture(),pools=market.blackMarketPools(undefined,now);c.lootAppearance=loot.initialLootAppearance();for(const id of pools.rare)c.lootAppearance.items[id]={rarity:'normal'};
 const before=money(c);assert.throws(()=>e.action(s,request(c),now,()=>.5),/獎池/);assert.equal(money(c),before);
}
{
 const {s,c}=fixture(),a=request(c,10);e.action(s,a,now,()=>.5);const saved=sync.persistedSave(s),restored=JSON.parse(JSON.stringify(saved)),character=restored.characters[0],before=money(character);
 e.action(restored,a,now,()=>0);assert.equal(money(character),before,'lost response retry must not charge or reroll');
 assert.throws(()=>e.action(restored,{...a,n:1},now,()=>0),/內容不符/);assert.equal(money(character),before);
}
{
 const {s,c}=fixture(),a=request(c);e.action(s,a,now,()=>.5);for(let n=0;n<33;n++)e.action(s,request(c),now,()=>.5);
 assert.equal(c.blackMarket.history.length,32);const before=money(c);assert.throws(()=>e.action(s,a,now,()=>0),/狀態已更新/);assert.equal(money(c),before,'expired receipt retries remain fenced by sequence');
}
{
 assert.deepEqual(market.blackMarketQuote(0,10),{paid:10,free:0,cost:3000000,progress:10});
 assert.deepEqual(market.blackMarketQuote(9,10),{paid:9,free:1,cost:2700000,progress:8});
}
console.log('PASS: three equal-probability qualities, pool eligibility, 1/10 draws, free progress, actual inventory/cost, eligibility failures, empty pools, persisted retries, stale-sequence fencing and receipt history.');

const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const tag=name=>({children,variant,...props})=>React.createElement(name,props,children);
const moduleObject={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/black-market.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>{
 if(id.endsWith('.css'))return {};
 if(id==='@/components/ui/button')return {Button:tag('button')};
 if(id==='@/components/ui/dialog')return {Dialog:({open,children})=>open?React.createElement('div',null,children):null,DialogContent:tag('section'),DialogTitle:tag('h2'),DialogDescription:tag('p')};
 if(id==='./item-icon')return {__esModule:true,default:({src,alt})=>React.createElement('img',{src,alt})};
 if(id==='./item-label')return {__esModule:true,default:({item})=>React.createElement('span',null,e.DATA.items[item]?.n||item)};
 if(id.startsWith('@/lib/game/'))return require(path.join(dir,id.slice(11)));return require(id);
},moduleObject,moduleObject.exports);
const UI=moduleObject.exports.default,Pool=moduleObject.exports.BlackMarketPool;
{
 const {c}=fixture(),render=()=>renderToStaticMarkup(React.createElement(UI,{c,npc:'npc_pandora',busy:false,act:async()=>{},inspect:()=>{},onClose:()=>{}}));
 let html=render();for(const label of ['潘朵拉的黑市','單抽 300,000','十連抽 3,000,000','獎勵查看','滿 10 次，下一抽免費'])assert(html.includes(label));
 assert(!html.includes('世界王'));assert.equal((html.match(/data-draw-count=/g)||[]).length,2);
 c.gold=0;c.blackMarket={progress:10,sequence:10,history:[]};html=render();
 assert(html.includes('免費抽獎'));assert(!html.match(/<button[^>]*data-draw-count="1"[^>]*>/)[0].includes('disabled'));
 assert(html.match(/<button[^>]*data-draw-count="10"[^>]*>/)[0].includes('disabled'));
 const pools=market.blackMarketPools(undefined,now),poolHtml=renderToStaticMarkup(React.createElement(Pool,{pools,inspect:()=>{}}));
 assert.equal((poolHtml.match(/<details/g)||[]).length,3);
 for(const rank of market.BLACK_MARKET_RANKS){assert(poolHtml.includes(loot.RARITY_NAMES[rank]));for(const id of pools[rank])assert(poolHtml.includes(renderToStaticMarkup(React.createElement('span',null,e.DATA.items[id].n)).replace(/^<span>|<\/span>$/g,'')));}
 console.log('PASS: real black-market UI shows 1/10 controls, free progress, affordability and every prize in exactly three quality groups; no world-boss draw.');
}
}finally{fs.rmSync(dir,{recursive:true,force:true});}
