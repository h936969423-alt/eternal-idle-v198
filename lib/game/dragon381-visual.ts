export const DRAGON381_HEADING=6;
export type SprFrame={ImageId:number;FrameIndex:number;Duration:number;OverlayIds:number[];TriggerHit?:boolean};
export type SprAction={id:number;name:string;directional:boolean;totalDuration:number;frames:SprFrame[]};
export type SprNode={id:number;base:number;name:string;imageCount:number;availableGroups?:number[];actions:SprAction[];attributes:{id?:number;AttributeId?:number;parameters?:string[];Parameters?:string[]}[]};
export type SpriteDefinitions={nodes:Record<string,SprNode>};
export type Pose={group:number;frame:number;progress:number;action:SprAction};
const fallback:Record<number,number>={15492:2001,12750:4160,12751:4160,15930:762};
export function resolveGraphic(id:number){return fallback[id]||id;}
export function spriteNode(defs:SpriteDefinitions,id:number){return defs.nodes[String(resolveGraphic(id))];}
export function chooseAction(node:SprNode,id:number,death=false){return node.actions.find(a=>a.id===id)||node.actions.find(a=>death?/dead|death/i.test(a.name):a.id===3)||node.actions[0];}
/** Duration values are relative weights fitted to the server clip window, not guessed source FPS. */
export function sampleDragonPose(node:SprNode,actionId:number,heading:number,phase:number,loop=false):Pose|undefined{
 const action=chooseAction(node,actionId,actionId===8);if(!action?.frames.length)return;
 const progress=loop?((phase%1)+1)%1:Math.max(0,Math.min(1-Number.EPSILON,phase));
 const total=action.frames.reduce((n,f)=>n+Math.max(0,f.Duration),0)||action.frames.length;
 let left=progress*total,frame=action.frames.at(-1)!;
 for(const f of action.frames){const weight=action.totalDuration?Math.max(0,f.Duration):1;if(left<weight){frame=f;break;}left-=weight;}
 let direction=action.directional?((heading%8)+8)%8:0;
 if(node.id===129)direction%=4;
 const group=frame.ImageId+direction;
 if(group<0||group>=node.imageCount)return;
 const index=node.id===7617&&action.id===0&&frame.FrameIndex===24?23:frame.FrameIndex;
 return {group,frame:index,progress,action};
}
export function attributeValues(node:SprNode,id:number){const attr=node.attributes.find(a=>(a.id??a.AttributeId)===id);return (attr?.parameters||attr?.Parameters||[]).map(Number).filter(Number.isFinite);}
export function layerIds(node:SprNode){const shadow=attributeValues(node,101)[0],clothes=attributeValues(node,105);return {shadow,clothes:clothes.slice(1,1+(clothes[0]||0)).filter(id=>id!==9292)};}
