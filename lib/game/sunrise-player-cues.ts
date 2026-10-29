import type {CombatEvent} from './engine';
import type {SunriseAction} from './sunrise-player-motion';
export type SunriseCue={seq:number;kind:Exclude<SunriseAction,'idle'|'death'|'hurt'>;key:string;previewAt?:number;displayAt?:number;targetUid?:string};
/** Source hooks: playerAttack() triggers attack; successful castSkill() triggers
 * skill once. Damage rows, AoE targets, missile impacts and weapon procs do not
 * start another player action. Hurt is driven by the rendered player's HP delta.
 */
export function sunrisePlayerCues(events:CombatEvent[]):SunriseCue[]{
 const seen=new Set<string>(),out:SunriseCue[]=[];
 for(const e of [...events].sort((a,b)=>a.seq-b.seq)){
  if(e.visualPhase==='impact'||e.weaponProc||['monster','doll','pet','summon','poison'].includes(e.source||''))continue;
  const kind=e.kind==='attack'&&!e.skill?'attack':e.kind==='magic'&&e.skill?'skill':undefined;
  if(!kind)continue;
  const key=`${e.at}:${kind}:${e.skill||''}`;if(seen.has(key))continue;seen.add(key);
  out.push({seq:e.seq,kind,key,targetUid:e.uid,displayAt:e.visualCastAt??e.visualAt??(e as CombatEvent&{shownAt?:number}).shownAt,...(Number.isFinite(e.visualCastAt)?{previewAt:e.visualCastAt}:{})});
 }
 return out;
}

