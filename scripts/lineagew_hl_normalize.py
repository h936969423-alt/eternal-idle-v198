import re
from lineagew_effects import parse_effect
from lineagew_hl_effects import parse_hl_effect
SLOTS={'頭盔':'helm','面甲':'helm','盔甲':'armor','T恤':'tshirt','手套':'gloves','斗篷':'cloak','鞋':'boots','脛甲':'pants','盾牌、臂甲、輔助':'shield','戒指':'ring','項鍊':'amulet','皮帶':'belt'}
WEAPONS={'發射體魔杖':'staff','匕首':'dagger','單手劍':'sword','雙手劍':'tohandsword','弓':'bow','魔杖':'staff','鋼爪':'claw','雙刀':'dual','斧':'blunt','槍':'spear','雙手斧':'tohandblunt'}
CLASSES={'騎士':'knight','妖精':'elf','魔法師':'mage','黑暗妖精':'dark'}
GRADES={'英雄':'hero','傳說':'legend'}
FIELDS={'暴擊機率':'critPct','雙倍機率':'doubleChance','金幣獎勵':'goldPct','物理防禦力':'ac','魔法防禦力':'mr','最大HP':'mhp','最大MP':'mmp','HP恢復':'hpR','MP恢復':'mpR','STR':'str','DEX':'dex','CON':'con','INT':'int','WIS':'wis','CHA':'cha','重量獎勵':'weightCap','傷害減免':'dr','近距離傷害':'meleeDmg','遠距離傷害':'rangedDmg','近距離命中':'meleeHit','遠距離命中':'rangedHit','魔法傷害':'mdmg','魔法命中':'magicHit','魔法增幅力':'sp','PVP追加傷害':'pvpDmg','PVP傷害減免':'pvpDr','藥水恢復率':'potionBonus','藥水恢復量':'potionFlat','攻擊速度':'atkSpdPct','增加最大HP':'maxHpPct','增加最大MP':'maxMpPct','近距離暴擊':'meleeCrit','遠距離暴擊':'rangedCrit','魔法暴擊':'magicCrit','近距離迴避力':'er','遠距離迴避力':'er','無視傷害減免':'ignoreDr','無視物理防禦力':'ignoreAc','無視遠距離迴避力':'ignoreEr','無視近距離迴避力':'ignoreEr','火屬性防禦':'resFire','水屬性防禦':'resWater','風屬性防禦':'resWind','地屬性防禦':'resEarth','昏迷抗性':'stunResist','石化抗性':'stoneResist','睡眠抗性':'sleepResist','失明抗性':'blindResist','束縛抗性':'sustainResist'}
def normalize(lines):
 out={};pending=[]
 for text in lines:
  effect=parse_hl_effect(text) or parse_effect(text)
  if effect:out[effect[0]]=effect[1];continue
  m=re.fullmatch(r'(小型目標傷害|大型目標傷害)\s+([\d.]+)~([\d.]+)',text)
  if m:
   size='S' if m[1]=='小型目標傷害' else 'L';out['min'+size]=int(float(m[2]));out['max'+size]=int(float(m[3]));continue
  if text in ['防止武器損壞','雙手武器']:continue
  m=re.fullmatch(r'不死族追加傷害 1~(\d+)',text)
  if m:out['undead']=int(m[1]);continue
  m=re.fullmatch(r'(.+?)\s+([+-]?[\d.]+)(%)?',text)
  if m:
   label,value,percent=m.groups();value=float(value);value=int(value) if value.is_integer() else value
   if label in FIELDS:out[FIELDS[label]]=out.get(FIELDS[label],0)+value;continue
   if label in ['武器命中','武器追加傷害']:out['hit' if label=='武器命中' else 'damage']=value;continue
   if label=='不死族追加傷害':out['undead']=value;continue
  pending.append(text)
 return out,pending
