/** Presentation-only rendezvous: confirmed HP results wait for a displayed
 * local swing's contact frame. No damage or reward is calculated here. */
export type SwingTarget={uid:string;slot?:number;seq?:number};
type Contact={uid:string;seq?:number;at:number;consumed:boolean};
type Owner={active:boolean;contacts:Contact[];pending:SwingTarget[];swing?:SwingTarget;retired:Set<number>;completed:Set<number>;contactSwing?:number};
const owners=new Map<string,Owner>();
const createOwner=():Owner=>({active:false,contacts:[],pending:[],retired:new Set(),completed:new Set()});
export const localHitOwner=(id:string,zone:string)=>`${id}:${zone}`;
/** At high attack speeds select a frame that the 125ms sampler can display
 * before the next 100ms attack tick replaces this swing. */
export function localContactFrame(count:number,seconds:number){
 const frames=Math.max(1,count),step=Number.isFinite(seconds)&&seconds>0?Math.max(20,seconds*1000/frames):125;
 const shortestPeriod=Math.max(100,Math.floor(seconds*10)*100);
 return Math.max(0,Math.min(Math.floor(frames/2),Math.floor((shortestPeriod-125)/step)));
}
export function setLocalHitActive(key:string,active:boolean,_period:number){
 const owner:Owner=owners.get(key)||createOwner();
 owner.active=active;
 if(!active){owner.contacts=[];owner.swing=undefined;}
 owners.set(key,owner);
}
export function clearLocalHits(key:string){owners.delete(key);}
export function queueLocalHitTargets(key:string,events:{seq:number;kind:string;uid?:string;slot?:number;skill?:string;weaponProc?:boolean;source?:string}[]){
 const owner=owners.get(key)||createOwner(),known=new Set(owner.pending.map(e=>e.seq));
 for(const e of events)if(e.kind==='attack'&&!e.skill&&!e.weaponProc&&(!e.source||e.source==='physical')&&e.uid&&!known.has(e.seq)&&!owner.completed.has(e.seq)){owner.pending.push({seq:e.seq,uid:e.uid,slot:e.slot});known.add(e.seq);}
 owner.pending.sort((a,b)=>a.seq!-b.seq!);owner.pending=owner.pending.slice(0,160);owners.set(key,owner);
}
/** Capture the earliest confirmed normal-hit target once, at swing start. */
export function beginLocalSwing(key:string,fallback:SwingTarget,liveUids?:string[]):SwingTarget{
 const owner=owners.get(key)||createOwner();
 if(liveUids)owner.pending=owner.pending.filter(e=>{if(liveUids.includes(e.uid))return true;if(e.seq!==undefined)owner.retired.add(e.seq);return false;});
 if(owner.retired.size>160)owner.retired=new Set([...owner.retired].slice(-160));
 const target=owner.pending[0]||fallback;owner.swing={...target};owners.set(key,owner);return {...target};
}
export function currentLocalSwing(key:string){const owner=owners.get(key);return owner?.active?owner.swing:undefined;}
export function recordLocalContact(key:string,uid:string,at:number,seq?:number,swingToken?:number){
 const owner=owners.get(key);if(!owner?.active)return;
 // Contact-frame callbacks may run more than once, but a swing can only issue
 // one hit permit, even after its first permit has already been consumed.
 if(swingToken!==undefined){if(owner.contactSwing===swingToken)return;owner.contactSwing=swingToken;}
 // Retain one actual contact until consumed or replaced by the next contact.
 // An 80ms expiry discarded it before ordinary buffered/network results arrived.
 owner.contacts=[{uid,seq,at,consumed:false}];
}
/** A hit settled without a swing (its target was superseded by a spell). */
export function settleLocalHit(key:string,seq:number){const owner=owners.get(key);if(!owner)return;owner.completed.add(seq);if(owner.completed.size>512)owner.completed.delete(owner.completed.values().next().value!);owner.pending=owner.pending.filter(e=>e.seq!==seq);}
export function allowLocalHit(key:string,uid:string|undefined,seq:number,now:number){
 const owner=owners.get(key);
 const complete=()=>{if(!owner)return;owner.completed.add(seq);if(owner.completed.size>512)owner.completed.delete(owner.completed.values().next().value!);owner.pending=owner.pending.filter(e=>e.seq!==seq);};
 // A repeated result is drained without consuming another swing. The view's
 // normal-hit receipt ledger suppresses its duplicate HP/number application.
 if(owner?.completed.has(seq))return true;
 if(!owner?.active||!uid){complete();return true;}
 // Retired results also leave the replay queue. Finalize them just like a
 // contacted result, or a per-frame requeue leaves a ghost at pending[0].
 if(owner.retired.delete(seq)){complete();return true;}
 owner.contacts=owner.contacts.filter(c=>!c.consumed);
 const contact=owner.contacts.find(c=>c.uid===uid&&(c.seq===undefined||c.seq===seq)&&c.at<=now);
 if(contact){contact.consumed=true;complete();return true;}
 // An elapsed timeout is not a swing. Releasing every overdue hit here caused
 // burst HP updates without displayed contacts. Stop/restore handles resync.
 return false;
}


