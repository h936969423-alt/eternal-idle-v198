import {defaultDolls} from './doll-config';
import type {Character} from './engine';
export const DOLL_ABILITIES:Record<string,{name:string;bonus:Record<string,number>;cost:number}>={doll_003:{name:'希爾黛斯',bonus:{expPct:3,rangedDmg:1},cost:10000},doll_005:{name:'食人妖精',bonus:{expPct:3,meleeDmg:1},cost:10000}};
export const DOLL_PERIOD=1800000;
const DEFAULT_DOLLS=defaultDolls();
export function dollDefinition(c:Character,id=c.doll||''){return c.dollDefinitions?.[id]||DEFAULT_DOLLS[id];}
export function summonDoll(c:Character,id:string,now:number){const d=dollDefinition(c,id);if(c.doll===id){c.doll=null;delete c.dollUntil;return '已卸下娃娃，回到背包';}if(!d?.enabled||!(c.bag[id]>0))throw Error('背包沒有此娃娃，或穿戴尚未開放');c.doll=id;delete c.dollUntil;c.dollStartedAt=now;return `已穿戴 ${d.name}，能力生效（不扣維持金幣）`;}
export function renewDoll(c:Character,now:number){if(!c.doll)return '';const d=dollDefinition(c);delete c.dollUntil;if(!d?.enabled){c.doll=null;return '娃娃已停用，已卸下';}c.dollStartedAt??=now;return '';}
export function dollRecovery(c:Character,begin:number,now:number,maxHp:number,maxMp:number){const d=dollDefinition(c);if(!c.doll||!d?.enabled)return;const start=Math.max(begin,c.dollStartedAt||begin),anchor=c.dollStartedAt||0;for(const a of d.abilities){if(!a.interval)continue;const count=Math.max(0,Math.floor((now-anchor)/(a.interval*1000))-Math.floor((start-anchor)/(a.interval*1000)));if(a.key==='healHp')c.hp=Math.min(maxHp,c.hp+count*a.value);if(a.key==='healMp')c.mp=Math.min(maxMp,c.mp+count*a.value);}}
/** Explicit local combat formula until the original base attack formula is available. */
export function petCombat(c:Character){const name=c.petActive;if(!name)return null;const p=c.pets?.[name]||{lv:0,xp:0,hit:0,damage:0};return {name,hit:65+p.lv+p.hit,damage:Math.max(1,1+p.lv+p.damage),interval:2};}
