/** Player motion ported from pp771007/idle-lineage-class@5f00f4a
 * js/09-vfx-render.js: _PM_PRIO, _playerMorphTrigger, _playerMorphApply,
 * _atkFrameMs and _skillFrameMs. React/network handling belongs to the adapter.
 */
export type SunriseAction='idle'|'attack'|'skill'|'hurt'|'death';
export type SunriseClock={act:Exclude<SunriseAction,'idle'>|null;t:number;pendAtk:boolean};
export type SunriseTiming={counts:Partial<Record<SunriseAction,number>>;attackSeconds:number;castSeconds:number};
export const SUNRISE_PLAYER_PRIORITY={death:5,hurt:4,skill:3,attack:2,idle:1};
export const emptySunriseClock=():SunriseClock=>({act:null,t:0,pendAtk:false});
export const SUNRISE_ATTACK_TICK_MS=100;
export const SUNRISE_PLAYER_FRAME_MS=125;
export type LocalAttackClock={elapsed:number;period:number};
export type LocalAttackInput={running:boolean;hasTarget:boolean;blocked:boolean;ownerKey?:string;targetUid?:string;targetSlot?:number;liveTargetUids?:string[]};
/** Local progress only; damage, rewards and saves remain server-owned. */
export function tickLocalPlayerAttack(clock:LocalAttackClock,seconds:number,enabled:boolean){
 const period=Number.isFinite(seconds)&&seconds>0?Math.max(.1,seconds):1;
 if(!enabled)return {clock:{elapsed:0,period},attack:false};
 let elapsed=Number.isFinite(clock.elapsed)&&clock.elapsed>=0?clock.elapsed:0;
 if(clock.period>0&&clock.period!==period)elapsed=elapsed/clock.period*period;
 elapsed+=SUNRISE_ATTACK_TICK_MS/1000;
 const attack=elapsed+1e-9>=period;
 return {clock:{elapsed:Math.max(0,attack?elapsed-period:elapsed),period},attack};
}
export function sunriseFrameMs(seconds:number,count:number){return Number.isFinite(seconds)&&seconds>0&&count>0?Math.max(20,seconds*1000/count):125;}
export function sunriseMotionDuration(kind:SunriseAction,timing:SunriseTiming){
 const count=timing.counts[kind]||0;
 return count*(kind==='attack'?sunriseFrameMs(timing.attackSeconds,count):kind==='skill'?sunriseFrameMs(timing.castSeconds,count):125);
}
export function triggerSunriseMotion(state:SunriseClock,kind:Exclude<SunriseAction,'idle'>,now:number,timing:SunriseTiming):SunriseClock{
 if(state.act==='death')return state;
 const active=state.act&&now-state.t<sunriseMotionDuration(state.act,timing);
 // Hurt is cosmetic: repeated incoming hits must not cancel an attack's contact,
 // interrupt a cast, or keep restarting hurt until outgoing attacks starve.
 if(kind==='hurt'&&active)return state;
 const current=active&&state.act!=='hurt'?SUNRISE_PLAYER_PRIORITY[state.act!]:0;
 if(SUNRISE_PLAYER_PRIORITY[kind]<current)return kind==='attack'?{...state,pendAtk:true}:state;
 return {act:kind,t:now,pendAtk:false};
}
export function advanceSunriseMotion(state:SunriseClock,now:number,timing:SunriseTiming):SunriseClock{
 if(!state.act||state.act==='death'||now-state.t<sunriseMotionDuration(state.act,timing))return state;
 return state.pendAtk&&(timing.counts.attack||0)>0?{act:'attack',t:now,pendAtk:false}:{...state,act:null,pendAtk:false};
}
export function sunriseMotionPose(state:SunriseClock,now:number,timing:SunriseTiming):{kind:SunriseAction;frame:number}{
 const kind=state.act&&(timing.counts[state.act]||0)>0?state.act:'idle',count=timing.counts[kind]||1;
 const step=kind==='attack'?sunriseFrameMs(timing.attackSeconds,count):kind==='skill'?sunriseFrameMs(timing.castSeconds,count):125;
 return {kind,frame:kind==='idle'?Math.floor(now/125)%count:Math.min(count-1,Math.max(0,Math.floor((now-state.t)/step)))};
}




