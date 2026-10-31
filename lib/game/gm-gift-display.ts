import raw from './gamedata.json';
import './lineagew-skill-data';
import type {GiftOption} from './gm-item-options';
/** One item list for every GM picker (gifts, monster drops, hybrid equipment pools).
 * Display only: the full option lists stay intact for server-side grant validation. */
export type GiftDisplayOption=GiftOption&{note?:string};
const items=raw.items as Record<string,any>;
const STATS=['dmgS','dmgL','hit','dmgBonus','ac','mr','safe','req','spd','twohanded','str','dex','con','int','wis','cha','maxHp','maxMp','hpR','mpR','mdmg','sp','er','minLv','slot','wcat','lwGrade','bless','greater','enhCap','eff','sk','dmg','type'];
const CLASSES:Record<string,string>={royal:'王族',knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精',dragon:'龍騎士',illusion:'幻術士',warrior:'戰士'};
const GRADES:Record<string,string>={normal:'一般',advanced:'高級',rare:'稀有',hero:'英雄',legend:'傳說',mythic:'神話'};
const ATTRS:Record<string,string>={str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力'};
/** Non-Lineage-W gear that the game depends on (polymorph and summon control). */
export const ESSENTIAL_LEGACY_ITEMS=new Set(['ap381_armor_20281','ap381_armor_20284']);
const norm=(s:string)=>String(s||'').replace(/\s+/g,'').replace(/（/g,'(').replace(/）/g,')');
const same=(a:any,b:any)=>STATS.every(k=>JSON.stringify(a?.[k])===JSON.stringify(b?.[k]));
const gear=(i:any)=>!!i&&['wpn','arm','acc'].includes(i.type)&&!i.isArrow&&!i.noEquip;
const book=(i:any)=>!!i&&i.type==='skillbk'&&!!(i.lwCanonicalSkill||i.sk);
export function itemSource(id:string):'lineagew'|'apang381'|'reference'|'original'{const i=items[id.split('@')[0]];return i?.source==='lineagew'||/^lw_/.test(id)?'lineagew':i?.source==='apang381'||/^ap381_/.test(id)?'apang381':/^ref_/.test(id)?'reference':'original';}
export const SOURCE_NAMES={lineagew:'天堂W',apang381:'3.81',reference:'參考圖鑑',original:'舊版'} as const;
const wBookSkills=new Set(Object.entries(items).filter(([id,i])=>book(i)&&itemSource(id)==='lineagew').map(([,i])=>i.lwCanonicalSkill||i.sk));
/** Shown by default: Lineage W gear and books, essential control rings, old books for skills
 * that have no Lineage W book, and every non-gear item (potions, scrolls, materials). */
export function isPreferredItem(id:string){const base=id.split('@')[0],i=items[base];if(!i)return false;
 if(gear(i))return itemSource(base)==='lineagew'||ESSENTIAL_LEGACY_ITEMS.has(base);
 if(book(i))return itemSource(base)==='lineagew'||!wBookSkills.has(i.lwCanonicalSkill||i.sk);
 return true;}
/** A reason to double-check an item already used in a drop table, or undefined. */
export function legacyItemWarning(id:string){if(isPreferredItem(id))return undefined;const i=items[id.split('@')[0]];if(!i)return '物品不存在';
 return book(i)?'此為舊版魔法書，已有天堂W版本':`此物品為 ${SOURCE_NAMES[itemSource(id)]} 版本`;}
const rank=(id:string)=>(isPreferredItem(id)?0:4)+(/^lw_book_/.test(id)?0:2)+(/^ref_/.test(id)?1:0);
function tags(group:string[]){
 const differs=(k:string)=>new Set(group.map(id=>JSON.stringify(items[id]?.[k]))).size>1;
 const parts:Record<string,string[]>=Object.fromEntries(group.map(id=>[id,[]]));
 const unique=()=>new Set(group.map(id=>parts[id].join('・'))).size===group.length;
 // Add only as many distinguishing tags as needed to tell the copies apart.
 const add=(fn:(i:any,id:string)=>string|undefined)=>{if(unique())return;for(const id of group){const t=fn(items[id],id);if(t)parts[id].push(t);}};
 if(differs('bless'))add(i=>i.bless?'祝福':'一般');
 if(differs('lwGrade'))add(i=>GRADES[i.lwGrade]||'一般');
 if(differs('req'))add(i=>String(i.req||'').split(',').map(c=>CLASSES[c.trim()]||c).filter(Boolean).join('／')||'全職業');
 for(const k of Object.keys(ATTRS))if(differs(k))add(i=>i[k]?`${ATTRS[k]}+${i[k]}`:undefined);
 if(differs('ac')||differs('mr'))add(i=>[i.ac?`防禦${i.ac}`:'',i.mr?`魔防${i.mr}`:''].filter(Boolean).join(' ')||undefined);
 if(differs('safe'))add(i=>`安定+${Math.max(0,i.safe||0)}`);
 if(differs('dmgS')||differs('dmgL'))add(i=>`傷害${i.dmgS}/${i.dmgL}`);
 add((_,id)=>SOURCE_NAMES[itemSource(id)]);
 return Object.fromEntries(group.map(id=>[id,parts[id].join('・')]));
}
/** showAll=false (default): Lineage W plus essentials, one entry per skill book and per identical item.
 * showAll=true: every source, each non-Lineage-W item labelled with its source. */
export function giftDisplayOptions<T extends GiftOption>(options:T[],showAll=false):(T&{note?:string})[]{
 const pool=showAll?options:options.filter(o=>isPreferredItem(o.id));
 const groups=new Map<string,T[]>();
 for(const o of pool){const i=items[o.id];const key=!showAll&&book(i)?'skill:'+(i.lwCanonicalSkill||i.sk):'name:'+norm(i?.n||o.name);(groups.get(key)||groups.set(key,[]).get(key)!).push(o);}
 const keep=new Set<string>(),notes:Record<string,string>={};
 for(const [key,group] of groups){
  if(group.length===1){keep.add(group[0].id);continue;}
  const distinct:T[]=[];
  for(const o of [...group].sort((a,b)=>rank(a.id)-rank(b.id)))if(key.startsWith('skill:')?!distinct.length:!distinct.some(d=>same(items[d.id],items[o.id])&&itemSource(d.id)===itemSource(o.id)))distinct.push(o);
  for(const o of distinct)keep.add(o.id);
  if(distinct.length>1)Object.assign(notes,tags(distinct.map(o=>o.id)));
 }
 return pool.filter(o=>keep.has(o.id)).map(o=>{const src=showAll&&!isPreferredItem(o.id)?SOURCE_NAMES[itemSource(o.id)]:'';const note=[notes[o.id],src&&!notes[o.id]?.includes(src)?src:''].filter(Boolean).join('・');return note?{...o,note}:o;});
}
/** Every item as a GM picker option (monster drop tables). */
export function allItemOptions():GiftOption[]{return Object.entries(items).map(([id,i])=>({id,name:i.n,label:i.n,cap:0,category:gear(i)?(i.type==='wpn'?'weapon':'equipment'):book(i)?'book':'misc'}));}
export function displayLabel(o:{id:string;note?:string},name:string){return name+(o.note?`（${o.note}）`:'');}
