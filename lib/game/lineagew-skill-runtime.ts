import {withSkillCooldown} from './skill-cooldown';
import {W_SKILLS,canonicalWSkill,learnedWSkills,wElementAllowed,wBuffModifiers,wUpgradeScale} from './lineagew-skill-data';
import type {Character,Encounter,CombatEvent} from './engine';
import {justiceSpellError,justiceHealMultiplier} from './alignment';
export type WSkillHooks={definition:(target:Encounter)=>any;normalAttack?:(target:Encounter,shot:number)=>number;physical:(target:Encounter,forceCritical?:boolean)=>{damage:number;miss:boolean};magic:(s:any,target:Encounter)=>number;hit:(target:Encounter,damage:number,skill:string,source:'physical'|'magic')=>number;heal:(amount:number)=>number;event:(kind:CombatEvent['kind'],data:Partial<CombatEvent>)=>void;teleport:()=>void;party:()=>{hp:number;maxHp:number;apply:(value:number)=>void}[];shareBuff?:(id:string,buff:{until:number;d:Record<string,number>})=>void;consumeArrow:()=>void;weapon:any;shield:any;log:(text:string)=>void};
const blocked=['stun','freeze','stone','silence','paralyze','sleep'];
const control=new Set(['stun','freeze','paralyze','sleep','silence']);
export function applyWSkillStatus(target:Encounter,definition:any,status:any,now:number,rng:()=>number,level:number,hit=0){
 const key=status.kind;
 if(control.has(key)&&(definition.boss||definition['imm'+key[0].toUpperCase()+key.slice(1)]))return false;
 if(rng()>=(status.chance??1))return false;
 const chance=Math.max(.05,Math.min(.95,.65+(level-(definition.lv||level))*.01+hit*.01-(definition.mr||0)*.002));
 if(!status.force&&rng()>=chance)return false;
 target.effects||={};target.effects[key]={until:now+Math.max(100,status.seconds*1000),value:status.value??1};
 return true;
}
export function castWSkill(c:Character,input:string,b:Record<string,number>,h:WSkillHooks,now:number,rng:()=>number){
 const id=canonicalWSkill(input,c.cls),s=W_SKILLS[id];if(!s)throw Error('技能不存在');if(!s.lwClasses.includes(c.cls))throw Error('職業不符');if(s.type==='passive')throw Error('此技能已被動生效');
 // Cancelling an existing toggle is not another cast.
 if(s.lwToggle&&c.buffs[id]?.until>now)return performWSkill(c,id,b,h,now,rng);
 return withSkillCooldown(c,id,b,now,()=>performWSkill(c,id,b,h,now,rng));
}
function performWSkill(c:Character,input:string,b:Record<string,number>,h:WSkillHooks,now:number,rng:()=>number){
 const id=canonicalWSkill(input,c.cls),s=W_SKILLS[id];if(!s)throw Error('技能不存在');
 if(!s.lwClasses.includes(c.cls))throw Error('職業不符');
 const justiceError=justiceSpellError(s,c.lawful);if(justiceError)throw Error(justiceError);
 if(s.type==='passive')throw Error('此技能已被動生效');
 if(!wElementAllowed(c,s))throw Error('妖精屬性不符');
 // A toggle may always be turned off; it never spends 魔力 or enters an auto-recast loop.
 if(s.lwToggle&&c.buffs[id]?.until>now){delete c.buffs[id];h.shareBuff?.(id,{until:now,d:{}});h.event('magic',{skill:id,effect:'關閉 '+s.n});return;}
 const escape=s.lwCleanse?.some((x:string)=>c.buffs['status_'+x]?.until>now)||id==='lw_skill_15981';
 if(!escape&&blocked.some(x=>c.buffs['status_'+x]?.until>now)||b.lwActionLock)throw Error('目前無法施法');
 const channel=s.type==='atk'?'attack':s.type==='heal'?'heal':s.type==='convert'?'convert':'w-support';
 if((c.skillCooldowns?.[id]||0)>now||(c.spellCooldowns?.[channel]||0)>now)throw Error('施法冷卻中');
 if(s.reqWpn==='bow'&&!h.weapon?.isBow)throw Error('需要裝備弓');
 if(s.reqWpn==='w2h'&&!(h.weapon?.twohanded||h.weapon?.w2h||h.weapon?.wcat==='tohandsword'))throw Error('需要雙手劍');
 const cost=s.mp?Math.max(1,Math.ceil(s.mp*(1-Math.min(100,b.mpReduce||0)/100))):0;
 if(c.mp<cost)throw Error('MP 不足');if(c.hp<=s.hpCost)throw Error('HP 不足以施法');
 const target=c.arena?.[c.arenaTarget||0];
 if((s.type==='atk'||s.drain)&&(!target||target.hp<=0))throw Error('沒有戰鬥目標');
 if(s.lwUndeadOnly&&target&&!h.definition(target).un)throw Error('只能對不死族施放');
 if(s.lwCleanse?.length&&!s.healBase&&!s.lwHealMaxPct&&!Object.keys(s.lwD).length&&!s.lwCleanse.some((key:string)=>c.buffs['status_'+key]?.until>now))throw Error('沒有可解除的狀態');
 if(id==='lw_skill_40'&&/^(wb_|antaras_lair|fafurion_lair|valakas_lair)/.test(c.zone))throw Error('頭目區域無法瞬間移動');
 if(id==='lw_skill_450'&&(c.tripleNeedsNormal||(c.tripleResumeAt||0)>now))throw Error('三重矢後需先完成一次普通攻擊');
 if(id==='lw_skill_450')h.consumeArrow();
 c.mp-=cost;c.hp-=s.hpCost;
 const scale=wUpgradeScale(c,id);let result='',total=0;const before=c.hp;
 for(const key of s.lwCleanse||[])delete c.buffs['status_'+key];
 if(s.type==='manual'){
  if(id==='lw_skill_40'){h.teleport();result='重新遭遇怪物';}
  else{result=(c.arena||[]).filter(t=>t.hp>0).map(t=>{const m=h.definition(t);return `${m.n} 生命 ${Math.ceil(t.hp)}/${t.maxHp||m.hp}`;}).join('；')||'目前沒有敵人';}
 }else if(s.type==='buff'){
  if(s.lwExclusiveGroup)for(const [key,buff] of Object.entries(c.buffs))if(W_SKILLS[key]?.lwExclusiveGroup===s.lwExclusiveGroup){delete c.buffs[key];h.shareBuff?.(key,{until:now,d:{}});}
  const d=wBuffModifiers(c,id);if(d.lwShield)d.lwShieldRemaining=d.lwShield;
  c.buffs[id]={until:s.lwToggle?Number.MAX_SAFE_INTEGER:now+s.dur*scale*1000,d};
  if(d.reveal)for(const t of c.arena||[]){if(t.hp<=0)continue;t.effects||={};delete t.effects.invisible;delete t.effects.disguised;t.effects.revealed={until:c.buffs[id].until,value:0};h.event('state',{slot:c.arena!.indexOf(t),uid:t.uid,mob:t.id,skill:id,targetEffects:structuredClone(t.effects)});}
  if(/隊員|血盟成員/.test(s.lwSourceTarget||''))h.shareBuff?.(id,c.buffs[id]);
  if(d.lwActionLock)c.buffs.status_action_lock={until:c.buffs[id].until,d:{}};
  result=s.lwToggle?'效果開啟':`效果持續 ${s.dur} 秒`;
 }else if(s.type==='heal'){
  const roll=()=>{let n=s.healBase||0;for(let j=0;j<(s.healDice?.[0]||0);j++)n+=1+Math.floor(rng()*s.healDice[1]);return Math.floor((n+(b.mdmg||0)+b.maxHp*(s.lwHealMaxPct||0))*scale*(1+(b.lwHealPct||0)/100)*(s.justiceHeal?justiceHealMultiplier(c.lawful):1));};
  const members=h.party();
  // Equalize the current live party's 生命 ratio before the group heal; conserve 生命.
  if(s.lwShareHp&&members.length>1){const hp=members.reduce((n,m)=>n+m.hp,0),max=members.reduce((n,m)=>n+m.maxHp,0);for(const m of members)m.apply(Math.floor(m.maxHp*hp/max)-m.hp);}
  const double=Object.keys(c.buffs).find(key=>c.buffs[key].until>now&&c.buffs[key].d.lwDoubleHeal);
  const targets=s.groupHeal?members:members.slice(0,1);
  for(const m of targets){const amount=s.healBase||s.lwHealMaxPct?Math.min(m.maxHp-m.hp,roll()*(double?c.buffs[double].d.lwDoubleHeal:1)):0;if(amount>0){m.apply(amount);total+=amount;}}
  if(double&&total>0){delete c.buffs[double];h.shareBuff?.(double,{until:now,d:{}});}
  if(Object.keys(s.lwD).length){const d=wBuffModifiers(c,id);if(d.lwShield)d.lwShieldRemaining=d.lwShield;c.buffs[id]={until:now+s.dur*1000,d};}
  result=`恢復 ${Math.floor(total)} 生命${s.lwCleanse?.length?'／解除對應異常':''}`;
 }else if(s.type==='convert'){
  let gain=Math.max(0,s.mpGain||0);
  if(s.drain&&target){const m=h.definition(target);if(rng()>=Math.max(.05,Math.min(.95,.65+(c.lv-(m.lv||c.lv))*.01)))gain=0;gain=Math.min(gain,target.mp||0);target.mp=Math.max(0,(target.mp||0)-gain);}
  gain=Math.min(gain,b.maxMp-c.mp);c.mp+=gain;result=`恢復 ${gain} 魔力`;
 }else if(s.type==='atk'){
  // Snapshot encounters. A kill/respawn can never redirect this cast to a new UID.
  const targets=s.target==='all'?(c.arena||[]).filter(t=>t.hp>0).slice():[target!];
  for(const t of targets){
   if(t.hp<=0||!c.arena?.includes(t))continue;const m=h.definition(t);
   if(s.lwStatus?.kind==='cancel'){
    for(const key of ['counter','holyBarrier','magicBarrier','haste'])if(t.effects)delete t.effects[key];
   }else{
    const hits=s.hits||1;
    for(let j=0;j<hits&&t.hp>0;j++){
     // Triple Arrow: each shot is one complete normal attack (own hit and critical roll), no equipment effects.
     if(id==='lw_skill_450'&&h.normalAttack){total+=h.normalAttack(t,j);continue;}
     let amount=0,miss=false;
     if(s.dmgType==='physical'){const p=h.physical(t,id==='lw_skill_9620');miss=p.miss;amount=miss?0:Math.max(1,(p.damage+(s.skillAddDmg||0))*scale);}
     else if(s.dmgDice)amount=h.magic(s,t)*scale;
     if(s.lwUndeadOnly&&!m.boss&&rng()<Math.max(.05,Math.min(.4,.12+(c.lv-(m.lv||c.lv))*.01)))amount=t.hp;
     if(amount>0){const dealt=h.hit(t,amount,id,s.dmgType==='physical'?'physical':'magic');total+=dealt;if(s.lifesteal&&dealt)h.heal(dealt);}
     else if(miss)h.event('attack',{slot:c.arena.indexOf(t),uid:t.uid,mob:t.id,mobHp:t.hp,damage:0,miss:true,skill:id,source:'physical'});
     if(!miss&&t.hp>0&&s.lwStatus&&s.lwStatus.kind!=='cancel'){
      const status={...s.lwStatus,seconds:s.lwStatus.seconds*scale};
      if(status.kind==='lwMark'){status.value=0;status.force=true;}
      if(applyWSkillStatus(t,m,status,now,rng,c.lv,(b.magicHit||0)+(status.kind==='stun'?b.stunHit||0:status.kind==='blind'?b.blindHit||0:0)))h.event('state',{slot:c.arena.indexOf(t),uid:t.uid,mob:t.id,skill:id,targetEffects:structuredClone(t.effects)});
      if(!amount)h.event('magic',{slot:c.arena.indexOf(t),uid:t.uid,mob:t.id,skill:id});
     }
    }
   }
  }
  result=`攻擊實扣 ${Math.floor(total)} 生命`;
 }

 c.spellCooldowns||={};c.spellCooldowns[channel]=now+Math.max(100,(s.type==='heal'?b.healIntervalMs:b.castIntervalMs)||1000);
 if(id==='lw_skill_450'){c.tripleNeedsNormal=true;delete c.tripleResumeAt;}
 if(c.hp>before)h.event('heal',{skill:id,damage:c.hp-before});
 h.event('magic',{skill:id,effect:result});h.log(`施放 ${s.n}：${result}`);
 return result;
}
/** Resolve skill shields/one-hit barriers before the existing equipment protection. */
export function wIncoming(c:Character,b:Record<string,number>,amount:number,magic:boolean,now:number,rng:()=>number){
 let damage=Math.max(0,amount),healed=0;let counterSkill='';
 for(const [id,buff] of Object.entries(c.buffs)){
  if(!W_SKILLS[id]||buff.until<=now)continue;
  if(buff.d.invulnerable){damage=0;break;}
  if(buff.d.lwRestoreBarrier&&damage>0){healed=Math.min(b.maxHp-c.hp,damage);c.hp+=healed;damage=0;delete c.buffs[id];break;}
  if(buff.d.lwShieldRemaining>0&&damage>0){const absorbed=Math.min(damage,buff.d.lwShieldRemaining);buff.d.lwShieldRemaining-=absorbed;damage-=absorbed;}
  if(!magic&&damage>0&&buff.d.lwCounterChance&&rng()*100<Math.min(75,buff.d.lwCounterChance)){counterSkill=id;damage=0;}
 }
 return {damage,healed,counterSkill};
}


