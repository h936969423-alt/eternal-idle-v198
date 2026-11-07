type WalkState={moving:boolean;direction:number;facing?:number;step?:number};
let walkState:WalkState={moving:false,direction:2,facing:2};const walkListeners=new Set<()=>void>();
/** Lets the sprite pick walk frames without the driver re-rendering the whole arena. */
export const playerWalkStore={get:()=>walkState,subscribe(fn:()=>void){walkListeners.add(fn);return()=>{walkListeners.delete(fn);};},set(next:WalkState){if(next.moving===walkState.moving&&next.direction===walkState.direction&&next.step===walkState.step&&(next.facing??2)===(walkState.facing??2))return;walkState=next;walkListeners.forEach(fn=>fn());}};
/** Client directions: 0 up-right, then clockwise in 45 degree steps. */
export function walkDirection(dx:number,dy:number){return (Math.round((Math.atan2(dx,-dy)*180/Math.PI+360)/45)+8)%8;}
export function walkFrames(counts:Record<string,number>|undefined,base:string,direction:number){const count=counts?.[String(direction)]||0;return Array.from({length:count},(_,i)=>`/assets/client-walk/v1/${base}/${direction}_${i}.webp`);}
export function directionalFrames(counts:Record<string,number>|undefined,base:string,prefix:string,direction:number){const count=counts?.[String(direction)]||0;return Array.from({length:count},(_,i)=>`/assets/client-walk/v1/${base}/${prefix}${direction}_${i}.webp`);}
/** Keeps attack timing: the existing clip's progress selects the frame in a clip of another length. */
export function scaledFrame(frame:number,total:number,length:number){return length<=0?0:Math.min(length-1,Math.floor(Math.max(0,frame)/Math.max(1,total)*length));}
/** Lets combat replay wait until the player has actually reached the monster it is about to show a hit on. */
export type WorldCombatGate={blocks(uid:string):boolean;aim(uid:string):void};
export const worldCombatGate:{current:WorldCombatGate|null}={current:null};
/** A hit needing contact: player hits and monster hits, but not poison ticks or a manual cast. */
export function hitNeedsContact(e:{kind:string;uid?:string;source?:string;manual?:boolean;catchUp?:boolean;dragonDot?:boolean}){return !!e.uid&&!e.manual&&!e.catchUp&&!e.dragonDot&&(e.kind==='attack'||e.kind==='hurt')&&!['poison','burn','bleed'].includes(e.source||'');}
