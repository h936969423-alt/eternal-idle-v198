import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=process.cwd();
let sharp;try{sharp=require('sharp');}catch{const store=path.join(root,'node_modules/.pnpm'),entry=fs.readdirSync(store).find(n=>n.startsWith('sharp@'));if(!entry)throw Error('Sharp is required to export web assets.');sharp=require(path.join(store,entry,'node_modules/sharp'));}
const [source,id]=process.argv.slice(2);if(!source||!/^\d+$/.test(id||''))throw Error('Usage: node scripts/export-equipment-hd.mjs SOURCE_PNG ICON_ID');
fs.mkdirSync('source-assets/equipment-hd',{recursive:true});fs.mkdirSync('public/assets/equipment-hd',{recursive:true});
const master=path.join(root,'source-assets/equipment-hd',id+'-v1.png');if(path.resolve(source)!==master)fs.copyFileSync(source,master);
const out=path.join(root,'public/assets/equipment-hd',id+'-v2.webp');
await sharp(master).resize({width:384,height:384,fit:'inside',withoutEnlargement:true}).webp({quality:92,alphaQuality:100,effort:6}).toFile(out);
const meta=await sharp(out).metadata();if(!meta.hasAlpha)throw Error('The game icon must preserve alpha transparency.');
const file='lib/game/item-icon-hd.json',map=JSON.parse(fs.readFileSync(file,'utf8'));
map['/assets/equipment381/icons/'+id+'.webp']={src:'/assets/equipment-hd/'+id+'-v2.webp',width:meta.width,height:meta.height,origin:'AI 高清重製；原始 3.81 圖示保留'};
fs.writeFileSync(file,JSON.stringify(map,null,2)+'\n');
console.log(JSON.stringify({id,width:meta.width,height:meta.height,bytes:fs.statSync(out).size,alpha:meta.hasAlpha}));
