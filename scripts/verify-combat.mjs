import {spawnSync} from 'node:child_process';

// This gate must pass before the isolated test Worker can be deployed.
const commands=[
 ['--experimental-strip-types','--test','tests/animation-clock.test.mjs','tests/recovery-status.test.mjs','tests/combat-audio.test.mjs'],
 ['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],
 ...['combat-smoothness','triple-impact-sync','manual-triple-latency','post-cast-continuity','offline-income','offline-income-notices','character-menu','account-theme','respawn-rules'].map(name=>[`scripts/test-${name}.cjs`]),
];
for(const args of commands){
 console.log(`Verifying: node ${args.join(' ')}`);
 const result=spawnSync(process.execPath,args,{stdio:'inherit'});
 if(result.error)console.error(result.error);
 if(result.status!==0)process.exit(result.status||1);
}
