'use client';
import {lineageWProfile,lineageWReference} from '@/lib/game/lineagew-mythic';
export default function LineageWMythicDetails({item,en}:{item:any;en:number}){
 const ref=lineageWReference(item);if(!ref)return null;
 const p=lineageWProfile(item,en)!,staff=p.kind==='staff';
 const rows=[['小型目標傷害',`${p.minS}～${p.maxS}`],['大型目標傷害',`${p.minL}～${p.maxL}`],['武器命中',`+${p.hit}`],['武器追加傷害',`+${p.damage}`],[staff?'智力 INT':item.isBow?'敏捷 DEX':'力量 STR',`+${staff?p.int:item.isBow?p.dex:p.str}`],[staff?'魔法暴擊':item.isBow?'遠距離暴擊':'近距離暴擊',`+${p.crit}%`],['不死族追加傷害',`1～${p.undead}${p.undeadExtra?`，另加 1～${p.undeadExtra}`:''}`],...(staff?[['魔法傷害',`+${p.mdmg}`],['MP 恢復',`+${p.mpR}`],['魔法命中',`+${p.magicHit}`],['魔法增幅力',`+${p.sp}`],['魔法貫穿',`+${p.magicPen}%`],['無視魔法防禦力',`+${p.ignoreMr}`]]:[['無視傷害減免',`+${p.ignoreDr}`],[item.isBow?'無視遠距離迴避力':'無視近距離迴避力',`+${p.ignoreEr}`],['無視物理防禦力',`+${p.ignoreAc}`]]),...(p.kind==='dual'?[['雙倍傷害機率',`${p.doubleChance}%`],['近距離迴避力',`+${p.er}`]]:[])];
 return <section><div className="mythic-stat-grid">{rows.map(([label,value])=><p key={label}><span>{label}</span><strong>{value}</strong></p>)}</div><ul className="equipment-ability-list"><li>{ref.assaultName}：{p.growth.assaultRate}%</li>{staff&&<><li>MP吸收 1～5</li><li>聖潔魔法：{p.growth.holyRate}%</li></>}<li>消除聖結界：{p.growth.dispelRate}%</li>{p.growth.revealRate>0&&<li>揭露：{p.growth.revealRate}%</li>}</ul></section>;
}
