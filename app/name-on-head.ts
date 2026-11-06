'use client';
/** Keeps the player's name just above the drawn head. Sprite frames carry a lot of transparent padding, so the box top is not the head. */
import {useEffect} from 'react';
const PAIRS:[string,string][]=[['.four-player>.actor-name','.four-player .character-sprite'],['.town-walk-actor>small','.town-walk-actor .town-player-sprite']];
const DEFAULT_TOP=.25,GAP=2,REFRESH_MS=150;
const tops=new Map<string,number>();let scratch:HTMLCanvasElement|null=null;
/** Fraction of the frame height where the first visible pixel row starts; cached per frame image. */
export function opaqueTop(alpha:Uint8ClampedArray,width:number,height:number,threshold=40){
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(alpha[(y*width+x)*4+3]>threshold)return y/height;
 return DEFAULT_TOP;
}
function headFraction(el:Element){
 if(!(el instanceof HTMLImageElement))return DEFAULT_TOP;
 const src=el.currentSrc||el.src;const known=tops.get(src);if(known!==undefined)return known;
 if(!el.complete||!el.naturalWidth)return undefined;
 try{const w=Math.min(256,el.naturalWidth),h=Math.max(1,Math.round(el.naturalHeight*w/el.naturalWidth));scratch??=document.createElement('canvas');scratch.width=w;scratch.height=h;const ctx=scratch.getContext('2d',{willReadFrequently:true});if(!ctx)return DEFAULT_TOP;ctx.clearRect(0,0,w,h);ctx.drawImage(el,0,0,w,h);
  // object-fit:contain may letterbox the frame inside the element box; the visible top is measured in frame space and mapped below.
  const value=opaqueTop(ctx.getImageData(0,0,w,h).data,w,h);tops.set(src,value);if(tops.size>400)tops.delete(tops.keys().next().value as string);return value;}
 catch{tops.set(src,DEFAULT_TOP);return DEFAULT_TOP;}
}
function frameBox(el:Element,box:DOMRect){
 if(!(el instanceof HTMLImageElement)||!el.naturalWidth)return box;
 const fit=getComputedStyle(el).objectFit;if(fit!=='contain'&&fit!=='scale-down')return box;
 const ratio=el.naturalWidth/el.naturalHeight,boxRatio=box.width/Math.max(1,box.height);
 if(boxRatio>ratio)return box;const height=box.width/ratio;return new DOMRect(box.x,box.y+(box.height-height)/2,box.width,height);
}
export function useNameOnHead(active:boolean){
 useEffect(()=>{if(!active)return;
  const place=()=>{for(const [nameSel,spriteSel] of PAIRS){const name=document.querySelector<HTMLElement>(nameSel),sprite=document.querySelector(spriteSel);if(!name||!sprite)continue;const parent=name.offsetParent as HTMLElement|null;if(!parent)continue;
   const frac=headFraction(sprite);if(frac===undefined)continue;const box=frameBox(sprite,sprite.getBoundingClientRect()),host=parent.getBoundingClientRect();if(!box.height)continue;
   const head=box.top+frac*box.height-host.top,centre=box.left+box.width/2-host.left;
   name.style.setProperty('--name-top',`${(head-name.offsetHeight-GAP).toFixed(1)}px`);name.style.setProperty('--name-left',`${centre.toFixed(1)}px`);name.dataset.onHead='true';}};
  place();const timer=setInterval(place,REFRESH_MS);
  return()=>{clearInterval(timer);for(const [nameSel] of PAIRS)document.querySelectorAll<HTMLElement>(nameSel).forEach(el=>{el.style.removeProperty('--name-top');el.style.removeProperty('--name-left');delete el.dataset.onHead;});};
 },[active]);
}
