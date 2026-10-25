import raw from './gamedata.json';
import type {Character} from './engine';
import {backpackCount,wornCount} from './worn-items';
import {baseItem,splitGear} from './gear';
import {MASTERIES,CHOICE_VALUES,type Material,type MasteryDefinition} from './mastery-data';
export type MasteryProgress={lv:number;xp:number[];choice?:keyof typeof CHOICE_VALUES;bound?:string;auraUntil:number;resonanceUntil:number};
export type MasteryState={version:1;entries:Record<string,MasteryProgress>;weaponSlot?:'k_weapon1'|'k_weapon2';secondUnlocked?:boolean};
const items=raw.items as Record<string,any>,HOUR=3600000;
export function masteryProgress(c:Character,id:string):MasteryProgress{return c.masteries?.entries[id]||{lv:0,xp:[],auraUntil:0,resonanceUntil:0};}
function mutable(c:Character,id:string){c.masteries||={version:1,entries:{}};return c.masteries.entries[id]||=(masteryProgress(c,id));}
export function masteryDefinition(id:string){const d=MASTERIES.find(d=>d.id===id);if(!d)throw Error('精通不存在');return d;}
export function masteryAvailable(c:Character,d:MasteryDefinition){return c.cls===d.cls&&(d.id!=='k_weapon2'||!!c.masteries?.secondUnlocked);}
/** Do not let players feed resources into a recipe whose catalog items retired. */
export function masteryUnavailableMaterials(c:Character,d:MasteryDefinition,catalog:Record<string,any>=items){
 const step=d.steps[masteryProgress(c,d.id).lv];if(!step)return [];
 const names=new Set(Object.values(catalog).map(i=>i.n));
 return [...new Set([...(step.feed||[]),...step.materials.filter(m=>!m.bound).map(m=>m.name)].filter(name=>!names.has(name)))];
}
export function masteryWeaponKeys(c:Character){return Object.keys(c.bag).filter(key=>{const i=items[baseItem(key)];return c.bag[key]>0&&i?.type==='wpn'&&!i.isArrow&&!i.noEquip&&!c.locked?.includes(key);});}
export function masteryFee(d:MasteryDefinition,lv:number){return d.fee==='level'?lv*10000:d.fee==='summon'?(lv+1)*10000:10000;}
function weaponType(key:string){const i=items[baseItem(key)];return i?.wcat||i?.sourceDefinition?.wcat||'';}
export function masteryWeaponMatches(c:Character,p:MasteryProgress,now:number){const held=c.equipment.weapon?.id;return !!held&&!!p.bound&&(held===p.bound||p.resonanceUntil>now&&!!weaponType(p.bound)&&weaponType(held)===weaponType(p.bound));}
export function masteryChoiceBonus(p:MasteryProgress){const result={hit:0,damage:0};if(!p.choice||!p.lv)return result;const value=CHOICE_VALUES[p.choice]?.[p.lv-1]||0;if(p.choice!=='hit')result.damage=value;if(p.choice!=='damage')result.hit=value;return result;}
export function masteryShared(c:Character,id:string){const other=masteryProgress(c,id==='k_weapon1'?'k_weapon2':'k_weapon1');const b=other.lv===5?masteryChoiceBonus(other):{hit:0,damage:0};return {hit:Math.floor(b.hit/3),damage:Math.floor(b.damage/3)};}
export function masteryBonuses(c:Character,now:number){const out:Record<string,number>={};for(const d of MASTERIES){if(!masteryAvailable(c,d))continue;const p=masteryProgress(c,d.id);if(!p.lv||p.auraUntil<=now)continue;if(d.weapon&&((c.masteries?.weaponSlot||'k_weapon1')!==d.id||!masteryWeaponMatches(c,p,now)))continue;if(d.effect)out[d.effect]=(out[d.effect]||0)+(d.values?.[p.lv-1]||0);if(d.choice){const b=masteryChoiceBonus(p),shared=d.weapon?masteryShared(c,d.id):{hit:0,damage:0},prefix=d.id==='e_wind'?'ranged':'melee';out[prefix+'Hit']=(out[prefix+'Hit']||0)+b.hit+shared.hit;out[prefix+'Dmg']=(out[prefix+'Dmg']||0)+b.damage+shared.damage;}}return out;}
function materialQuantity(c:Character,m:Material,key:string){return m.plain?backpackCount(c,key):(c.bag[key]||0);}
function materialEnhancement(c:Character,key:string){return c.enh[key]??Object.values(c.equipment).find(e=>e.id===key)?.en??0;}
export function masteryMaterialKeys(c:Character,m:Material,p:MasteryProgress){return Object.keys(c.bag).filter(key=>{const i=items[baseItem(key)],a=c.affixes?.[key];if(!i||!materialQuantity(c,m,key)||c.locked?.includes(key)||a?.blessing==='cursed')return false;if(m.bound?(!p.bound||baseItem(key)!==baseItem(p.bound)||key===p.bound):i.n!==m.name)return false;if(m.en!==undefined&&materialEnhancement(c,key)!==m.en)return false;if(m.blessed&&a?.blessing!=='blessed')return false;if(m.plain&&(materialEnhancement(c,key)>0||!!a||!!c.darkAffixes?.[key]?.length))return false;return true;}).sort((a,b)=>wornCount(c,a)-wornCount(c,b));}
export function masteryMaterialCount(c:Character,m:Material,p:MasteryProgress){return masteryMaterialKeys(c,m,p).reduce((n,k)=>n+materialQuantity(c,m,k),0);}
function planMaterials(c:Character,materials:Material[],p:MasteryProgress){const plan:Record<string,number>={};for(const m of materials){let left=m.qty;for(const key of masteryMaterialKeys(c,m,p)){const n=Math.min(left,materialQuantity(c,m,key)-(plan[key]||0));if(n>0){plan[key]=(plan[key]||0)+n;left-=n;}if(!left)break;}if(left)throw Error(`缺少 ${m.blessed?'祝福的':''}${m.en!==undefined?'+'+m.en+' ':''}${m.name} ×${left}（鎖定道具不計；餵養不使用穿戴中的裝備）`);}return plan;}
function equipmentCost(c:Character,plan:Record<string,number>){return Object.entries(plan).flatMap(([key,n])=>Object.entries(c.equipment).filter(([,e])=>e.id===key).slice(Math.max(0,(c.bag[key]||0)-n)).map(([slot,e])=>({slot,key,name:items[baseItem(key)]?.n||key,en:e.en})));}
export function masteryBreakPreview(c:Character,id:string){const d=masteryDefinition(id),p=masteryProgress(c,id),step=d.steps[p.lv];if(!step)throw Error('精通已滿級');const plan=planMaterials(c,step.materials,p);return {plan,equipment:equipmentCost(c,plan)};}
function consumePlan(c:Character,plan:Record<string,number>){for(const cost of equipmentCost(c,plan))delete c.equipment[cost.slot];for(const [key,n]of Object.entries(plan)){c.bag[key]-=n;if(!c.bag[key]){delete c.bag[key];if(!c.bank[key]){delete c.enh[key];if(c.affixes)delete c.affixes[key];if(c.darkAffixes)delete c.darkAffixes[key];}}}}
function clearAura(p:MasteryProgress){p.auraUntil=0;p.resonanceUntil=0;}
export function masteryKill(c:Character,now:number){for(const d of MASTERIES){if(!masteryAvailable(c,d))continue;const old=masteryProgress(c,d.id),s=d.steps[old.lv];if(!s||!s.need||s.feed||s.zone&&s.zone!==c.zone)continue;if(d.weapon&&((c.masteries?.weaponSlot||'k_weapon1')!==d.id||!masteryWeaponMatches(c,old,now)))continue;const p=mutable(c,d.id);p.xp[0]=Math.min(s.need,(p.xp[0]||0)+1);}}
export function masteryAction(c:Character,a:any,now:number){
 if(a.type==='masteryUnlockSecond'){if(c.cls!=='knight'||masteryProgress(c,'k_weapon1').lv!==5)throw Error('第一武器精通須先達 Lv5');c.masteries||={version:1,entries:{}};c.masteries.secondUnlocked=true;return '已開啟第二武器精通';}
 const d=masteryDefinition(String(a.id)),old=masteryProgress(c,d.id);if(!masteryAvailable(c,d))throw Error('職業不符或第二武器精通尚未開啟');
 if(a.type==='masteryFeed'||a.type==='masteryBreak'){
  const missing=masteryUnavailableMaterials(c,d);
  if(missing.length)throw Error('目前配方材料未開放：'+missing.join('、')+'；未消耗材料或金幣');
 }
 if(a.type==='masteryBind'){if(!d.weapon)throw Error('此精通不需綁定武器');const key=String(a.item||''),i=items[baseItem(key)];if(!i||i.type!=='wpn'||i.isArrow||i.noEquip||!c.bag[key]||c.locked?.includes(key))throw Error('請選擇未鎖定的武器');const other=masteryProgress(c,d.id==='k_weapon1'?'k_weapon2':'k_weapon1');if(other.bound===key)throw Error('兩個精通槽需綁定不同武器');const fee=d.id==='k_weapon2'?1000000:0;if(c.gold<fee)throw Error('金幣不足');c.gold-=fee;const p=mutable(c,d.id);p.bound=splitGear(c,key);clearAura(p);if(d.id==='k_weapon2')clearAura(mutable(c,'k_weapon1'));return `已綁定 ${i.n}${fee?'，消耗 100 萬金幣':''}`;}
 if(a.type==='masterySwitch'){if(!d.weapon||!c.masteries?.secondUnlocked||!old.bound)throw Error('須先開啟並綁定第二精通');if((c.masteries.weaponSlot||'k_weapon1')===d.id)throw Error('此槽已指定為主精通');if(c.gold<1000000)throw Error('切換需 100 萬金幣');c.gold-=1000000;c.masteries.weaponSlot=d.id as 'k_weapon1'|'k_weapon2';clearAura(mutable(c,'k_weapon1'));clearAura(mutable(c,'k_weapon2'));return '已切換主武器精通，兩槽光環與共鳴歸零';}
 if(a.type==='masteryFeed'){const s=d.steps[old.lv],track=Number(a.track||0);if(!s?.feed||!Number.isInteger(track)||!s.feed[track])throw Error('此精通目前無法餵養');const count=Number(a.count);if(!Number.isSafeInteger(count)||count<1)throw Error('餵養數量無效');const n=Math.min(count,s.need-(old.xp[track]||0));if(n<1)throw Error('此軌經驗已滿');const plan=planMaterials(c,[{name:s.feed[track],qty:n,plain:true}],old);consumePlan(c,plan);mutable(c,d.id).xp[track]=(old.xp[track]||0)+n;return `${d.name}：${s.feed[track]} 經驗 +${n}`;}
 if(a.type==='masteryBreak'){const s=d.steps[old.lv];if(!s)throw Error('精通已滿級');if(d.weapon&&!old.bound)throw Error('請先綁定武器');if(s.need&&(s.feed||['擊殺']).some((_,i)=>(old.xp[i]||0)<s.need))throw Error('精通經驗尚未滿');if(c.gold<(s.gold||0))throw Error('突破金幣不足');const plan=planMaterials(c,s.materials,old),equipment=equipmentCost(c,plan);if(equipment.some(e=>!Array.isArray(a.equippedMaterials)||!a.equippedMaterials.includes(e.key)))throw Error('請先確認消耗穿戴中的裝備；突破後該裝備會卸下並消失');consumePlan(c,plan);c.gold-=s.gold||0;const p=mutable(c,d.id);p.lv++;p.xp=[];delete p.choice;clearAura(p);return `${d.name} 突破至 Lv${p.lv}，請重新選擇能力及啟用光環`;}
 if(a.type==='masteryChoice'){const choice=String(a.choice) as keyof typeof CHOICE_VALUES;if(!d.choice||!old.lv||!Object.hasOwn(CHOICE_VALUES,choice))throw Error('能力選擇無效');if(old.choice===choice)throw Error('已選擇此能力');if(old.choice){consumePlan(c,planMaterials(c,[{name:'精通洗鍊卡',qty:1}],old));}mutable(c,d.id).choice=choice;return '已選擇精通能力';}
 if(a.type==='masteryAura'||a.type==='masteryResonance'){if(!old.lv||d.choice&&!old.choice||d.weapon&&!old.bound)throw Error('請先突破、綁定武器並選擇能力');const resonance=a.type==='masteryResonance';if(resonance&&(!d.weapon||old.lv!==5||!weaponType(old.bound!)))throw Error('武器共鳴需武器精通 Lv5、已選能力及有效武器類型');const key=resonance?'resonanceUntil':'auraUntil',start=Math.max(now,old[key]||0);if(start+HOUR>now+12*HOUR)throw Error('最多累計 12 小時，剩餘時間過長');const fee=resonance?100000:masteryFee(d,old.lv);if(c.gold<fee)throw Error('金幣不足');c.gold-=fee;mutable(c,d.id)[key]=start+HOUR;return `${resonance?'武器共鳴':'能力光環'}增加 1 小時`;}
 throw Error('精通操作不存在');
}

