import {isFourDragonZone} from './four-dragon-loot';
import {itemRarity,type LootAppearanceConfig} from './loot-appearance';
/** Applies to every world-boss and four-dragon reward source, including saved custom tables. */
export function bossDropAllowed(item:string,appearance?:LootAppearanceConfig,zone?:string){
 if(zone&&!isFourDragonZone(zone))return false;
 const rarity=itemRarity(item,appearance);
 return rarity!=='hero'&&rarity!=='legend';
}
