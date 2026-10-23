import assets from './asset-map.json';
import {dollDefinition} from './companions';
import type {Character,CombatEvent} from './engine';
export function sceneDoll(c:Character){const d=dollDefinition(c);if(!c.doll||!d?.enabled)return null;const icons=assets.icons.dolls as Record<string,string>;return {id:c.doll,name:d.name,tier:d.tier,src:icons[d.icon]||icons[d.name]||null};}
export function isSceneDollEvent(c:Character,e:CombatEvent){return !!c.doll&&e.source==='doll'&&e.dollId===c.doll;}
