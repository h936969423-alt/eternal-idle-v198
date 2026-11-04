import raw from './gamedata.json';
import icons from './gm-icon-library.json';
import {RETIRED_ITEMS} from './retired-items';
import {refreshCustomGiftOptions} from './gm-item-options';
import {mythicProcDefinition} from './lineagew-mythic-procs';
import procSkills from './weapon-proc-skills.json';
/** Equipment created in the GM console. Definitions live in D1 and are merged into the shared item catalog. */
export type CustomRank='normal'|'advanced'|'rare'|'hero'|'legend'|'mythic';
export type CustomProc={skill:string;rate:number};
export type CustomEquipment={id:string;name:string;slot:string;icon:string;description:string;rank:CustomRank;classes:string[];minLv:number;safe:number;enhCap:number;price:number;weight:number;weapon?:{wcat:string;dmgS:number;dmgL:number};stats:Record<string,number>;procs:CustomProc[];deleted?:boolean};
export type CustomEquipmentConfig={items:Record<string,CustomEquipment>;nextId:number;history:{at:number;by:string;action:string;id:string;name:string}[];revision?:number};
export const CUSTOM_SLOTS:Record<string,{name:string;type:'wpn'|'arm'|'acc';group:'武器'|'防具'|'飾品'}>={weapon:{name:'武器',type:'wpn',group:'武器'},armor:{name:'盔甲',type:'arm',group:'防具'},helm:{name:'頭盔',type:'arm',group:'防具'},shield:{name:'盾牌',type:'arm',group:'防具'},cloak:{name:'斗篷',type:'arm',group:'防具'},gloves:{name:'手套',type:'arm',group:'防具'},boots:{name:'靴子',type:'arm',group:'防具'},tshirt:{name:'內衣',type:'arm',group:'防具'},pants:{name:'褲子',type:'arm',group:'防具'},belt:{name:'腰帶',type:'acc',group:'飾品'},ring:{name:'戒指',type:'acc',group:'飾品'},amulet:{name:'項鍊',type:'acc',group:'飾品'},ear1:{name:'耳環',type:'acc',group:'飾品'}};
export const CUSTOM_WEAPONS:Record<string,{name:string;twohanded?:boolean;bow?:boolean}>={sword:{name:'單手劍'},tohandsword:{name:'雙手劍',twohanded:true},dagger:{name:'匕首'},blunt:{name:'鈍器'},spear:{name:'雙手矛',twohanded:true},claw:{name:'鋼爪',twohanded:true},dual:{name:'雙刀',twohanded:true},chainsword:{name:'鎖鏈劍',twohanded:true},kiringku:{name:'奇古獸',twohanded:true},staff:{name:'魔杖'},bow:{name:'弓',twohanded:true,bow:true}};
export const CUSTOM_CLASSES:Record<string,string>={royal:'王族',knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精'};
/** Every key is read by the stat engine; values are added while the item is worn. */
export const CUSTOM_STATS:Record<string,string>={str:'力量',dex:'敏捷',con:'體質',int:'智力',wis:'精神',cha:'魅力',hit:'武器命中',dmgBonus:'武器額外傷害',meleeHit:'近距離命中',meleeDmg:'近距離傷害',rangedHit:'遠距離命中',rangedDmg:'遠距離傷害',magicHit:'魔法命中',sp:'魔攻',mdmg:'魔法傷害',meleeCrit:'近距離爆擊',rangedCrit:'遠距離爆擊',magicCrit:'魔法爆擊',doubleChance:'雙擊機率',ac:'防禦',mr:'魔防',er:'迴避',dr:'傷害減免',mhp:'最大 HP',mmp:'最大 MP',hpR:'HP 恢復',mpR:'MP 恢復',maxHpPct:'最大 HP %',maxMpPct:'最大 MP %',atkSpdPct:'攻擊速度 %',moveSpeedPct:'移動速度 %',stunResist:'昏迷抗性',potionBonus:'藥水恢復 %',expPct:'經驗值 %',goldPct:'金幣 %',dropPct:'掉寶 %',resFire:'火屬性抗性',resWater:'水屬性抗性',resWind:'風屬性抗性',resEarth:'地屬性抗性'};
const WEAPON_ONLY_STATS=new Set(['hit','dmgBonus']);
export const CUSTOM_PROC_OPTIONS:{id:string;name:string}[]=[...Object.entries(procSkills as Record<string,{n:string}>).map(([id,s])=>({id,name:s.n})),...['lw_chaos_assault','lw_gaia_assault','lw_lightning_assault','lw_dispel_barrier','lw_reveal','lw_holy_magic'].map(id=>({id,name:mythicProcDefinition(id)!.name}))];
export const RANK_NAMES:Record<CustomRank,string>={normal:'一般',advanced:'高級',rare:'稀有',hero:'英雄',legend:'傳說',mythic:'神話'};
const iconPaths=new Set((icons as string[][]).map(r=>r[0])),procNames=new Map(CUSTOM_PROC_OPTIONS.map(p=>[p.id,p.name]));
export const emptyCustomEquipment=():CustomEquipmentConfig=>({items:{},nextId:1,history:[]});
const integer=(value:unknown,label:string,min:number,max:number)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${label}必須是 ${min} 至 ${max} 的整數`);return n;};
/** Whitelists every field so a definition can never add arbitrary engine flags to the catalog. */
export function validateCustomEquipment(input:any,id:string):CustomEquipment{
 const name=String(input?.name??'').trim();if(!name||name.length>30)throw Error('名稱須為 1 至 30 字');
 const slot=String(input?.slot??'');if(!Object.hasOwn(CUSTOM_SLOTS,slot))throw Error('請選擇部位');
 const icon=String(input?.icon??'');if(!iconPaths.has(icon))throw Error('請從圖示庫選擇圖示');
 const description=String(input?.description??'').trim();if(description.length>300)throw Error('說明最多 300 字');
 const rank=String(input?.rank??'normal') as CustomRank;if(!Object.hasOwn(RANK_NAMES,rank))throw Error('品級無效');
 const classes=Array.isArray(input?.classes)?[...new Set(input.classes.map(String))] as string[]:[];if(!classes.length||classes.some(k=>!Object.hasOwn(CUSTOM_CLASSES,k)))throw Error('請至少選擇一個職業');
 const def:CustomEquipment={id,name,slot,icon,description,rank,classes,minLv:integer(input.minLv??0,'需求等級',0,99),safe:integer(input.safe??0,'安定值',0,20),enhCap:integer(input.enhCap??0,'強化上限',0,99),price:integer(input.price??0,'價值',0,100000000),weight:integer(input.weight??0,'重量',0,10000),stats:{},procs:[]};
 if(def.enhCap&&def.safe>def.enhCap)throw Error('安定值不能高於強化上限');
 const weapon=slot==='weapon';
 if(weapon){const wcat=String(input?.weapon?.wcat??'');if(!Object.hasOwn(CUSTOM_WEAPONS,wcat))throw Error('請選擇武器類型');def.weapon={wcat,dmgS:integer(input.weapon.dmgS,'小型傷害',1,9999),dmgL:integer(input.weapon.dmgL,'大型傷害',1,9999)};}
 if(input?.stats&&typeof input.stats==='object')for(const [key,value] of Object.entries(input.stats)){if(!Object.hasOwn(CUSTOM_STATS,key)||!weapon&&WEAPON_ONLY_STATS.has(key))throw Error('屬性無效：'+key);const n=integer(value,CUSTOM_STATS[key],-99999,99999);if(n)def.stats[key]=n;}
 const procs=Array.isArray(input?.procs)?input.procs:[];if(procs.length&&!weapon)throw Error('只有武器可以設定觸發能力');if(procs.length>5)throw Error('觸發能力最多 5 個');
 const seen=new Set<string>();
 for(const p of procs){const skill=String(p?.skill??''),rate=Number(p?.rate);if(!procNames.has(skill))throw Error('請選擇觸發能力');if(seen.has(skill))throw Error('觸發能力不能重複');seen.add(skill);if(!Number.isFinite(rate)||rate<=0||rate>100)throw Error('觸發機率必須大於 0%，最高 100%');def.procs.push({skill,rate:Math.round(rate*100)/100});}
 return def;
}
export function customEquipmentSummary(def:Pick<CustomEquipment,'stats'|'procs'|'safe'|'enhCap'|'weapon'>){
 const lines:string[]=[];
 if(def.weapon)lines.push(`傷害 ${def.weapon.dmgS}／${def.weapon.dmgL}`);
 const stats=Object.entries(def.stats).filter(([,v])=>v).map(([k,v])=>`${CUSTOM_STATS[k]||k} ${v>0?'+':''}${v}`);if(stats.length)lines.push(stats.join('・'));
 lines.push(def.enhCap?`安定值 +${def.safe}・強化上限 +${def.enhCap}`:'不可強化');
 for(const p of def.procs)lines.push(`攻擊時 ${p.rate}% 施展${procNames.get(p.skill)||p.skill}`);
 return lines;
}
export function customEquipmentItem(def:CustomEquipment){
 const slot=CUSTOM_SLOTS[def.slot],w=def.weapon&&CUSTOM_WEAPONS[def.weapon.wcat],isMythicProc=(p:CustomProc)=>p.skill.startsWith('lw_');
 const item:Record<string,any>={...def.stats,n:def.name,type:slot.type,slot:def.slot,source:'gm',req:def.classes.join(','),safe:def.safe,enhCap:def.enhCap,sourceIcon:def.icon,gmRank:def.rank,noAffix:true,noShop:true,p:def.price,sellP:Math.floor(def.price*.25),weight:def.weight,d:[def.description,...customEquipmentSummary(def)].filter(Boolean).join('\n')};
 if(!def.enhCap)item.noEnh=true;if(def.minLv)item.minLv=def.minLv;
 if(def.weapon&&w){Object.assign(item,{dmgS:def.weapon.dmgS,dmgL:def.weapon.dmgL,hit:def.stats.hit||0,dmgBonus:def.stats.dmgBonus||0,spd:1.2,wcat:def.weapon.wcat,sourceKind:def.weapon.wcat});if(w.twohanded)item.twohanded=true;if(w.bow){item.isBow=true;item.ranged=true;}
  const magic=def.procs.filter(p=>!isMythicProc(p)),mythic=def.procs.filter(isMythicProc);if(magic.length)item.attackProcs=magic;if(mythic.length)item.gmProcs=mythic;}
 return item;
}
let version=0;const listeners=new Set<()=>void>();
export const customEquipmentVersion=()=>version;
export function subscribeCustomEquipment(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
/** Replaces the catalog's GM entries. The catalog is one shared object on the server and in the browser. Deleted items
 * stay resolvable so held copies are refunded at their sell price by the retired-item sweep. */
export function applyCustomEquipment(config?:Pick<CustomEquipmentConfig,'items'>|null){
 if(!config)return;
 const items=raw.items as Record<string,any>;
 for(const id of Object.keys(items))if(items[id]?.source==='gm')delete items[id];
 for(const id of Object.keys(RETIRED_ITEMS))if(id.startsWith('gmx_'))delete RETIRED_ITEMS[id];
 for(const def of Object.values(config.items||{})){items[def.id]=customEquipmentItem(def);if(def.deleted)RETIRED_ITEMS[def.id]=def.name;}
 refreshCustomGiftOptions();version++;for(const listener of listeners)listener();
}
