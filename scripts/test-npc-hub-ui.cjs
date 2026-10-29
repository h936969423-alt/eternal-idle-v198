const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');
const dir=fs.mkdtempSync('/tmp/npc-hub-ui-');fs.writeFileSync(path.join(dir,'package.json'),'{"type":"commonjs"}');
for(const file of fs.readdirSync(path.join(root,'lib/game'))){const from=path.join(root,'lib/game',file);if(file.endsWith('.json'))fs.copyFileSync(from,path.join(dir,file));else if(file.endsWith('.ts'))fs.writeFileSync(path.join(dir,file.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(from,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);}
try{
const engine=require(path.join(dir,'engine.js')),npc=require(path.join(dir,'npc-config.js'));
const tag=name=>({children,variant,...p})=>React.createElement(name,p,children);
function component(file){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app',file+'.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(id=>{
 if(id==='@/components/ui/button')return {Button:tag('button')};if(id==='@/components/ui/input')return {Input:tag('input')};
 if(id==='@/components/ui/dialog')return {Dialog:({open,children})=>open?React.createElement('div',null,children):null,DialogContent:tag('section'),DialogTitle:tag('h2'),DialogDescription:tag('p')};
 if(id==='./gilen-spell-shop')return {__esModule:true,default:()=>null,useGilenDialogViewport:()=>undefined};
 if(id.startsWith('./'))return {__esModule:true,default:()=>null};
 if(id.startsWith('@/lib/game/'))return require(path.join(dir,id.slice(11)));if(id.startsWith('@/'))throw Error('Unexpected UI dependency '+id);
 return require(id);
 },m,m.exports);return m.exports.default;}
const base=engine.BASES.knight,a={};let left=base.pts;for(const k of ['str','dex','con','int','wis','cha']){a[k]=Math.min(left,20-base[k]);left-=a[k];}
const c=engine.createCharacter('村莊檢查','knight','m',a,Date.now());c.lv=99;c.gold=1000000;c.zone='town_silver_knight';
const Town=component('town-shops'),render=character=>renderToStaticMarkup(React.createElement(Town,{c:character,busy:false,act:async()=>{},inspect:()=>{},onService:()=>{},compact:true}));
const html=render(c);assert.equal((html.match(/<article/g)||[]).length,22);assert.equal((html.match(/<h3>格林<\/h3>/g)||[]).length,1);assert(html.includes('銀騎士村 · NPC 服務中心'));for(const name of ['商店','製作／兌換','職業／養成','其他服務','活動'])assert(html.includes(name));assert(html.includes('搜尋 NPC、原 NPC 名稱或服務'));
const away=render({...c,zone:'town_giran'});assert.equal((away.match(/<article/g)||[]).length,0);assert(away.includes('前往銀騎士村 NPC 服務中心'));
const hidden=npc.updateNpcConfig(npc.initialNpcConfig(),{action:'visibility',zone:c.zone,npc:'npc_glin',visible:false},'gm',Date.now());assert.equal((render({...c,npcConfig:hidden}).match(/<article/g)||[]).length,21);
const Recipe=component('npc-recipe-list'),recipesHtml=renderToStaticMarkup(React.createElement(Recipe,{c,npc:'npc_hector',busy:false,act:async()=>{}}));assert(recipesHtml.includes('顯示更多配方'));assert((recipesHtml.match(/class="auto-card"/g)||[]).length<=30);
const Services=component('npc-special-services');for(const id of ['npc_esti','npc_ally_b','npc_aqua','npc_ispa']){const h=renderToStaticMarkup(React.createElement(Services,{c,npc:id,busy:false,act:async()=>{}}));assert(h.includes('不扣金幣或材料'));assert(!h.includes('<button'),'unimplemented service does not offer a misleading paid action');}
console.log('PASS: real town UI renders 22 service representatives once, categories/search, no duplicates in other towns, GM visibility, bounded recipe pages and explicit unavailable-service notices.');

}finally{fs.rmSync(dir,{recursive:true,force:true});}
