export type MotionKind='idle'|'walk'|'spawn'|'attack'|'skill'|'hurt'|'death';
export type MotionCue={seq:number;kind:MotionKind;at:number;key?:string;immediate?:boolean;durationMs?:number;displayAt?:number};
export type MotionClock={kind:MotionKind;at:number;duration:number;pending:MotionCue[]};
export const priority:Record<MotionKind,number>={idle:0,walk:0,spawn:5,attack:2,skill:3,hurt:4,death:6};
export function frameMs(interval:number,count:number){return interval>0&&count>0?Math.min(125,interval*1000/count):125;}
// A player swing spans the real attack interval; a 125ms frame cap left idle gaps at slower speeds.
export function durationFor(kind:MotionKind,count:number,attackInterval=0,castInterval=0,hurtMultiplier=1){if(kind==='attack'&&attackInterval>0)return attackInterval*1000;return Math.max(1,count)*(kind==='skill'?frameMs(castInterval,count):125)*(kind==='hurt'?Math.max(.05,Math.min(1,hurtMultiplier)):1);}
export function pushCue(state:MotionClock,cue:MotionCue,now:number,duration:(kind:MotionKind)=>number,retriggerAttack=false,attackPriority=false){
 if(state.kind==='death')return state;
 // A live player swing keeps its current frame when another arrow is released.
 // Finish it within the new burst's window, without restarting at frame zero.
 if(attackPriority&&cue.immediate&&cue.kind==='attack'&&state.kind==='attack'&&now<state.at+state.duration)
  return {...state,duration:Math.min(state.duration,now-state.at+(cue.durationMs??duration('attack')))};
 // A confirmed player swing owns its display deadline. Never build a second
 // attack queue behind the previous swing because a render arrived late.
 if(attackPriority&&state.kind!=='spawn'&&cue.kind==='attack'&&!cue.immediate&&Number.isFinite(cue.displayAt))
  return {kind:cue.kind,at:Math.min(now,cue.displayAt!),duration:cue.durationMs??duration(cue.kind),pending:[]};
 if(cue.immediate)return {kind:cue.kind,at:now,duration:cue.durationMs??duration(cue.kind),pending:[]};
 const active=now<state.at+state.duration;
 if(attackPriority&&active&&(state.kind==='attack'||state.kind==='skill')&&cue.kind==='hurt')return state;
 // A confirmed player action replaces a visual cast/flinch immediately. Skill
 // cooldowns are enforced by the server; replaying the pose must not add a lock.
 if(attackPriority&&((cue.kind==='attack'&&state.kind==='skill')||((cue.kind==='attack'||cue.kind==='skill')&&state.kind==='hurt')))
  return {kind:cue.kind,at:now,duration:cue.durationMs??duration(cue.kind),pending:[]};
 // A pose represents current combat, not a second history of every attack.
 // Keep only the newest deferred pose while preserving death/skill priority.
 const defer=()=>({...state,pending:retriggerAttack?[...state.pending,cue].slice(-4):[cue]});
 // New monster attacks cannot jump ahead of attacks already deferred by spawn/skill.
 if(active&&retriggerAttack&&state.kind==='attack'&&cue.kind==='attack'&&state.pending.length)return defer();
 if(active&&(state.kind==='spawn'||state.kind==='skill')&&cue.kind!=='death'&&cue.kind!=='hurt')return defer();
 if(active&&!(attackPriority&&cue.kind==='attack'&&state.kind==='hurt')&&priority[cue.kind]<priority[state.kind])return defer();
 if(active&&!retriggerAttack&&cue.kind===state.kind&&cue.kind==='attack')return defer();
 const pending:MotionCue[]=retriggerAttack?state.pending:[];
 return {kind:cue.kind,at:now,duration:cue.durationMs??duration(cue.kind),pending};
}
export function advanceMotion(state:MotionClock,now:number,duration:(kind:MotionKind)=>number):MotionClock{
 if(state.kind==='death'||now<state.at+state.duration)return state;
 const next=state.pending[0];
 return next?{kind:next.kind,at:now,duration:next.durationMs??duration(next.kind),pending:state.pending.slice(1)}:{kind:'idle',at:now,duration:Infinity,pending:[]};
}
export function facing(dx:number,dy:number){const oct=Math.round(Math.atan2(dy,dx)*4/Math.PI);return ({0:3,1:4,2:5,3:6,4:7,'-4':7,'-3':0,'-2':1,'-1':2} as Record<string,number>)[oct]??6;}
export function projectileCount(){return 1;}


