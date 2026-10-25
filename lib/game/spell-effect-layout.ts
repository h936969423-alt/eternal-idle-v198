export type EffectRect={left:number;top:number;width:number;height:number};
export type TargetSpellAtlas={src:string;width:number;height:number;cols:number;count:number;pivotX:number;pivotY:number};
/** Keep the source impact pixel on the actor while fitting the whole canvas inside the arena. */
export function targetSpellLayout(atlas:TargetSpellAtlas,parent:EffectRect,actor:EffectRect,arena:EffectRect,targetVc=.6){
 const margin=2,clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 const x=clamp(actor.left+actor.width*.5,arena.left+margin,arena.left+arena.width-margin),y=clamp(actor.top+actor.height*targetVc,arena.top+margin,arena.top+arena.height-margin);
 const maxWidth=Math.min(260,arena.width*.65),ratio=(space:number,size:number)=>size>0?Math.max(0,space)/size:Infinity;
 const scale=Math.max(0,Math.min(maxWidth/atlas.width,ratio(x-arena.left-margin,atlas.pivotX),ratio(arena.left+arena.width-margin-x,atlas.width-atlas.pivotX),ratio(y-arena.top-margin,atlas.pivotY),ratio(arena.top+arena.height-margin-y,atlas.height-atlas.pivotY)));
 return {left:x-parent.left-atlas.pivotX*scale,top:y-parent.top-atlas.pivotY*scale,width:atlas.width*scale,height:atlas.height*scale,scale};
}
