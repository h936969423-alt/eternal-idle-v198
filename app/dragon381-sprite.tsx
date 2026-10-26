'use client';
import {sourceMonsterGroundOffset} from '@/lib/game/monster-ground';
import renderActions from '@/lib/game/dragon381-render-actions.json';
import layouts from '@/lib/game/dragon381-layouts.json';
import {useEffect,useRef,type RefObject} from 'react';
import type {CombatEvent,Encounter} from '@/lib/game/engine';
import {dragonGfx,dragonRows,dragonSkill} from '@/lib/game/dragon381';
import {DRAGON381_HEADING,sampleDragonPose,spriteNode,chooseAction,layerIds,attributeValues,resolveGraphic,type SpriteDefinitions,type SprNode,type Pose} from '@/lib/game/dragon381-visual';
import {dragon381EffectPosition} from '@/lib/game/battle-layout';
type Frame={index:number;empty?:boolean;page?:number;x:number;y:number;width:number;height:number;xOffset:number;yOffset:number};
type Group={frameCount:number;frames:Frame[]};
const ROOT='/assets/dragon381',groups=new Map<string,Group>(),pendingGroups=new Map<string,Promise<void>>(),images=new Map<string,{image:HTMLImageElement;pixels:number;at:number}>(),pendingImages=new Set<string>(),failed=new Map<string,number>();
let definitions:SpriteDefinitions|undefined,defsPromise:Promise<SpriteDefinitions>|undefined;
const callbacks=new Set<(now:number)=>void>();let raf=0;
function loop(now:number){raf=0;if(document.hidden)return;for(const draw of callbacks)draw(now);if(callbacks.size)raf=requestAnimationFrame(loop);}
function subscribe(draw:(now:number)=>void){callbacks.add(draw);if(!raf&&!document.hidden)raf=requestAnimationFrame(loop);const visibility=()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else if(!raf&&callbacks.size)raf=requestAnimationFrame(loop);};document.addEventListener('visibilitychange',visibility);return()=>{callbacks.delete(draw);document.removeEventListener('visibilitychange',visibility);if(!callbacks.size&&raf){cancelAnimationFrame(raf);raf=0;}};}
export function dragonVisualStats(){return {images:images.size,pixels:[...images.values()].reduce((n,v)=>n+v.pixels,0),groups:groups.size,loops:callbacks.size};}
function loadDefinitions(){return defsPromise||=(fetch(`${ROOT}/definitions.json`).then(r=>{if(!r.ok)throw Error('dragon definitions');return r.json() as Promise<SpriteDefinitions>;}).then(d=>(definitions=d)));}
function group(key:string){const cached=groups.get(key);if(cached)return cached;if(!pendingGroups.has(key)&&(failed.get('g:'+key)||0)<Date.now())pendingGroups.set(key,fetch(`${ROOT}/sprites/${key}/frames.json`).then(r=>{if(!r.ok)throw Error('sprite group');return r.json() as Promise<Group>;}).then(d=>{groups.set(key,d);if(groups.size>320)groups.delete(groups.keys().next().value!);}).catch(()=>{failed.set('g:'+key,Date.now()+30000);}).finally(()=>pendingGroups.delete(key)));return;}
function image(key:string,page:number,now:number){const src=`${ROOT}/sprites/${key}/atlas-${String(page).padStart(3,'0')}.webp`,cached=images.get(src);if(cached){cached.at=now;return cached.image;}
 if(!pendingImages.has(src)&&pendingImages.size<6&&(failed.get(src)||0)<Date.now()){
  pendingImages.add(src);const img=new Image();img.decoding='async';img.onload=()=>{pendingImages.delete(src);images.set(src,{image:img,pixels:img.naturalWidth*img.naturalHeight,at:now});let pixels=[...images.values()].reduce((n,x)=>n+x.pixels,0);for(const [url,old] of [...images.entries()].sort((a,b)=>a[1].at-b[1].at)){if(pixels<=12*1024*1024)break;if(old.at>=now)continue;images.delete(url);old.image.src='';pixels-=old.pixels;}};img.onerror=()=>{pendingImages.delete(src);failed.set(src,Date.now()+30000);};img.src=src;
 }return;
}
function layer(ctx:CanvasRenderingContext2D,node:SprNode,pose:Pose,x:number,y:number,scale:number,now:number,blend:GlobalCompositeOperation='source-over'){
 if(node.availableGroups&&!node.availableGroups.includes(pose.group))return false;const key=`${node.base}-${pose.group}`,g=group(key);if(!g)return false;const f=g.frames.find(f=>f.index===pose.frame);if(!f)return false;if(f.empty)return true;const img=image(key,f.page||0,now);if(!img)return false;
 ctx.save();ctx.globalCompositeOperation=blend;ctx.drawImage(img,f.x,f.y,f.width,f.height,x+f.xOffset*scale,y+f.yOffset*scale,f.width*scale,f.height*scale);ctx.restore();return true;
}
function drawNode(ctx:CanvasRenderingContext2D,defs:SpriteDefinitions,id:number,action:number,heading:number,phase:number,looping:boolean,x:number,y:number,scale:number,now:number,depth=0):boolean{
 if(id===9292||depth>3)return false;const node=spriteNode(defs,id);if(!node)return false;const pose=sampleDragonPose(node,action,heading,phase,looping);if(!pose)return false;
 // Wait for the body before clearing its previously visible frame.
 const key=`${node.base}-${pose.group}`,g=group(key),f=g?.frames.find(f=>f.index===pose.frame);if(!g||!f||!f.empty&&!image(key,f.page||0,now))return false;
 const layers=layerIds(node);
 if(layers.shadow){const shadow=spriteNode(defs,layers.shadow);if(shadow)layer(ctx,shadow,shadow.actions.length?(sampleDragonPose(shadow,action,heading,phase,looping)||pose):pose,x,y,scale,now);}
 layer(ctx,node,pose,x,y,scale,now);
 for(const id of layers.clothes){const cloth=spriteNode(defs,id);if(cloth)layer(ctx,cloth,cloth.actions.length?(sampleDragonPose(cloth,action,heading,phase,looping)||pose):pose,x,y,scale,now,'screen');}
 // Source ] overlays are timed events, including zero-duration trigger frames.
 let triggerAt=0;const activeOverlays=new Map<number,number>(),total=pose.action.totalDuration||1;
 for(const sf of pose.action.frames){
  if(triggerAt<=pose.progress*total)for(const overlay of sf.OverlayIds||[]){const child=spriteNode(defs,overlay),clip=child&&chooseAction(child,0);const childTotal=clip?.totalDuration||total,age=(pose.progress*total-triggerAt)/childTotal;if(age>=0&&age<1)activeOverlays.set(overlay,age);}
  triggerAt+=Math.max(0,sf.Duration);
 }
 for(const [overlay,age] of [...activeOverlays].slice(-4))drawNode(ctx,defs,overlay,0,heading,age,false,x,y,scale,now,depth+1);
 return true;
}
function prewarm(defs:SpriteDefinitions,gfx:number,heading:number,action:number){const node=spriteNode(defs,gfx);if(!node)return;for(const phase of [0,.2,.5,.8]){const pose=sampleDragonPose(node,action,heading,phase);if(!pose)continue;const key=`${node.base}-${pose.group}`,g=group(key);const warm=()=>{const data=groups.get(key);for(const f of data?.frames.filter(f=>!f.empty).slice(0,1)||[])image(key,f.page||0,performance.now());};if(g)warm();else pendingGroups.get(key)?.then(warm);}}
function scenePoint(arena:HTMLDivElement|null,node:Element|null,fallback:{x:number;y:number}){
 if(!arena||!node)return fallback;const a=arena.getBoundingClientRect(),b=node.getBoundingClientRect();
 return a.width>0&&a.height>0?{x:(b.left+b.width/2-a.left)/a.width*100,y:(b.top+b.height*.55-a.top)/a.height*100}:fallback;
}
function prepareCanvas(canvas:HTMLCanvasElement,w:number,h:number){const dpr=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx?.setTransform(dpr,0,0,dpr,0,0);return ctx;}
export default function DragonSprite({gfx,npcId,name,uid,hp,actions,fallback,summon=false}:{gfx:number;npcId?:number;name:string;uid:string;hp:number;actions:CombatEvent[];fallback?:string;summon?:boolean}){
 const renderLayout=(layouts.nodes as Record<string,{headings:Record<string,{scale:number;anchorX:number;anchorY:number}>}>)[String(resolveGraphic(gfx))]?.headings[String(DRAGON381_HEADING)];
 const direction=DRAGON381_HEADING,canvas=useRef<HTMLCanvasElement>(null),placeholder=useRef<HTMLImageElement>(null),latest=useRef({hp,actions});latest.current={hp,actions};
 useEffect(()=>{let alive=true,stop:(()=>void)|undefined,last=0,dead=false,state={action:3,start:performance.now(),duration:1600,loop:true};
  loadDefinitions().then(defs=>{if(!alive)return;const node=spriteNode(defs,gfx);if(!node)return;
   for(const id of (renderActions as Record<string,number[]>)[String(resolveGraphic(gfx))]||[3,1,8])prewarm(defs,gfx,direction,id);
   for(const r of dragonRows(npcId||0)){const sk=dragonSkill(Number(r.SkillId)),fx=Number(r.Gfxid)||Number(sk?.castgfx);if(fx)prewarm(defs,fx,direction,0);}
   stop=subscribe(now=>{if(!canvas.current)return;const current=latest.current;
    if(current.hp<=0&&!dead){dead=true;state={action:chooseAction(node,8,true)?.id||8,start:now,duration:1600,loop:false};}
    if(current.hp>0&&dead){dead=false;state={action:3,start:now,duration:1600,loop:true};}
    if(!dead){for(const event of current.actions){if(event.uid!==uid||event.seq<=last)continue;const action=event.dragonAction??(summon&&event.kind==='hurt'&&event.mob?1:undefined);if(action===undefined)continue;last=event.seq;const at=(event as CombatEvent&{shownAt?:number}).shownAt??now;state={action,start:at,duration:event.dragonDuration||1200,loop:false};}
     if(!state.loop&&now-state.start>=state.duration)state={action:3,start:state.start+state.duration,duration:1600,loop:true};}
    // Padded buffer keeps anchored attack limbs visible at the original actor scale.
    const phase=(now-state.start)/state.duration,ctx=prepareCanvas(canvas.current,512,492);if(!ctx)return;
    const pose=sampleDragonPose(node,state.action,direction,phase,state.loop);if(!pose)return;const key=`${node.base}-${pose.group}`,meta=group(key),frame=meta?.frames.find(f=>f.index===pose.frame);if(!meta||!frame||!frame.empty&&!image(key,frame.page||0,now))return;
    const layout=(layouts.nodes as Record<string,{headings:Record<string,{scale:number;anchorX:number;anchorY:number}>}>)[String(resolveGraphic(gfx))]?.headings[String(direction)];const scale=layout?.scale||(summon?.60:.74),ground=dead?[0,0]:sourceMonsterGroundOffset(resolveGraphic(gfx),key,pose.frame);ctx.clearRect(0,0,512,492);drawNode(ctx,defs,gfx,state.action,direction,phase,state.loop,96+(layout?.anchorX||155)+ground[0]*scale,96+(layout?.anchorY||235)+ground[1]*scale,scale,now);
    if(placeholder.current)placeholder.current.style.opacity='0';
   });
  }).catch(()=>{});
  return()=>{alive=false;stop?.();};
 },[gfx,npcId,uid,direction,summon]);
 return <span className={`dragon381-sprite ${summon?'dragon381-minion':''}`} role="img" aria-label={name} data-gfx={gfx} style={{transformOrigin:`${(renderLayout?.anchorX??155)/320*100}% ${(renderLayout?.anchorY??235)/300*100}%`}}><canvas ref={canvas} style={{position:'absolute',left:'-30%',top:'-32%',width:'160%',height:'164%'}} aria-hidden="true"/>{fallback&&<img className="dragon381-placeholder" ref={placeholder} src={fallback} alt=""/>}</span>;
}
export function DragonEffects({events,arena,actors}:{events:(CombatEvent&{shownAt?:number})[];arena:RefObject<HTMLDivElement|null>;actors:Encounter[]}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef({events,actors});latest.current={events,actors};
 useEffect(()=>{let alive=true,stop:(()=>void)|undefined,w=1,h=1;const observer=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box){w=box.width;h=box.height;}});if(arena.current)observer.observe(arena.current);
  loadDefinitions().then(defs=>{if(!alive)return;stop=subscribe(now=>{if(!canvas.current)return;const ctx=prepareCanvas(canvas.current,w,h);if(!ctx)return;ctx.clearRect(0,0,w,h);
   const visible=latest.current.events.filter(e=>e.source==='monster'&&e.dragonEffect&&e.casterSlot!==undefined&&latest.current.actors[e.casterSlot]?.uid===e.uid).slice(-4);
   const drawn=new Set<string>();for(const e of visible){const key=`${e.at}:${e.uid}:${e.dragonEffect}`;if(drawn.has(key))continue;drawn.add(key);const phase=(now-(e.shownAt??now))/(e.dragonDuration||1600);if(phase<0||phase>=1)continue;
    let gfx=resolveGraphic(e.dragonEffect!),from=scenePoint(arena.current,arena.current?.querySelector(`[data-monster-slot="${e.casterSlot}"] .four-monster-art`)||null,dragon381EffectPosition(e.casterSlot!,w,window.innerWidth)),to=scenePoint(arena.current,arena.current?.querySelector('.character-sprite')||null,{x:39,y:90}),position=to,local=phase;const projectile=[4156,4160,4163,4166].includes(gfx);
    if(e.slot!==undefined)position=scenePoint(arena.current,arena.current?.querySelector(`[data-monster-slot="${e.slot}"] .four-monster-art`)||null,dragon381EffectPosition(e.slot,w,window.innerWidth));
    if(projectile){const flight=Math.min(1,phase/.65);position={x:from.x+(to.x-from.x)*flight,y:from.y+(to.y-from.y)*flight};if(phase>.65){const n=spriteNode(defs,gfx),impact=n&&attributeValues(n,109)[1];if(impact&&spriteNode(defs,impact)){gfx=impact;local=(phase-.65)/.35;}}}
    drawNode(ctx,defs,gfx,0,DRAGON381_HEADING,local,false,w*position.x/100,h*position.y/100,Math.min(1,w/500),now);
   }
  });}).catch(()=>{});
  return()=>{alive=false;observer.disconnect();stop?.();};
 },[arena]);return <canvas className="dragon381-effects" ref={canvas} aria-hidden="true"/>;
}

