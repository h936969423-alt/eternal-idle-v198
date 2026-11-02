import {canonicalWSkill} from './lineagew-skill-data';
import raw from './gamedata.json';
import type {Character} from './engine';
import {requiredSkillLevel} from './spell-rules';
const skills=raw.skills as Record<string,any>;
// The reference image fixes the first-tier positions; empty slots never collapse.
const firstTier=['sk_heal1','sk_sunlight','sk_shield','sk_lightarrow','sk_teleport','sk_icearrow','sk_windblade','sk_holy_wpn'];
const EXCLUSIVE_TITLES:Record<string,string>={royal:'王族魔法',elf:'妖精魔法',knight:'騎士技能',dark:'黑暗妖精魔法',mage:'專屬技能'};
/** Original skill book: 通用魔法書 tiers 1–10 (8 slots a row) and the class's own skills. */
export function bookSections(c:Pick<Character,'cls'|'skills'>){
 const rows=Object.entries(skills).filter(([id,s])=>!id.startsWith('lw_')&&s.tier&&Number.isFinite(requiredSkillLevel(c,s)));
 const sections=[false,true].map(exclusive=>({title:exclusive?EXCLUSIVE_TITLES[c.cls]||'專屬技能':'通用魔法書',label:exclusive?'專屬技能':'魔法書',tiers:[...new Set(rows.filter(([,s])=>(s.reqM===undefined)===exclusive).map(([,s])=>Number(s.tier)))].sort((a,b)=>a-b).map(tier=>{
  let ids=rows.filter(([,s])=>s.tier===tier&&(s.reqM===undefined)===exclusive).map(([id])=>id);
  if(!exclusive&&tier===1)ids=firstTier.filter(id=>ids.includes(id));
  if(!exclusive&&tier===2){const remaining=ids.filter(id=>!['sk_ench_wpn','sk_antidote'].includes(id));ids=[...Array.from({length:8},(_,i)=>i===3?'sk_ench_wpn':i===5?'sk_antidote':remaining.shift()||'').filter(id=>!!id),...remaining];}
  return {tier,slots:Array.from({length:Math.max(8,Math.ceil(ids.length/8)*8)},(_,i)=>ids[i]||null)};
 })})).filter(s=>s.tiers.length);
 // Learned skills outside this class's book (e.g. granted by a GM) stay visible and usable.
 const shown=new Set(sections.flatMap(s=>s.tiers.flatMap(t=>t.slots)));
 const other=[...new Set(c.skills.map(id=>canonicalWSkill(id,c.cls)))].filter(id=>skills[id]&&!id.startsWith('lw_')&&!shown.has(id));
 if(other.length)sections.push({title:'其他已學技能',label:'其他',tiers:[{tier:0,slots:Array.from({length:Math.ceil(other.length/8)*8},(_,i)=>other[i]||null)}]});
 return sections;
}
