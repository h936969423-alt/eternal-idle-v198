import registry from './dragon381-registry.json';
/** Temporarily expose only source entries explicitly named 恐怖的; keep all source data for restoration. */
export const ACTIVE_DRAGON381=registry.filter(r=>r.name.startsWith('恐怖的'));
export const PAUSED_DRAGON_ZONES=new Set([
 ...registry.filter(r=>!r.name.startsWith('恐怖的')).map(r=>r.zone),
 'antaras_lair','fafurion_lair','valakas_lair',
]);
export function isPausedDragonZone(id:string){return PAUSED_DRAGON_ZONES.has(id);}
