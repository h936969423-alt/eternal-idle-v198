// Every equipment icon the catalog or the GM icon library names must be in the final Worker assets.
import fs from 'node:fs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),items=Object.values(read('lib/game/gamedata.json').items),library=read('lib/game/gm-icon-library.json');
const paths=[...new Set([...items.map(i=>i.sourceIcon).filter(Boolean),...library.map(r=>r[0])])],hd=read('lib/game/item-icon-hd.json');
const missing=paths.filter(p=>!fs.existsSync('dist/client'+(hd[p]?.src||p))&&!fs.existsSync('dist/client'+p));
console.log(`Checked ${paths.length} equipment icons, ${missing.length} missing`);
if(missing.length){console.error(missing.slice(0,40).join('\n'));process.exit(1);}
