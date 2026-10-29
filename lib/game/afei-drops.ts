import catalog from './afei-drop-catalog.json';
const mobs=new Set<string>(catalog.mobs),bosses=new Set<string>(catalog.worldBosses);
/** Explicit GM modes still override these reference-table defaults. */
export function isAfeiMonster(id:string){return mobs.has(id);}
export function isAfeiBoss(zone:string){return bosses.has(zone);}
