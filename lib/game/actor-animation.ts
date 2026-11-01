import type {CombatEvent} from './engine';
/** Only new player actions may start a new player clip. Misses never reset it. */
export function actorAction(events:(CombatEvent|undefined)[],after:number,skillType:(id:string)=>string|undefined){
 const fresh=events.filter((e):e is CombatEvent=>!!e&&e.seq>after);
 const seq=Math.max(after,...fresh.map(e=>e.seq));
 const own=fresh.filter(e=>e.source!=='monster'&&e.source!=='pet'&&e.source!=='summon'&&e.source!=='poison'&&(e.kind==='attack'||e.kind==='magic'&&!!e.skill)).sort((a,b)=>b.seq-a.seq);
 const event=own[0];
 if(event){const type=event.skill?skillType(event.skill):undefined;return {seq,action:(event.kind==='attack'||type==='atk')&&!event.skill?'attack':event.skill&&['sk_elf_triple','lw_skill_450','sk_dark_crit','sk_shock_stun'].includes(event.skill)?'attack':'cast'};}
 const hurt=fresh.find(e=>e.kind==='hurt'&&!e.miss&&!!e.damage);
 return {seq,action:hurt?'hurt':null};
}
export function clipFrame(elapsed:number,duration:number,count:number){return Math.min(Math.max(0,count-1),Math.floor(Math.max(0,elapsed)/Math.max(1,duration)*count));}
