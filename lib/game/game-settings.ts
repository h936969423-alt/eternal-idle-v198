import {getLootAppearanceConfig} from './item-appearance-store';
import {initialNpcConfig,type NpcConfig} from './npc-config';
import {initialMapAccess,mapAccessState} from './map-access';
import {initialLootAppearance,type LootAppearanceConfig} from './loot-appearance';
import {equipment381Settings} from './equipment381-settings';
import {env} from 'cloudflare:workers';
import {defaultDolls,type DollConfig} from './doll-config';
import {DEFAULT_WORLD_RULES,type WorldConfig} from './world-rules';
import type {MapPoolConfig} from './map-pools';
import type {MonsterConfig} from './monster-config';
/** Read the live GM configurations in one round trip, without stale caches. */
export async function getGameSettings(){
 const db=env.DB;if(!db)throw Error('game storage unavailable');
 const now=Date.now(),defaults={npcs:initialNpcConfig(),map_access:initialMapAccess(),item_appearance:initialLootAppearance(),map_pools:{maps:{},bosses:{},history:[]},monsters:{definitions:{},bossDrops:{},history:[]},dolls:{definitions:defaultDolls(),history:[]},world:{...DEFAULT_WORLD_RULES,revision:0,updatedAt:now,history:[{...DEFAULT_WORLD_RULES,at:now,by:'initial'}]}};
 const read=()=>db.prepare("SELECT id,payload,revision FROM world_settings WHERE id IN ('map_pools','monsters','dolls','world','item_appearance','map_access','npcs')").all<{id:string;payload:string;revision:number}>();
 let rows=(await read()).results;
 const missing=Object.keys(defaults).filter(id=>!rows.some(r=>r.id===id));
 if(missing.length){await db.batch(missing.map(id=>db.prepare('INSERT INTO world_settings (id,payload,revision,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO NOTHING').bind(id,JSON.stringify(defaults[id as keyof typeof defaults]),now)));rows=(await read()).results;}
 const get=(id:string)=>{const row=rows.find(r=>r.id===id);if(!row)throw Error('game settings storage unavailable');return {...JSON.parse(row.payload),revision:row.revision};};
 const appearance=get('item_appearance');
 if((appearance.normalEquipmentVersion||0)<1||(appearance.advancedEquipmentVersion||0)<1||(appearance.rareEquipmentVersion||0)<1)Object.assign(appearance,await getLootAppearanceConfig());
 const dolls=get('dolls');
 return {npcs:get('npcs') as NpcConfig,mapAccess:mapAccessState(get('map_access')),appearance:{...initialLootAppearance(),...appearance,defaults:{...initialLootAppearance().defaults,...appearance.defaults}} as LootAppearanceConfig,maps:{maps:{},bosses:{},...get('map_pools')} as MapPoolConfig,monsters:equipment381Settings(get('monsters')) as MonsterConfig,dolls:{...dolls,definitions:{...defaultDolls(),...dolls.definitions}} as DollConfig,world:get('world') as WorldConfig};
}
