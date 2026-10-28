import registry from './dragon381-registry.json';
/** All four-dragon source entries are available by default. GM map access and boss generation settings remain authoritative. */
export const ACTIVE_DRAGON381=registry;
export const PAUSED_DRAGON_ZONES=new Set<string>();
export function isPausedDragonZone(id:string){return PAUSED_DRAGON_ZONES.has(id);}
