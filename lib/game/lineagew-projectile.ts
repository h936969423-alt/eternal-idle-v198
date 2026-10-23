import {lineageWEquipmentProfile} from './lineagew-equipment';
import {weaponMagicDamage} from './weapon-magic';
import {targetMagicHit} from './lineagew-equipment-effects';
import type {Character} from './engine';
/** Launcher staff: ordinary ranged magic, no arrows/MP since the source lists no resource cost. */
export function lineageWProjectileStrike(c:Character,item:any,b:Record<string,number>,m:any,rng:()=>number){
 const p=lineageWEquipmentProfile(item,c.equipment.weapon?.en||0)!;
 const chance=Math.max(5,Math.min(95,75+c.lv-(m.lv||0)+targetMagicHit(b,m)+p.hit-(m.mr||0)/10));
 if(rng()*100>=chance)return {damage:0,miss:true,critical:false,heavy:false,graze:false};
 const critical=rng()*100<(b.magicCrit||0),size=m.s==='L'?'L':'S';
 const damage=weaponMagicDamage({ele:'none',dmgDice:[1,size==='L'?p.maxL:p.maxS],dmgBase:p.damage,tier:1},{...b,magicCrit:critical?100:0},m,rng);
 return {damage,miss:false,critical,heavy:false,graze:false};
}
