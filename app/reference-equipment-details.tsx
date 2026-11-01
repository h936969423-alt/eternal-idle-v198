'use client';
import {STAT_NAMES} from '@/lib/game/affix-rules';
const labels:Record<string,string>={...STAT_NAMES,hpR:'HP 回復',atkSpdPct:'攻速加成（%）',immPoison:'中毒免疫',expPct:'經驗加成（%）',stunResist:'昏迷耐性',stoneResist:'石化耐性',sleepResist:'睡眠耐性',freezeResist:'冰凍耐性',sustainResist:'支撐耐性',blindResist:'暗黑耐性',meleeCrit:'近距離爆擊',rangedCrit:'遠距離爆擊',magicCrit:'魔法爆擊',potionBonus:'藥水回復加成（%）',potionFlat:'藥水固定回復加成',doubleChance:'雙倍傷害機率（%）'};
export default function ReferenceEquipmentDetails({item}:{item:any}){
 if(!item.source)return null;
 return <section><div className="reference-item-stats">{item.polyCtrl&&<p>變形控制：持有即可指定變身</p>}{item.summonCtrl&&<p>召喚控制：穿戴後可選擇召喚物</p>}{Object.entries(labels).filter(([key])=>typeof item[key]==='number'&&!['ac','mr'].includes(key)).map(([key,label])=><p key={key}>{label}：{item[key]>0?'+':''}{item[key]}</p>)}{item.type==='wpn'&&<><p>對小型怪物攻擊力：{item.dmgS}</p><p>對大型怪物攻擊力：{item.dmgL}</p><p>額外命中：{item.hit||0} · 額外傷害：{item.dmgBonus||0}</p></>}</div></section>;
}
