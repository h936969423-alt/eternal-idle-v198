import deployment from './dragon-deployment-groups.cjs';
import {finalizeAssetStorage} from "./finalize-asset-storage.mjs";
import {readFileSync,readdirSync,rmSync,existsSync,writeFileSync,statSync,unlinkSync} from "node:fs";
import path from "node:path";
const source=path.resolve('public/assets/dragon381'),output=path.resolve('dist/client/assets/dragon381');
if(!existsSync(path.join(output,'definitions.json')))throw Error('Missing built dragon assets');
const defs=JSON.parse(readFileSync(path.join(source,'definitions.json'),'utf8')).nodes;
const requests=JSON.parse(readFileSync('lib/game/dragon381-render-actions.json','utf8')),registry=JSON.parse(readFileSync('lib/game/dragon381-registry.json','utf8')),sourceData=JSON.parse(readFileSync('lib/game/dragon381-source.json','utf8'));
const {heading,needed,selected}=deployment.selectDragonDeployment({defs,requests,registry,sourceData,existsGroup:key=>existsSync(path.join(source,'sprites',key))});
// Only generated output is trimmed. All source directions and original frame metadata remain tracked.
let removed=0;for(const name of readdirSync(path.join(output,'sprites'))){if(!needed.has(name)){rmSync(path.join(output,'sprites',name),{recursive:true});removed++;}}
writeFileSync(path.join(output,'deployment-manifest.json'),JSON.stringify({edition:'3.81',heading,groups:[...needed].sort(),allSourceDirectionsRetained:true,actions:Object.fromEntries([...selected].map(([id,actions])=>[id,[...actions].map(a=>a.id)]))}));
console.log(`Dragon deployment: ${needed.size} required groups; ${removed} unused-facing groups omitted from generated output.`);

// Vinext may retain files copied by earlier builds; only WebP atlases are referenced now.
function removeOldAtlasPngs(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())removeOldAtlasPngs(file);else if(e.name.endsWith('.png')){if(!existsSync(file.replace(/\.png$/,'.webp')))throw Error(`Missing replacement atlas ${file}`);unlinkSync(file);}}}
removeOldAtlasPngs(path.resolve('dist/client/assets/combat-anim'));
function bytes(dir){return readdirSync(dir,{withFileTypes:true}).reduce((sum,e)=>sum+(e.isDirectory()?bytes(path.join(dir,e.name)):statSync(path.join(dir,e.name)).size),0);}
finalizeAssetStorage();
const expanded=bytes(path.resolve("dist"));console.log(`Expanded deployment output: ${expanded} bytes.`);if(process.env.ASSET_STORAGE_PREPARE!=="1"&&expanded>240000000)throw Error("Deployment exceeds safe expanded archive budget");

