import {npcOriginalService} from './npc-config';
import raw from './gamedata.json';
import type {Character} from './engine';
import {isRetiredStat} from './retired-stats';
export type Blessing='blessed'|'cursed';
export type Ancient='ancient'|'eternal'|'immortal'|'primordial';
export type ElementName='fire'|'water'|'wind'|'earth';
export type ElementAffix={element:ElementName;tier:1|2|3|4|5};
/** Legacy key/name/value stay compatible with existing saves. New rolls use three independent slots. */
export type Affix={key:string;name:string;value:number;blessing?:Blessing;ancient?:Ancient;element?:ElementAffix;attrMagic?:string;attrMagicStar?:number};
export type DarkAffix={key:string;name:string;value:number;tier:'gray'|'blue'|'gold'};
export const ANCIENT_NAMES:Record<Ancient,string>={ancient:'遠古',eternal:'永恆',immortal:'不朽',primordial:'太初'};
export const ELEMENT_NAMES:Record<ElementName,string[]>={fire:['火之','爆炎','火靈','赤炎','帕格里奧'],water:['水之','海嘯','水靈','霜凍','伊娃'],wind:['風之','暴風','風靈','蒼蘭','沙哈'],earth:['地之','崩裂','地靈','輝岩','馬普勒']};
export const STAT_NAMES:Record<string,string>={extraDmg:'額外傷害',extraHit:'額外命中',meleeDmg:'近距離傷害',meleeHit:'近距離命中',rangedDmg:'遠距離傷害',rangedHit:'遠距離命中',ac:'防禦 AC',mr:'魔防 MR',dr:'傷害減免 DR',er:'閃避 ER',mdmg:'魔法傷害',sp:'額外魔法點數',mhp:'最大 HP',mmp:'最大 MP',mpR:'MP 回復',resFire:'火抗',resWater:'水抗',resWind:'風抗',resEarth:'地抗',str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力'};
export const DARK_POOL=[
 {key:'meleeDmg',name:'近距離傷害',ranges:[[1,1],[2,2],[3,3]]},
 {key:'meleeHit',name:'近距離命中',ranges:[[1,1],[2,2],[3,3]]},
 {key:'rangedDmg',name:'遠距離傷害',ranges:[[1,1],[2,2],[3,3]]},
 {key:'rangedHit',name:'遠距離命中',ranges:[[1,1],[2,2],[3,3]]},
 {key:'extraDmg',name:'額外傷害',ranges:[[1,1],[2,2],[3,3]]},
 {key:'extraHit',name:'額外命中',ranges:[[1,1],[2,2],[3,3]]},
 {key:'ac',name:'防禦',ranges:[[1,1],[2,2],[3,3]]},
 {key:'mr',name:'魔防',ranges:[[1,2],[3,4],[5,5]]},
 {key:'mhp',name:'最大 HP',ranges:[[10,19],[20,29],[30,30]]},
 {key:'mmp',name:'最大 MP',ranges:[[10,19],[20,29],[30,30]]},
 {key:'mpR',name:'MP 回復',ranges:[[1,2],[3,4],[5,5]]},
 {key:'sp',name:'額外魔法點數',ranges:[[1,2],[3,4],[5,5]]},
 {key:'dr',name:'傷害減免',ranges:[[1,1],[2,2],[3,3]]},
] as const;
const items=raw.items as Record<string,any>,base=(key:string)=>key.split('@')[0];
export function isPetEquipment(i:any){return !!i&&(i.petEquip||i.petEquipment||i.petOnly||i.isPetEquipment||/^pet/.test(i.type||'')||/^pet/.test(i.slot||'')||/寵物.*(裝備|武器|防具)/.test(i.n||''));}
export function hasModifiers(c:Character,key:string){const a=c.affixes?.[key];return !!(a&&(a.key!=='families'||a.blessing||a.ancient||a.element)||c.darkAffixes?.[key]?.length);}
export function isCursed(c:Character,key:string){return c.affixes?.[key]?.blessing==='cursed';}
export function affixBonus(a:Affix|undefined,type:string,dark:DarkAffix[]=[]){const out:Record<string,number>={};const add=(bonus:Record<string,number>)=>{for(const [k,v]of Object.entries(bonus))out[k]=(out[k]||0)+v;};
 if(a){if(a.key!=='families')add({[a.key]:a.key==='ac'?-a.value:a.value});
  if(a.blessing){const sign=a.blessing==='blessed'?1:-1;add(type==='wpn'?{extraDmg:sign,extraHit:sign,sp:sign*2}:type==='arm'?{ac:-sign,dr:sign}:{ac:-sign,mr:sign});}
  if(a.ancient){const table:Record<string,Record<string,Record<string,number>>>={ancient:{wpn:{extraDmg:2,mdmg:1},arm:{dr:2},acc:{dr:1,mr:1}},eternal:{wpn:{extraDmg:4},arm:{ac:-2},acc:{ac:-1,extraDmg:1}},immortal:{wpn:{extraHit:4},arm:{er:2},acc:{extraDmg:1,extraHit:1}},primordial:{wpn:{mdmg:2},arm:{mr:4},acc:{sp:2,mr:2}}};add(table[a.ancient][type]||{});}
  if(a.element&&type==='wpn')add({extraDmg:ELEMENT_VALUES[a.element.tier-1],sp:ELEMENT_VALUES[a.element.tier-1]});
  if(a.element&&type!=='wpn'){const {tier,element}=a.element;add({['res'+element[0].toUpperCase()+element.slice(1)]:tier,mr:tier});}
 }
 for(const d of dark)add({[d.key]:d.key==='ac'?-d.value:d.value});return out;
}
export function elementalWeaponDamage(_c:Character,_monsterElement:string){return 0;}
export function weaponElementMultiplier(c:Character,monsterElement:string){const e=c.affixes?.[c.equipment.weapon?.id||'']?.element?.element;if(!e)return 1;const counter:Record<string,string>={fire:'earth',water:'fire',wind:'water',earth:'wind'};return counter[e]===monsterElement?1.4:counter[monsterElement]===e?.6:1;}
export function affixLabel(c:Character,key:string){const a=c.affixes?.[key];return [a&&a.key!=='families'?`${a.name} ${a.value>=0?'+':''}${a.value}（舊版）`:null,a?.attrMagic?'★'.repeat(getAttrMagic(a)?.star||1):null,a?.element?ELEMENT_NAMES[a.element.element][a.element.tier-1]:null,a?.ancient?ANCIENT_NAMES[a.ancient]:null,a?.blessing==='blessed'?'祝福的':a?.blessing==='cursed'?'詛咒的':null,...(c.darkAffixes?.[key]||[]).map(d=>`${d.tier==='gold'?'暗金':d.tier==='blue'?'藍':'灰'} ${d.name}+${d.value}`)].filter(Boolean).join(' · ');}
export function blessingLines(c:Character,key:string){const i=items[base(key)],a=c.affixes?.[key];if(!i)return [];const lines:{name:string;text:string;className?:string}[]=[];const text=(b:Record<string,number>)=>Object.entries(b).filter(([k])=>!isRetiredStat(k)).map(([k,v])=>`${STAT_NAMES[k]||k} ${v>=0?'+':''}${v}`).join('、');
 if(a?.key&&a.key!=='families')lines.push({name:'舊版詞綴',text:text(affixBonus({key:a.key,name:a.name,value:a.value},i.type))});
 if(a?.blessing)lines.push({name:a.blessing==='blessed'?'祝福的':'詛咒的',text:text(affixBonus({key:'families',name:'',value:0,blessing:a.blessing},i.type)),className:a.blessing==='cursed'?'cursed-affix':'blessed-affix'});
 if(a?.ancient)lines.push({name:ANCIENT_NAMES[a.ancient],text:text(affixBonus({key:'families',name:'',value:0,ancient:a.ancient},i.type))});
 if(a?.element){const e=a.element;lines.push({name:ELEMENT_NAMES[e.element][e.tier-1],className:'element-'+e.element,text:i.type==='wpn'?`屬性第 ${e.tier} 階 · 額外傷害 +${ELEMENT_VALUES[e.tier-1]}、額外魔法點數 +${ELEMENT_VALUES[e.tier-1]} · 一般攻擊轉為此屬性，剋制 ×1.4`:text(affixBonus({key:'families',name:'',value:0,element:e},i.type))});}
 const magic=getAttrMagic(a);if(magic)lines.push({name:'★'.repeat(magic.star)+' 屬性附加魔法',text:`攻擊時 ${magic.rate}% 機率觸發 ${itemsSkillName(magic.skill)}，不消耗 MP`,className:'blessed-affix'});
 for(const d of c.darkAffixes?.[key]||[])lines.push({name:`暗黑詞條 · ${d.tier==='gold'?'暗金':d.tier==='blue'?'藍':'灰'}`,text:`${d.name} ${d.key==='ac'?'-':'+'}${d.value}`,className:`dark-affix-${d.tier}`});return lines;
}
export type AffixRoll={family:'blessing';value:Blessing}|{family:'ancient';value:Ancient}|{family:'element';value:ElementAffix};
export function rollBlessing(rng:()=>number):AffixRoll{const family=Math.floor(rng()*3);if(family===0)return {family:'blessing',value:rng()<.5?'blessed':'cursed'};if(family===1)return {family:'ancient',value:(['ancient','eternal','immortal','primordial'] as Ancient[])[Math.floor(rng()*4)]};const t=rng(),tier=t<.6?1:t<.9?2:3;return {family:'element',value:{tier,element:(['fire','water','wind','earth'] as ElementName[])[Math.floor(rng()*4)]}};}
export function applyBlessingRoll(c:Character,key:string,roll:AffixRoll){c.affixes||={};const next:Affix={...(c.affixes[key]||{key:'families',name:'',value:0})};const old=next[roll.family],same=roll.family==='element'?next.element?.element===roll.value.element&&next.element?.tier===roll.value.tier:old===roll.value;if(same)delete next[roll.family];else Object.assign(next,{[roll.family]:roll.value});if(next.key==='families'&&!next.blessing&&!next.ancient&&!next.element)delete c.affixes[key];else c.affixes[key]=next;const name=roll.family==='blessing'?(roll.value==='blessed'?'祝福的':'詛咒的'):roll.family==='ancient'?ANCIENT_NAMES[roll.value]:ELEMENT_NAMES[roll.value.element][roll.value.tier-1];return same?`抽中相同「${name}」，該詞條已移除`:`賦予「${name}」，其他系保留`;}
export function scrollCandidates(c:Character,id:string){return Object.keys(c.bag).filter(key=>base(key)===id&&c.bag[key]>0&&!c.locked?.includes(key)&&!hasModifiers(c,key)&&!(c.enh[key]>0));}
export function affixEligible(c:Character,key:string){const i=items[base(key)];if(!i||!['wpn','arm','acc'].includes(i.type)||i.isArrow||i.doll||i.noEquip||i.noAffix||i.wearHours||isPetEquipment(i)||!c.bag[key])throw Error('此裝備不能賦予');if(c.locked?.includes(key))throw Error('請先解除裝備鎖定');if(isCursed(c,key))throw Error('裝備被詛咒，請先找碧恩解除詛咒');return i;}
export function requireBian(c:Character,npc:string){if(c.zone!=='town_silver_knight'||npc!=='npc_bian'||!npcOriginalService(c.zone,npc,c.npcConfig))throw Error('請前往銀騎士村找 NPC 碧恩');}
export function rollDarkAffixes(rng:()=>number):DarkAffix[]{const n=rng(),count=n<.5?0:n<.95?1:2,pool=[...DARK_POOL],out:DarkAffix[]=[];for(let j=0;j<count;j++){const choice=pool.splice(Math.floor(rng()*pool.length),1)[0],r=rng(),tier=r<.7?'gray':r<.95?'blue':'gold',range=choice.ranges[tier==='gray'?0:tier==='blue'?1:2];out.push({key:choice.key,name:choice.name,tier,value:range[0]+Math.floor(rng()*(range[1]-range[0]+1))});}return out;}
export function grantDroppedItem(c:Character,id:string,n:number,rng:()=>number){const keys:string[]=[];for(let j=0;j<n;j++){const dark=id==='blt_titan'?rollDarkAffixes(rng):[];const key=dark.length?id+'@'+crypto.randomUUID():id;c.bag[key]=(c.bag[key]||0)+1;if(dark.length){c.darkAffixes||={};c.darkAffixes[key]=dark;}keys.push(key);}return keys;}
/** Fixed bonuses are added after critical/double multipliers. */
export function physicalDamage(base:number,fixed:number,critical=false,double=false,percent=0){return Math.max(0,base*(1+percent/100)*(critical?2:1)*(double?2:1)+fixed);}

export const ELEMENT_VALUES=[1,3,5,7,9];
export const ATTR_MAGIC_POOL:Record<ElementName,{skill:string;rate:number}[]>={
 fire:[{skill:'sk_meteor',rate:1},{skill:'sk_fire_storm',rate:2},{skill:'sk_blaze',rate:5},{skill:'sk_fireball',rate:5},{skill:'sk_firearrow',rate:10}],
 water:[{skill:'sk_blizzard',rate:2},{skill:'sk_ice_lance',rate:5},{skill:'sk_chill',rate:6},{skill:'sk_icearrow',rate:10},{skill:'sk_poison_curse',rate:10}],
 wind:[{skill:'sk_thunder_storm',rate:2},{skill:'sk_tornado',rate:3},{skill:'sk_thunder',rate:6},{skill:'sk_windblade',rate:10},{skill:'sk_holy_dash',rate:10}],
 earth:[{skill:'sk_quake',rate:2},{skill:'sk_earthquake',rate:5},{skill:'sk_rock_prison',rate:6},{skill:'sk_hell_fang',rate:10},{skill:'sk_slow',rate:10}]};
export function itemsSkillName(id:string){return (raw.skills as Record<string,any>)[id]?.n||id;}
export function getAttrMagic(a?:Affix){if(a?.element?.tier!==5||!a.attrMagic)return null;const p=ATTR_MAGIC_POOL[a.element.element].find(p=>p.skill===a.attrMagic);if(!p)return null;const star=Math.max(1,Math.min(3,Math.floor(a.attrMagicStar||1)));return {...p,star,rate:p.rate*star};}
export function weaponHasTriggeredSkill(i:any,id:string){if(['attackProc','spellProc','procSkill','procSkill2','procStatusSkill','procFireSkillRate','meleeHitSpell','onHitCastSkill','dragonStrike','hitEchoMagic','procPoison','procPoisonPct','procBurstPoison','procBurn','procHealFlat','onHitEleDmg','windbladeProc','qiguProc','redSpecter','selfBreakProc','procInstakill','strawCurse'].some(k=>!!i[k]))return true;if(['wpn_giltas_sword','wpn_giltas_wand','wpn_strwand','wpn_steel_manawand_red','wpn_priest_wand'].includes(id))return false;return ['moonburst','magicstrike','magicburst','dice_death'].includes(i.eff);}
export function elementEligibility(c:Character,key:string,ele:ElementName){if(isCursed(c,key))throw Error('裝備被詛咒，請先解除詛咒');const i=items[base(key)];if(!i||i.type!=='wpn'||i.isArrow||i.relic||i.noEquip||i.noAffix||i.petEquip||!c.bag[key])throw Error('只能對裝備中的非遺物武器賦予屬性');if(!Object.values(c.equipment).some(e=>e.id===key))throw Error('請先穿戴此武器');if(c.locked?.includes(key))throw Error('請先解除武器鎖定');if(!ELEMENT_NAMES[ele])throw Error('屬性無效');const current=c.affixes?.[key]?.element,same=current?.element===ele,next=same?current.tier+1:1;if(next>5&&weaponHasTriggeredSkill(i,base(key)))throw Error('此武器原有攻擊觸發技能，無法附加魔法');if(!(i.noEnhance||i.noEnh)&&(next===4&&(c.enh[key]||0)<10||next===5&&(c.enh[key]||0)<11))throw Error(next===4?'武器需 +10 以上才能衝第四階':'武器需 +11 以上才能衝第五階');return {i,next,same};}
export function affixGlow(c:Character,key:string){const a=c.affixes?.[key];if(a?.blessing==='cursed')return 'gear-glow-curse';if(a?.element&&a.ancient&&a.blessing)return 'gear-glow-tri';if(a?.ancient&&a.blessing)return 'gear-glow-dual';if(a?.ancient)return 'gear-glow-ancient'+(a.element?' gear-glow-strong':'');if(a?.blessing)return 'gear-glow-blessed'+(a.element?' gear-glow-strong':'');if(a?.element)return 'gear-glow-'+a.element.element+(a.element.tier===5?' gear-glow-five':'');return '';}
