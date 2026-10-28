import {canonicalWSkill} from './lineagew-skill-data';
import {magicVisual} from './magic-visuals';
import raw from './gamedata.json';
import {playerActionKind} from './animation-cues';
import {durationFor} from './animation-clock';
import type {Save} from './engine';
/** Browser-only intent: a pose preview, never an engine action or damage event. */
export type CastIntent={id:number;characterId:string;skill:string;at:number;afterSeq:number;effectPreviewed?:boolean};
export function spellEffectPreviewDuration(skill:string){const c=magicVisual({skill}).config;return c?Math.ceil(Math.max(c.frames.length,...(c.layers||[]).map(x=>x.length))*1000/Math.max(1,c.fps))+100:0;}
export function spellPreviewNeedsTarget(skill:string){return !magicVisual({skill}).config?.self;}
export function canPreviewSpellEffect(skill:string){const config=magicVisual({skill}).config;return playerActionKind(skill)==='skill'&&(raw.skills as Record<string,any>)[skill]?.type!=='passive'&&!!config;}
export function castFeedbackPose(intent:CastIntent|undefined,characterId:string,now:number,count:number,castInterval:number,dead=false){
 if(!intent||dead||intent.characterId!==characterId||(playerActionKind(intent.skill)!=='skill'&&intent.skill!=='sk_shock_stun')||count<1)return undefined;
 const kind=intent.skill==='sk_shock_stun'?'attack' as const:'skill' as const;
 const age=Math.max(0,now-intent.at),duration=durationFor(kind,count,castInterval,castInterval);
 return age<duration?{kind,frame:Math.min(count-1,Math.floor(age/duration*count))}:undefined;
}
/** Annotate only this response's latest confirmed manual spell. The pose can
 * continue from its click time without replaying the windup a second time.
 * This does not move the spell's release, HP/MP, hit, loot or projectile clock.
 */
export function attachCastFeedback(save:Save,intent:CastIntent):Save{
 return {...save,characters:save.characters.map(c=>{
  if(c.id!==intent.characterId)return c;
  const skill=canonicalWSkill(intent.skill,c.cls);
  const matches=(c.events||[]).filter(e=>e.seq>intent.afterSeq&&e.manual&&e.skill&&canonicalWSkill(e.skill,c.cls)===skill&&!e.weaponProc);
  if(!matches.length)return c;
  const at=Math.max(...matches.map(e=>e.at)),seqs=new Set(matches.filter(e=>e.at===at).map(e=>e.seq));
  return {...c,events:(c.events||[]).map(e=>seqs.has(e.seq)?{...e,visualCastAt:intent.at,...(intent.effectPreviewed?{visualEffectPreviewed:true}:{})}:e)};
 })};
}


/** The click preview must relinquish the sprite when a later confirmed action
 * is displayed. Otherwise its older frame masks the live attack underneath. */
export function castPreviewSuperseded(intent:CastIntent|undefined,cues:import('./animation-clock').MotionCue[]):boolean{
 if(!intent)return false;
 const own=cues.filter(c=>c.previewed&&c.displayAt===intent.at);
 const after=Math.max(intent.afterSeq,...own.map(c=>c.seq));
 return cues.some(c=>c.seq>after&&(c.kind==='attack'||c.kind==='skill')&&Number.isFinite(c.displayAt)&&c.displayAt!>=intent.at&&!(c.previewed&&c.displayAt===intent.at));
}
export function resolvePlayerPose<T>(feedback:T|undefined,confirmed:T,intent:CastIntent|undefined,cues:import('./animation-clock').MotionCue[]):T{
 return feedback&&!castPreviewSuperseded(intent,cues)?feedback:confirmed;
}
/** The server has already applied haste and morph speed to this duration. */
export function playerCastInterval(serverSeconds:number|undefined,fallback:number):number{
 return typeof serverSeconds==='number'&&Number.isFinite(serverSeconds)&&serverSeconds>0?serverSeconds:fallback;
}

