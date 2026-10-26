import raw from './gamedata.json';
import type {Character} from './engine';
import {requiredSkillLevel} from './spell-rules';
const skills=raw.skills as Record<string,any>;
// The reference image fixes the first-tier positions; empty slots never collapse.
const firstTier=['sk_heal1','sk_sunlight','sk_shield','sk_lightarrow','sk_teleport','sk_icearrow','sk_windblade','sk_holy_wpn'];
export function bookSections(c:Pick<Character,'cls'|'skills'>){
 const req=({royal:'reqRoy',knight:'reqK',elf:'reqE',mage:'reqM',dark:'reqD'} as Record<string,string>)[c.cls];
 const rows=Object.entries(skills).filter(([,s])=>s.tier&&Number.isFinite(requiredSkillLevel(c,s)));
 return [false,true].map(exclusive=>({title:exclusive?({royal:'王族魔法',elf:'妖精魔法',knight:'騎士技能',dark:'黑暗妖精魔法',mage:'專屬技能'} as Record<string,string>)[c.cls]:'通用魔法書',label:exclusive?'專屬技能':'魔法書',tiers:[...new Set(rows.filter(([,s])=>(s.reqM===undefined)===exclusive).map(([,s])=>Number(s.tier)))].sort((a,b)=>a-b).map(tier=>{let ids=rows.filter(([,s])=>s.tier===tier&&(s.reqM===undefined)===exclusive).map(([id])=>id);if(!exclusive&&tier===1)ids=firstTier.filter(id=>ids.includes(id));if(!exclusive&&tier===2){const remaining=ids.filter(id=>!['sk_ench_wpn','sk_antidote'].includes(id));ids=[...Array.from({length:8},(_,i)=>i===3?'sk_ench_wpn':i===5?'sk_antidote':remaining.shift()||'').filter(id=>!!id),...remaining];}return {tier,slots:Array.from({length:Math.max(8,Math.ceil(ids.length/8)*8)},(_,i)=>ids[i]||null)};})})).filter(s=>s.tiers.length);
}

