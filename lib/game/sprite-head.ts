/** Fraction of a frame's height where the first visible pixel row starts (sprite frames carry transparent padding). */
export const DEFAULT_HEAD_TOP=.25;
export function opaqueTop(alpha:Uint8ClampedArray,width:number,height:number,threshold=40){
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[(y*width+x)*4+3]>threshold)return y/height;
 return DEFAULT_HEAD_TOP;
}
