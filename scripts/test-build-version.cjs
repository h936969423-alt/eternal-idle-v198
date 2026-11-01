// A page left open across a deploy is told to reload; dev builds and missing ids never prompt.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const src=ts.transpileModule(fs.readFileSync(path.join(__dirname,'..','lib/game/build-version.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function('module','exports',src)(m,m.exports);const {isNewerBuild}=m.exports;
assert.equal(isNewerBuild('aaa','bbb'),true,'different deploy prompts');
assert.equal(isNewerBuild('aaa','aaa'),false,'same deploy is quiet');
assert.equal(isNewerBuild('dev','bbb'),false,'local dev page never prompts');
assert.equal(isNewerBuild('aaa','dev'),false,'dev server never prompts');
for(const bad of [undefined,null,'',42,{}])assert.equal(isNewerBuild('aaa',bad),false,'bad response is quiet');
const cfg=fs.readFileSync(path.join(__dirname,'..','vite.config.ts'),'utf8');
assert.match(cfg,/__APP_BUILD__/,'vite defines the build id');assert.match(cfg,/GITHUB_SHA/,'deploy commit is the build id');
console.log('PASS build version: new deploy prompts once, same/dev/invalid stay quiet, vite defines GITHUB_SHA');
