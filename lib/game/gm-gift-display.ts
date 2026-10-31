import raw from './gamedata.json';
import './lineagew-skill-data';
import type {GiftOption} from './gm-item-options';
/** GM gift picker only: the full option lists stay intact for grant validation. */
export type GiftDisplayOption=GiftOption&{note?:string};
const items=raw.items as Record<string,any>;
const STATS=['dmgS','dmgL','hit','dmgBonus','ac','mr','safe','req','spd','twohanded','str','dex','con','int','wis','cha','maxHp','maxMp','hpR','mpR','mdmg','sp','er','minLv','slot','wcat','lwGrade','bless','greater','enhCap','eff','sk','dmg','type'];
const CLASSES:Record<string,string>={royal:'王族',knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精',dragon:'龍騎士',illusion:'幻術士',warrior:'戰士'};
const GRADES:Record<string,string>={normal:'一般',advanced:'高級',rare:'稀有',hero:'英雄',legend:'傳說',mythic:'神話'};
const ATTRS:Record<string,string>={str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力'};
const norm=(s:string)=>String(s||'').replace(/\s+/g,'').replace(/（/g,'(').replace(/）/g,')');
const same=(a:any,b:any)=>STATS.every(k=>JSON.stringify(a?.[k])===JSON.stringify(b?.[k]));
/** Prefer the current catalog copy: Lineage W books, then non-reference ids, then the first listed. */
const rank=(id:string)=>(/^lw_book_/.test(id)?0:2)+(/^ref_/.test(id)?1:0);
function tags(group:string[]){
 const differs=(k:string)=>new Set(group.map(id=>JSON.stringify(items[id]?.[k]))).size>1;
 const parts:Record<string,string[]>=Object.fromEntries(group.map(id=>[id,[]]));
 const unique=()=>new Set(group.map(id=>parts[id].join('・'))).size===group.length;
 // Add only as many distinguishing tags as needed to tell the copies apart.
 const add=(fn:(i:any)=>string|undefined)=>{if(unique())return;for(const id of group){const t=fn(items[id]);if(t)parts[id].push(t);}};
 if(differs('bless'))add(i=>i.bless?'祝福':'一般');
 if(differs('lwGrade'))add(i=>GRADES[i.lwGrade]||'一般');
 if(differs('req'))add(i=>String(i.req||'').split(',').map(c=>CLASSES[c.trim()]||c).filter(Boolean).join('／')||'全職業');
 for(const k of Object.keys(ATTRS))if(differs(k))add(i=>i[k]?`${ATTRS[k]}+${i[k]}`:undefined);
 if(differs('ac')||differs('mr'))add(i=>[i.ac?`防禦${i.ac}`:'',i.mr?`魔防${i.mr}`:''].filter(Boolean).join(' ')||undefined);
 if(differs('safe'))add(i=>`安定+${Math.max(0,i.safe||0)}`);
 if(differs('dmgS')||differs('dmgL'))add(i=>`傷害${i.dmgS}/${i.dmgL}`);
 return Object.fromEntries(group.map(id=>[id,parts[id].join('・')]));
}
export function giftDisplayOptions(options:GiftOption[]):GiftDisplayOption[]{
 const groups=new Map<string,GiftOption[]>();
 for(const o of options){const i=items[o.id];const key=i?.type==='skillbk'&&(i.lwCanonicalSkill||i.sk)?'skill:'+(i.lwCanonicalSkill||i.sk):'name:'+norm(i?.n||o.name);(groups.get(key)||groups.set(key,[]).get(key)!).push(o);}
 const keep=new Set<string>(),notes:Record<string,string>={};
 for(const [key,group] of groups){
  if(group.length===1){keep.add(group[0].id);continue;}
  // Same skill, or completely identical item: show one entry.
  const distinct:GiftOption[]=[];
  for(const o of [...group].sort((a,b)=>rank(a.id)-rank(b.id)))if(key.startsWith('skill:')?!distinct.length:!distinct.some(d=>same(items[d.id],items[o.id])))distinct.push(o);
  for(const o of distinct)keep.add(o.id);
  if(distinct.length>1)Object.assign(notes,tags(distinct.map(o=>o.id)));
 }
 return options.filter(o=>keep.has(o.id)).map(o=>notes[o.id]?{...o,note:notes[o.id]}:o);
}
