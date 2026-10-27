import motion from './client-motion.json';
import maps from './client-maps.json';
import sunrise from './sunrise-maps.json';
import raw from './gamedata.json';
import {activeForm} from './polymorph';
import type {Character} from './engine';
export type WalkClip={directions:string[][];frameMs:number;sourceSprite:number};
const clips=motion as Record<string,WalkClip>;
export function walkClip(c:Character){const poly=c.polyLook!==false?activeForm(c):undefined;if(poly)return clips[poly.id]||clips[({'死亡騎士':'deathknight','骷髏':'skeleton','妖魔':'orc','黑暗精靈':'darkelf'} as Record<string,string>)[poly.name]];const base=({knight:'knight',elf:'elf',mage:'wizard',dark:'darkelf'} as Record<string,string>)[c.cls];return clips[base+(c.gender==='f'?'_f':'')];}
export function sceneBackground(zone:string){const replacement=(sunrise.zones as Record<string,{src:string}>)[zone];if(replacement)return replacement.src;const found=(maps as Record<string,{src:string}>)[zone];if(found)return found.src;const dungeon=raw.mapCategories.dungeon.some(x=>x.v===zone);return `/assets/background/${(raw.towns as Record<string,unknown>)[zone]?'village.jpg':dungeon?'dungeon.jpg':'forest.jpg'}`;}
export function sceneBlend(value:unknown):'screen'|'normal'{return value==='screen'?'screen':'normal';}
export function movementDirection(dx:number,dy:number){return (Math.round((Math.atan2(dx,-dy)*180/Math.PI+360)/45)+8)%8;}
