import {DATA,usable,type Character} from './engine';
import {requiredSkillLevel,elementError} from './spell-rules';
import {hasSkill} from './skill-access';
import {specialSkillSupported} from './combat-rules';

/** 全魔法之書 (GM test item, one per class): learns every magic the class can learn — ordinary and
 * class-exclusive, active and passive, Lineage W and the remaining older spells — at any level.
 * Upgrade skills are learned after their prerequisite. The book is not consumed. An elf also gets
 * every element (gmAllElements), so all four element lines can be learned and cast. */
export function learnAllMagic(c:Character,book:any):string{
 if(book?.eff!=='gmAllMagic'||!usable(c,book))throw Error('職業不符，不能使用此全魔法之書');
 if(c.cls==='elf')c.gmAllElements=true;
 const candidates=Object.entries(DATA.skills).filter(([id,s])=>Number.isFinite(requiredSkillLevel(c,s))&&specialSkillSupported(id,s.type)&&!elementError(c,s));
 const learned:string[]=[];let progressed=true;
 while(progressed){progressed=false;
  for(const [id,s] of candidates){if(hasSkill(c,id))continue;if(s.lwUpgradeOf&&!hasSkill(c,s.lwUpgradeOf))continue;c.skills.push(id);learned.push(s.n);progressed=true;}}
 return learned.length?`全魔法之書：學會 ${learned.length} 個魔法`:'全魔法之書：已學會本職業全部魔法';
}
