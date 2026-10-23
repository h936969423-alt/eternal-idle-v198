const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react');
const root=path.resolve(__dirname,'..');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const state=[];let hook=0,services=[],moves=[];
const named={};const stub=n=>named[n]??=(function Stub(){return null;});
const react={...React,useState(initial){const i=hook++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v];},useEffect(){}};
const moduleOut={exports:{}},code=ts.transpileModule(fs.readFileSync('app/town-shops.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
new Function('module','exports','require',code)(moduleOut,moduleOut.exports,n=>{
 if(n==='react')return react;if(n==='react/jsx-runtime')return require(n);
 if(n.startsWith('@/components/'))return new Proxy({},{get:(_,key)=>stub(String(key))});
 if(n.startsWith('./'))return {__esModule:true,default:stub(n),useGilenDialogViewport:()=>undefined};
 if(n.startsWith('@/')){const target=path.join(root,n.slice(2));return require(target+(fs.existsSync(target+'.ts')?'.ts':''));}return require(n);
});
const customId='gm_npc_f8883be777664a43b19c48321820974f',zone='town_silver_knight',config=require('../lib/game/npc-config.ts').initialNpcConfig();config.custom[zone]=[{id:customId,n:'吉倫',title:'魔法學習',d:'',type:'skill'}];
const c={id:'test',zone,cls:'elf',gold:1000,skills:[],npcConfig:config};
const render=()=>{hook=0;return moduleOut.exports.default({c,busy:false,act:async a=>{moves.push(a);return {};},inspect:()=>{},onService:tab=>services.push(tab)});};
const flatten=n=>!n||typeof n!=='object'?[]:[n,...React.Children.toArray(n.props?.children).flatMap(flatten)];
(async()=>{
 let nodes=flatten(render());const card=nodes.find(n=>n.type==='article'&&String(n.key).includes(customId));assert.ok(card);
 const button=flatten(card).find(n=>n.type===stub('Button'));assert.ok(button);assert.equal(button.props.children,'學習 1～3 級魔法');await button.props.onClick();assert.deepEqual(services,[],'click never navigates to ability/skills');assert.deepEqual(state[0],{zone,id:customId});
 nodes=flatten(render());const shop=nodes.find(n=>n.type===stub('./gilen-spell-shop'));assert.ok(shop,'click mounts the gold spell list');assert.equal(shop.props.zone,zone);assert.equal(shop.props.npcId,customId);const dialog=nodes.find(n=>n.props?.className==='gilen-dialog');assert.ok(dialog);assert.equal(dialog.props.positioning,'viewport','Gilen must opt out of centered transforms');
 shop.props.onClose();assert.equal(state[0],null);assert.equal(moves.length,0,'same-town click does not issue movement');
 console.log('PASS: actual live GM-created Gilen entry opens gold spell list with the correct town/NPC, never skills navigation; close returns to village.');
})().catch(e=>{console.error(e);process.exitCode=1;});
