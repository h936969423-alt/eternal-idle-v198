import raw from './gamedata.json';
import assets from './asset-map.json';
import catalog from './lineagew-skills.json';
import {RETIRED_ITEMS} from './retired-items';
const CATALOG=catalog.skills as Record<string,any>,CATALOG_BOOKS=catalog.books as Record<string,any>;
/** The original Lineage W migration map (old id → W id), kept to read saves and requests from that period. */
export const W_LEGACY=catalog.legacy as Record<string,string>;
/** Ordinary and class skills that are played with their original rules, names and ids again: W id → old id.
 * Their old definitions are in gamedata.json; the W icons are kept. */
export const W_REVERTED:Record<string,string>=Object.fromEntries(Object.entries(W_LEGACY).map(([old,id])=>[id,old]));
const retained=(s:any)=>/^(潛力|攻城)/.test(s.lwCategory||'');
/** Lineage W ordinary/class skills without an old version: removed from the game (learned copies are taken out). */
export const W_REMOVED:ReadonlySet<string>=new Set(Object.entries(CATALOG).filter(([id,s])=>!retained(s)&&!W_REVERTED[id]).map(([id])=>id));
/** Lineage W skills still in play: the 潛力 and 攻城 lines. */
export const W_SKILLS:Record<string,any>=Object.fromEntries(Object.entries(CATALOG).filter(([,s])=>retained(s)));
export const W_BOOKS:Record<string,any>=Object.fromEntries(Object.entries(CATALOG_BOOKS).filter(([,b])=>!W_REMOVED.has(b.sk)));
const skills=raw.skills as Record<string,any>,items=raw.items as Record<string,any>;
const icons=assets.icons as Record<string,Record<string,string>>;
for(const [id,s] of Object.entries(W_SKILLS)){
 skills[id]=s;
 if(s.lwIcon)icons.skills[s.n]=s.lwIcon;
}
// Reverted skills keep their Lineage W icon under their old name.
for(const [id,old] of Object.entries(W_REVERTED)){const s=CATALOG[id],icon=s?.lwIcon||icons.skills[s?.n];if(icon&&skills[old])icons.skills[skills[old].n]=icon;}
for(const [id,item] of Object.entries(CATALOG_BOOKS)){
 items[id]=item;
 if(item.lwIcon)icons.items[item.n]=item.lwIcon;
 // Books of removed skills leave the game: copies held are taken out and refunded.
 if(W_REMOVED.has(item.sk)){RETIRED_ITEMS[id]=item.n;item.noShop=true;item.gachaWeight=0;}
}
for(const item of Object.values(items)){
 if(item.type!=='skillbk')continue;
 const id=W_REVERTED[item.sk]?item.sk:W_SKILLS[W_LEGACY[item.sk]||item.sk]?W_LEGACY[item.sk]||item.sk:undefined;if(!id)continue;
 // Grade (rarity, black market rank) is kept for reverted skills too; the canonical skill is the played id.
 const s=CATALOG[id];item.lwSkillBook=true;item.lwGrade=s.lwGrade;item.lwCanonicalSkill=W_REVERTED[id]||id;
 const book=Object.values(CATALOG_BOOKS).find(b=>b.sk===id&&b.lwItemIconSource);
 if(book?.lwIcon||s?.lwIcon)icons.items[item.n]=book?.lwIcon||s.lwIcon;
}
/** A Lineage W skill icon from the full catalogue (status icons keep using them). */
export function wCatalogIcon(id:string):string|undefined{return CATALOG[id]?.lwIcon;}
/** The id a skill is stored and played under: reverted W ids map back to their old id. */
export function canonicalWSkill(id:string,_cls?:string){return W_REVERTED[id]||id;}
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
export function wElementAllowed(c:{cls:string;elfEle?:string;elfEle2?:string;skills:string[];gmAllElements?:boolean},s:any,context?:WSkillContext){return c.cls!=='elf'||!s.reqEle||!!c.gmAllElements||s.reqEle===c.elfEle||(context?context.learned.has('lw_skill_16970'):learnedWSkills(c).includes('lw_skill_16970'))&&s.reqEle===c.elfEle2;}
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

