import {PET_FORMS,petNeedV2,type PetState} from './pet-system';
import raw from './gamedata.json';
import {grantDoll,dollPool} from './doll-system';
import {dollDefinition} from './companions';
import type {Character} from './engine';
const mobs=raw.mobs as Record<string,any>;
export type CollectionEntry={id:string;name:string;level:number;boss:boolean;gold:number;gems:number;need:number;bonus:Record<string,number>};
// Only observed names, fees and rewards. Kill thresholds for ordinary entries are local reconstruction.
const rows:[string,number,string,number][]=[['那魯加妖魔',340000,'mhp',4],['萊肯',340000,'mhp',4],['楊果里恩',360000,'mhp',4],['食人妖精',440000,'mhp',4],['地獄犬',480000,'mhp',4],['哈維',520000,'mhp',4],['毒蠍',520000,'mhp',4],['黑暗精靈',540000,'mhp',4],['骷髏神射手',540000,'mhp',4],['骷髏警衛',540000,'mhp',4],['多羅',560000,'mmp',2],['紙人',560000,'mmp',2],['骷髏鬥士',580000,'mmp',2],['艾爾摩士兵',600000,'mmp',2],['食人妖精王',600000,'mmp',2],['莫妮亞',600000,'mmp',2],['夢幻之島鬼火',600000,'mmp',2],['夢幻之島蘑菇',600000,'mmp',2],['艾爾摩法師',620000,'mmp',2],['密密',620000,'mmp',2],['艾爾摩將軍',700000,'mmp',4],['阿魯巴',700000,'mmp',4],['鋼鐵高崙',700000,'hpR',1],['思克巴',740000,'hpR',1],['夢幻之島火蜥蜴',760000,'hpR',1],['夢幻之島冰人',760000,'hpR',1],['夢幻之島殺人蜂',760000,'hpR',1],['夢幻之島暴走兔',760000,'hpR',1],['夢幻之島火炎蛋',780000,'mpR',1],['夢幻之島冰石高崙',780000,'mpR',1],['夢幻之島閃電球',780000,'mpR',1],['夢幻之島鎧甲守衛',780000,'mpR',1],['夢幻之島大鬼火',800000,'mpR',1],['夢魘',800000,'mpR',1],['思克巴女皇',820000,'mpR',1],['影魔',820000,'mpR',1],['鬼魂',840000,'meleeHit',1],['火精靈王',860000,'rangedHit',1],['地精靈王',860000,'magicHit',1],['紅鬼魂',860000,'magicHit',1],['風精靈王',860000,'magicHit',1],['獨角獸',860000,'magicHit',1]];
const bossNames=['西瑪','巴土瑟','卡士柏','伊弗利特','馬庫爾','飛龍','巴風特','黑長者','變形怪首領','克特','死亡騎士','冰之女王','巨蟻女皇','不死鳥'];
function resolve(name:string){return Object.keys(mobs).find(id=>mobs[id].n===name);}
export const COLLECTION:CollectionEntry[]=[...rows.flatMap(([name,gold,key,value])=>{const id=resolve(name);if(!id)return [];const level=mobs[id].lv;return [{id,name,level,boss:false,gold,gems:level>=40?10:0,need:level>=40?500:level>=20?200:50,bonus:{[key]:value}}];}),...bossNames.flatMap(name=>{const id=resolve(name);return id?[{id,name,level:mobs[id].lv,boss:true,gold:0,gems:100,need:0,bonus:(name==='不死鳥'?{con:1}:{expPct:1}) as Record<string,number>}]:[];})];
export function collectionBonus(c:Character){const out:Record<string,number>={};for(const row of COLLECTION)if(c.collection?.includes(row.id))for(const [key,value]of Object.entries(row.bonus))out[key]=(out[key]||0)+value;return out;}
export function registerCollection(c:Character,id:string){const row=COLLECTION.find(x=>x.id===id);if(!row)throw Error('此圖鑑資料尚未確認');if(c.collection?.includes(id))throw Error('已登錄此圖鑑');if((c.mobKills?.[id]||0)<row.need)throw Error('擊殺數不足');if(c.gold<row.gold||(c.blueDiamonds||0)<row.gems)throw Error('登錄金幣或藍鑽不足');c.gold-=row.gold;c.blueDiamonds=(c.blueDiamonds||0)-row.gems;c.collection=[...(c.collection||[]),id];return row;}
export const PET_NAMES=PET_FORMS;
export type PetProgress=PetState;
export function petNeed(lv:number){return petNeedV2(lv);}
export function gainPetLevel(p:PetProgress,rng:()=>number){const roll=rng();if(roll<.35)p.hit++;else if(roll<.7)p.damage++;else{p.hit++;p.damage++;}p.lv++;}
export function petKill(c:Character,rng:()=>number){if(!c.petTraining)return;c.pets||={};const p=c.pets[c.petTraining]||={lv:0,xp:0,hit:0,damage:0};p.xp++;while(p.lv<30&&p.xp>=petNeed(p.lv)){p.xp-=petNeed(p.lv);gainPetLevel(p,rng);}}
export const DOLL_TIERS=['','一般','高級','稀有','英雄','傳說'];
export function unlockDoll(c:Character,tier:number,rng:()=>number){const pool=dollPool(tier);if(!pool.length)throw Error('娃娃階級無效');const id=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];grantDoll(c,id);return `${tier} 階娃娃 ${dollDefinition(c,id)?.name||id} ×1`;}
