import type {CombatEvent} from './engine';

/** 黑暗妖精爆擊「血刃十字斬」(approved mock-up option A): two red blade streaks cross over the
 * monster, a white-hot core flashes and a ring of red sparks bursts out. It starts on the same
 * frame as the critical damage number and never delays it. Drawn live, not as a sprite sheet. */
export const CRIT_SLASH_MS=420;
/** Proportions come from the mock-up, drawn on a 590-unit-wide arena. */
export const CRIT_SLASH_SCENE_WIDTH=590;
/** Centre offset from the monster's sprite centre, in mock-up units: toward the player (left), a little up. */
export const CRIT_SLASH_OFFSET={x:-8,y:-2};
const SECOND_SLASH_MS=50,SPARKS_AT_MS=110;

type Hit=Pick<CombatEvent,'kind'|'critical'|'miss'|'source'|'weaponProc'|'slot'|'uid'|'seq'>;
/** A Dark Elf's own physical critical hit on a monster (normal attack or 會心一擊). */
export function isPlayerCriticalHit(e:Hit){
 return e.kind==='attack'&&!!e.critical&&!e.miss&&!e.weaponProc&&e.slot!==undefined&&!!e.uid&&(!e.source||e.source==='physical');
}
/** Critical hits newly shown (not seen before, still within the effect's lifetime). */
export function newCritSlashes<T extends Hit&{shownAt:number}>(floats:readonly T[],seen:ReadonlySet<number>,now:number):T[]{
 return floats.filter(f=>isPlayerCriticalHit(f)&&!seen.has(f.seq)&&f.shownAt>now-CRIT_SLASH_MS);
}

type Ctx=Pick<CanvasRenderingContext2D,'save'|'restore'|'beginPath'|'moveTo'|'lineTo'|'stroke'|'fill'|'arc'>&{globalCompositeOperation:string;shadowColor:string;shadowBlur:number;strokeStyle:string|CanvasGradient|CanvasPattern;fillStyle:string|CanvasGradient|CanvasPattern;lineWidth:number;lineCap:CanvasLineCap};
const red=(a:number)=>`rgba(255,59,48,${a})`,hot=(a:number)=>`rgba(255,236,220,${a})`,ember=(a:number)=>`rgba(255,160,90,${a})`;
const clamp=(v:number)=>Math.max(0,Math.min(1,v)),ease=(t:number)=>1-Math.pow(1-t,3),lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Spark directions are fixed per hit so a replay looks the same. */
export function critSparks(seed:number){let s=Math.abs(Math.floor(seed))%2147483646+1;const r=()=>(s=s*16807%2147483647)/2147483647;return Array.from({length:14},()=>({a:r()*Math.PI*2,v:60+r()*90,size:1+r()*1.6}));}

/** Draw the effect at age t (ms) centred on (cx,cy); k converts mock-up units to canvas pixels.
 * Returns false once the effect is over. */
export function drawCritSlash(ctx:Ctx,t:number,cx:number,cy:number,k:number,sparks=critSparks(1)):boolean{
 if(t<0||t>=CRIT_SLASH_MS)return false;
 const glow=(color:string,blur:number,fn:()=>void)=>{ctx.save();ctx.globalCompositeOperation='lighter';ctx.shadowColor=color;ctx.shadowBlur=blur*k;fn();ctx.restore();};
 const slash=(t0:number,angle:number)=>{const s=t-t0;if(s<0||s>300)return;const draw=ease(clamp(s/70)),fade=s<120?1:1-(s-120)/180,L=36*k;
  const dx=Math.cos(angle)*L,dy=Math.sin(angle)*L,x0=cx-dx,y0=cy-dy,x1=lerp(x0,cx+dx,draw),y1=lerp(y0,cy+dy,draw);
  glow(red(.95),12,()=>{ctx.lineCap='round';ctx.strokeStyle=red(.9*fade);ctx.lineWidth=(7*fade+1)*k;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
   ctx.strokeStyle=hot(.95*fade);ctx.lineWidth=(2.2*fade+.4)*k;ctx.beginPath();ctx.moveTo(lerp(x0,x1,.15),lerp(y0,y1,.15));ctx.lineTo(lerp(x0,x1,.92),lerp(y0,y1,.92));ctx.stroke();});};
 slash(0,-.75);slash(SECOND_SLASH_MS,.75);
 const s=t-SPARKS_AT_MS;
 if(s>=0&&s<=CRIT_SLASH_MS-SPARKS_AT_MS){const q=s/(CRIT_SLASH_MS-SPARKS_AT_MS);glow(ember(.9),6,()=>{for(const p of sparks){const d=ease(q)*p.v*.45*k,x=cx+Math.cos(p.a)*d,y=cy+Math.sin(p.a)*d*.7+q*q*12*k;ctx.fillStyle=(p.size>2?hot:ember)((1-q)*.95);ctx.beginPath();ctx.arc(x,y,p.size*(1-q*.5)*k,0,Math.PI*2);ctx.fill();}});}
 if(t<90)glow(hot(1),14,()=>{ctx.fillStyle=hot(1-t/90);ctx.beginPath();ctx.arc(cx,cy,(5+t/90*6)*k,0,Math.PI*2);ctx.fill();});
 return true;
}
