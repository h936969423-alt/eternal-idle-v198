import type {Character} from './engine';
/** Save bag quantities include worn copies; presentation excludes only those copies. */
export function wornCount(c:Character,key:string){return Object.values(c.equipment).filter(e=>e.id===key).length+(c.doll===key?1:0);}
export function backpackCount(c:Character,key:string){return Math.max(0,(c.bag[key]||0)-wornCount(c,key));}
