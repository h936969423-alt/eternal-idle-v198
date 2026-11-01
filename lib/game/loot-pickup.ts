import raw from './gamedata.json';
import assets from './asset-map.json';
import type {ItemRarity,LootNotice} from './loot-appearance';
import {dragon381Position,monsterPosition,worldBossPosition} from './battle-layout';

const items=raw.items as Record<string,{n?:string;sourceIcon?:string}>;
const icons=(assets as unknown as {icons:{items:Record<string,string>}}).icons.items;
export const RARITY_RANK:Record<ItemRarity,number>={normal:0,advanced:1,rare:2,hero:3,legend:4,mythic:5,relic:6};
/** Icon source for any item id, including enhanced/affixed ids (`base@...`). */
export function lootIconSrc(id:string):string|undefined{const i=items[id.split('@')[0]];return i?.sourceIcon||(i?.n?icons[i.n]:undefined);}
/** Scene percentage where a loot notice originated. */
export function lootOrigin(notice:LootNotice,slot:number):{x:number;y:number}{
 if(notice.layout==='ordinary'&&notice.spawnPoint)return notice.spawnPoint;
 return (notice.layout==='dragon'?(s:number)=>dragon381Position(s):notice.layout==='boss'?worldBossPosition:monsterPosition)(slot,notice.slots);
}
export type BurstItem={key:string;item:string;name:string;quantity:number;rarity:ItemRarity;extra?:number};
/** World-boss pile: one chip per item id, rarest last; beyond `max` the commonest collapse into one "+N" chip. */
export function planBossBurst(notices:LootNotice[],max=12):BurstItem[]{
 const merged=new Map<string,BurstItem>();
 for(const n of notices){const key=n.item;const old=merged.get(key);if(old)old.quantity+=n.quantity;else merged.set(key,{key,item:n.item,name:n.name,quantity:n.quantity,rarity:n.rarity});}
 const sorted=[...merged.values()].sort((a,b)=>RARITY_RANK[a.rarity]-RARITY_RANK[b.rarity]);
 if(sorted.length<=max)return sorted;
 const cut=sorted.length-(max-1),rest=sorted.slice(0,cut),kept=sorted.slice(cut);
 return [{key:'+rest',item:rest[rest.length-1].item,name:'其他物品',quantity:rest.reduce((s,r)=>s+r.quantity,0),rarity:rest[rest.length-1].rarity,extra:rest.length},...kept];
}
/** Ring around the boss, clamped inside the scene; deterministic so re-renders never jump. */
export function burstPositions(origin:{x:number;y:number},count:number,aspect:number):{x:number;y:number}[]{
 const out:{x:number;y:number}[]=[];
 for(let i=0;i<count;i++){
  const ring=i<8?0:1,inRing=ring?count-8:Math.min(8,count),index=ring?i-8:i;
  const angle=-Math.PI/2+(index+(ring?.5:0))*2*Math.PI/Math.max(1,inRing),radiusY=ring?30:20,radiusX=radiusY/Math.max(.4,aspect);
  out.push({x:Math.min(92,Math.max(8,origin.x+Math.cos(angle)*radiusX)),y:Math.min(90,Math.max(22,origin.y+8+Math.sin(angle)*radiusY*.7))});
 }
 return out;
}
/** Ground spot for the n-th ordinary drop of one monster: fanned to the sides of the corpse. */
export function groundSpot(origin:{x:number;y:number},n:number):{x:number;y:number}{
 const side=n%2?1:-1,step=Math.ceil(n/2);
 return {x:Math.min(94,Math.max(6,origin.x+side*step*10)),y:Math.min(92,Math.max(20,origin.y+2+(n%3)*2))};
}
/** Timing for the boss sequence: commons fly quickly, the rarest tier one by one and slower. */
export function burstSchedule(list:BurstItem[]){
 const top=list.length?RARITY_RANK[list[list.length-1].rarity]:0,highlight=top>=RARITY_RANK.rare;
 let t=0;return list.map(item=>{const finale=highlight&&RARITY_RANK[item.rarity]===top&&!item.extra;const start=t;t+=finale?1100:140;return {start,finale,flight:finale?650:420};});
}
