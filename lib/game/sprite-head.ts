/** Visible rows of a sprite frame as fractions of its height (frames carry transparent padding). */
export const DEFAULT_HEAD_TOP=.25,DEFAULT_FEET=.9;
/**
 * The head is searched only in a narrow band above the feet, so a sword held out or raised to one
 * side does not count as the top of the character.
 */
export function opaqueRows(alpha:Uint8ClampedArray,width:number,height:number,threshold=40,band=.12){
 const on=(x:number,y:number)=>alpha[(y*width+x)*4+3]>threshold;
 let bottom=-1;for(let y=height-1;y>=0&&bottom<0;y--)for(let x=0;x<width;x++)if(on(x,y)){bottom=y+1;break;}
 if(bottom<0)return {top:DEFAULT_HEAD_TOP,bottom:DEFAULT_FEET};
 let sum=0,count=0;const footRows=Math.max(1,Math.round(height*.08));
 for(let y=Math.max(0,bottom-footRows);y<bottom;y++)for(let x=0;x<width;x++)if(on(x,y)){sum+=x;count++;}
 const centre=count?sum/count:width/2,half=Math.max(1,Math.round(width*band)),from=Math.max(0,Math.floor(centre-half)),to=Math.min(width-1,Math.ceil(centre+half));
 for(let y=0;y<bottom;y++)for(let x=from;x<=to;x++)if(on(x,y))return {top:y/height,bottom:bottom/height};
 return {top:DEFAULT_HEAD_TOP,bottom:bottom/height};
}
export function opaqueTop(alpha:Uint8ClampedArray,width:number,height:number,threshold=40){return opaqueRows(alpha,width,height,threshold).top;}
export function nameBottom(feet:number,top:number,bodyHeight:number|undefined){return bodyHeight===undefined?top:feet-bodyHeight;}
