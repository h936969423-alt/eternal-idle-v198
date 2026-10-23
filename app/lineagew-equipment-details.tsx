"use client";
import {lineageWDisplayedAbilities} from '@/lib/game/lineagew-display';
export default function LineageWEquipmentDetails({item,en}:{item:any;en:number}){
 const abilities=lineageWDisplayedAbilities(item,en);if(!abilities.length)return null;
 return <ul className="equipment-ability-list">{abilities.map((text,n)=><li key={n}>{text}</li>)}</ul>;
}
