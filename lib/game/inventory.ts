import {DATA,usable,type Character} from './engine';
import {backpackCount} from './worn-items';
import {baseItem} from './gear';
function knownItem(key:string){return DATA.items[key]||(DATA.dolls.some(d=>d.id===baseItem(key))?{n:`魔法娃娃 ${baseItem(key)}`,type:'doll',p:0,noSell:true,noWh:true,noEquip:true,d:'完整能力資料尚未取得'}:null);}
export function inventoryRows(c:Character){return Object.entries(c.bag).filter(([key,cnt])=>cnt>0&&knownItem(key)).map(([key,cnt])=>{const i=knownItem(key),en=c.enh[key]||0,lock=!!c.locked?.includes(key),equippable=['wpn','arm','acc'].includes(i.type)&&!i.noEquip&&!i.isArrow;return {key,id:baseItem(key),n:i.n,cnt,en,lock,cat:i.type,equippable:equippable&&usable(c,i),equipped:Object.values(c.equipment).some(e=>e.id===key),nosell:!!i.noSell||!(i.p>0),sell:Math.floor(i.sellP??i.p*.25)||0,safe:i.safe||0,enhanceable:equippable&&!i.noEnh,noBless:!!i.noBless,affix:c.affixes?.[key]||null,autoSell:!!c.autoSell?.includes(baseItem(key)),description:i.d||'',stats:i};});}

export function backpackRows(c:Character){return inventoryRows(c).map(row=>({...row,cnt:backpackCount(c,row.key),equipped:false})).filter(row=>row.cnt>0);}
