import {hasModifiers} from './affix-rules';
import {wornCount} from './worn-items';
import raw from './gamedata.json';
import {baseItem} from './gear';
import type {Character} from './engine';
const items=raw.items as Record<string,any>;
export function saleCandidates(c:Character,extra:string[]=[]){const selected=new Set(extra);return Object.entries(c.bag).flatMap(([key,cnt])=>{const id=baseItem(key),i=items[id];if(!i||i.noSell||!(i.p>0)||c.locked?.includes(key)||(c.enh[key]||0)>0||hasModifiers(c,key)||['ap381_armor_20281','wpn_22'].includes(id))return [];if(!['wpn','arm','acc'].includes(i.type)&&!selected.has(key))return [];const quantity=cnt-wornCount(c,key);if(quantity<=0)return [];const price=Math.floor(i.sellP??i.p*.25);return [{key,id,name:i.n,quantity,price,total:quantity*price}];});}
export function sellUnused(c:Character,extra:string[]=[]){const rows=saleCandidates(c,extra);if(!rows.length)throw Error('沒有可販售的無用裝備或所選物品');let gold=0,count=0;for(const r of rows){c.bag[r.key]-=r.quantity;if(!c.bag[r.key])delete c.bag[r.key];gold+=r.total;count+=r.quantity;}c.gold+=gold;return `一鍵販售 ${count} 件物品，獲得 ${gold.toLocaleString()} 金幣`;}
