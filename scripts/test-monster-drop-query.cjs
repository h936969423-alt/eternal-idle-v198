const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),code=ts.transpileModule(fs.readFileSync(path.join(root,'app/battle-arena.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function render(boss,busy){
 const inspected=[],actions=[],mod={exports:{}},jsx=(type,props)=>({type,props}),stub=()=>null;
 const generic=new Proxy({__esModule:true,default:stub},{get:(o,k)=>k in o?o[k]:stub});
 const context={exports:mod.exports,require:id=>{
  if(id==='react')return {useRef:()=>({current:null}),useEffect:()=>{},useState:x=>[x,()=>{}]};
  if(id==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(id.endsWith('gamedata.json'))return {maps:{training:[]},mobs:{}};
  if(id.endsWith('asset-map.json'))return {icons:{monsters:{}}};
  if(id.endsWith('boss-respawn'))return {playableBoss:()=>boss,bossMembers:()=>[]};
  if(id.endsWith('monster-runtime'))return {monsterData:(c,id,enc)=>({n:enc?.definition?.n||id,hp:100})};
  if(id.endsWith('battle-layout'))return {WORLD_BOSS_VISUAL_SCALE:1,monsterPosition:()=>({x:50,y:50}),worldBossPosition:()=>({x:50,y:50})};
  if(id.endsWith('magic-visuals'))return {magicVisual:()=>({})};
  return generic;
 }};
 vm.runInNewContext(code,context);
 const arena=[{id:'orc',uid:'orc-1',hp:30,definition:{n:'自訂獸人'}},{id:'orc',uid:'orc-2',hp:80,definition:{n:'另一隻獸人'}}];
 const tree=mod.exports.default({c:{id:'c',zone:'training',lv:10,name:'玩家',running:true,buffs:{},equipment:{}},view:{arena,hp:100,mp:50,actions:[],floats:[],casts:[]},interval:1000,maxHp:100,maxMp:50,busy,act:a=>actions.push(a),inspect:(...args)=>inspected.push(args)});
 const nodes=[];function walk(n,inButton=false){if(!n)return;if(Array.isArray(n)){n.forEach(x=>walk(x,inButton));return;}if(typeof n!=='object')return;if(n.type==='button')assert(!inButton,'drop controls cannot be nested inside attack buttons');nodes.push(n);walk(n.props?.children,inButton||n.type==='button');}walk(tree);
 const query=nodes.filter(n=>n.type==='button'&&n.props.className==='monster-drop-query');assert.equal(query.length,2);assert(!nodes.some(n=>n.props?.className==='monster-inspect-shell'));
 query.forEach((button,index)=>{let stopped=false;button.props.onClick({stopPropagation(){stopped=true;}});assert(stopped);assert.equal(inspected[index][0],arena[index].id);assert.equal(inspected[index][1],arena[index],'use the clicked encounter snapshot, including GM overrides');assert(!button.props.disabled,'read-only lookup stays available during combat requests');});assert.equal(actions.length,0,'drop lookup cannot change the attack target');
}
for(const boss of [false,true])for(const busy of [false,true])render(boss,busy);
console.log('PASS: each encounter opens its own drops and custom definition; lookup is independent of target changes, busy state and boss mode; no nested attack button or old toolbar.');
