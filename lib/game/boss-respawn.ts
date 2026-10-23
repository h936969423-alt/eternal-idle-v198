import raw from './gamedata.json';
import {isPausedDragonZone} from './dragon-availability';
export const ORDINARY_RESPAWN_MS=5000;
export function playableBoss(id:string){if(isPausedDragonZone(id))return null;const b=(raw.worldBosses as Record<string,any>)[id];if(!b||b.mvOnly||(!b.mob&&!b.members?.length))return null;const inferred=({hourly:3600000,even:7200000,q4h:14400000} as Record<string,number>)[b.respawnMark];const respawnMs=b.respawnMs||inferred;if(!(respawnMs>0))return null;return {...b,respawnMs,scheduleInferred:!b.respawnMs};}
export function bossMembers(id:string){const b=playableBoss(id);return !b?[]:b.members||Array.from({length:b.count||1},()=>({mob:b.mob,hp:b.hp}));}
export function bossName(id:string){const b=(raw.worldBosses as Record<string,any>)[id];return b?.name||(raw.mobs as Record<string,any>)[b?.mob]?.n||id;}
export function bossWait(until:number,now=Date.now()){const seconds=Math.max(0,Math.ceil((until-now)/1000));return `${Math.floor(seconds/3600)}時${Math.floor(seconds%3600/60)}分${seconds%60}秒`;}
