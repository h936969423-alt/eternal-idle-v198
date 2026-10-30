import {canonicalWSkill} from './lineagew-skill-data';
import {hasSkill} from './skill-access';
import {AREA_SKILLS} from './combat-rules';
import raw from './gamedata.json';
import type {Character} from './engine';
export type AutoConfig={opener:string;attack:string;heal:string;convert:string;mpAbove:number;openerMpAbove:number;healBelow:number;convertHpAbove:number;convertMpBelow:number;potionDirectGold:boolean;potionFallback:boolean;arrowBuy?:boolean;buffs:string[];aux:Record<string,{enabled:boolean;directGold:boolean}>};
export const AUX_ITEMS=['potion_haste','potion_blue','potion_brave','new_item_139','new_item_140','scroll_magicbarrier','scroll_poly','new_item_237'];
function canonicalIds(c:Character,ids:string[]){return [...new Set(ids.map(id=>canonicalWSkill(id,c.cls)))];}
function storedAutoConfig(c:Character):AutoConfig{
 if(c.autoConfig)return {...c.autoConfig,potionFallback:c.autoConfig.potionFallback??true,openerMpAbove:c.autoConfig.openerMpAbove??c.autoConfig.mpAbove};
 const ids=canonicalIds(c,c.autoSkills);
 return {opener:'',attack:ids.find(id=>(raw.skills as any)[id]?.type==='atk')||'',heal:ids.find(id=>(raw.skills as any)[id]?.type==='heal')||'',convert:ids.find(id=>(raw.skills as any)[id]?.type==='convert')||'',mpAbove:50,openerMpAbove:50,healBelow:60,convertHpAbove:30,convertMpBelow:80,potionDirectGold:false,potionFallback:true,buffs:ids.filter(id=>(raw.skills as any)[id]?.type==='buff'),aux:{scroll_poly:{enabled:!!c.autoPoly,directGold:!!c.autoBuyPoly}}};
}
/** UI reads, old saves and server casting all use the same canonical IDs. */
export function autoConfig(c:Character):AutoConfig{
 const saved=storedAutoConfig(c),cfg={...saved,buffs:[...saved.buffs]};
 for(const key of ['opener','attack','heal','convert'] as const){const id=canonicalWSkill(cfg[key],c.cls);cfg[key]=id;const s=(raw.skills as Record<string,any>)[id];if(id&&s?.type!==({opener:'atk',attack:'atk',heal:'heal',convert:'convert'}[key]))cfg[key]='';}
 cfg.buffs=canonicalIds(c,cfg.buffs).filter(id=>(raw.skills as Record<string,any>)[id]?.type==='buff');
 delete (cfg as AutoConfig&{tripleIntervalMs?:number}).tripleIntervalMs;
 if(cfg.opener&&(AREA_SKILLS.has(cfg.opener)||cfg.opener===cfg.attack))cfg.opener='';
 return cfg;
}
export function enabledAutoSkills(cfg:AutoConfig){return [...new Set([cfg.opener,cfg.attack,cfg.heal,cfg.convert,...cfg.buffs].filter(Boolean))];}
export function autoSkillEnabled(c:Character,skill:string){const id=canonicalWSkill(skill,c.cls),cfg=autoConfig(c);return !!id&&(cfg.buffs.includes(id)||[cfg.opener,cfg.attack,cfg.heal,cfg.convert].includes(id));}
export function validateAutoConfig(c:Character,input:any):AutoConfig{if(!input||typeof input!=='object')throw Error('自動設定無效');const out=autoConfig(c),result={...out,aux:{...out.aux},buffs:[...out.buffs]};for(const key of ['opener','attack','heal','convert'] as const){if(input[key]!==undefined){const value=input[key];if(typeof value!=='string')throw Error('只能選擇已學會且類型符合的魔法');const id=canonicalWSkill(value,c.cls),sk=(raw.skills as Record<string,any>)[id];if(id&&(!hasSkill(c,id)||sk?.type!==({opener:'atk',attack:'atk',heal:'heal',convert:'convert'}[key])))throw Error('只能選擇已學會且類型符合的魔法');result[key]=id;}}for(const key of ['mpAbove','openerMpAbove','healBelow','convertHpAbove','convertMpBelow'] as const)if(input[key]!==undefined){if(!Number.isInteger(input[key])||input[key]<0||input[key]>100)throw Error('比例必須為 0–100 的整數');result[key]=input[key];}if(input.potionFallback!==undefined){if(typeof input.potionFallback!=='boolean')throw Error('藥水設定無效');result.potionFallback=input.potionFallback;}if(input.potionDirectGold!==undefined){if(typeof input.potionDirectGold!=='boolean')throw Error('藥水設定無效');result.potionDirectGold=input.potionDirectGold;}if(input.buffs!==undefined){if(!Array.isArray(input.buffs)||input.buffs.length>123||input.buffs.some((id:unknown)=>typeof id!=='string'))throw Error('狀態魔法設定無效');const buffs=canonicalIds(c,input.buffs);if(buffs.some(id=>!hasSkill(c,id)||(raw.skills as any)[id]?.type!=='buff'))throw Error('狀態魔法設定無效');result.buffs=buffs;}if(input.arrowBuy!==undefined){if(typeof input.arrowBuy!=='boolean')throw Error('補箭設定無效');result.arrowBuy=input.arrowBuy;}if(input.aux!==undefined){if(!input.aux||typeof input.aux!=='object'||Array.isArray(input.aux))throw Error('輔助物品設定無效');for(const [id,value] of Object.entries(input.aux) as [string,any][]){if(!AUX_ITEMS.includes(id)||!value||typeof value.enabled!=='boolean'||typeof value.directGold!=='boolean'||['scroll_magicbarrier','new_item_237'].includes(id)&&value.directGold)throw Error('輔助物品設定無效');result.aux[id]={enabled:value.enabled,directGold:value.directGold};}}if(result.opener&&AREA_SKILLS.has(result.opener))throw Error('開怪技能只能選擇單體技能');if(result.opener&&result.opener===result.attack)throw Error('開怪與攻擊不能設定同一招');return result;}

