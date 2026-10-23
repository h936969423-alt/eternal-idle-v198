import source from './dragon381-source.json';
import registry from './dragon381-registry.json';
export const DRAGON381_REGISTRY=registry;
export const DRAGON381_SOURCE=source;
export type SourceRow=Record<string,string>;
export type DragonMemory={uses:Record<string,number>;readyAt:Record<string,number>;lastAt:number};
export type DragonChoice={row:SourceRow;skill?:SourceRow;gfx:number;action:number;physical:boolean;name:string;type:number;element:string};
const npcById=new Map(source.dragons.map(n=>[Number(n.npcid),n]));
const skills=new Map(source.skills.map(n=>[Number(n.skill_id),n]));
const rows=new Map<number,SourceRow[]>();
for(const r of source.mobskills){const id=Number(r.mobid);rows.set(id,[...(rows.get(id)||[]),r]);}
export function dragonRecord(id:number){return npcById.get(id);}
export function dragonRows(id:number){return rows.get(id)||[];}
export function dragonSkill(id:number){return skills.get(id);}
export function dragonGfx(id:number){return Number(npcById.get(id)?.gfxid||source.summons.find(n=>Number(n.npcid)===id)?.gfxid||0);}
export function dragonMobId(npcId:number){return registry.find(r=>r.npcId===npcId)?.mobId||`ap381_summon_${npcId}`;}
export function dragonMemory():DragonMemory{return {uses:{},readyAt:{},lastAt:0};}
/** Preserve the actual source core gate (TriRnd <= random1..100), not an assumed percentage. */
export function dragonSourceChance(raw:number){return raw>0?Math.max(0,Math.min(1,(101-raw)/100)):0;}
export function chooseDragonSkill(id:number,memory:DragonMemory,hpPercent:number,mp:number,now:number,rng:()=>number,options:{companionHp?:number;distance?:number}={}):DragonChoice|null{
 const list=dragonRows(id).filter(r=>{
  const key=r.actNo,hp=Number(r.TriHp),comp=Number(r.TriCompanionHp),range=Number(r.TriRange),count=Number(r.TriCount);
  return (memory.readyAt[key]||0)<=now&&(!hp||hpPercent<=hp)&&(!comp||options.companionHp!==undefined&&options.companionHp<=comp)&&(!count||(memory.uses[key]||0)<count)&&(!range||range<0?(options.distance??1)<=Math.abs(range||14):(options.distance??1)>=range)&&Number(skills.get(Number(r.SkillId))?.mpConsume||0)<=mp;
 });
 if(!list.length)return null;
 const r=list[Math.min(list.length-1,Math.floor(Math.max(0,rng())*list.length))];
 if(rng()>=dragonSourceChance(Number(r.TriRnd)))return null;
 const skill=skills.get(Number(r.SkillId)),type=Number(r.Type),gfx=Number(r.Gfxid)||Number(skill?.castgfx)||0,action=Number(r.ActId)||Number(skill?.action_id)||(type===1?1:19);
 memory.uses[r.actNo]=(memory.uses[r.actNo]||0)+1;memory.readyAt[r.actNo]=now+Math.max(0,Number(r.reuseDelay));memory.lastAt=now;
 return {row:r,skill,gfx,action,physical:type===1,name:r.mobname||skill?.name||'龍之攻擊',type,element:({1:'earth',2:'fire',4:'water',8:'wind'} as Record<number,string>)[Number(skill?.attr)]||'none'};
}
export function dragonDamage(choice:DragonChoice,roll:(min:number,max:number)=>number){const s=choice.skill;if(!s)return 0;const count=Math.max(0,Math.min(50,Number(s.damage_dice_count))),dice=Math.max(1,Number(s.damage_dice));let value=Number(s.damage_value)||0;for(let n=0;n<count;n++)value+=roll(1,dice);return Math.max(0,Math.floor(value*Math.max(.1,Number(choice.row.Leverage||10)/10)));}
export function dragonControl(type:number){return ({5:'stun',6:'cancel',7:'weaponBreak',8:'potionErosion',9:'pollutedWater',10:'healingErosion',11:'silence',12:'potionSeal',13:'windShackle',15:'field',16:'field',17:'slow'} as Record<number,string>)[type];}
export function dragonEffectGfx(choice:DragonChoice){return choice.gfx||({5:11727,7:172,8:7781,9:7782,10:7780,11:10708,13:8032} as Record<number,number>)[choice.type]||0;}
export const DRAGON_COMPATIBILITY={edition:'3.81',sharedMagicSource:'Sprite',fallbacks:{15492:2001,12750:4160,12751:4160,15930:762},disabledLayers:[9292]} as const;
