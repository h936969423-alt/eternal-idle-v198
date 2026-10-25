import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// Run every existing regression script, even after a failure, so the deployment
// gate cannot hide unrelated failures behind a passing combat subset.
const files=readdirSync('scripts').filter(name=>/^test-.*\.(cjs|mjs)$/.test(name)||/^check-.*\.cjs$/.test(name)).sort();
let failed=0;
for(const file of files){
 console.log(`Regression: ${file}`);
 const result=spawnSync(process.execPath,[`scripts/${file}`],{stdio:'inherit',timeout:120_000});
 if(result.error)console.error(result.error);
 if(result.status!==0){failed++;console.error(`FAIL: ${file}`);}
}
console.log(`Regressions: ${files.length-failed}/${files.length} passed; ${failed} failed.`);
if(failed)process.exit(1);
