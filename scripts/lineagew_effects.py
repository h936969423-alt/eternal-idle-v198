"""Explicit Eternal interpretations of the remaining public W effect labels."""
import re
FIELDS={'移動速度':'moveSpeedPct','減少被擊延遲':'hurtDelayReductionPct','昏迷抗性':'stunResist','目標追加傷害':'targetExtraDamage','PVE魔法命中':'pveMagicHit','PVE遠距離命中':'pveRangedHit','PVE近距離命中':'pveMeleeHit','PVP近距離命中':'pvpMeleeHit'}
PROCS={'月光地裂':'moon','精靈之箭':'spirit','冰錐':'ice','猛爆劇毒':'venom'}
def parse_effect(text):
 if text in ['MP吸收','HP吸收']:return ('mpAbsorb' if text=='MP吸收' else 'hpAbsorb',1)
 m=re.fullmatch(r'(.+?)\s*:\s*發動機率\s+([\d.]+)%',text)
 if m and m[1] in PROCS:return ('lwProc_'+PROCS[m[1]],float(m[2]))
 m=re.fullmatch(r'(.+?)\s+([+-]?[\d.]+)%?',text)
 if not m:return None
 label=re.sub(r'\s+','',m[1]);value=float(m[2]);value=int(value) if value.is_integer() else value
 if label in FIELDS:return (FIELDS[label],value)
 # Source unit is not documented: Eternal explicitly interprets 10000 raw units as 1%.
 if label=='近距離傷害增幅':return ('meleeDamageAmpPct',value/10000)
 return None
