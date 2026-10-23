"""Source numeric clauses; unpublished combat formulas are Eternal interpretations."""
import re
from lineagew_hl_normalize import normalize as regular
FIELDS={'命中':'hitPct','抗性':'abnormalResist','緩慢抗性':'slowResist','排斥的詛咒抗性':'repulsionResist','近距離暴擊傷害':'meleeCritDmg','遠距離暴擊傷害':'rangedCritDmg','魔法暴擊傷害':'magicCritDmg','無視近距離暴擊':'ignoreMeleeCrit','無視遠距離暴擊':'ignoreRangedCrit','無視魔法暴擊':'ignoreMagicCrit','無視近距離增幅傷害':'ignoreMeleeAmpPct','無視遠距離增幅傷害':'ignoreRangedAmpPct','無視遭受近距離傷害增加':'ignoreMeleeVulnerabilityPct','無視遭受遠距離傷害增加':'ignoreRangedVulnerabilityPct','防禦無視反擊':'counterIgnoreDefensePct','持續恢復量增加率':'hotBonusPct','治癒恢復量':'healBonusPct','水屬性抗性':'resWater','水屬性追加傷害':'waterDamage','水龍的蠶食I指數最大值':'waterErosionIMax','水龍的蠶食I指數減免':'waterErosionIReduction','水龍的蠶食II指數最大值':'waterErosionIIMax','水龍的蠶食II指數減免':'waterErosionIIReduction','無視近距離傷害':'incomingMeleeFlat','無視遠距離傷害':'incomingRangedFlat','無視魔法傷害':'incomingMagicFlat','無視魔法防禦力':'ignoreMr','無視魔法相消術免疫':'cancelImmuneBypass'}
PROCS={'渾沌狂襲':'chaos','蓋亞狂襲':'gaia','雷電狂襲':'lightning','消除聖結界':'dispel','揭露':'reveal','聖潔魔法':'holy','神秘防護':'guard','歐西里斯的加護':'osiris','伊娃的祈禱':'eva'}
def normalize(lines):
 out={};pending=[]
 for text in lines:
  m=re.fullmatch(r'(.+?)\s*:\s*發動機率\s*([\d.]+)%',text)
  if m and m[1] in PROCS:out['lwMythic_'+PROCS[m[1]]]=float(m[2]);continue
  m=re.fullmatch(r'增加(小型|大型)目標傷害(最大值|最小值)\s+([+-]?[\d.]+)',text)
  if m:out[('max' if m[2]=='最大值' else 'min')+('S' if m[1]=='小型' else 'L')]=float(m[3]);continue
  m=re.fullmatch(r'(.+?)\s+([+-]?[\d.]+)%?',text)
  if m and re.sub(r'\s+','',m[1]) in FIELDS:
   k=FIELDS[re.sub(r'\s+','',m[1])];out[k]=out.get(k,0)+float(m[2]);continue
  a,p=regular([text]);pending.extend(p)
  for k,v in a.items():out[k]=out.get(k,0)+v
 return out,pending
