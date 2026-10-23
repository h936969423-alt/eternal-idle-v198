const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const pmod={exports:{}};new Function('module','exports','require',compile('lib/game/polymorph.ts'))(pmod,pmod.exports,n=>require('../lib/game/'+n.replace('./','')));
const p=pmod.exports,form=p.POLYMORPH.forms.find(f=>f.level===55),calls=[];
function stub(tag){return ({children,...props})=>React.createElement(tag,props,children);}
const primitives=Object.fromEntries(['AlertDialog','AlertDialogContent','AlertDialogTitle','AlertDialogDescription','AlertDialogFooter','AlertDialogCancel','AlertDialogAction'].map(n=>[n,stub(n==='AlertDialogAction'||n==='AlertDialogCancel'?'button':'div')]));
function load(file){const m={exports:{}};new Function('module','exports','require',compile(file))(m,m.exports,n=>n==='react'?{...React,useState:v=>[v,()=>{}],useRef:v=>({current:v})}:n==='@/components/ui/alert-dialog'?primitives:n==='@/lib/game/polymorph'?p:n==='@/lib/game/gamedata.json'?require('../lib/game/gamedata.json'):require(n));return m.exports.default;}
const Dialog=load('app/polymorph-unlock-dialog.tsx');
const find=(node,type)=>{if(!node||typeof node!=='object')return null;if(node.type===type)return node;for(const child of React.Children.toArray(node.props?.children)){const result=find(child,type);if(result)return result;}return null;};
const base={lv:55,gold:60000000,bag:{ap381_armor_20281:1,...p.POLYMORPH.unlockCost.items},equipment:{}};
(async()=>{
 let closed=0,prevented=0;const props={c:base,form,busy:false,act:async a=>{calls.push(a);return {save:{}};},close:()=>closed++};
 let tree=Dialog(props),confirm=find(tree,primitives.AlertDialogAction);assert.equal(confirm.props.disabled,false);
 await confirm.props.onClick({preventDefault(){prevented++;}});assert.equal(prevented,1);assert.equal(closed,1);assert.deepEqual(calls,[{type:'polyUnlock',id:form.id}]);
 tree=Dialog({...props,act:async()=>null});await find(tree,primitives.AlertDialogAction).props.onClick({preventDefault(){}});assert.equal(closed,1,'failed request keeps the dialog open');
 const poor={...base,gold:0,bag:{}};tree=Dialog({...props,c:poor});confirm=find(tree,primitives.AlertDialogAction);assert.equal(confirm.props.disabled,true);await confirm.props.onClick({preventDefault(){}});assert.equal(calls.length,1,'missing requirements never submits');
 const html=renderToStaticMarkup(tree);assert.match(html,/持有／需要/);assert.match(html,/60,000,000/);assert.match(html,/尚未持有/);assert.match(html,/BOSS/);
 tree=Dialog({...props,busy:true});assert.equal(find(tree,primitives.AlertDialogAction).props.disabled,true);assert.equal(find(tree,primitives.AlertDialogCancel).props.disabled,true);
 console.log('PASS: full-cost confirmation, missing-requirement block, visible ownership counts, success-only close and busy guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
