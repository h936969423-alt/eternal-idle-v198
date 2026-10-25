import type {Character,Encounter} from './engine';
/** Combat clocks hold elapsed SECONDS, never Unix milliseconds. */
export function combatClock(value:number|undefined,period=86400){
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>=86400)return 0;
 return Math.min(value,Math.max(0,period-1e-6));
}
export function repairCombatClocks(c:Character){
 c.atkClock=combatClock(c.atkClock);c.mobClock=combatClock(c.mobClock);
 const seen=new Set<Encounter>();
 for(const arena of [c.arena||[],...Object.values(c.bossRooms||{}).map(room=>room.arena)])for(const m of arena){
  if(seen.has(m))continue;seen.add(m);m.clock=combatClock(m.clock);
  for(const key of Object.keys(m.magicClocks||{}))m.magicClocks![key]=combatClock(m.magicClocks![key]);
 }
}
