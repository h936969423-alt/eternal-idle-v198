import {canonicalWSkill} from './lineagew-skill-data';
import raw from './gamedata.json';
const skills=raw.skills as Record<string,any>,items=raw.items as Record<string,any>;
export const GILEN_ZONE='town_talking',GILEN_ID='npc_gilen',GILEN_BOOK_PRICE=2000;
export function gilenBookStock():Record<string,number>{const seen=new Set<string>();return Object.fromEntries(Object.entries(items).filter(([,item])=>{const id=canonicalWSkill(item.sk),s=skills[id];if(item.type!=='skillbk'||s?.reqM===undefined||![1,2,3].includes(s.tier)||seen.has(id))return false;seen.add(id);return true;}).map(([id])=>[id,GILEN_BOOK_PRICE]));}

const firstTier=['sk_heal1','sk_sunlight','sk_shield','sk_lightarrow','sk_teleport','sk_icearrow','sk_windblade','sk_holy_wpn'].map(id=>canonicalWSkill(id));
export function gilenBookIds():string[]{return Object.keys(gilenBookStock()).sort((a,b)=>{const x=skills[items[a].sk],y=skills[items[b].sk];return x.tier-y.tier||(x.tier===1?firstTier.indexOf(items[a].sk)-firstTier.indexOf(items[b].sk):0);});}

/** GM-created copies named 吉倫 use the same teacher service as the original. */
export function isGilenTeacher(zone:string,npc?:{id:string;n:string;type:string}|null){return !!npc&&['skill','shop'].includes(npc.type)&&((zone===GILEN_ZONE&&npc.id===GILEN_ID)||(npc.id.startsWith('gm_npc_')&&npc.n.trim()==='吉倫'));}

