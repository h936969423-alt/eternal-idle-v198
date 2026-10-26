/** Presentation-only rendezvous: confirmed HP results wait for a displayed
 * local swing's contact frame. No damage or reward is calculated here. */
type Contact={uid:string;at:number;consumed:boolean};
type Owner={active:boolean;period:number;contacts:Contact[];waiting:Map<number,number>};
const owners=new Map<string,Owner>();
export const localHitOwner=(id:string,zone:string)=>`${id}:${zone}`;
/** At high attack speeds select a frame that the 125ms sampler can display
 * before the next 100ms attack tick replaces this swing. */
export function localContactFrame(count:number,seconds:number){
 const frames=Math.max(1,count),step=Math.max(45,Math.min(125,seconds*1000/frames));
 const shortestPeriod=Math.max(100,Math.floor(seconds*10)*100);
 return Math.max(0,Math.min(Math.floor(frames/2),Math.floor((shortestPeriod-125)/step)));
}
export function setLocalHitActive(key:string,active:boolean,period:number){
 const owner:Owner=owners.get(key)||{active,period,contacts:[],waiting:new Map()};
 owner.active=active;owner.period=period;
 if(!active){owner.contacts=[];owner.waiting.clear();}
 owners.set(key,owner);
}
export function clearLocalHits(key:string){owners.delete(key);}
export function recordLocalContact(key:string,uid:string,at:number){
 const owner=owners.get(key);if(!owner?.active)return;
 owner.contacts=owner.contacts.filter(c=>!c.consumed&&at-c.at<=80);
 owner.contacts.push({uid,at,consumed:false});
}
export function allowLocalHit(key:string,uid:string|undefined,seq:number,now:number){
 const owner=owners.get(key);if(!owner?.active||!uid)return true;
 owner.contacts=owner.contacts.filter(c=>!c.consumed&&now-c.at<=80);
 const contact=owner.contacts.find(c=>c.uid===uid&&c.at<=now);
 if(contact){contact.consumed=true;owner.waiting.delete(seq);return true;}
 const since=owner.waiting.get(seq)??now;owner.waiting.set(seq,since);
 // Missing frames/old targets must not hold canonical results indefinitely.
 const limit=Math.min(5000,Math.max(2000,owner.period*2000));
 if(now-since>=limit){owner.waiting.delete(seq);return true;}
 if(owner.waiting.size>160)owner.waiting.delete(owner.waiting.keys().next().value!);
 return false;
}
