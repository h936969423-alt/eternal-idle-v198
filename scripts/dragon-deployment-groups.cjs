// Shared by artifact trimming and regression checks. No game state is changed.
exports.selectDragonDeployment=function({defs,registry,sourceData,requests,existsGroup,heading=6}){
const needed=new Set();
const choose=(node,id)=>node.actions.find(a=>a.id===id)||node.actions.find(a=>id===8?/dead|death/i.test(a.name):a.id===3)||node.actions[0];
// Omit paused dragon body actions from deployment, retaining all original source files.
// Graphic IDs can share an atlas base; the needed-set union below keeps shared live groups.
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
function include(node,values,optional=false){for(const group of values){if(group<0||!optional&&group>=node.imageCount)continue;const key=`${node.base}-${group}`;if(optional&&!existsGroup(key))continue;if(!existsGroup(key))throw Error(`Missing required sprite group ${key}`);needed.add(key);}}
for(const node of Object.values(defs)){
 const own=groups(node);include(node,own);
 for(const attr of node.attributes){const id=attr.id??attr.AttributeId,params=(attr.parameters||attr.Parameters||[]).map(Number);const layers=id===101?params.slice(0,1):id===105?params.slice(1,1+(params[0]||0)):[];
  for(const id of layers){if(id===9292)continue;const child=defs[String(id)];if(child&&!child.actions.length)include(child,own,true);}
 }
}
return {heading,needed,selected};
};
