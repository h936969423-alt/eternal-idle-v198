import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let sharp;try{sharp=require('sharp');}catch{const base=path.resolve('node_modules/.pnpm'),entry=fs.readdirSync(base).find(x=>x.startsWith('sharp@'));sharp=require(path.join(base,entry,'node_modules/sharp'));}
const map=JSON.parse(fs.readFileSync('lib/game/item-icon-hd.json','utf8'));
const progress=JSON.parse(fs.readFileSync('docs/equipment-hd-progress.json','utf8'));
let bytes=0,items=0;
for(const [original,icon] of Object.entries(map)){
  if(!fs.existsSync(`public${original}`))throw Error(`Missing original ${original}`);
  const file=`public${icon.src}`,meta=await sharp(file).metadata(),stats=await sharp(file).stats();
  if(meta.width!==icon.width||meta.height!==icon.height||!meta.hasAlpha)throw Error(`Invalid metadata: ${file}`);
  const alpha=stats.channels.at(-1);
  if(alpha.min!==0||alpha.max<250)throw Error(`Invalid alpha: ${file}`);
  if(Math.max(meta.width,meta.height)!==384)throw Error(`Unexpected display resolution: ${file}`);
  if(progress.icons[original]?.status!=='ready')throw Error(`Missing progress: ${original}`);
  bytes+=fs.statSync(file).size;items+=progress.icons[original].items.length;
}
if(Object.keys(map).length!==progress.readyIcons||items!==progress.readyItems)throw Error('Inconsistent progress totals');
console.log(JSON.stringify({icons:Object.keys(map).length,items,bytes,remaining:progress.totalIcons-Object.keys(map).length}));
