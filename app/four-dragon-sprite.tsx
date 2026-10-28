'use client';
import {useEffect,useRef} from 'react';
import type {CombatEvent} from '@/lib/game/engine';
import {sourceDragonClip,sourceDragonFx,sourceDragonFrame,sourceDragonFxFrame,sourceDragonClipMs,type DragonSheet} from '@/lib/game/four-dragon-visual';
const images=new Map<string,HTMLImageElement>();
function load(src:string){let image=images.get(src);if(!image){image=new Image();image.decoding='async';image.src=src;images.set(src,image);}return image;}
function draw(ctx:CanvasRenderingContext2D,sheet:DragonSheet|undefined,frame:number,x:number,y:number,scale:number,blend:GlobalCompositeOperation='source-over'){
 if(!sheet||frame<0)return false;const image=load(sheet.src);if(!image.complete||!image.naturalWidth)return false;
 const index=Math.min(sheet.count-1,frame);ctx.save();ctx.globalCompositeOperation=blend;ctx.drawImage(image,index%sheet.cols*sheet.w,Math.floor(index/sheet.cols)*sheet.h,sheet.w,sheet.h,x,y,sheet.w*scale,sheet.h*scale);ctx.restore();return true;
}
/** Body and source skill_effect share one clock, including the authored mouth-opening offset. */
export default function FourDragonSprite({id,uid,hp,actions,fallback}:{id:string;uid:string;hp:number;actions:(CombatEvent&{shownAt?:number})[];fallback?:string}){
 const placeholder=useRef<HTMLImageElement>(null),canvas=useRef<HTMLCanvasElement>(null),latest=useRef({hp,actions});latest.current={hp,actions};
 useEffect(()=>{
  for(const action of ['idle','attack','skill','death','spawn']){const clip=sourceDragonClip(id,action);for(const s of [clip?.body,clip?.shadow,clip?.weapon])if(s)load(s.src);}const fx=sourceDragonFx(id);if(fx)load(fx.sheet.src);
  let timer:ReturnType<typeof setTimeout>|undefined,lastSeq=0,dead=false,state={action:sourceDragonClip(id,'spawn')?'spawn':'idle',start:performance.now()};
  const tick=()=>{
   if(document.hidden)return;const now=performance.now(),current=latest.current;
   if(current.hp<=0&&!dead){dead=true;state={action:'death',start:now};}
   if(current.hp>0&&dead){dead=false;state={action:'spawn',start:now};}
   const fresh=current.actions.filter(e=>e.uid===uid&&e.source==='monster'&&(e.sunriseDragon||e.motion)&&e.seq>lastSeq);
   if(fresh.length){lastSeq=Math.max(lastSeq,...fresh.map(e=>e.seq));const e=fresh.filter(e=>!!e.motion).at(-1);if(e&&!dead){const started=e.visualAt??e.shownAt??now;
    // A skill owns its full body/FX clip. Fast normal hits cannot cut off a breath.
    if(e.motion==='skill'||state.action!=='skill'||started-state.start>=sourceDragonClipMs(id,'skill'))state={action:e.motion==='skill'?'skill':'attack',start:started};
   }}
   let elapsed=now-state.start;if(!dead&&state.action!=='idle'&&elapsed>=Math.max(sourceDragonClipMs(id,state.action),state.action==='skill'&&fx?(fx.delay+fx.sheet.count+fx.hold)*125:0)){state={action:'idle',start:state.start+sourceDragonClipMs(id,state.action)};elapsed=now-state.start;}
   const clip=sourceDragonClip(id,state.action)||sourceDragonClip(id,'idle'),host=canvas.current;
   if(clip&&host){const ctx=host.getContext('2d');if(ctx){const frame=sourceDragonFrame(elapsed,clip.body.count,state.action==='idle');const still=frame<0?clip.body.count-1:frame;
    const scale=Math.min(280/clip.body.w,250/clip.body.h),x=256-clip.body.w*scale/2,y=360-clip.body.h*scale;
    if(load(clip.body.src).complete&&load(clip.body.src).naturalWidth){if(placeholder.current)placeholder.current.style.opacity='0';ctx.clearRect(0,0,512,492);draw(ctx,clip.shadow,still,x,y,scale);draw(ctx,clip.body,still,x,y,scale);draw(ctx,clip.weapon,still,x,y,scale,'screen');if(state.action==='skill'&&fx)draw(ctx,fx.sheet,sourceDragonFxFrame(id,elapsed),x+fx.ox*scale,y+fx.oy*scale,scale,'screen');}
   }}
   timer=setTimeout(tick,1000/8);
  };
  const visibility=()=>{if(timer)clearTimeout(timer);if(!document.hidden)tick();};document.addEventListener('visibilitychange',visibility);tick();
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};
 },[id,uid]);
 return <span className="dragon381-sprite" role="img" aria-label="四龍來源動畫與施法特效" data-source-dragon={id}><canvas ref={canvas} width={512} height={492} style={{position:'absolute',left:'-30%',top:'-32%',width:'160%',height:'164%',pointerEvents:'none'}}/>{fallback&&<img ref={placeholder} className="dragon381-placeholder" src={fallback} alt=""/>}</span>;
}
