import {isTripleArrow} from './projectile-timing';
import type {CombatEvent} from './engine';

/** 三重矢氣壓環（approved mock-up option A): a green ring of air squeezes to a point above the elf's
 * head and bursts into a faint shockwave. It starts on the same frame as the first arrow and never
 * delays the volley. Drawn live (display refresh rate), not as a 12fps sprite sheet. */
export const PRESSURE_RING_MS=460;
/** Proportions come from the mock-up, drawn on a 590-unit-wide arena. */
export const PRESSURE_RING_SCENE_WIDTH=590;
/** Ring centre above the top of the head, in mock-up units. */
export const PRESSURE_RING_LIFT=24;
/** Canvas box around the ring centre, in mock-up units (ring, converging streaks and glow). */
export const PRESSURE_RING_BOX={width:132,height:66};
/** Shots of one cast leave 70ms apart; a launch this long after the previous ring is a new cast. */
const NEW_CAST_GAP_MS=300;

type Launch=Pick<CombatEvent,'kind'|'skill'|'visualPhase'|'seq'>&{shownAt:number};
/** Display times of displayed Triple Arrow launches that begin a new cast (one ring per cast). */
export function pressureRingStarts(actions:readonly Launch[],lastStart:number,now:number):number[]{
 const launches=actions.filter(e=>e.kind==='attack'&&e.visualPhase==='launch'&&isTripleArrow(e.skill)&&e.shownAt>now-PRESSURE_RING_MS).map(e=>e.shownAt).sort((a,b)=>a-b);
 const starts:number[]=[];let last=lastStart;
 for(const at of launches)if(at-last>NEW_CAST_GAP_MS){starts.push(at);last=at;}
 return starts;
}

type Ctx=Pick<CanvasRenderingContext2D,'save'|'restore'|'beginPath'|'moveTo'|'lineTo'|'stroke'|'fill'|'ellipse'>&{globalCompositeOperation:string;shadowColor:string;shadowBlur:number;strokeStyle:string|CanvasGradient|CanvasPattern;fillStyle:string|CanvasGradient|CanvasPattern;lineWidth:number};
const jade=(a:number)=>`rgba(124,255,154,${a})`,core=(a:number)=>`rgba(236,255,224,${a})`;
const clamp=(v:number)=>Math.max(0,Math.min(1,v)),ease=(t:number)=>1-Math.pow(1-t,3),lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

/** Draw the ring at age t (ms) centred on (cx,cy); k converts mock-up units to canvas pixels.
 * Returns false once the effect is over. */
export function drawPressureRing(ctx:Ctx,t:number,cx:number,cy:number,k:number):boolean{
 if(t<0||t>=PRESSURE_RING_MS)return false;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor=jade(.9);ctx.shadowBlur=5*k; // shadowBlur ignores transforms: the mock-up's 10 device px on its 2× canvas = 5 units
 if(t<160){
  // Squeeze: ten streaks converge while the ring tightens to a bright core.
  const q=ease(clamp(t/110));
  for(let i=0;i<10;i++){const ang=i/10*Math.PI*2+.3,r0=lerp(38,8,q),r1=r0+lerp(14,4,q);
   ctx.strokeStyle=jade(lerp(.35,.95,q));ctx.lineWidth=1.4*k;ctx.beginPath();
   ctx.moveTo(cx+Math.cos(ang)*r1*k,cy+Math.sin(ang)*r1*.42*k);ctx.lineTo(cx+Math.cos(ang)*r0*k,cy+Math.sin(ang)*r0*.42*k);ctx.stroke();}
  const rx=lerp(30,7,q);ctx.strokeStyle=jade(.9);ctx.lineWidth=lerp(1.5,3,q)*k;ctx.beginPath();ctx.ellipse(cx,cy,rx*k,rx*.36*k,0,0,Math.PI*2);ctx.stroke();
  if(t>=100){const f=clamp((t-100)/60);ctx.fillStyle=core(1-f*.3);ctx.beginPath();ctx.ellipse(cx,cy,(6+f*4)*k,(3+f*1.5)*k,0,0,Math.PI*2);ctx.fill();}
 }else{
  // Release: two shockwave rings expand and fade.
  for(const [delay,width] of [[0,2.6],[60,1.4]]){const s=t-160-delay;if(s<0)continue;const q=ease(clamp(s/240));
   ctx.strokeStyle=jade((1-q)*.9);ctx.lineWidth=(width*(1-q)+.4)*k;ctx.beginPath();ctx.ellipse(cx,cy,lerp(10,46,q)*k,lerp(4,15,q)*k,0,0,Math.PI*2);ctx.stroke();}
  const f=clamp((t-160)/120);if(f<1){ctx.fillStyle=core(1-f);ctx.beginPath();ctx.ellipse(cx,cy,(10*(1-f)+2)*k,(4*(1-f)+1)*k,0,0,Math.PI*2);ctx.fill();}
 }
 ctx.restore();return true;
}

/** Where the top of the head is inside an object-fit:contain sprite, from the topmost opaque row. */
export function containedHeadPoint(box:{left:number;top:number;width:number;height:number},natural:{width:number;height:number},head:{row:number;column:number}){
 const scale=Math.min(box.width/natural.width,box.height/natural.height),ox=(box.width-natural.width*scale)/2,oy=(box.height-natural.height*scale)/2;
 return {x:box.left+ox+head.column*scale,y:box.top+oy+head.row*scale};
}
