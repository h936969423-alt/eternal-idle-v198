'use client';
/** Small copy of the real map around the player, with the player and monsters as dots. Presentation only. */
import {useEffect,useRef,useState} from 'react';
import {worldMinimap} from '@/lib/game/minimap-store';
const W=112,H=72,SCALE=.06,REFRESH_MS=250;
const images=new Map<string,HTMLImageElement>();
function chunkImage(src:string){let image=images.get(src);if(!image){image=new Image();image.src=src;images.set(src,image);}return image;}
export default function LandscapeMinimap(){
 const canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let timer=0;
  const draw=()=>{const source=worldMinimap.current,el=canvas.current;setReady(!!source);if(!source||!el)return;const ctx=el.getContext('2d');if(!ctx)return;
   const ratio=Math.min(2,window.devicePixelRatio||1);if(el.width!==W*ratio){el.width=W*ratio;el.height=H*ratio;}
   ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#141a12';ctx.fillRect(0,0,W,H);
   const {map,walker,base}=source,centre=walker.pixel(walker.player),left=centre.x-W/2/SCALE,top=centre.y-H/2/SCALE,size=map.chunk*SCALE;
   for(const [x,y] of map.chunks){const sx=(x*map.chunk-left)*SCALE,sy=(y*map.chunk-top)*SCALE;if(sx>W||sy>H||sx+size<0||sy+size<0)continue;const image=chunkImage(`${base}${x}_${y}.webp`);if(image.complete&&image.naturalWidth)ctx.drawImage(image,sx,sy,size,size);}
   ctx.fillStyle='#e0473c';for(const m of walker.monsters.values()){const p=walker.pixel(m),x=(p.x-left)*SCALE,y=(p.y-top)*SCALE;if(x<0||y<0||x>W||y>H)continue;ctx.beginPath();ctx.arc(x,y,2.2,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle='#ffe17a';ctx.strokeStyle='#1a1712';ctx.lineWidth=1;ctx.beginPath();ctx.arc(W/2,H/2,3,0,Math.PI*2);ctx.fill();ctx.stroke();
  };
  draw();timer=window.setInterval(draw,REFRESH_MS);return()=>clearInterval(timer);
 },[]);
 return <canvas ref={canvas} className="lhud-minimap" width={W} height={H} style={{display:ready?undefined:'none'}} role="img" aria-label="小地圖：黃點是你，紅點是怪物"/>;
}
