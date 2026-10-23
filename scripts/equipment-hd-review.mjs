import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{const base=path.resolve('node_modules/.pnpm'),entry=fs.readdirSync(base).find(x=>x.startsWith('sharp@'));sharp=require(path.join(base,entry,'node_modules/sharp'));}
const [manifest,out]=process.argv.slice(2),jobs=JSON.parse(fs.readFileSync(manifest,'utf8'));
const width=1152,height=Math.ceil(jobs.length/6)*192,layers=[];
for(let i=0;i<jobs.length;i++){
 const j=jobs[i],left=(i%6)*192,top=Math.floor(i/6)*192;
 const orig=await sharp(`public${j.url}`).resize({width:52,height:52,fit:'inside',kernel:'nearest'}).toBuffer();
 const hd=await sharp(j.path).resize({width:126,height:144,fit:'inside'}).toBuffer();
 layers.push({input:orig,left:left+3,top:top+40},{input:hd,left:left+60,top:top+32});
 const label=Buffer.from(`<svg width="192" height="26"><text x="8" y="19" fill="#ffe396" font-size="17">${j.id}</text></svg>`);
 layers.push({input:label,left,top});
}
await sharp({create:{width,height,channels:4,background:'#21170e'}}).composite(layers).png().toFile(out);
console.log(out);
