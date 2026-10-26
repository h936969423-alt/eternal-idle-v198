/** Presentation-only rendezvous: confirmed HP results wait for a displayed
 * local swing's contact frame. No damage or reward is calculated here. */
export type SwingTarget={uid:string;slot?:number;seq?:number};
type Contact={uid:string;seq?:number;at:number;consumed:boolean};
type Owner={active:boolean;period:number;contacts:Contact[];waiting:Map<number,number>;pending:SwingTarget[];swing?:SwingTarget;retired:Set<number>};
const owners=new Map<string,Owner>();
const createOwner=():Owner=>({active:false,period:1,contacts:[],waiting:new Map(),pending:[],retired:new Set()});
export const localHitOwner=(id:string,zone:string)=>`${id}:${zone}`;
/** At high attack speeds select a frame that the 125ms sampler can display
 * before the next 100ms attack tick replaces this swing. */
export function localContactFrame(count:number,seconds:number){
 const frames=Math.max(1,count),step=Math.max(45,Math.min(125,seconds*1000/frames));
 const shortestPeriod=Math.max(100,Math.floor(seconds*10)*100);
 return Math.max(0,Math.min(Math.floor(frames/2),Math.floor((shortestPeriod-125)/step)));
}
export function setLocalHitActive(key:string,active:boolean,period:number){
 const owner:Owner=owners.get(key)||createOwner();
 owner.active=active;owner.period=period;
 if(!active){owner.contacts=[];owner.waiting.clear();}
 owners.set(key,owner);
}
export function clearLocalHits(key:string){owners.delete(key);}
export function queueLocalHitTargets(key:string,events:{seq:number;kind:string;uid?:string;slot?:number;skill?:string;weaponProc?:boolean;source?:string}[]){
 const owner=owners.get(key)||createOwner(),known=new Set(owner.pending.map(e=>e.seq));
 for(const e of events)if(e.kind==='attack'&&!e.skill&&!e.weaponProc&&(!e.source||e.source==='physical')&&e.uid&&!known.has(e.seq)){owner.pending.push({seq:e.seq,uid:e.uid,slot:e.slot});known.add(e.seq);}
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
export function recordLocalContact(key:string,uid:string,at:number,seq?:number){
 const owner=owners.get(key);if(!owner?.active)return;
 owner.contacts=owner.contacts.filter(c=>!c.consumed&&at-c.at<=80);
 owner.contacts.push({uid,seq,at,consumed:false});
}
export function allowLocalHit(key:string,uid:string|undefined,seq:number,now:number){
 const owner=owners.get(key);
 if(!owner?.active||!uid){if(owner)owner.pending=owner.pending.filter(e=>e.seq!==seq);return true;}
 if(owner.retired.delete(seq))return true;
 owner.contacts=owner.contacts.filter(c=>!c.consumed&&now-c.at<=80);
 const contact=owner.contacts.find(c=>c.uid===uid&&(c.seq===undefined||c.seq===seq)&&c.at<=now);
 const complete=()=>{owner.waiting.delete(seq);owner.pending=owner.pending.filter(e=>e.seq!==seq);};
 if(contact){contact.consumed=true;complete();return true;}
 const since=owner.waiting.get(seq)??now;owner.waiting.set(seq,since);
 // Missing frames/old targets must not hold canonical results indefinitely.
 const limit=Math.min(5000,Math.max(2000,owner.period*2000));
 if(now-since>=limit&&(!owner.swing||owner.swing.uid===uid)){complete();return true;}
 if(owner.waiting.size>160)owner.waiting.delete(owner.waiting.keys().next().value!);
 return false;
}

