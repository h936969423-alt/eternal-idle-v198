import fs from 'node:fs';
const file='docs/equipment-hd-progress.json';
const progress=JSON.parse(fs.readFileSync(file,'utf8'));
const map=JSON.parse(fs.readFileSync('lib/game/item-icon-hd.json','utf8'));
for(const [url,icon] of Object.entries(map)){
  const entry=progress.icons[url];
  if(!entry)throw Error(`Unknown source icon: ${url}`);
  const id=url.split('/').at(-1).split('.')[0];
  const master=`source-assets/equipment-hd/${id}-v1.png`;
  if(!fs.existsSync(`public${icon.src}`)||!fs.existsSync(master))throw Error(`Missing HD asset: ${url}`);
  Object.assign(entry,{status:'ready',asset:icon.src,source:master});
}
progress.readyIcons=Object.values(progress.icons).filter(x=>x.status==='ready').length;
progress.readyItems=Object.values(progress.icons).filter(x=>x.status==='ready').reduce((n,x)=>n+x.items.length,0);
fs.writeFileSync(file,JSON.stringify(progress,null,2)+'\n');
console.log(JSON.stringify({readyIcons:progress.readyIcons,totalIcons:progress.totalIcons,readyItems:progress.readyItems,totalItems:progress.totalItems}));
