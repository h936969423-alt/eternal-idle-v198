import {magicVisual} from './magic-visuals';
import raw from './gamedata.json';
import {playerActionKind} from './animation-cues';
import {durationFor} from './animation-clock';
import type {Save} from './engine';
/** Browser-only intent: a pose preview, never an engine action or damage event. */
export type CastIntent={id:number;characterId:string;skill:string;at:number;afterSeq:number;effectPreviewed?:boolean};
export function canPreviewSpellEffect(skill:string){const config=magicVisual({skill}).config;return (raw.skills as Record<string,any>)[skill]?.type==='atk'&&skill!=='sk_shock_stun'&&skill!=='sk_elf_triple'&&!!config&&!config.proj&&!config.self;}
export function castFeedbackPose(intent:CastIntent|undefined,characterId:string,now:number,count:number,castInterval:number,dead=false){
 if(!intent||dead||intent.characterId!==characterId||playerActionKind(intent.skill)!=='skill'||count<1)return undefined;
 const age=Math.max(0,now-intent.at),duration=durationFor('skill',count,0,castInterval);
 return age<duration?{kind:'skill' as const,frame:Math.min(count-1,Math.floor(age/duration*count))}:undefined;
}
/** Annotate only this response's latest confirmed manual spell. The pose can
 * continue from its click time without replaying the windup a second time.
 * This does not move the spell's release, HP/MP, hit, loot or projectile clock.
 */
export function attachCastFeedback(save:Save,intent:CastIntent):Save{
 if(playerActionKind(intent.skill)!=='skill')return save;
 return {...save,characters:save.characters.map(c=>{
  if(c.id!==intent.characterId)return c;
  const matches=(c.events||[]).filter(e=>e.seq>intent.afterSeq&&e.manual&&e.skill===intent.skill&&!e.weaponProc);
  if(!matches.length)return c;
  const at=Math.max(...matches.map(e=>e.at)),seqs=new Set(matches.filter(e=>e.at===at).map(e=>e.seq));
  return {...c,events:(c.events||[]).map(e=>seqs.has(e.seq)?{...e,visualCastAt:intent.at,...(intent.effectPreviewed?{visualEffectPreviewed:true}:{})}:e)};
 })};
}

