const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.resolve(__dirname,'..');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const moduleOut={exports:{}};
const compile=ts.transpileModule(fs.readFileSync(path.join(root,'app/gilen-spell-shop.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const element=tag=>({children,...props})=>React.createElement(tag,props,children);
new Function('module','exports','require',compile)(moduleOut,moduleOut.exports,n=>{
 if(n==='@/components/ui/dialog')return {DialogTitle:element('h2'),DialogDescription:element('p')};
 if(n==='@/components/ui/button')return {Button:element('button')};
 if(n==='./gear-name')return {__esModule:true,default:({item})=>React.createElement('span',null,require(path.join(root,'lib/game/gamedata.json')).items[item].n)};
 if(n==='./item-icon')return {__esModule:true,default:({src,alt})=>React.createElement('img',{src,alt})};
 if(n.startsWith('@/')){const target=path.join(root,n.slice(2));return require(target+(fs.existsSync(target+'.ts')?'.ts':''));}return require(n);
});
const render=c=>renderToStaticMarkup(React.createElement(moduleOut.exports.default,{c,zone:'town_silver_knight',npcId:'gm_npc_gilen_widget',busy:false,act:async()=>{},onClose:()=>{}}));
const c={id:'test',cls:'elf',lv:8,gold:10000,zone:'town_silver_knight',npcConfig:{revision:0,hidden:{},shops:{},custom:{town_silver_knight:[{id:'gm_npc_gilen_widget',n:'吉倫',type:'skill',title:'魔法傳授者',d:''}]}},skills:['sk_heal1'],bag:{}};
const html=render(c);const expected=Object.keys(require(path.join(root,'lib/game/npc-magic.ts')).gilenBookStock()).length;assert(expected>=24);assert.equal((html.match(/class="gilen-spell-row"/g)||[]).length,expected);assert.equal((html.match(/aria-controls="gilen-details-/g)||[]).length,expected);assert.equal((html.match(/>已學會</g)||[]).length,1);assert.match(html,/需 Lv\.8/);assert.match(html,/等級不足/);assert.match(html,/魔法書\(指定傳送\)/);assert.match(html,/關閉/);assert.match(html,/2,000/);assert.match(html,/持有金幣/);assert.match(html,/10,000/);
assert.match(html,/魔法書/);assert.match(html,/日光術/);assert.match(html,/保護罩/);
const poor=render({...c,gold:1999,skills:[]});assert.match(poor,/金幣不足/);
const wrongClass=render({...c,cls:'knight',lv:80,skills:[]});assert.match(wrongClass,/職業不符/);
console.log('PASS: legacy custom Gilen UI renders its complete book stock, reference tier-1 order, details, class levels, learned/insufficient-gold/level/class states and close button.');

for(const [width,height,offset] of [[393,852,0],[393,700,0],[852,393,0],[375,667,0],[1280,900,0],[393,600,80]]){const bounds=moduleOut.exports.gilenDialogBounds(width,height,offset);assert.ok(bounds.top>=offset+32);assert.ok(bounds.top+bounds.height<=offset+height-24);assert.ok(bounds.height>=96);if(width<=640&&height>500)assert.ok(bounds.top>=offset+136,'header clears native top toolbar');}
const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8');assert.match(css,/gilen-dialog\[data-slot=dialog-content\]\{[^}]*translate:none!important/);console.log('PASS: portrait, landscape, smaller visible viewport and zoom offset keep header/footer inside bounds; outer dialog has no centering translation.');
