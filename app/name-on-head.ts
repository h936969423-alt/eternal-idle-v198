'use client';
/** Keeps the player's name just above the drawn head. Sprite frames carry a lot of transparent padding, so the box top is not the head. */
import {useEffect} from 'react';
import {DEFAULT_HEAD_TOP as DEFAULT_TOP,DEFAULT_FEET,nameBottom,opaqueRows} from '@/lib/game/sprite-head';
const PAIRS:[string,string][]=[['.four-player>.actor-name','.four-player .character-sprite'],['.town-walk-actor>small','.town-walk-actor .town-player-sprite']];
const GAP=2,REFRESH_MS=150;
type Rows={top:number;bottom:number};const tops=new Map<string,Rows>();const FALLBACK:Rows={top:DEFAULT_TOP,bottom:DEFAULT_FEET};
/** Body height in CSS px per name, learned from plain walk/idle frames (no raised weapon). */
const bodies=new Map<string,number>();let scratch:HTMLCanvasElement|null=null;
const loaded=new Map<string,HTMLImageElement>();
function sourceImage(href:string){let image=loaded.get(href);if(!image){image=new Image();image.src=href;loaded.set(href,image);if(loaded.size>400)loaded.delete(loaded.keys().next().value as string);}return image;}
function measure(image:HTMLImageElement){
 const src=image.currentSrc||image.src;const known=tops.get(src);if(known!==undefined)return known;
 if(!image.complete||!image.naturalWidth)return undefined;
 try{const w=Math.min(256,image.naturalWidth),h=Math.max(1,Math.round(image.naturalHeight*w/image.naturalWidth));scratch??=document.createElement('canvas');scratch.width=w;scratch.height=h;const ctx=scratch.getContext('2d',{willReadFrequently:true});if(!ctx)return FALLBACK;ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);
  const value=opaqueRows(ctx.getImageData(0,0,w,h).data,w,h);tops.set(src,value);if(tops.size>400)tops.delete(tops.keys().next().value as string);return value;}
 catch{tops.set(src,FALLBACK);return FALLBACK;}
}
/** Letterboxing of a frame drawn with contain / SVG "meet": the frame sits centred inside its box. */
function fitted(box:DOMRect,image:HTMLImageElement,contain:boolean){
 if(!contain||!image.naturalWidth)return box;const ratio=image.naturalWidth/image.naturalHeight,boxRatio=box.width/Math.max(1,box.height);
 if(boxRatio>ratio){const width=box.height*ratio;return new DOMRect(box.x+(box.width-width)/2,box.y,width,box.height);}
 const height=box.width/ratio;return new DOMRect(box.x,box.y+(box.height-height)/2,box.width,height);
}
/** The drawn frame's box and where its visible top is. Plain <img> frames and SVG frames (attack, cast, polymorph) are both handled. */
function target(el:Element):{box:DOMRect;rows:Rows;plain:boolean}|undefined{
 if(el instanceof HTMLImageElement){const rows=measure(el);if(rows===undefined)return undefined;const fit=getComputedStyle(el).objectFit;return {box:fitted(el.getBoundingClientRect(),el,fit==='contain'||fit==='scale-down'),rows,plain:el.dataset.action!=='attack'};}
 const layer=el.querySelector('image:not(.polymorph-cast-shadow)');const href=layer?.getAttribute('href')||layer?.getAttributeNS('http://www.w3.org/1999/xlink','href');
 if(!layer||!href)return {box:el.getBoundingClientRect(),rows:FALLBACK,plain:false};
 const image=sourceImage(href),rows=measure(image);if(rows===undefined)return undefined;
 const meet=(layer.getAttribute('preserveAspectRatio')||'xMidYMid meet')!=='none';return {box:fitted(layer.getBoundingClientRect(),image,meet),rows,plain:false};
}
export function useNameOnHead(active:boolean){
 useEffect(()=>{if(!active)return;
  const place=()=>{for(const [nameSel,spriteSel] of PAIRS){const name=document.querySelector<HTMLElement>(nameSel),sprite=document.querySelector(spriteSel);if(!name||!sprite)continue;const parent=name.offsetParent as HTMLElement|null;if(!parent)continue;
   const found=target(sprite);if(!found)continue;const {box,rows,plain}=found,host=parent.getBoundingClientRect();if(!box.height)continue;
   // Attack and cast frames swing weapons past the head and feet: keep the last walk/idle placement (it moves with the player).
   if(!plain&&name.dataset.onHead)continue;
   const top=box.top+rows.top*box.height-host.top,feet=box.top+rows.bottom*box.height-host.top,centre=box.left+box.width/2-host.left;
   if(plain&&feet>top)bodies.set(nameSel,feet-top);const head=nameBottom(feet,top,bodies.get(nameSel));
   name.style.setProperty('--name-top',`${(head-name.offsetHeight-GAP).toFixed(1)}px`);name.style.setProperty('--name-left',`${centre.toFixed(1)}px`);name.dataset.onHead='true';}};
  place();const timer=setInterval(place,REFRESH_MS);
  return()=>{clearInterval(timer);for(const [nameSel] of PAIRS)document.querySelectorAll<HTMLElement>(nameSel).forEach(el=>{el.style.removeProperty('--name-top');el.style.removeProperty('--name-left');delete el.dataset.onHead;});};
 },[active]);
}
