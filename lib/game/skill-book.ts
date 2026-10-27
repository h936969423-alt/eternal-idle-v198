import {W_SKILLS,canonicalWSkill} from './lineagew-skill-data';
import raw from './gamedata.json';
import type {Character} from './engine';
import {requiredSkillLevel} from './spell-rules';
export function bookSections(c:Pick<Character,'cls'|'skills'>){
 const skills=raw.skills as Record<string,any>,groups=[{title:'共用一般魔法',label:'一般魔法',test:(s:any)=>!s.lwCategory.startsWith('潛力')&&s.lwClasses.length>1},{title:'職業專屬技能',label:'專屬技能',test:(s:any)=>!s.lwCategory.startsWith('潛力')&&s.lwClasses.length===1},{title:'潛力技能',label:'潛力',test:(s:any)=>s.lwCategory.startsWith('潛力')}];
 const rows=Object.entries(W_SKILLS).filter(([,s])=>Number.isFinite(requiredSkillLevel(c,s)));
 const sections=groups.map(g=>({title:g.title,label:g.label,tiers:[...new Set(rows.filter(([,s])=>g.test(s)).map(([,s])=>Number(s.tier)))].sort((a,b)=>a-b).map(tier=>{const ids=rows.filter(([,s])=>g.test(s)&&s.tier===tier).map(([id])=>id);return {tier,slots:Array.from({length:Math.max(8,Math.ceil(ids.length/8)*8)},(_,i)=>ids[i]||null)};})}));
 const legacy=[...new Set(c.skills)].filter(id=>skills[id]&&!W_SKILLS[id]&&canonicalWSkill(id,c.cls)===id);
 if(legacy.length)sections.push({title:'既有技能（保留學習紀錄）',label:'既有技能',tiers:[{tier:0,slots:Array.from({length:Math.ceil(legacy.length/8)*8},(_,i)=>legacy[i]||null)}]});
 return sections.filter(s=>s.tiers.length);
}
