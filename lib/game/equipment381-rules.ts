import growth from './equipment381-growth.json';

/** Original 3.81 integer threshold; rnd is 1..100 and must be strictly smaller. */
export function equipment381EnchantRates(type:string,en:number,safe:number){
 if(en<safe)return {success:1,hold:0,destroy:0};
 const tmp=Math.max(1,en+(safe===0?(type==='wpn'?6:type==='arm'?2:0):0));
 const threshold=Math.trunc((100+tmp*2)/(en>=9?tmp*2:tmp));
 const success=Math.max(0,Math.min(100,threshold-1))/100;
 const hold=en>=9?Math.max(0,Math.min(100,threshold*2-1)-Math.max(0,Math.min(100,threshold-1)))/100:0;
 return {success,hold,destroy:1-success-hold};
}
export function equipment381BlessedGain(en:number,rng:()=>number){
 const roll=1+Math.floor(rng()*100);
 if(en<=2)return roll<32?1:roll===32?0:roll<77?2:3;
 return en<=5?(roll<50?2:1):1;
}

/** Additional values only: base SQL fields are already in the active catalog. */
const growthCache=new Map<string,Record<string,number>>();
export function equipment381Growth(i:any,en:number):Record<string,number>{
 if(i.source!=='apang381')return {};
 const cacheKey=`${i.sourceTable}:${i.sourceId}:${en}`,cached=growthCache.get(cacheKey);if(cached)return cached;
 const out:Record<string,number>={},maps=growth.maps as Record<string,Record<string,number>>,id=String(i.sourceId);
 const add=(key:string,n:number)=>{if(n)out[key]=(out[key]||0)+n;};
 const value=(name:string)=>maps[name]?.[id]||0;
 add('mr',value('MR')*en);add('mpR',value('MPR')*en);add('doubleChance',value('X2')*en);
 let sp=en;if([20107,120107].includes(i.sourceId))sp=Math.max(0,en-2);else if([21220,121220].includes(i.sourceId))sp=Math.max(0,en-7);else if([21221,121221].includes(i.sourceId))sp=Math.max(0,en-6);else if(i.sourceId===300431)sp=en<5?0:en<7?1:en<9?2:3;
 add('sp',value('SP')*sp);
 add('meleeHit',value('HIT')*(i.sourceId===400051?Math.max(0,en-4):en));
 const tier=en<5?0:en<7?1:en<9?2:3;
 add('mhp',value('HP')*(i.sourceId===300429?tier:en));
 add('dr',value('DMG_REDUCE')*(i.sourceId===300430?tier:[21223,121223].includes(i.sourceId)?Math.max(0,en-6):en));
 if(i.type==='acc'&&i.greater>=0&&i.greater<=2){
  const methods:Record<string,string>={addMaxHp:'mhp',addMaxMp:'mmp',addMr:'mr',addSp:'sp',add_up_hp_potion:'potionBonus',add_uhp_number:'potionFlat',addDmgModifierByArmor:'meleeDmg',addBowDmgModifierByArmor:'rangedDmg',addDamageReductionByArmor:'dr',addDmgupForPK:'pvpDmg',addDamageReductionByArmorForPK:'pvpDr'};
  const tiers=growth.accessories as Record<string,Record<string,{method:string;value:number}[]>>;
  for(const row of tiers[String(i.greater)]?.[String(Math.min(8,Math.max(0,en)))]||[])if(methods[row.method])add(methods[row.method],row.value);
 }
 if(i.type!=='wpn'&&i.safe>=0){
  const table=i.slot==='ring'?'ring':i.slot==='amulet'?'amulet':i.type==='arm'?'arm':null;
  if(table){const rows=growth.armorTables[table];for(const r of rows){if((Number(r['防具編號'])===0||Number(r['防具編號'])===i.sourceId)&&Number(r['強化值'])===en-i.safe){
   const fields:Record<string,string>={'力量增加':'str','體質增加':'con','敏捷增加':'dex','智力增加':'int','精神增加':'wis','魅力增加':'cha','增加防禦':'ac','傷害減免':'dr','血量提升':'mhp','魔力提升':'mmp'};
   for(const [f,key]of Object.entries(fields))add(key,Number(r[f as keyof typeof r])||0);
  }}}
 }
 growthCache.set(cacheKey,out);if(growthCache.size>4096)growthCache.delete(growthCache.keys().next().value!);return out;
}
