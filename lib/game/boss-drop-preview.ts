import {bossDropAllowed} from './boss-drop-policy';
import {isFourDragonZone,isDragonRewardItem,fourDragonPools} from './four-dragon-loot';
import raw from './gamedata.json';
import {bossMembers,playableBoss} from './boss-respawn';
import {bossMemberDrops} from './boss-loot';
import {defaultHybridRule,hybridRoleForBoss,hybridCandidates,isProgressionEquipment,type DropRank} from './hybrid-loot';
import {monsterData} from './monster-runtime';
import {mapPool} from './map-pools';
import type {Character,Encounter} from './engine';
import type {BossDropDefinition,DropEntry} from './monster-config';

const items=raw.items as Record<string,any>;
export type BossPreviewDrop=DropEntry&{source:string};
export function bossDropPreview(zone:string,c?:Character,definition?:BossDropDefinition,now=Date.now()){
 const room=c?.bossRooms?.[zone],members=room?.arena.filter(m=>!m.summonedBy);
 const targets:Pick<Encounter,'id'|'definition'>[]=members?.length?members:bossMembers(zone).map((m:{mob:string})=>({id:m.mob,definition:c?.monsterDefinitions?.[m.mob]}));
 const levelTargets=room?.arena.length?room.arena:targets;
 const level=Math.max(1,...levelTargets.map(m=>m.definition?.lv||(c?monsterData(c,m.id,m as any)?.lv:(raw.mobs as Record<string,any>)[m.id]?.lv)||1));
 const configured=definition||(room?room.dropDefinition:c?.bossDropDefinitions?.[zone]);
 const hasDefaultHybrid=!configured&&targets.some(m=>m.definition?.dropsMode!=='custom');
 const hybrid=configured?.hybrid||(hasDefaultHybrid?defaultHybridRule(level,hybridRoleForBoss(zone)):undefined);
 const dragon=isFourDragonZone(zone),dragonGroups=dragon?fourDragonPools(c?.lootAppearance,now):[];
 if(!dragon)return {drops:[] as BossPreviewDrop[],equipment:[],shards:[],dragonGroups:[],conditionalHybrid:false};
 const drops:BossPreviewDrop[]=[];
 const add=(entries:DropEntry[],source:string,mixed:boolean)=>{for(const d of entries){
  const i=items[d.item];if(!bossDropAllowed(d.item,c?.lootAppearance)||!d.enabled||d.chance<=0||!i||i.availFrom>now||(mixed||dragon)&&isProgressionEquipment(i)||dragon&&isDragonRewardItem(i))continue;
  drops.push({...d,source});
 }};
 if(configured)add(configured.drops,configured.timing==='complete'?'整場完成':'每隻王擊殺',!!hybrid);
 else targets.forEach((m,index)=>{
  const custom=m.definition?.dropsMode==='custom',mixed=!custom;
  add(custom?m.definition!.drops:bossMemberDrops(zone,m.id),((raw.mobs as Record<string,any>)[m.id]?.n||m.id)+' · 第'+(index+1)+'隻',mixed);
 });
 const pool=hybrid?hybridCandidates(hybrid,targets[0]?.id||playableBoss(zone)?.mob||'',zone,level,c?.lootAppearance,now,mapPool(zone,c?.mapPools).map(m=>m.id)):undefined;
 const total=hybrid?Object.values(hybrid.weights).reduce((sum,n)=>sum+n,0):0;
 const equipment=!dragon&&pool&&hybrid?Object.entries(pool).flatMap(([rank,ids])=>{
  const chance=total?hybrid.equipmentChance*hybrid.weights[rank as DropRank]/total:0;
  return rank!=='hero'&&rank!=='legend'&&chance>0&&ids.length?[{rank:rank as DropRank,chance,items:ids.map(item=>({item,chance:chance/ids.length}))}]:[];
 }):[];
 const shards=hybrid?[{item:'mat_legend_shard',chance:hybrid.legendShardChance},{item:'mat_mythic_shard',chance:hybrid.mythicShardChance}].filter(d=>d.chance>0&&bossDropAllowed(d.item,c?.lootAppearance)):[];
 return {drops,equipment,shards,dragonGroups,conditionalHybrid:!dragon&&!!hybrid&&!configured&&targets.some(m=>m.definition?.dropsMode==='custom')};
}
