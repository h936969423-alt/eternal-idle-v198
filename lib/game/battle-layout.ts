export const WORLD_BOSS_VISUAL_SCALE=1.5;
/** Each slot owns its place, so a death or replacement never moves survivors. */
export function monsterPosition(slot:number,count:number){
 const normal=[{x:56,y:65},{x:80,y:39},{x:83,y:82}];
 if(count<=3)return normal[slot]||normal[0];
 const formation=[{x:49,y:77},{x:73,y:77},{x:92,y:77},{x:61,y:43},{x:84,y:43}];
 return formation[slot]||{x:73,y:60};
}

/** Bosses face the player, leaving the top health bars and bottom controls clear. */
export function worldBossPosition(slot:number,count:number){if(count===1)return {x:70,y:58};if(count===2)return {x:slot?82:58,y:58};const rows=Math.ceil(count/2);return {x:slot%2?82:58,y:55+Math.floor(slot/2)*19/Math.max(1,rows-1)};}

/** Source dragon anchor stays fixed when its minions enter or expire. */
export function dragon381Position(slot:number){return [{x:70,y:60},{x:54,y:76},{x:87,y:76},{x:53,y:34},{x:88,y:34},{x:72,y:85}][slot]||{x:70,y:53};}

/** Match the responsive CSS boundary when projectile origins follow enlarged dragons. */
export function dragon381EffectPosition(slot:number,arenaWidth:number,viewportWidth:number){const p=dragon381Position(slot);if(slot!==0||!(arenaWidth>0))return p;const halfWidth=Math.min(viewportWidth*.46,210)*WORLD_BOSS_VISUAL_SCALE/2;return {...p,x:Math.min(p.x,100-(halfWidth+8)/arenaWidth*100)};}
