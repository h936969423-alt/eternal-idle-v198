'use client';
import type {CSSProperties} from 'react';
import {useItemAppearance} from './item-appearance-context';
import {itemDisplayName,itemRarity,itemTextColor,RARITY_COLORS,type LootAppearanceConfig} from '@/lib/game/loot-appearance';
export default function ItemLabel({item,appearance}:{item:string;appearance?:LootAppearanceConfig}){
 const inherited=useItemAppearance(),config=appearance??inherited,color=itemTextColor(item,config)||RARITY_COLORS[itemRarity(item,config)];
 return <span className={`gear-name item-rarity-${itemRarity(item,config)}`} data-custom-item-color="true" style={{color,'--item-text-color':color} as CSSProperties}>{itemDisplayName(item,config)}</span>;
}
