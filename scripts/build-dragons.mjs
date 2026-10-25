import {spawnSync as restoreProcess} from 'node:child_process';
const effects=restoreProcess('python3',['scripts/restore-dasu-effects.py'],{stdio:'inherit'});if(effects.status!==0)process.exit(effects.status||1);
import {spawnSync} from "node:child_process";
const magic=spawnSync('python3',["scripts/restore-magic-import.py"],{stdio:"inherit"});
if(magic.status!==0)process.exit(magic.status||1);
const build=spawnSync(process.execPath,["scripts/run-framework.mjs","build"],{stdio:"inherit"});
if(build.status!==0)process.exit(build.status||1);
await import("./trim-dragon-output.mjs");


