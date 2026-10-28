import raw from './gamedata.json';
import assets from './asset-map.json';
import catalog from './lineagew-skills.json';
export const W_SKILLS=catalog.skills as Record<string,any>;
export const W_LEGACY=catalog.legacy as Record<string,string>;
export const W_BOOKS=catalog.books as Record<string,any>;
const skills=raw.skills as Record<string,any>,items=raw.items as Record<string,any>;
const icons=assets.icons as Record<string,Record<string,string>>;
// Overlay is additive. Persisted skill/item IDs and the original JSON remain intact.
for(const [id,s] of Object.entries(W_SKILLS)){
 skills[id]=s;
 const fallback=s.lwLegacyId?icons.skills[skills[s.lwLegacyId]?.n]:undefined;
 if(s.lwIcon||fallback)icons.skills[s.n]=s.lwIcon||fallback;
}
for(const [id,item] of Object.entries(W_BOOKS)){
 items[id]=item;
 if(item.lwIcon)icons.items[item.n]=item.lwIcon;
}
for(const item of Object.values(items))if(item.type==='skillbk'&&W_LEGACY[item.sk]){
 const s=W_SKILLS[W_LEGACY[item.sk]];
 item.lwSkillBook=true;item.lwGrade=s.lwGrade;item.lwCanonicalSkill=W_LEGACY[item.sk];
 const book=Object.values(W_BOOKS).find(b=>b.sk===W_LEGACY[item.sk]&&b.lwItemIconSource);
 if(book?.lwIcon||s.lwIcon)icons.items[item.n]=book?.lwIcon||s.lwIcon;
}
export function canonicalWSkill(id:string,cls?:string){const candidate=W_LEGACY[id];return candidate&&(!cls||W_SKILLS[candidate]?.lwClasses.includes(cls))?candidate:id;}
export function wSkill(id:string,cls?:string){return W_SKILLS[canonicalWSkill(id,cls)];}
export function learnedWSkills(c:{skills:string[];cls:string;equipment?:Record<string,{id:string}>}){const ids=[...c.skills];for(const eq of Object.values(c.equipment||{})){const i=items[eq.id.split('@')[0]];if(i?.req&&i.req!=='all'&&!i.req.split(',').includes(c.cls))continue;ids.push(...(i?.grantSkills||[]));}return [...new Set(ids.map(id=>canonicalWSkill(id,c.cls)))].filter(id=>W_SKILLS[id]?.lwClasses.includes(c.cls));}
export type WSkillContext={ids:string[];learned:Set<string>;scales:Map<string,number>};
/** One snapshot per calculation; learning, equipment and element changes rebuild it. */
export function wSkillContext(c:{skills:string[];cls:string;equipment?:Record<string,{id:string}>}):WSkillContext{
 const ids=learnedWSkills(c),learned=new Set(ids),percent=new Map<string,number>();
 for(const key of ids){let skill=W_SKILLS[key];const visited=new Set<string>();while(skill?.lwUpgradeOf&&!visited.has(skill.lwUpgradeOf)){const parent=skill.lwUpgradeOf;visited.add(parent);if(!learned.has(parent))break;percent.set(parent,(percent.get(parent)||0)+(W_SKILLS[key].lwUpgradePct||0));skill=W_SKILLS[parent];}}
 return {ids,learned,scales:new Map([...percent].map(([id,pct])=>[id,1+Math.min(100,pct)/100]))};
}
export function normalizeWSkillBuffs(c:{skills:string[];cls:string;lv:number;buffs:Record<string,{until:number;d:Record<string,number>}>}){const context=wSkillContext(c);for(const old of Object.keys(c.buffs)){if(old==='sk_abs_barrier')continue;const id=canonicalWSkill(old,c.cls);if(id===old||!context.learned.has(id))continue;const s=W_SKILLS[id],buff=c.buffs[old];if(s.type!=='passive'&&!c.buffs[id]){const d=wBuffModifiers(c,id,context);if(d.lwShield)d.lwShieldRemaining=d.lwShield;c.buffs[id]={until:buff.until,d};}delete c.buffs[old];}return context;}
export function wUpgradeScale(c:{skills:string[];cls:string},id:string,context=wSkillContext(c)){return context.learned.has(id)?context.scales.get(id)||1:1;}
export function wElementAllowed(c:{cls:string;elfEle?:string;elfEle2?:string;skills:string[]},s:any,context?:WSkillContext){return c.cls!=='elf'||!s.reqEle||s.reqEle===c.elfEle||(context?context.learned.has('lw_skill_16970'):learnedWSkills(c).includes('lw_skill_16970'))&&s.reqEle===c.elfEle2;}
export function wPassiveBonuses(c:{cls:string;lv:number;skills:string[];elfEle?:string;elfEle2?:string},b:Record<string,number>,context=wSkillContext(c)){
 const result:Record<string,number>={},add=(key:string,value:number)=>{result[key]=(result[key]||0)+value;};
 const steps=(start:number,every:number)=>Math.floor(Math.max(0,Math.min(90,c.lv)-start)/every);
 for(const id of context.ids){
  const s=W_SKILLS[id];if(s.type!=='passive'||!wElementAllowed(c,s,context)||s.lwUpgradeOf)continue;
  const d={...s.lwD};
  if(id==='lw_skill_110')d.mpR=5+steps(70,5);
  if(id==='lw_skill_12540'){d.meleeDmg=1+steps(70,5);d.meleeHit=steps(70,10);}
  if(id==='lw_skill_12539')d.er=1+steps(70,5);
  if(id==='lw_skill_12543')d.lwHealPct=5+Math.max(0,Math.min(90,c.lv)-65)*1.5;
  if(id==='lw_skill_550')d.mpR=steps(60,5);
  if(id==='lw_skill_9570'){d.mr=4+steps(50,5);d.dr=steps(50,5);d.ac=5+steps(50,10);d.er=steps(50,10);}
  if(id==='lw_skill_9600')d.er=18+steps(50,5);
  if(id==='lw_skill_9610'){d.meleeDmg=10+steps(50,5);d.meleeHit=10+2*steps(70,5);d.ignoreErBonus=steps(50,10);}
  if(id==='lw_skill_12544'){d.meleeCrit=5+steps(70,5);d.meleeCritDmg=5+steps(70,5);}
  if(id==='lw_skill_13366'){d.potionFlat=steps(50,5);d.potionBonus=2*steps(50,5);d.mhp=200*steps(50,5);d.maxHpPct=5*steps(70,5);}
  if(id==='lw_skill_11173'){d.meleeHit=Math.floor((b.magicHit||0)/2);d.meleeDmg=Math.floor((b.mdmg||0)/2);delete d.lwConversion;}
  const main=({royal:'str',knight:'str',dark:'str',mage:'int',elf:'dex'} as Record<string,string>)[c.cls];
  if(d.lwMainAttr){d[main]=(d[main]||0)+d.lwMainAttr;delete d.lwMainAttr;}
  const scale=wUpgradeScale(c,id,context);
  for(const [key,value] of Object.entries(d))if(typeof value==='number')add(key,value*scale);
 }
 return result;
}
export function wBuffModifiers(c:{cls:string;lv:number;skills:string[]},id:string,context=wSkillContext(c)){const s=W_SKILLS[id],d={...(s?.lwD||{})},steps=(start:number,every:number,cap=90)=>Math.floor(Math.max(0,Math.min(cap,c.lv)-start)/every);
 if(id==='lw_skill_640'){d.meleeHit+=steps(50,5);d.meleeDmg+=steps(50,10);}
 if(id==='lw_skill_650')d.mr+=steps(50,5);
 if(id==='lw_skill_660')d.lwAmpChance+=steps(70,10);
 if(id==='lw_skill_690'){d.dr+=3*steps(50,5,75);d.ac+=3*steps(50,10);}
 if(id==='lw_skill_11999'){d.stunHit+=steps(60,5);d.allIgnoreDr+=steps(60,5);d.ignoreAcBonus=steps(60,10);}
 if(id==='lw_skill_600')d.ac+=steps(50,10);
 if(id==='lw_skill_610')d.dr+=steps(50,5);
 if(id==='lw_skill_720')d.mr+=2*steps(50,10);
 if(id==='lw_skill_9590')d.doubleChance=Math.min(40,30+steps(55,5));
 if(id==='lw_skill_15981'&&c.lv>=90)d.lwExtraStrikeChance=40;
 const scale=wUpgradeScale(c,id,context);for(const key of Object.keys(d))if(!['invulnerable','lwActionLock','lwDualElement','magicBarrier','lwDoubleHeal'].includes(key))d[key]*=scale;
 if(id==='lw_skill_530')d.lwDoubleHeal=2*scale;
 return d as Record<string,number>;
}
