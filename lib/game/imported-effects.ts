import manifest from './imported-effects.json';
import raw from './gamedata.json';
import {baseItem} from './gear';
import type {Character,CombatEvent} from './engine';
export type EffectEntry={id:string;code:string;label:string;category:string;clip:string;source:string};
export type EffectClip={sheet:string;width:number;height:number;count:number;cols:number;fps:number;left:number;top:number};
export const importedEffects=manifest as unknown as {clips:Record<string,EffectClip>;entries:Record<string,EffectEntry>;spellDefaults:Record<string,string>;triple:string[];hurt:{id:string;name:string;image:string;audio:string}[];defaults:Record<string,string>};
export type CombatEffectsConfig={revision:number;enabled:boolean;weapons:Record<string,string>;defaults:Record<string,string>;hurt:string;history:{at:number;by:string}[]};
export const initialCombatEffects=():CombatEffectsConfig=>({revision:0,enabled:true,weapons:{},defaults:{...importedEffects.defaults},hurt:'off',history:[]});
export function validateCombatEffects(input:unknown):Omit<CombatEffectsConfig,'revision'|'history'>{
 const x=input as CombatEffectsConfig;if(!x||typeof x.enabled!=='boolean'||!x.weapons||!x.defaults)throw Error('特效設定格式錯誤');
 const check=(id:unknown)=>{if(id==='off')return 'off';if(typeof id!=='string'||!Object.hasOwn(importedEffects.entries,id)||importedEffects.entries[id].category!=='weapon')throw Error('武器特效編號不存在，請從清單選擇版本');return id;};
 if(Object.keys(x.weapons).length>2000)throw Error('武器設定數量超過上限');
 const weapons=Object.fromEntries(Object.entries(x.weapons).map(([id,fx])=>{if(!Object.hasOwn(raw.items,id)||(raw.items as Record<string,any>)[id].type!=='wpn')throw Error('武器編號不存在');return [id,check(fx)];}));
 const defaults=Object.fromEntries(Object.keys(importedEffects.defaults).map(k=>[k,check(x.defaults[k])]));
 if(x.hurt!=='off'&&!importedEffects.hurt.some(h=>h.id===x.hurt))throw Error('受擊特效不存在');
 return {enabled:x.enabled,weapons,defaults,hurt:'off'};
}
export function importedWeaponEffect(c:Character,config:CombatEffectsConfig,event:CombatEvent){
 if(!config.enabled||event.kind!=='attack'||event.visualPhase==='launch'||event.miss||!event.damage||['monster','pet','summon','poison','doll'].includes(event.source||''))return undefined;
 // Ordinary magic is rendered by its spell effect; magic weapons keep confirmed proc timing.
 if(event.skill&&event.skill!=='sk_elf_triple'&&!event.weaponProc)return undefined;
 const id=baseItem(c.equipment.weapon?.id||''),item=(raw.items as Record<string,any>)[id];if(!item)return undefined;
 const category=item.isBow?'bow':c.cls==='dark'?'dark':c.cls==='dragon'?'dragon':'other';
 return importedEffects.entries[config.weapons[id]??config.defaults[category]];
}
export function importedFrame(clip:EffectClip,age:number){return Math.min(clip.count-1,Math.max(0,Math.floor(age*clip.fps/1000)));}
