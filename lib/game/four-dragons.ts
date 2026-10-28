import raw from './gamedata.json';
import source from './four-dragon-source.json';

export const FOUR_DRAGON_SOURCE=source;
export const FOUR_DRAGON_VERSION=source.commit;
export const FOUR_DRAGON_IDS=Object.keys(source.mobs);
export function fourDragon(id:string):any{return (source.mobs as Record<string,unknown>)[id];}
export const FOUR_DRAGON_AOE=new Set(['毒氣風暴','大地怒吼','巨水炮','寒冰噴吐','火牢','流星雨','火焰噴吐','閃電風暴']);
export type DragonDot={kind:'poison'|'burn'|'scald';damage:number;nextAt:number;until:number;tickMs:number;casterUid:string;mob:string;skill:string;petId?:string;summonUid?:string};
export function dragonMrMult(mr:number){mr=Math.max(0,mr);return mr<=100?1-mr/200:mr<=200?.5-(mr-100)/1000:mr<=400?.4-(mr-200)*.00075:mr<=600?.25-(mr-400)*.0006:mr<=800?.13-(mr-600)*.0004:mr<=1000?.05-(mr-800)*.0002:.01;}
/** Same diminishing return used by the source for elemental resistance and ER. */
export function dragonEffectiveResist(value:number){return Math.max(0,value<=50?value:50+Math.floor((value-50)/5));}
export function dragonStatusChance(base:number,mr:number){return Math.max(0,Math.min(1,(base-mr)/200));}
export function dragonDice(dice:number[],bonus:number,rng:()=>number){let total=bonus;for(let i=0;i<dice[0];i++)total+=1+Math.floor(rng()*dice[1]);return total;}
export function dragonMagicDamage(skill:any,defense:Record<string,number>,frozen:boolean,rng:()=>number){
 const element=String(skill.ele||'none'),res=defense['res'+element[0].toUpperCase()+element.slice(1)]||0;
 let damage=Math.floor(Math.floor(dragonDice(skill.dmg,skill.db||0,rng)*Math.max(0,1-dragonEffectiveResist(res)/100))*dragonMrMult(defense.mr||0))-(defense.dr||0);
 if(frozen&&skill.ext_freeze)damage+=skill.ext_freeze;
 return Math.max(1,damage);
}
export function dragonRange(dice:number[],bonus=0){return [dice[0]+bonus,dice[0]*dice[1]+bonus];}
export function dragonSkillEntries(id:string):[string,any][]{const m=fourDragon(id);return m?['mag','mag2','mag3'].filter(k=>m[k]).map(k=>[k,{...m[k],cd:m[k].cd/10}]):[];}

// Install into the shared game database before server/client consumers construct actors.
// Keep the upstream snapshot separate so a data rebuild cannot silently undo this port.
for(const [id,definition] of Object.entries(source.mobs)){
 const mobs=raw.mobs as Record<string,any>,old=mobs[id];if(!old)continue;
 const visual={icon:old.icon,dragon381:old.dragon381,sourceGfx:old.sourceGfx};
 const next:any={...structuredClone(definition),...visual,sunriseDragon:FOUR_DRAGON_VERSION,noAttack:false,mp:0,regenHp:0,regenMp:0,dmgTakenMult:1,magDmgTakenMult:1};
 for(const key of ['mag','mag2','mag3'])next[key]={...next[key],cd:next[key].cd/10};
 mobs[id]=next;
 for(const boss of Object.values(raw.worldBosses) as any[])if(boss.mob===id){boss.hp=next.hp;boss.healPer5s=0;boss.name=next.n+' · 放置天堂';boss.sourceEdition='放置天堂 '+source.version;}
}
