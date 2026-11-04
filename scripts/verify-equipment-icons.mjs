// Every equipment icon the catalog or GM icon library names must be in the R2 asset index the Worker serves from.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),config=read('lib/asset-storage-config.json'),items=Object.values(read('lib/game/gamedata.json').items),library=read('lib/game/gm-icon-library.json');
const indexFile='/tmp/eternal-asset-index.json';
execFileSync('aws',['--endpoint-url','https://9bf17726da5739f20d3e5ec454ae3d91.r2.cloudflarestorage.com','s3','cp',`s3://eternal-idle-v198-test-assets/${config.indexKey}`,indexFile,'--no-progress'],{stdio:'inherit'});
const files=read(indexFile).files,has=p=>Object.hasOwn(files,p)||Object.hasOwn(files,p.replace(/^\//,''))||fs.existsSync('public'+p);
const paths=[...new Set([...items.map(i=>i.sourceIcon).filter(Boolean),...library.map(r=>r[0])])],missing=paths.filter(p=>!has(p));
console.log(`Checked ${paths.length} equipment icons against ${Object.keys(files).length} indexed files, ${missing.length} missing`);
if(missing.length){console.error(missing.slice(0,60).join('\n'));process.exit(1);}
