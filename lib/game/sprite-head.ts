/** Visible rows of a sprite frame as fractions of its height (frames carry transparent padding). */
export const DEFAULT_HEAD_TOP=.25,DEFAULT_FEET=.9;
export function opaqueRows(alpha:Uint8ClampedArray,width:number,height:number,threshold=40){
 const visible=(y:number)=>{for(let x=0;x<width;x++)if(alpha[(y*width+x)*4+3]>threshold)return true;return false;};
 let top=-1,bottom=-1;for(let y=0;y<height;y++)if(visible(y)){top=y;break;}
 if(top<0)return {top:DEFAULT_HEAD_TOP,bottom:DEFAULT_FEET};
 for(let y=height-1;y>=top;y--)if(visible(y)){bottom=y+1;break;}
 return {top:top/height,bottom:bottom/height};
}
export function opaqueTop(alpha:Uint8ClampedArray,width:number,height:number,threshold=40){return opaqueRows(alpha,width,height,threshold).top;}
/** Where the name's bottom edge goes: a fixed body height above the feet, so raised weapons do not move it. */
export function nameBottom(feet:number,top:number,bodyHeight:number|undefined){return bodyHeight===undefined?top:feet-bodyHeight;}
