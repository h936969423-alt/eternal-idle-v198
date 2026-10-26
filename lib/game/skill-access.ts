import raw from './gamedata.json';
import type {Character} from './engine';
/** Equipment-granted skills are never persisted into learned skills. Removing gear removes access. */
export function availableSkills(c:Pick<Character,'skills'|'equipment'|'cls'>){const ids=[...c.skills];for(const eq of Object.values(c.equipment)){const item=(raw.items as Record<string,any>)[eq.id.split('@')[0]];if(item?.req&&item.req!=='all'&&!item.req.split(',').includes(c.cls))continue;for(const id of item?.grantSkills||[])if(!ids.includes(id))ids.push(id);}return ids;}
export function hasSkill(c:Pick<Character,'skills'|'equipment'|'cls'>,id:string){return availableSkills(c).includes(id);}
