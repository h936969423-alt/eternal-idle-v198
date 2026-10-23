import {finalizeAssetStorage} from "./finalize-asset-storage.mjs";
import {readFileSync,readdirSync,rmSync,existsSync,writeFileSync,statSync,unlinkSync} from "node:fs";
import path from "node:path";
const source=path.resolve('public/assets/dragon381'),output=path.resolve('dist/client/assets/dragon381');
if(!existsSync(path.join(output,'definitions.json')))throw Error('Missing built dragon assets');
const defs=JSON.parse(readFileSync(path.join(source,'definitions.json'),'utf8')).nodes;
const heading=6,needed=new Set(),requests=JSON.parse(readFileSync('lib/game/dragon381-render-actions.json','utf8'));
const choose=(node,id)=>node.actions.find(a=>a.id===id)||node.actions.find(a=>id===8?/dead|death/i.test(a.name):a.id===3)||node.actions[0];
// Omit paused dragon body actions from deployment, retaining all original source files.
// Graphic IDs can share an atlas base; the needed-set union below keeps shared live groups.
const registry=JSON.parse(readFileSync('lib/game/dragon381-registry.json','utf8'));
const sourceData=JSON.parse(readFileSync('lib/game/dragon381-source.json','utf8'));
const resolve=id=>({15492:2001,12750:4160,12751:4160,15930:762}[Number(id)]||Number(id));
const protectedGraphics=new Set([
 ...registry.filter(r=>r.name.startsWith('恐怖的')).map(r=>resolve(r.gfx)),
 ...sourceData.summons.map(r=>resolve(r.gfxid)),
 ...sourceData.skills.map(r=>resolve(r.castgfx)),
 ...sourceData.mobskills.map(r=>resolve(r.Gfxid)),
]);
for(const node of Object.values(defs)){
 for(const attr of node.attributes){const id=attr.id??attr.AttributeId,p=(attr.parameters||attr.Parameters||[]).map(Number);for(const graphic of id===101?p.slice(0,1):id===105?p.slice(1,1+(p[0]||0)):[])protectedGraphics.add(resolve(graphic));}
 for(const action of node.actions)for(const frame of action.frames)for(const graphic of frame.OverlayIds||[])protectedGraphics.add(resolve(graphic));
}
const pausedBodies=new Set(registry.filter(r=>!r.name.startsWith('恐怖的')).map(r=>resolve(r.gfx)).filter(id=>!protectedGraphics.has(id)));
const selected=new Map(Object.entries(requests).map(([id,ids])=>[id,new Set((pausedBodies.has(Number(id))?[]:ids).map(i=>choose(defs[id],i)).filter(Boolean))]));
for(let pass=0;pass<4;pass++)for(const node of Object.values(defs)){for(const attr of node.attributes){const id=attr.id??attr.AttributeId,p=(attr.parameters||attr.Parameters||[]).map(Number),layers=id===101?p.slice(0,1):id===105?p.slice(1,1+(p[0]||0)):[];for(const id of layers){const child=defs[String(id)];if(!child?.actions.length)continue;for(const action of selected.get(String(node.id))||[]){const a=choose(child,action.id);if(a)selected.get(String(id)).add(a);}}}}
function groups(node){return new Set([...(selected.get(String(node.id))||[])].flatMap(a=>a.frames.map(f=>f.ImageId+(a.directional?(node.id===129?heading%4:heading):0))));}
function include(node,values,optional=false){for(const group of values){if(group<0||!optional&&group>=node.imageCount)continue;const key=`${node.base}-${group}`;if(optional&&!existsSync(path.join(source,'sprites',key)))continue;if(!existsSync(path.join(source,'sprites',key)))throw Error(`Missing required sprite group ${key}`);needed.add(key);}}
for(const node of Object.values(defs)){
 const own=groups(node);include(node,own);
 for(const attr of node.attributes){const id=attr.id??attr.AttributeId,params=(attr.parameters||attr.Parameters||[]).map(Number);const layers=id===101?params.slice(0,1):id===105?params.slice(1,1+(params[0]||0)):[];
  for(const id of layers){if(id===9292)continue;const child=defs[String(id)];if(child&&!child.actions.length)include(child,own,true);}
 }
}
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
