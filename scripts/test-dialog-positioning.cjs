const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const moduleOut={exports:{}};
const code=ts.transpileModule(fs.readFileSync('components/ui/dialog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const node=({children,...props})=>React.createElement('div',props,children);
const primitive=new Proxy({},{get:()=>node});
new Function('module','exports','require',code)(moduleOut,moduleOut.exports,n=>{
 if(n==='radix-ui')return {Dialog:primitive};if(n==='lucide-react')return {XIcon:()=>null};if(n==='@/lib/utils')return {cn:(...parts)=>parts.filter(Boolean).join(' ')};if(n==='@/components/ui/button')return {Button:node};return require(n);
});
const markup=props=>renderToStaticMarkup(React.createElement(moduleOut.exports.DialogContent,{showCloseButton:false,...props},'contents'));
const centered=markup({}),viewport=markup({positioning:'viewport',className:'gilen-dialog'});
const contentClass=html=>html.match(/data-slot="dialog-content" class="([^"]+)"/)[1];
assert.match(contentClass(centered),/translate-x-\[-50%\]/);assert.match(contentClass(centered),/translate-y-\[-50%\]/);
const fixed=contentClass(viewport);assert.match(fixed,/fixed/);assert.match(fixed,/inset-x-4 top-4/);assert.ok(!fixed.includes('50%'));assert.ok(!fixed.includes('translate-'));assert.ok(!fixed.includes('zoom-'));assert.ok(!viewport.includes('positioning='),'positioning is not forwarded to DOM');
console.log('PASS: actual viewport dialog markup has no centered positions, half-width translations or zoom transforms; standard dialogs keep existing centered behavior.');
