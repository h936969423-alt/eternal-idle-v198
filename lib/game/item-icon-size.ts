/** Pixel art grows only by a whole multiple (at most 2x); larger artwork can be reduced. */
export function itemIconSize(width:number,height:number,limit=48){
 const w=width>0&&Number.isFinite(width)?width:32,h=height>0&&Number.isFinite(height)?height:32;
 const max=Math.max(1,Number.isFinite(limit)?limit:48),edge=Math.max(w,h);
 const scale=edge<=max?Math.max(1,Math.min(2,Math.floor(max/edge))):max/edge;
 return {width:w*scale,height:h*scale,pixelArt:edge<=32};
}
