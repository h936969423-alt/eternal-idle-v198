"""Source labels → explicit runtime fields; no inferred W combat formulas."""
import re
PROCS={
 '疾病術':'disease','大地爆炸':'earth_blast','震裂術':'fissure','地裂術':'earthquake',
 '邪惡落雷':'evil_lightning','充能之箭':'charged_arrow','亡靈的詛咒':'undead_curse',
 '電擊':'electric','起死回生術':'revive','激光落雷':'laser','血之箭':'blood_arrow',
 '惡魔之吻':'demon_kiss','極道落雷':'extreme_lightning','地獄之火':'hellfire',
 '爆裂':'burst','安魂曲':'requiem','穿刺箭':'piercing_arrow','根除':'eradicate',
 '深淵之箭':'abyss_arrow','深淵落雷':'abyss_lightning','交錯斬擊':'cross_slash',
 '寒冰破擊':'ice_break','帕格立歐之傷':'paagrio','影之詛咒':'shadow_curse',
 '深淵射擊':'abyss_shot','深淵爆裂':'abyss_burst','緋紅漩渦':'crimson_vortex',
 '傷害減免':'guard',
}
FIELDS={
 'PVP遠距離命中':'pvpRangedHit','PVP魔法命中':'pvpMagicHit','PVP魔法增幅力':'pvpSp',
 'PVP近距離傷害':'pvpMeleeDmg','PVP遠距離傷害':'pvpRangedDmg','PVP物理防禦力':'pvpAc',
 'PVE物理防禦力':'pveAc','PVE傷害減免':'pveDr','PVE命中':'pveHit','PVE追加傷害':'pveDmg',
 'PVE近距離傷害':'pveMeleeDmg','PVE遠距離傷害':'pveRangedDmg','PVE魔法傷害':'pveMdmg',
 'PVE魔法防禦力':'pveMr','PVE魔法增幅力':'pveSp','目標近距離命中':'targetMeleeHit',
 '經驗值獎勵':'expPct','絕對迴避力':'absoluteEr','機率魔法迴避力':'magicEr',
 '中毒抗性':'poisonResist','暗黑抗性':'blindResist','沉默抗性':'silenceResist',
 '時間靜止抗性':'freezeResist','昏迷命中':'stunHit',
 '無視近距離傷害減免':'ignoreMeleeDr','無視遠距離傷害減免':'ignoreRangedDr',
 '無視魔法傷害減免':'ignoreMagicDr','最大保護盾':'maxShield','保護盾恢復量':'shieldRegen',
 '魔法貫穿':'magicPen','風屬性追加傷害':'windDamage','風屬性抗性':'resWind','昏迷狀態傷害量減少':'stunDamageReductionPct','狀態傷害量增加':'statusDamagePct','無視傷害減少':'ignoreDamageReductionPct','無視反擊':'ignoreCounterPct','減少一定量受到的傷害':'damageReductionPct','暗黑命中':'blindHit','移動抗性':'slowResist','石化抗性':'stoneResist','束縛抗性':'sustainResist','睡眠抗性':'sleepResist','地屬性追加傷害':'earthDamage','地屬性抗性':'resEarth',
}
def parse_hl_effect(text):
 if text=='貫穿效果':return ('penetrating',1)
 m=re.fullmatch(r'(.+?)\s*:\s*發動機率\s*([\d.]+)%',text)
 if m and m[1] in PROCS:return ('lwHL_'+PROCS[m[1]],float(m[2]))
 m=re.fullmatch(r'(.+?)\s+([+-]?[\d.]+)%?',text)
 if not m:return None
 label=re.sub(r'\s+','',m[1]);value=float(m[2]);value=int(value) if value.is_integer() else value
 if label in FIELDS:return FIELDS[label],value
 return None
