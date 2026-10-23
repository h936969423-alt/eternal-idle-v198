'use client';
import {useItemAppearance} from './item-appearance-context';
import {itemFrameColor,itemRarity,type LootAppearanceConfig} from '@/lib/game/loot-appearance';
import type {CSSProperties,ImgHTMLAttributes} from 'react';
import dimensions from '@/lib/game/item-icon-dimensions.json';
import hdIcons from '@/lib/game/item-icon-hd.json';
import {itemIconSize} from '@/lib/game/item-icon-size';
const measured=dimensions as Record<string,number[]>;
const hd=hdIcons as Record<string,{src:string;width:number;height:number}>;
type Props=Omit<ImgHTMLAttributes<HTMLImageElement>,'width'|'height'|'src'> & {src:string;alt:string;size?:number;itemId?:string;appearance?:LootAppearanceConfig};
export default function ItemIcon({src,alt,size=48,style,onLoad,loading='lazy',itemId,appearance,...props}:Props){
 const inherited=useItemAppearance(),config=appearance??inherited,frame=itemId?itemFrameColor(itemId,config):undefined;
 const override=hd[src],resolved=override?.src||src,native=override?[override.width,override.height]:measured[src],display=itemIconSize(native?.[0]||32,native?.[1]||32,size);
 const icon=<img {...props} src={resolved} alt={alt} loading={loading} width={display.width} height={display.height} data-item-icon="true" data-item-id={itemId} data-item-rarity={itemId?itemRarity(itemId,config):undefined} data-hd-icon={override?"true":undefined} data-source-icon={src} data-original-width={native?.[0]} data-original-height={native?.[1]} style={{...style,width:display.width,height:display.height,maxWidth:'none',maxHeight:'none',objectFit:'contain',imageRendering:display.pixelArt?'pixelated':'auto',flexShrink:0}} onLoad={e=>{if(!native){const image=e.currentTarget,next=itemIconSize(image.naturalWidth,image.naturalHeight,size);image.style.width=next.width+'px';image.style.height=next.height+'px';image.style.imageRendering=next.pixelArt?'pixelated':'auto';}onLoad?.(e);}}/>;
 if(!itemId)return icon;
 return <span data-item-plate="true" data-item-rarity={itemRarity(itemId,config)} className={`item-plate item-rarity-${itemRarity(itemId,config)}`} style={{'--plate-size':`${size}px`,outline:`2px solid ${frame}`,outlineOffset:-2} as CSSProperties}>{icon}</span>;
}
