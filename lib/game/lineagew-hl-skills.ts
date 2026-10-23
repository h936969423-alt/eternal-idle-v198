/** Source only publishes names/rates. All damage, durations and visuals below are Eternal rules. */
export type HLProc={name:string;kind:string;ele?:string;dmgDice?:readonly number[];dmgBase?:number;tier?:number;status?:string;seconds?:number;value?:number;physical?:boolean;ignoreDr?:number;drain?:number;undeadOnly?:boolean;guard?:boolean;protection?:'shield'|'eva'};
const spell=(name:string,kind:string,ele:string,base:number,extra:Partial<HLProc>={}):HLProc=>({name,kind,ele,dmgDice:[3,6],dmgBase:base,tier:6,...extra});
export const LW_HL_SKILLS:Record<string,HLProc>={
 lw_hl_disease:{name:'疾病術',kind:'curse',status:'disease',seconds:12,value:8},
 lw_hl_earth_blast:spell('大地爆炸','earth','earth',16),
 lw_hl_fissure:spell('震裂術','earth','earth',14),
 lw_hl_earthquake:spell('地裂術','earth','earth',12),
 lw_hl_evil_lightning:spell('邪惡落雷','lightning','wind',18),
 lw_hl_charged_arrow:spell('充能之箭','arrow','wind',14),
 lw_hl_undead_curse:{name:'亡靈的詛咒',kind:'curse',status:'weak',seconds:10,value:4},
 lw_hl_electric:spell('電擊','lightning','wind',12),
 lw_hl_revive:spell('起死回生術','holy','none',24,{dmgDice:[4,6],undeadOnly:true}),
 lw_hl_laser:spell('激光落雷','lightning','wind',20),
 lw_hl_blood_arrow:spell('血之箭','blood','none',16,{drain:.1}),
 lw_hl_demon_kiss:spell('惡魔之吻','curse','none',20,{status:'weak',seconds:10,value:4}),
 lw_hl_extreme_lightning:spell('極道落雷','lightning','wind',24),
 lw_hl_hellfire:spell('地獄之火','fire','fire',28),
 lw_hl_burst:spell('爆裂','fire','fire',24),
 lw_hl_requiem:spell('安魂曲','curse','none',18,{status:'silence',seconds:3,value:1}),
 lw_hl_piercing_arrow:spell('穿刺箭','arrow','none',20,{physical:true,ignoreDr:10}),
 lw_hl_eradicate:spell('根除','earth','earth',22,{status:'noRegen',seconds:8,value:1}),
 lw_hl_abyss_arrow:spell('深淵之箭','arrow','none',24),
 lw_hl_abyss_lightning:spell('深淵落雷','lightning','wind',26),
 lw_hl_cross_slash:spell('交錯斬擊','slash','none',24,{physical:true}),
 lw_hl_ice_break:spell('寒冰破擊','ice','water',22,{status:'slow',seconds:3,value:20}),
 lw_hl_paagrio:spell('帕格立歐之傷','fire','fire',24,{status:'vulnerable',seconds:5,value:10}),
 lw_hl_shadow_curse:{name:'影之詛咒',kind:'curse',status:'blind',seconds:5,value:10},
 lw_hl_abyss_shot:spell('深淵射擊','arrow','none',26),
 lw_hl_abyss_burst:spell('深淵爆裂','earth','none',28),
 lw_hl_crimson_vortex:spell('緋紅漩渦','blood','fire',24,{drain:.2}),
 lw_hl_mythic_guard:{name:'神秘防護',kind:'guard',guard:true},
 lw_hl_mythic_osiris:{name:'歐西里斯的加護',kind:'guard',protection:'shield'},
 lw_hl_mythic_eva:{name:'伊娃的祈禱',kind:'holy',protection:'eva'},
 lw_hl_guard:{name:'傷害減免',kind:'guard',guard:true},
};
export function hlProcDescription(d:HLProc){
 if(d.protection==='shield')return '永夜：受到直接傷害時觸發，5 秒內傷害減少 20%，重複觸發只刷新時間。';
 if(d.protection==='eva')return '永夜：受到直接傷害時觸發，恢復最大 HP 的 5%，並解除藥水侵蝕、治癒侵蝕與污濁之水。';
 if(d.guard)return '受到直接傷害時，依來源機率將本次傷害減半；不重複疊加。';
 const status:Record<string,string>={disease:'疾病 12 秒：AC 弱化 8、攻擊命中降低 4',weak:'衰弱 10 秒：攻擊命中降低 2、物理傷害降低 4',silence:'沉默 3 秒，停止施放魔法',noRegen:'停止 HP 再生 8 秒',slow:'攻擊間隔增加 20%，持續 3 秒',vulnerable:'易傷 5 秒：受到傷害增加 10%',blind:'失明 5 秒：攻擊命中降低 10'};
 return [d.dmgDice?`${d.undeadOnly?'僅對不死族；不提供即死或復活。':''}${d.ele==='none'?'無屬性':({fire:'火',water:'水',wind:'風',earth:'地'} as Record<string,string>)[d.ele||'']} ${d.dmgDice.join('d')}＋${d.dmgBase} ${d.physical?'物理':'魔法'}追加傷害${d.ignoreDr?`，無視 ${d.ignoreDr} 傷害減免`:''}。`:'不造成直接傷害。',d.status?`${status[d.status]}；王與對應免疫目標不受此狀態影響。`:'',d.drain?`回復實際追加傷害的 ${d.drain*100}% HP，以自身缺額為上限。`:''].join('');
}
