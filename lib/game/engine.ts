import {combatClock,repairCombatClocks,rescaleAttackClock} from './combat-clock';
import {calculateOfflineGains,MAP_EFFICIENCY,DEFAULT_OFFLINE_EFFICIENCY,MAX_OFFLINE_SECONDS} from './offline-gains';
import {lineageWProjectileStrike} from './lineagew-projectile';
import {LW_MYTHIC_FIELDS,mythicMonsterMagicDamage,mythicHealing,applyWaterErosion,waterErosionActive,mythicCancelHit} from './lineagew-mythic-effects';
import {lineageWDefenseStats,lineageWCounterDamage,LW_CONDITIONAL_FIELDS} from './lineagew-conditions';
import {recoverLineageWShield,lineageWIncomingDamage} from './lineagew-defense';
import {lineageWEffectProfile,rollLineageWEquipmentProcs,lineageWEffectDefinition,lineageWProcDamage,LW_EFFECT_RULES,equipmentResistsStatus,targetMagicHit} from './lineagew-equipment-effects';
import lineageWCatalog from './lineagew-equipment-reference.json';
import {lineageWEquipmentGrowth} from './lineagew-equipment';
import {lineageWActiveId} from './lineagew-migration';
import {defaultHybridRule,hybridRoleForBoss,hybridCandidates,rollHybridLoot,isProgressionEquipment,type PityRecord} from './hybrid-loot';
import {itemDisplayName} from './loot-appearance';
import {redeemChatCode} from './chat-codes';
import {isGilenTeacher,gilenBookStock} from './npc-magic';
import {MAX_CHARACTERS,settleCharacterDeletions,requestCharacterDeletion,cancelCharacterDeletion,type CharacterDeletion} from './character-menu';
import {magicIntBonuses,fixedHealing} from './magic-formulas';
import {TRIPLE_SHOT_GAP_MS,ARROW_FLIGHT_MS} from './projectile-timing';
import {mapIsOpen,SAFE_MAP,type MapAccessState} from './map-access';
import {lootAppearance,type ItemRarity,type LootNotice,type LootAppearanceConfig} from './loot-appearance';
import {requiredSkillLevel,elementError,availableSkillBook,skillMpCost,rollDice,abnormalHit,healingAmount,weaponRequirement,spellClockKey,spellDamage,buffModifiers} from './spell-rules';
import {availableSkills,hasSkill} from './skill-access';
import {AUTO_SPELL_CHECK_MS,spellChannel,spellIntervalMs,spellReady,nextSpellAt,type SpellCooldowns} from './spell-timing';
import {bossMemberDrops,bossGoldRange} from './boss-loot';
import {activeSpeedStages,legacySpeedStage,useReusableSpeed} from './reusable-speed';
import {rollMythicProcs,mythicAssaultDamage,mythicLightningDamage,MYTHIC_CLEANSE_KEYS,applyMythicState,applyMonsterHolyBarrier,monsterBarrierDamage,mythicProcDefinition} from './lineagew-mythic-procs';
import {lineageWProfile,lineageWGrowth,lineageWMagicTarget} from './lineagew-mythic';
import {equipment381Growth} from './equipment381-rules';
import activation381 from './equipment381-activation.json';
import {chooseDragonSkill,dragonRows,dragonMemory,dragonDamage,dragonControl,dragonEffectGfx,dragonMobId,dragonGfx,type DragonMemory,type DragonChoice} from './dragon381';
import {newBossLedger,recordBossDamage,recordBossReward,recordBossDrop,finishBossBattle,resetBossParticipation,acknowledgeBossVictory,type BossBattleLedger,type BossVictoryReceipt} from './boss-result';
import {rememberOfflineIncome,acknowledgeOfflineIncome,type OfflineIncomeReceipt} from './offline-income';
import {masteryAction,masteryBonuses,masteryKill,type MasteryState} from './mastery-system';
import {PET_BOOK,ensurePet,petNamesOut,petStats,petMaintenance,petTakeHit,petSkill,petGain,revivePet,type PetState} from './pet-system';
import {playerStrike,monsterStrike,monsterRoll,monsterMagicRoll,physicalArmorReduction} from './attack-rules';
import {getStrMeleeDmg,getStrMeleeHit,getStrMeleeCrit,getDexRangedDmg,getDexRangedHit,getDexRangedCrit,getDexAC,getDexER,getWisMR} from './attack-tables';
import {buildSummons,summonEligible,summonRing,summonNumbers,summonEntry,summonPhysical,summonHit,summonRoll,type SummonEntity,type SummonContract} from './summon-system';
import {triggeredWeaponMagic,weaponMagicDamage} from './weapon-magic';
import {affixBonus,affixLabel,getAttrMagic,weaponElementMultiplier,isCursed,grantDroppedItem,elementalWeaponDamage,physicalDamage,type DarkAffix} from './affix-rules';
import {ordinaryRespawnMs} from './respawn-rules';
import {mapPool,mapGeneration,chooseMapMonster,chooseSpawnPoint,defaultSpawnPoints,type MapGeneration,type BossGeneration} from './map-pools';
import {createEncounter,monsterData,magicKeys,magicData,recoverMonster} from './monster-runtime';
import {rollConfiguredDrops,type MonsterDefinition,type BossDropDefinition} from './monster-config';
import {backpackCount} from './worn-items';
import {dollAttackEffects,dollDamageReduction} from './doll-combat';
import {migrateDolls,fullDollCollection,openDollBox,synthDolls,rerollDolls,exchangeLegacyFragments} from './doll-system';
import {acquireDollCard,rollDollCards,useDollCard,exchangeDollCards,synthDollCards} from './doll-cards';
import {dollBonus,type DollDefinition} from './doll-config';
import {autoAntidote,restockArrows,arrowCount,consumeArrows} from './auto-supplies';
import {dollDefinition,dollRecovery,summonDoll,renewDoll,petCombat} from './companions';
import {collectionBonus,registerCollection,petKill,PET_NAMES,unlockDoll,type PetProgress} from './verified-progress';
import {craftRecipe} from './npc-recipes';
import {SPECIAL_BUFFS,TARGET_EFFECTS,AREA_SKILLS,skillElement,resistanceDamage,specialSkillSupported} from './combat-rules';
import {playableBoss,bossMembers,ORDINARY_RESPAWN_MS} from './boss-respawn';
import {isPausedDragonZone} from './dragon-availability';
import {publicMonsterDrop,rollDropList,WORLD_BOSS_LOOT,areaMonsterDrops} from './monster-loot';
import {levelPointGain,upgradeAbilityPoints} from './ability-points';
import {autoConfig,validateAutoConfig,type AutoConfig} from './auto-config';
import {sellUnused} from './sell-unused';
import {effectText} from './magic';
import {purchaseCost} from './vendors';
import {findNpc,type NpcConfig} from './npc-config';
import { baseItem, canAutoSell, enhanceGear, affixGear, weaponMagicGear, uncurseGear, autoSellGear, type Affix } from './gear';
import { POLYMORPH, activeForm, polyBonus, bindPolymorphUnlocks, polySpeed, hasPolyControl, usePolymorph, unlockPolymorph, tickPolymorph } from './polymorph';
import { DEFAULT_WORLD_RULES, worldRulesAt, type WorldRules, type WorldConfig } from './world-rules';
import raw from './gamedata.json';
import bases from './classes.json';
export const DATA = raw as unknown as {items:Record<string,any>;mobs:Record<string,any>;skills:Record<string,any>;maps:Record<string,string[]>;mapCategories:Record<string,any[]>;towns:Record<string,any>;sets:Record<string,any>;worldBosses:Record<string,any>;dolls:any[];dollCfg:any;castle:any};
DATA.items=new Proxy(DATA.items,{get:(target,key)=>typeof key==='string'?(Object.prototype.hasOwnProperty.call(target,baseItem(key))?target[baseItem(key)]:undefined):Reflect.get(target,key)});
export const BASES = bases as Record<string,Record<string,number>>;
export type Encounter={deathSettled?:boolean;spawnPoint?:{x:number;y:number};dragonState?:DragonMemory;summonedBy?:string;expiresAt?:number;retiring?:boolean;definition?:MonsterDefinition;mp?:number;maxMp?:number;createdAt?:number;regenAt?:number;uid:string;id:string;hp:number;maxHp?:number;clock:number;previousAttackGap?:number;effects?:Record<string,{until:number;value:number;nextAt?:number;tickMs?:number}>;magicClocks?:Record<string,number>;respawnAt?:number};
export type CombatEvent={visualEffectPreviewed?:boolean;magicProjectile?:boolean;visualPhase?:'launch'|'impact';visualAt?:number;visualCastAt?:number;visualFlightMs?:number;loot?:LootNotice;dragonAction?:number;dragonGfx?:number;dragonEffect?:number;dragonSkill?:number;dragonNpc?:number;dragonDuration?:number;weaponProc?:boolean;motion?:'attack'|'skill';petName?:string;petUid?:string;petEntities?:PetSnapshot[];critical?:boolean;heavy?:boolean;graze?:boolean;summonUid?:string;summonEntities?:SummonEntity[];summonName?:string;manual?:boolean;seq:number;at:number;kind:'attack'|'hurt'|'heal'|'spawn'|'state'|'magic'|'loot';slot?:number;uid?:string;mob?:string;damage?:number;source?:'physical'|'magic'|'summon'|'poison'|'pet'|'monster'|'doll';dollId?:string;dollKind?:'attack'|'recovery'|'guard';pet?:string;miss?:boolean;hp:number;mp:number;mobHp?:number;spawn?:Encounter;targetEffects?:Encounter['effects'];target?:number;polyName?:string;casterSlot?:number;monsterMp?:number;skill?:string;effectName?:string;effect?:string;item?:string};
export type BossRoom={ledger?:BossBattleLedger;generation?:BossGeneration;dropDefinition?:BossDropDefinition;arena:Encounter[];respawnAt:number;regenAt?:number};
export type PetSnapshot={uid:string;form:string;lv:number;hp:number;mp:number;maxHp:number;maxMp:number;deadAt?:number};
export type Character={lawful?:number;restoredControlRings?:{key:string;from:import('./lineagew-migration').RetiredEquipment;at:number}[];protectionShield?:number;retiredEquipment?:import('./lineagew-migration').RetiredEquipment[];hybridPity?:Record<string,PityRecord>;npcConfig?:NpcConfig;healingOverTime?:{skill:string;amount:number;nextAt:number;remaining:number};tripleNeedsNormal?:boolean;tripleResumeAt?:number;mapAccess?:MapAccessState;lootAppearance?:LootAppearanceConfig;elfEle?:string;skillCooldowns?:Record<string,number>;stormClocks?:Record<string,number>;spellCooldowns?:SpellCooldowns;lastBossVictory?:BossVictoryReceipt;masteries?:MasteryState;petActives?:string[];summonChoice?:string;summonContract?:SummonContract;mastery?:string;dollSystemVersion?:2;dollSeed?:string;dollSeq?:number;dollPity?:Record<number,number>;dollCollection?:string[];dollCardDex?:Record<string,number>;mapPools?:Record<string,MapGeneration>;bossGeneration?:Record<string,BossGeneration>;monsterDefinitions?:Record<string,MonsterDefinition>;bossDropDefinitions?:Record<string,BossDropDefinition>;dollDefinitions?:Record<string,DollDefinition>;dollStartedAt?:number;mobKills?:Record<string,number>;collection?:string[];blueDiamonds?:number;pets?:Record<string,PetProgress>;petTraining?:string;petActive?:string;petClock?:number;dollUntil?:number;dollUnlocks?:string[];dollFragments?:Record<number,number>;panaceaUsed?:number;summons?:{skill:string;until:number;damage:number;count:number;lastAt:number};autoSupplyVersion?:1;bossRooms?:Record<string,BossRoom>;id:string;name:string;cls:string;gender:string;lv:number;xp:number;gold:number;hp:number;mp:number;attrs:Record<string,number>;points:number;levelPointsVersion?:2;bag:Record<string,number>;equipment:Record<string,{id:string;en:number}>;enh:Record<string,number>;skills:string[];autoSkills:string[];zone:string;running:boolean;mob:string|null;mobHp:number;atkClock:number;previousAttackInterval?:number;mobClock:number;autoConfig?:AutoConfig;openedUid?:string;lastOffensiveAt?:number;autoPotion:boolean;potion:string;threshold:number;buffs:Record<string,{until:number;d:Record<string,number>}>;kills:number;deaths:number;lastDeathAt?:number;logs:{time:number;text:string;kind:string;item?:string;rarity?:ItemRarity}[];lastHit:number;lastTaken:number;doll:string|null;bank:Record<string,number>;arena?:Encounter[];arenaZone?:string;arenaTarget?:number;events?:CombatEvent[];eventSeq?:number;affixes?:Record<string,Affix>;darkAffixes?:Record<string,DarkAffix[]>;lastGear?:{key:string;result:string;nonce:string};locked?:string[];autoSell?:string[];magicBarrierCooldown?:number;poly?:{id:string;until:number};polyUnlocked?:string[];polyPreferred?:string;autoPoly?:boolean;autoBuyPoly?:boolean;polyLook?:boolean;population?:{zone:string;countMultiplier:number;slots:{id:string;killedAt:number}[]};targetSlot?:number;mapPopulations?:Record<string,{zone:string;countMultiplier:number;slots:{id:string;killedAt:number}[]}>;};
export type Save={lineageWMythicCatalogVersion?:string;controlRingsVersion?:1;lineageWHLCatalogVersion?:string;lineageWCatalogVersion?:string;codeRedemptions?:Record<string,{at:number;characterId:string}>;interfaceTheme?:'classic'|'ice';characterDeletions?:Record<string,CharacterDeletion>;polyUnlocked?:string[];equipmentCatalogVersion?:string;offlineIncome?:OfflineIncomeReceipt;catchup?:{mode?:'online';seconds:number;kills:number;gold:number;xp?:number;drops?:Record<string,number>;characterName?:string;characterId?:string;targetAt?:number};dollCollection?:string[];dollCardDex?:Record<string,number>;npcDaily?:Record<string,number>;bossRooms?:Record<string,BossRoom>;v:number;characters:Character[];active:string|null;at:number};
const equipmentPool=Object.keys(DATA.items).filter(k=>['wpn','arm','acc'].includes(DATA.items[k].type)&& !DATA.items[k].isArrow && !DATA.items[k].noEquip && DATA.items[k].p>0 && !DATA.items[k].noSell && (!DATA.items[k].source||['apang381','lineagew'].includes(DATA.items[k].source)));
const weightedPool=Object.keys(DATA.items).filter(k=>DATA.items[k].gachaWeight>0&&!DATA.items[k]._noGacha);
export const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const int=(a:number,b:number,rng:()=>number)=>Math.floor(a+rng()*(Math.max(a,b)-a+1));
// Character levels 45–48 ramp up; every level from 49 uses the fixed requirement.
export const xpNeed=(lv:number)=>lv>=49?36_065_092:lv>=45?[729_360,1_508_416,3_495_263,9_912_189][lv-45]:Math.floor(80*Math.pow(lv,2.1));
export function emptySave(now=Date.now()):Save{return {v:1,equipmentCatalogVersion:activation381.version,characters:[],active:null,at:now};}
export function log(c:Character,text:string,kind='info',now=Date.now(),details:{item?:string;rarity?:ItemRarity}={}){if(kind==='attack'||kind==='hurt')return;c.logs.unshift({time:now,text,kind,...details});let drops=0,other=0;c.logs=c.logs.filter(l=>l.kind==='loot'&&l.item?++drops<=30:++other<=60);}
export function usable(c:Character,i:any){const name=({royal:c.gender==='f'?'公主':'王子',knight:'騎士',mage:'法師',elf:'妖精',dark:'黑暗妖精',illusion:'幻術士',dragon:'龍騎士',warrior:'戰士'} as Record<string,string>)[c.cls];const avatar=c.cls==='royal'?name:(c.gender==='f'?'女':'男')+name;return (!i.req||i.req==='all'||String(i.req).split(',').includes(c.cls))&&(!i.reqAvatar||i.reqAvatar===avatar)&&(!i.minLv||c.lv>=i.minLv)&&(!i.maxLv||c.lv<=i.maxLv);}
export function skillLevel(c:Character,s:any){return requiredSkillLevel(c,s);}
export function stats(c:Character,now=Date.now()){
 const b:Record<string,number>={...c.attrs,pveMeleeHit:0,pveRangedHit:0,pveMagicHit:0,pvpMeleeHit:0,targetExtraDamage:0,meleeDamageAmpPct:0,moveSpeedPct:0,hurtDelayReductionPct:0,ac:10,mr:getWisMR(c.attrs.wis),meleeCrit:0,rangedCrit:0,meleeCritDmg:c.cls==='dark'?100:50,rangedCritDmg:c.cls==='dark'?100:50,meleeHit:0,rangedDmg:0,mdmg:0,sp:0,resEarth:0,resFire:0,resWater:0,resWind:0,er:0,hpR:2,mpR:1,extraHit:0,extraDmg:0,meleeDmg:0,rangedHit:0,magicHit:0,dr:0,mhp:0,mmp:0,expPct:0,goldPct:0,dropPct:0,critPct:0,magicDrNonEle:0,immPoison:0,immStone:0,weightCap:0,damageReductionPct:0,damagePct:0,doubleChance:0,maxWeapon:0,atkSpdPct:0,maxHpPct:0,maxMpPct:0,invisible:0,potionBonus:0,extraMp:0,freezeResist:0,stunResist:0,abnormalResist:0,immParalyze:0,immSlow:0,stoneResist:0,sleepResist:0,sustainResist:0,blindResist:0,potionFlat:0,pvpDmg:0,pvpDr:0,magicCrit:0,magicCritDmg:100,mpReduce:0};
 for(const k of [...LW_CONDITIONAL_FIELDS,...LW_MYTHIC_FIELDS])b[k]=0;
 for(const eq of Object.values(c.equipment)){const i=DATA.items[eq.id];if(!i)continue;if(i.immPoison)b.immPoison=1;if(i.immStone)b.immStone=1;for(const [k,v] of Object.entries(i))if(typeof v==='number'&&(k in b))b[k]+=k==='ac'?-v:v;if(!i.lwCatalogId&&i.type!=='wpn'&&(i.source!=='apang381'||i.type==='arm'))b.ac-=eq.en;for(const [k,v]of Object.entries({...equipment381Growth(i,eq.en),...lineageWGrowth(i,eq.en),...lineageWEquipmentGrowth(i,eq.en)}))b[k]=(b[k]||0)+v;for(const [k,v]of Object.entries(affixBonus(c.affixes?.[eq.id],i.type,c.darkAffixes?.[eq.id])))b[k]=(b[k]||0)+v;for(const [level,bonus] of Object.entries(i.enBonus||{}))if(eq.en>=Number(level))for(const [k,v] of Object.entries(bonus as Record<string,number>))b[k]=(b[k]||0)+(k==='ac'?-v:v);b.meleeHit+=(i.meleeHitPerEn||0)*eq.en;b.mr+=(i.mrPerEn||0)*eq.en;b.mmp+=(i.extraMpPerEn||0)*eq.en;b.sp+=(i.spPerEn||0)*eq.en;b.extraDmg+=(i.extraDmgPerEn||0)*eq.en;}
 for(const [key,value]of Object.entries(polyBonus(c,now)))b[key]=(b[key]||0)+(key==='ac'?-value:value);
 const speedStages=activeSpeedStages(c,now);
 let sourceHaste=Object.values(c.equipment).some(eq=>DATA.items[eq.id]?.sourceHaste);
 for(const [buffId,buff] of Object.entries(c.buffs))if(buff.until>now)for(const [k,v] of Object.entries(DATA.skills[buffId]?.type==='buff'?buffModifiers(buffId,DATA.skills[buffId],c.lv,c.elfEle):buff.d)){if(typeof v==='number'&&k!=='speedStage'&&!(k==='atkSpdPct'&&speedStages.has(legacySpeedStage(buffId))))b[k]=(b[k]||0)+(k==='ac'?-v:v);}
 if(c.doll&&dollDefinition(c)?.enabled){const i=dollBonus(dollDefinition(c));if(i){for(const [k,v] of Object.entries(i))if(typeof v==='number'&&(k in b))b[k]+=v;}}
 if(fullDollCollection(c))for(const key of ['str','dex','con','int','wis','cha'])b[key]++;b.sp+=b.extraMp;
 const wornCounts=new Map<string,number>();for(const eq of Object.values(c.equipment)){const id=baseItem(eq.id);wornCounts.set(id,(wornCounts.get(id)||0)+1);}
 for(const set of Object.values(DATA.sets)){if(set.items.every((id:string)=>(wornCounts.get(id)||0)>=set.items.filter((key:string)=>key===id).length)){for(const [k,v]of Object.entries(set))if(typeof v==='number'&&(k in b))b[k]+=k==='ac'?-v:v;if(set.sourceHaste)sourceHaste=true;}}
 if(sourceHaste&&!speedStages.has(1))b.atkSpdPct+=33;
 for(const [key,value]of Object.entries(collectionBonus(c)))b[key]=(b[key]||0)+value;
 for(const [key,value]of Object.entries(masteryBonuses(c,now)))b[key]=(b[key]||0)+value;
 b.intMagicApplied=1;const magic=magicIntBonuses(b.int);for(const [key,value]of Object.entries(magic))b[key]=(b[key]||0)+value;
 b.mr+=getWisMR(b.wis)-getWisMR(c.attrs.wis);const classRates:Record<string,number[]>={knight:[6,0,12,4,10,3,4],elf:[7,25,3,7,4,5,6],dark:[6,10,2,5,8,3,4],mage:[8,15,8,0,0,0,10]};const rates=classRates[c.cls]||classRates.mage;b.ac-=Math.floor(c.lv/rates[0]);b.ac+=getDexAC(b.dex);b.mr+=rates[1]+Math.floor(c.lv/rates[2]);if(rates[3])b.meleeDmg+=Math.floor(c.lv/rates[3]);if(rates[4])b.rangedDmg+=Math.floor(c.lv/rates[4]);if(rates[5])b.extraHit+=Math.floor(c.lv/rates[5]);b.er+=Math.floor(c.lv/rates[6])+getDexER(b.dex);b.meleeCrit+=getStrMeleeCrit(b.str)+b.critPct+(c.cls==='dark'?3:0);b.rangedCrit+=getDexRangedCrit(b.dex)+b.critPct+(c.cls==='dark'?3:0);
 const classHp={knight:12,elf:8,mage:6,dark:9}[c.cls]||8;
 b.maxHp=Math.max(1,Math.floor((30+b.con*2+(c.lv-1)*classHp+b.mhp)*(1+b.maxHpPct/100)));
 b.maxMp=Math.max(0,Math.floor((b.wis*2+(c.lv-1)*(c.cls==='mage'?8:c.cls==='elf'?5:3)+b.mmp)*(1+b.maxMpPct/100)));
 const w=c.equipment.weapon?DATA.items[c.equipment.weapon.id]:null,lw=lineageWProfile(w,c.equipment.weapon?.en||0),weaponEn=lw?0:c.equipment.weapon?.en||0,weaponDamage=lw?.damage??w?.dmgBonus??0,weaponHit=lw?.hit??w?.hit??0;
 b.weaponDamageBonus=weaponDamage+weaponEn;
 b.damageBonus=(w?.isBow?getDexRangedDmg(b.dex):getStrMeleeDmg(b.str))+b.extraDmg+(w?.isBow?b.rangedDmg:b.meleeDmg)+weaponDamage+weaponEn;
 b.hit=65+c.lv+Math.floor(b.dex/2)+weaponHit+weaponEn+b.extraHit+(w?.isBow?b.rangedHit:b.meleeHit);
 b.wpnRanged=w?.isBow||w?.magicProjectile?1:0;b.elementFixedDmg=elementalWeaponDamage(c,'none');
 // Expose the same separate melee/ranged and extra rows used by the public interface.
 // The selected damage/hit totals remain exactly the existing combat formula.
 b.meleeDmg=getStrMeleeDmg(b.str)+b.meleeDmg+(!w?.isBow?weaponDamage+weaponEn:0);
 b.rangedDmg=getDexRangedDmg(b.dex)+b.rangedDmg+(w?.isBow?weaponDamage+weaponEn:0);
 b.meleeHit=getStrMeleeHit(b.str)+b.meleeHit+(!w?.isBow?weaponHit+weaponEn:0);
 b.rangedHit=getDexRangedHit(b.dex)+b.rangedHit+(w?.isBow?weaponHit+weaponEn:0);
 if(b.attackSpeedMult)b.atkSpdPct=((1+b.atkSpdPct/100)*b.attackSpeedMult-1)*100;
 if(speedStages.size)b.atkSpdPct=((1+b.atkSpdPct/100)*Math.pow(1.33,speedStages.size)-1)*100;
 const form=activeForm(c,now),polyStages=new Set([...speedStages,...Object.entries(c.buffs).filter(([,buff])=>buff.until>now).map(([id])=>legacySpeedStage(id)).filter(Boolean)]),polyHaste=Math.pow(.67,polyStages.size)*(sourceHaste&&!polyStages.has(1)?.67:1)*(c.buffs.sk_dark_walkhaste?.until>now?.85:1);b.castIntervalMs=Math.round(spellIntervalMs(c.cls,form?.name)*(form?polyHaste:1));b.healIntervalMs=Math.round(2000*(speedStages.has(1)||sourceHaste||Object.entries(c.buffs).some(([id,buff])=>buff.until>now&&legacySpeedStage(id)===1)?.67:1)*(c.buffs.sk_dark_walkhaste?.until>now?.85:1));if(form)b.healIntervalMs=b.castIntervalMs;b.supportCastIntervalMs=b.healIntervalMs;
 b.polySpeedPct=polySpeed(c,now);
 // While transformed, known haste stages use the same multiplicative interval reduction for attacks and casts.
 const legacySpeedBonus=Object.entries(c.buffs).filter(([id,buff])=>buff.until>now&&legacySpeedStage(id)&&!speedStages.has(legacySpeedStage(id))).reduce((sum,[id,buff])=>sum+((DATA.skills[id]?.type==='buff'?buffModifiers(id,DATA.skills[id],c.lv,c.elfEle):buff.d).atkSpdPct||0),0)+(sourceHaste&&!speedStages.has(1)?33:0);
 const otherSpeedPct=((1+b.atkSpdPct/100)/Math.pow(1.33,speedStages.size)-1)*100-legacySpeedBonus;
 b.attackInterval=Math.max(0.2,(w?.spd||1.2)/(1+(form?otherSpeedPct:b.atkSpdPct)/100)*(form?polyHaste:1)*(1-b.polySpeedPct/100));
 b.protectionShield=Math.min(b.maxShield||0,c.protectionShield??b.maxShield??0);
 return b;
}
export function createCharacter(name:string,cls:string,gender:string,allocation:Record<string,number>,now=Date.now()):Character{
 const base=BASES[cls];if(!base)throw new Error('職業不存在');if(!/^[一-鿿a-zA-Z0-9]{1,12}$/.test(name.trim()))throw new Error('角色名稱請輸入 1–12 字');
 const attrs:Record<string,number>={};let used=0;for(const k of ['str','dex','con','int','wis','cha']){const add=allocation[k]||0;if(!Number.isInteger(add)||add<0||add>20)throw new Error('配點無效');if(base[k]+add>20)throw new Error('初始能力上限為 20');attrs[k]=base[k]+add;used+=add;}
 if(used!==base.pts)throw new Error('請分配全部初始能力點數');
 const starter=({royal:'ap381_weapon_24',knight:'ap381_weapon_24',elf:'ap381_weapon_170',mage:'ap381_weapon_128',dark:'ap381_weapon_152',dragon:'ap381_weapon_24',illusion:'ap381_weapon_128',warrior:'ap381_weapon_143'} as Record<string,string>)[cls];
 const w=(lineageWCatalog.manifest.starters as Record<string,string>)[cls]||lineageWActiveId(starter)||starter;
 const c:Character={id:crypto.randomUUID(),name:name.trim(),cls,gender:gender==='f'?'f':'m',lv:1,xp:0,gold:3000,hp:1,mp:1,attrs,points:base.pts-used,levelPointsVersion:2,bag:{[w]:1,potion_heal:100,potion_strong:10},equipment:{weapon:{id:w,en:0}},enh:{},skills:cls==='mage'?['sk_lightarrow']:[],autoSkills:[],zone:'training',running:false,mob:null,mobHp:0,atkClock:0,mobClock:0,autoPotion:true,potion:'potion_heal',threshold:70,buffs:{},lawful:0,kills:0,deaths:0,logs:[],lastHit:0,lastTaken:0,doll:null,bank:{}};
 c.autoSupplyVersion=1;if(cls==='elf')c.bag.wpn_22=1000;c.autoConfig=validateAutoConfig(c,{potionFallback:true,potionDirectGold:true});const b=stats(c,now);c.hp=b.maxHp;c.mp=b.maxMp;log(c,'冒險開始。新兵修練場等待你的挑戰。','info',now);return c;
}
function addItem(c:Character,k:string,n=1){c.bag[k]=(c.bag[k]||0)+n;}
function consume(c:Character,k:string,n=1){if((c.bag[k]||0)<n)throw new Error('背包數量不足');c.bag[k]-=n;if(c.bag[k]<=0)delete c.bag[k];}
export function potion(c:Character,k:string,now=Date.now(),silent=false){const i=DATA.items[k];if(!i||i.type!=='pot'||!usable(c,i))throw new Error('此角色不能使用這種藥水');if(!c.bag[k])throw new Error('藥水已用完');if(c.locked?.includes(k))throw new Error('請先解除藥水鎖定');const b=stats(c,now);
 const beforeHp=c.hp;
 if(i.val){if(c.buffs.status_potionSeal?.until>now)throw Error('藥水霜化中，暫時無法使用補血藥水');if(c.hp>=b.maxHp)throw new Error('HP 已滿');consume(c,k);const gain=Math.min(Math.floor(i.val*(1+b.potionBonus/100)),b.maxHp-c.hp);dragonHealing(c,gain,now,'potion');if(!silent)log(c,`${i.n}：恢復 ${gain} HP`,'heal',now);}
 else if(i.eff==='reusableSpeed'){useReusableSpeed(c,k,now);if(!silent)log(c,`使用 ${i.n}：${i.speedStage}段加速，${i.dur/60} 分鐘（無消耗）`,'heal',now);}
 else if(['brave','elfcookie','haste','blue','cautious'].includes(i.eff)){consume(c,k);if(i.eff==='haste')for(const id of Object.keys(c.buffs))if(DATA.items[id]?.eff==='haste')delete c.buffs[id];const d:Record<string,number>=i.eff==='brave'||i.eff==='haste'?{atkSpdPct:33}:i.eff==='elfcookie'?{atkSpdPct:15}:i.eff==='cautious'?{mdmg:2,mpR:2}:{mpR:b.wis<=10?1:b.wis-8};c.buffs[k]={until:now+(i.dur||300)*1000,d};if(!silent)log(c,`使用 ${i.n}`,'heal',now);}
 else if(i.eff==='meat'){consume(c,k);c.buffs[k]={until:now+300000,d:{lure:1}};log(c,'獲得誘捕狀態 300 秒（寵物捕捉規則尚未公開）','magic',now);}
 else if(k==='new_item_141'){if(c.buffs.status_potionSeal?.until>now)throw Error('藥水霜化中，暫時無法使用補血藥水');if(c.hp>=b.maxHp)throw new Error('HP 已滿');consume(c,k);const gain=Math.min(b.maxHp-c.hp,Math.floor(int(44,107,Math.random)*(1+b.potionBonus/100)));dragonHealing(c,gain,now,'potion');log(c,`${i.n}：恢復 ${gain} HP`,'heal',now);}
 else if(i.eff==='exp'){upgradeAbilityPoints(c);if(c.lv>=99)throw new Error('已達等級上限');consume(c,k);c.xp+=i.xp;while(c.xp>=xpNeed(c.lv)&&c.lv<99){c.xp-=xpNeed(c.lv);c.points+=levelPointGain(c.lv,c.lv+1);c.lv++;}const ns=stats(c,now);c.hp=ns.maxHp;c.mp=ns.maxMp;log(c,`${i.n}：EXP +${i.xp}`,'level',now);}
 else throw new Error('此道具的完整效果尚未有可驗證的規則');
 if(c.hp>beforeHp)event(c,'heal',now,{damage:c.hp-beforeHp,item:k});else event(c,'magic',now,{item:k,effect:effectText(c.buffs[k]?.d||{})});
}
export function selectHealingPotion(c:Character,now=Date.now()){
 if(!c.autoPotion||!autoConfig(c).potionFallback||(c.bag[c.potion]||0)>0&&!c.locked?.includes(c.potion))return;
 const id=['potion_heal','potion_strong','potion_ult'].find(k=>(c.bag[k]||0)>0&&!c.locked?.includes(k)&&usable(c,DATA.items[k]));
 if(id&&id!==c.potion){c.potion=id;log(c,`自動補血改用 ${DATA.items[id].n}`,'info',now);}
}
function upgradeSupply(c:Character,now:number){if(c.autoSupplyVersion!==1){if(c.autoPotion){c.autoConfig=validateAutoConfig(c,{potionFallback:true,potionDirectGold:true});log(c,'補給設定已修正：缺藥接續背包藥水，全部用完後直接扣金幣補血。','info',now);}c.autoSupplyVersion=1;}selectHealingPotion(c,now);}
function useAutomaticItem(c:Character,id:string,directGold:boolean,now:number,rng:()=>number){const i=DATA.items[id];if(!i||!usable(c,i)||c.locked?.includes(id))return;let temporary=false;if(!c.bag[id]){if(!directGold||!Number.isFinite(i.p)||i.p<=0||c.gold<i.p||id==='scroll_magicbarrier')return;c.gold-=i.p;c.bag[id]=1;temporary=true;}try{if(id==='scroll_magicbarrier'){if((c.magicBarrierCooldown||0)>now)throw Error('冷卻中');consume(c,id);c.buffs[id]={until:now+16000,d:{magicBarrier:1}};event(c,'magic',now,{item:id,effect:'魔法屏障 · 16 秒'});}else potion(c,id,now,true);}catch(e){if(temporary){delete c.bag[id];c.gold+=i.p;}throw e;}}
export function syncPopulation(c:Character,rules:WorldRules=DEFAULT_WORLD_RULES){
 const source=mapPool(c.zone,c.mapPools).map(e=>e.id).filter(id=>DATA.mobs[id]||c.monsterDefinitions?.[id]?.custom);
 if(!source.length){delete c.population;delete c.targetSlot;return;}
 c.mapPopulations||={};if(c.population)c.mapPopulations[c.population.zone]=c.population;
 const previous=c.mapPopulations[c.zone];const sameZone=c.population?.zone===c.zone;
 if(sameZone&&c.population?.countMultiplier===rules.countMultiplier&&JSON.stringify(c.population.slots.map(s=>s.id))===JSON.stringify(Array.from({length:rules.countMultiplier},()=>source).flat()))return;
 const old=previous?.slots||[];
 // Append complete copies to preserve existing slot IDs and cooldowns across count changes.
 const ids=Array.from({length:rules.countMultiplier},()=>source).flat();
 const slots=ids.map((id,n)=>({id,killedAt:old[n]?.id===id?old[n].killedAt:0}));
 c.population={zone:c.zone,countMultiplier:rules.countMultiplier,slots};c.mapPopulations[c.zone]=c.population;
 if(c.mob){const prior=c.targetSlot;const index=prior!==undefined&&slots[prior]?.id===c.mob?prior:slots.findIndex(x=>x.id===c.mob&&!x.killedAt);if(index<0){c.mob=null;c.mobHp=0;delete c.targetSlot;}else c.targetSlot=index;}
}
const offlineEventRecordingAfter=new WeakMap<Character,number>();
export function event(c:Character,kind:CombatEvent['kind'],now:number,details:Partial<CombatEvent>={}){c.eventSeq=(c.eventSeq||0)+1;const recordAfter=offlineEventRecordingAfter.get(c);if(recordAfter!==undefined&&now<recordAfter){for(const name of petNamesOut(c))ensurePet(c,name,now);return;}c.events||=[];c.events.push({petEntities:petSnapshot(c,now),seq:c.eventSeq,at:now,kind,summonEntities:c.summonContract?structuredClone(c.summonContract.entities):[],hp:c.hp,mp:c.mp,target:c.arenaTarget||0,polyName:POLYMORPH.forms.find(f=>f.id===c.poly?.id&&c.poly.until>now)?.name,...details,...(details.source==='doll'?{dollId:c.doll||undefined}:{})});if(c.events.length>160)c.events.splice(0,c.events.length-160);}
function replacement(c:Character,slot:number,rng:()=>number,now:number){if(slot>=mapGeneration(c.zone,c.mapPools).count){if(c.arena?.[slot])delete c.arena[slot].respawnAt;return;}const id=chooseMapMonster(c.zone,c.mapPools,rng);if(!id){if(c.arena?.[slot])delete c.arena[slot].respawnAt;return;}const mob=createEncounter(c,id,now),g=mapGeneration(c.zone,c.mapPools);mob.spawnPoint=chooseSpawnPoint(g,slot,(c.arena||[]).flatMap((m,i)=>i!==slot&&m.hp>0?[m.spawnPoint||defaultSpawnPoints(g.count)[i]||{x:83,y:82}]:[]),rng,c.arena?.[slot]?.spawnPoint);c.arena![slot]=mob;event(c,'spawn',now,{slot,spawn:{...mob}});}
export function ensureArena(c:Character,rng:()=>number=Math.random,now=Date.now()){if(!isPausedDragonZone(c.zone)&&!mapIsOpen(c.zone,c.mapAccess,now)){clearDragonSummons(c);resetBossParticipation(c);c.zone=SAFE_MAP;c.running=false;c.arena=[];c.arenaZone=SAFE_MAP;c.arenaTarget=0;delete c.population;delete c.targetSlot;c.mob=null;c.mobHp=0;log(c,'此地圖已關閉，已返回銀騎士村並停止狩獵。','info',now);event(c,'state',now);}if(isPausedDragonZone(c.zone)){clearDragonSummons(c);resetBossParticipation(c);c.zone='town_silver_knight';c.running=false;c.arena=[];delete c.population;delete c.targetSlot;c.mob=null;c.mobHp=0;log(c,'此四龍版本已暫停，已返回銀騎士村並停止狩獵。','info',now);event(c,'state',now);}const boss=playableBoss(c.zone);if(boss){c.bossRooms||={};let room=c.bossRooms[c.zone];const changed=c.arenaZone!==c.zone;if((!room||room.respawnAt>0&&room.respawnAt<=now)&&c.bossGeneration?.[c.zone]?.enabled===false){c.arena=[];c.arenaZone=c.zone;c.running=false;c.mob=null;c.mobHp=0;return;}if(!room||room.respawnAt>0&&room.respawnAt<=now){const g=c.bossGeneration?.[c.zone];const members=g&&!boss.members?.length?Array.from({length:g.count},()=>({mob:boss.mob,hp:boss.hp})):bossMembers(c.zone);const arena:Encounter[]=members.map((member:any)=>createEncounter(c,member.mob,now,member.hp));room={arena,respawnAt:0,regenAt:now,ledger:newBossLedger(now),...(g?{generation:structuredClone(g)}:{}),...(c.bossDropDefinitions?.[c.zone]?{dropDefinition:structuredClone(c.bossDropDefinitions[c.zone])}:{})};c.bossRooms[c.zone]=room;arena.forEach((m,slot)=>event(c,'spawn',now,{slot,spawn:{...m}}));}const ticks=Math.max(0,Math.floor((now-(room.regenAt??now))/5000));if(ticks){for(const m of room.arena)if(!m.definition&&m.hp>0&&!(m.effects?.noRegen?.until!>now))m.hp=Math.min(m.maxHp||DATA.mobs[m.id].hp,m.hp+ticks*(boss.healPer5s||0)*(m.effects?.muddywater?.until!>now?.5:1));room.regenAt=(room.regenAt??now)+ticks*5000;}else room.regenAt??=now;c.arena=room.arena;c.arenaZone=c.zone;if(changed)c.arenaTarget=0;syncTarget(c);return;}const generation=mapGeneration(c.zone,c.mapPools),pool=mapPool(c.zone,c.mapPools);if(!pool.length){if(c.arenaZone===c.zone&&c.arena?.some(m=>m.hp>0)){syncTarget(c);return;}c.arena=[];c.arenaZone=c.zone;c.mob=null;c.mobHp=0;c.running=false;return;}if(c.arenaZone!==c.zone){c.arena=[];c.arenaZone=c.zone;c.arenaTarget=0;}c.arena||=[];
 // Existing saved encounters can carry the old default five-slot coordinates.
 // Migrate only those exact defaults; preserve random and GM-custom placements.
 if(generation.count===5&&generation.spawnMode!=='random'){
  const legacy=[{x:54,y:32},{x:83,y:32},{x:54,y:58},{x:83,y:58},{x:54,y:84}];
  const points=generation.spawnPoints||[];
  const updated=defaultSpawnPoints(5);
  const usesNewDefaults=points.length===5&&points.every((p,i)=>p.x===updated[i].x&&p.y===updated[i].y);
  if(usesNewDefaults)for(let n=0;n<Math.min(c.arena.length,5);n++){
   const p=c.arena[n]?.spawnPoint;
   if(p&&p.x===legacy[n].x&&p.y===legacy[n].y)c.arena[n].spawnPoint={...updated[n]};
  }
 }
 for(let n=0;n<generation.count;n++){if(!c.arena[n])replacement(c,n,rng,now);else if(c.arena[n].hp<=0&&!c.arena[n].respawnAt)c.arena[n].respawnAt=now+ordinaryRespawnMs(c,now);}c.arena.forEach((m,n)=>m.retiring=n>=generation.count);while(c.arena.length>generation.count&&c.arena.at(-1)!.hp<=0)c.arena.pop();syncTarget(c);}

function syncTarget(c:Character){if(!c.arena?.[c.arenaTarget||0]?.hp){const alive=c.arena?.findIndex(m=>m.hp>0)??-1;if(alive>=0)c.arenaTarget=alive;}const target=c.arena?.[c.arenaTarget||0];c.mob=target?.hp?target.id:null;c.mobHp=target?.hp||0;}
export function populationSummary(c:Character,now=Date.now(),rules:WorldRules=DEFAULT_WORLD_RULES){syncPopulation(c,rules);ensureArena(c,Math.random,now);const boss=playableBoss(c.zone),waiting=(c.arena||[]).filter(m=>m.hp<=0&&m.respawnAt);return {total:c.arena?.length||0,alive:c.arena?.filter(m=>m.hp>0).length||0,waiting:waiting.length,respawnMs:(boss?(c.bossRooms?.[c.zone]?.generation?.respawnSeconds||boss.respawnMs/1000)*1000:0)||ordinaryRespawnMs(c,now),nextRespawnMs:waiting.length?Math.max(0,Math.min(...waiting.map(m=>m.respawnAt!-now))):0,sourcePoolCount:boss?1:c.population?.slots.length||0,groups:Object.entries((c.arena||[]).reduce((out:Record<string,{total:number;alive:number}>,m)=>{out[m.id]||={total:0,alive:0};out[m.id].total++;if(m.hp>0)out[m.id].alive++;return out;},{})).map(([id,n])=>({id,...n}))};}

type IncomeLedger={xp:number;drops:Record<string,number>};
const incomeLedgers=new WeakMap<Character,IncomeLedger>();
function recordDrop(c:Character,item:string,n=1){recordBossDrop(c,item,n);const ledger=incomeLedgers.get(c);if(ledger)ledger.drops[item]=(ledger.drops[item]||0)+n;}
/** Called only after a monster reward is actually credited; never on purchases or GM gifts. */
function showLoot(c:Character,id:string,quantity:number,now:number,arena=c.arena,animate=true){const item=DATA.items[baseItem(id)];if(!item||quantity<=0)return;const {rarity,style}=lootAppearance(id,c.lootAppearance);log(c,`拾獲 ${itemDisplayName(id,c.lootAppearance)} ×${quantity}`,'loot',now,{item:id,rarity});if(style.effect==='off'||!animate)return;const slot=c.arenaTarget||0,target=arena?.[slot];event(c,'loot',now,{item:id,slot,uid:target?.uid,mob:target?.id,loot:{spawnPoint:target?.spawnPoint,item:id,name:itemDisplayName(id,c.lootAppearance),quantity,rarity,style,layout:arena?.some(m=>DATA.mobs[m.id]?.dragon381)?'dragon':playableBoss(c.zone)?'boss':'ordinary',slots:arena?.length||1}});}
export function settleBossRewards(c:Character,now:number,rng:()=>number){
 for(const [roomZone,room] of Object.entries(c.bossRooms||{})){const b=room.ledger,p=b?.participants?.[c.id],pending=p?.pending;if(!b?.finishedAt||!p||!pending)continue;delete p.pending;
 c.gold+=pending.gold;c.xp+=pending.xp;const income=incomeLedgers.get(c);if(income)income.xp+=pending.xp;
 for(const [id,n] of Object.entries(pending.drops)){const i=DATA.items[id];if(i?.eff==='dollCard')acquireDollCard(c,i.cardMob,i.cardTier,n);else grantDroppedItem(c,id,n,rng);if(income)income.drops[id]=(income.drops[id]||0)+n;if(i?.doll)c.dollCollection=[...new Set([...(c.dollCollection||[]),id])];showLoot(c,id,n,now,room.arena,roomZone===c.zone);}
 log(c,`世界王結算：金幣 +${pending.gold}，EXP +${pending.xp}`,'loot',now);
 while(c.xp>=xpNeed(c.lv)&&c.lv<99){c.xp-=xpNeed(c.lv);c.points+=levelPointGain(c.lv,c.lv+1);c.lv++;const b=stats(c,now);c.hp=b.maxHp;c.mp=b.maxMp;log(c,`升級！現在為 Lv.${c.lv}`,'level',now);}
 }
}
function award(c:Character,mobId:string,rng:()=>number,now:number){const dead=c.arena?.[c.arenaTarget||0];if(!dead||dead.hp>0||dead.deathSettled)return;dead.deathSettled=true;const m=monsterData(c,mobId,dead);if(dead?.summonedBy){log(c,`擊退 ${m.n}`,'kill',now);syncTarget(c);event(c,'state',now);return;}if(dead?.uid)for(let slot=0;slot<(c.arena?.length||0);slot++){const child=c.arena![slot];if(child.summonedBy===dead.uid&&child.hp>0){child.hp=0;event(c,'state',now,{casterSlot:slot,uid:child.uid,mob:child.id,mobHp:0});}}const roomBoss=playableBoss(c.zone);const rewards=stats(c,now),xp=Math.floor(m.exp*(1+rewards.expPct/100));const ledger=incomeLedgers.get(c);if(ledger&&!roomBoss)ledger.xp+=xp;c.kills++;c.lawful=clamp((c.lawful??0)+1,-32768,32767);masteryKill(c,now);c.mobKills||={};c.mobKills[mobId]=(c.mobKills[mobId]||0)+1;petGain(c,xp,rng,now);if(roomBoss){const preview={...c,bag:{},dollCardDex:{...(c.dollCardDex||{})}};rollDollCards(preview,mobId,rng,id=>recordBossDrop(c,id,1,true));}else rollDollCards(c,mobId,rng,id=>{recordDrop(c,id);showLoot(c,id,1,now);});if(!roomBoss)c.xp+=xp;const range=roomBoss?bossGoldRange(m):{min:m.goldMin,max:m.goldMax};const earnedGold=Math.max(roomBoss?1:0,Math.floor(int(range.min,range.max,rng)*(1+rewards.goldPct/100)));if(!roomBoss)c.gold+=earnedGold;recordBossReward(c,xp,earnedGold,now,!!roomBoss);log(c,`擊敗 ${m.n} · EXP +${xp}${roomBoss?'（待整場結算）':''}`,'kill',now);
 const roomFinished=!!roomBoss&&!c.arena?.some(m=>m.hp>0);const roomDrop=c.bossRooms?.[c.zone]?.dropDefinition;const customMonster=dead?.definition?.dropsMode==='custom';
 const ordinaryMaterial=(id:string)=>{const item=DATA.items[id];if(!item||item.type==='wpn'||item.type==='arm'||item.type==='acc'||item.type==='pot'||item.type==='scroll'||item.type==='skillbk'||item.type==='doll'||item.noSell||id==='mat_boss_crystal')return false;return /米索莉|元素石|皮革|精靈玉|礦石|金屬塊|原石|寶石|水晶|蘑菇汁|安特的樹枝|樹枝|木材|布料|羽毛|鱗片|獸皮|骨頭|粉末|材料|礦物|礦塊|碎石|結晶|石塊/.test(String(item.n||''));};
 const grantDrops=(drops:{item:string;quantity:number}[])=>{for(const d of drops){if(roomBoss){recordBossDrop(c,d.item,d.quantity,true);continue;}if(ordinaryMaterial(d.item)&&rng()>=0.5)continue;const keys=grantDroppedItem(c,d.item,d.quantity,rng);recordDrop(c,d.item,d.quantity);if(DATA.items[d.item]?.doll)c.dollCollection=[...new Set([...(c.dollCollection||[]),d.item])];showLoot(c,d.item,d.quantity,now);for(const key of keys)if(c.darkAffixes?.[key]?.length)log(c,`暗黑詞條：${affixLabel(c,key)}`,'loot',now);}};
 const mixedMonster=!roomBoss&&(dead?.definition?.dropsMode??'hybrid')==='hybrid';
 const bossLevel=roomBoss?Math.max(...(c.arena||[]).map(target=>monsterData(c,target.id,target)?.lv||1)):m.lv;
 const mixedBoss=roomBoss?(roomDrop?.hybrid||(!roomDrop&&!customMonster?defaultHybridRule(bossLevel,hybridRoleForBoss(c.zone)):undefined)):undefined;
 const onlySupplies=(drops:{item:string;quantity:number}[])=>drops.filter(d=>!isProgressionEquipment(DATA.items[d.item]));
 const grantMixed=(rule:ReturnType<typeof defaultHybridRule>,key:string,lv:number)=>{
  const pool=hybridCandidates(rule,mobId,c.zone,lv,c.lootAppearance,now,mapPool(c.zone,c.mapPools).map(entry=>entry.id));
  c.hybridPity||={};if(!c.hybridPity[key]&&Object.keys(c.hybridPity).length>=512)delete c.hybridPity[Object.keys(c.hybridPity)[0]];
  const result=rollHybridLoot(rule,pool,rng,rewards.dropPct,c.hybridPity[key]);c.hybridPity[key]=result.pity;grantDrops(result.drops);
 };
 if(customMonster&&!roomBoss)grantDrops(rollConfiguredDrops(dead!.definition!.drops,rewards.dropPct,rng,now));
 if(roomBoss){
  if(roomDrop){if(roomDrop.timing==='kill'||roomFinished){const drops=rollConfiguredDrops(roomDrop.drops,rewards.dropPct,rng,now);grantDrops(mixedBoss?onlySupplies(drops):drops);}}
  else {const drops=rollConfiguredDrops(customMonster?dead!.definition!.drops:bossMemberDrops(c.zone,mobId),rewards.dropPct,rng,now);grantDrops(mixedBoss?onlySupplies(drops):drops);}
  if(roomFinished){if(mixedBoss)grantMixed(mixedBoss,'boss:'+c.zone,bossLevel);grantDrops([{item:'mat_boss_crystal',quantity:1}]);}
 }else if(mixedMonster){
  const original=publicMonsterDrop(mobId,rng,now,rewards.dropPct);grantDrops(onlySupplies(original.items));
  if(!original.known&&m.lv>=POLYMORPH.crystalDropLevel&&rng()<POLYMORPH.crystalDropChance)grantDrops([{item:'mat_boss_crystal',quantity:1}]);
  grantDrops(onlySupplies(rollConfiguredDrops(dead?.definition?.drops||[],rewards.dropPct,rng,now)));
  grantMixed(dead?.definition?.hybrid||defaultHybridRule(m.lv),'monster:'+c.zone+':'+mobId,m.lv);
 }else if(!customMonster){const drop=publicMonsterDrop(mobId,rng,now,rewards.dropPct);if(drop.known){grantDrops(drop.items);}else{if(m.lv>=POLYMORPH.crystalDropLevel&&rng()<POLYMORPH.crystalDropChance){addItem(c,'mat_boss_crystal');recordDrop(c,'mat_boss_crystal');showLoot(c,'mat_boss_crystal',1,now);}if(rng()<Math.min(1,.12*(1+rewards.dropPct/100))){const budget=Math.max(500,m.lv*m.lv*150),pool=equipmentPool.filter(k=>DATA.items[k].p<=budget);if(pool.length)grantDrops([{item:pool[int(0,pool.length-1,rng)],quantity:1}]);}}}
 const areaDrops=areaMonsterDrops(c.zone,c.skills,rng,now,rewards.dropPct);grantDrops(mixedMonster||mixedBoss?onlySupplies(areaDrops):areaDrops);

 while(c.xp>=xpNeed(c.lv)&&c.lv<99){c.xp-=xpNeed(c.lv);c.points+=levelPointGain(c.lv,c.lv+1);c.lv++;const b=stats(c,now);c.hp=b.maxHp;c.mp=b.maxMp;log(c,`升級！現在為 Lv.${c.lv}`,'level',now);}
 const boss=playableBoss(c.zone);const respawnAt=now+(boss?(c.bossRooms?.[c.zone]?.generation?.respawnSeconds||boss.respawnMs/1000)*1000:ordinaryRespawnMs(c,now));if(!boss){if(mapPool(c.zone,c.mapPools).length&&!dead?.retiring)c.arena![c.arenaTarget||0].respawnAt=respawnAt;else{delete c.arena![c.arenaTarget||0].respawnAt;if(!mapPool(c.zone,c.mapPools).length&&!c.arena?.some(m=>m.hp>0)){c.running=false;log(c,'此地圖沒有怪物配置，已停止狩獵。','info',now);}}}else if(roomFinished){finishBossBattle(c,now);settleBossRewards(c,now,rng);c.arena!.forEach(m=>m.respawnAt=respawnAt);c.bossRooms![c.zone].respawnAt=respawnAt;c.running=false;log(c,'世界王已被擊敗，等待重生。','info',now);}syncTarget(c);event(c,'state',now);
}
/** A complete weapon attack; resources and automatic-cycle state belong to the caller. */
function normalWeaponAttack(c:Character,target:Encounter,now:number,rng:()=>number,arrow?:any,skill?:string,current=stats(c,now)){
 const m=monsterData(c,target.id,target),weapon=DATA.items[c.equipment.weapon?.id||''],strike=weapon?.magicProjectile?lineageWProjectileStrike(c,weapon,current,m,rng):playerStrike(c,current,m,rng,arrow,now);let dealt=0;
 if(!strike.miss){
  let damage=strike.damage+elementalWeaponDamage(c,m.e||'none')*(c.buffs.sk_elf_flamesoul?.until>now&&!current.wpnRanged?1.2:1);
  if(current.invisible)for(const id of Object.keys(c.buffs))if(c.buffs[id].d.invisible)delete c.buffs[id];
  damageMonster(c,Math.max(1,damage*weaponElementMultiplier(c,m.e||'none')*(m.dmgTakenMult||1)),now,rng,skill);
  dealt=c.lastHit;
  const attack=c.events?.findLast(e=>e.kind==='attack');
  if(attack){if(weapon?.magicProjectile){attack.magicProjectile=true;attack.motion='attack';}
attack.critical=strike.critical;attack.heavy=strike.heavy;attack.graze=strike.graze;}
 }else{
  c.lastHit=0;event(c,'attack',now,{slot:c.arenaTarget||0,uid:target.uid,mob:target.id,damage:0,miss:true,mobHp:target.hp,skill,source:'physical',magicProjectile:!!weapon?.magicProjectile});
  log(c,`${skill?DATA.skills[skill]?.n:'攻擊'} ${m.n}：未命中`,'miss',now);
 }
 if(!strike.miss&&dealt>0&&target.effects?.counter?.until!>now){const reflected=lineageWCounterDamage(dealt,target.effects!.counter.value,(current.ignoreCounterPct||0)+(lineageWProfile(weapon,c.equipment.weapon?.en||0)?.ignoreCounter||0),rng);if(reflected>0){const hit=lineageWIncomingDamage(c,current,reflected,now,rng);emitLineageWProtection(c,hit,now);const damage=Math.min(c.hp,hit.damage);c.hp-=damage;event(c,'hurt',now,{slot:c.arenaTarget||0,uid:target.uid,mob:target.id,damage,effectName:'反擊'});if(c.hp<=0){defeat(c,now,rng);return dealt;}}}
 if(!strike.miss&&target.hp>0&&c.buffs.sk_dark_poison?.until>now&&rng()<.5)applySpellStatus(c,target,m,{kind:'poison',force:true,dur:30,dmg:[1,10],tick:3},'sk_dark_poison',current,now,rng);
 if(!strike.miss)applyLineageWAbsorption(c,target,dealt,now,rng);
 if(!strike.miss&&target.hp>0){applyLineageWEquipmentProcs(c,target,now,rng);}
 if(!strike.miss&&target.hp>0){absorbMythicMana(c,target,now,rng);applyMythicWeaponProcs(c,target,now,rng);}
 if(target.hp>0)applyWeaponMagic(c,now,rng,skill==='sk_elf_triple'?target:undefined);
 applyDollAttack(c,now,rng,skill==='sk_elf_triple'?target:undefined);
 return dealt;
}
export function cast(c:Character,k:string,now=Date.now(),rng:()=>number=Math.random,silent=false){
 const s=DATA.skills[k],oldHp=c.hp;if(!s||!hasSkill(c,k))throw Error('尚未學習此技能');
 if(['silence','stun','stone','freeze','sleep','paralyze'].some(x=>c.buffs['status_'+x]?.until>now)||c.buffs.sk_abs_barrier?.until>now)throw Error('目前無法施法');
 if(!specialSkillSupported(k,s.type)||s.type==='passive')throw Error('此技能目前不能主動施放');
 const reason=elementError(c,s);if(reason)throw Error(reason);
 const channel=spellClockKey(k,s);if(channel&&!spellReady(c.spellCooldowns,channel,now)||c.skillCooldowns?.[k]!>now)throw Error('施法冷卻中');
 if(s.noRefresh&&c.buffs[k]?.until>now)throw Error('效果尚未結束');
 if(k==='sk_magic_shield'&&(c.magicBarrierCooldown||0)>now)throw Error('魔法屏障冷卻中');
 const b=stats(c,now),w=DATA.items[baseItem(c.equipment.weapon?.id||'')],shield=DATA.items[baseItem(c.equipment.shield?.id||'')],wpnError=weaponRequirement(s,w,shield);if(wpnError)throw Error(wpnError);
 if(c.mp<skillMpCost(s,b))throw Error('MP 不足');if(s.hpCost&&c.hp<=s.hpCost+5)throw Error('HP 不足以施法');
 const needsTarget=s.type==='atk'||s.drain||k==='sk_charm';if(needsTarget&&!c.mob)throw Error('沒有戰鬥目標');
 const savedTarget=c.arenaTarget||0,target=c.arena?.[savedTarget],m=target?monsterData(c,target.id,target):undefined;
 if(s.bossOnly&&!m?.boss)throw Error('只能對頭目施放');if(k==='sk_charm'&&m?.boss)throw Error('無法迷魅頭目');
 if(k==='sk_teleport'&&(playableBoss(c.zone)||m?.dragon381))throw Error('此區域無法瞬間移動');
 if(s.darkCrit&&(c.mp<=1||c.hp<=1))throw Error('會心一擊需要 HP 與 MP 均大於 1');
 const purify:Record<string,string[]>={sk_antidote:['poison'],sk_holy_light:['stone','paralyze'],sk_cancel:['freeze','stone','poison','paralyze','burn','scald','weaken','disease','blind','potionFrost','foulWater']};
 if(purify[k]&&!purify[k].some(x=>c.buffs['status_'+x]?.until>now))throw Error('沒有可解除的負面狀態');
 if(s.status&&!s.dmgDice&&!s.multiDmg){const candidates=s.target==='all'?(c.arena||[]).filter(x=>x.hp>0):target?[target]:[];if(candidates.length&&candidates.every(x=>x.effects?.[statusKey(s.status.kind)]?.until!>now))throw Error('目標已有此狀態');}
 let usedArrow:any;if(k==='sk_elf_triple'){const msg=restockArrows(c,!!autoConfig(c).arrowBuy);if(msg)log(c,msg,'info',now);if(arrowCount(c)<1)throw Error('三重矢需要 1 支未鎖定的箭');usedArrow=Object.keys(c.bag).filter(id=>c.bag[id]>0&&!c.locked?.includes(id)).map(id=>DATA.items[baseItem(id)]).find(i=>i?.isArrow);}
 const summonPlan=k==='sk_summon'?buildSummons(c,b,now):undefined,critMult=s.darkCrit?c.mp/Math.max(1,b.maxMp)*5:1;
 c.mp-=skillMpCost(s,b);if(s.hpCost)c.hp-=s.hpCost;if(s.darkCrit){c.hp=1;c.mp=1;}if(usedArrow)consumeArrows(c,1);let result='';
 if(s.type==='manual'){
  if(k==='sk_teleport'){for(let slot=0;slot<(c.arena?.length||0);slot++)replacement(c,slot,rng,now);syncTarget(c);result='瞬間移動，重新遭遇怪物';}
  else if(k==='sk_energy_sense')result=m?`${m.n} · 屬性 ${m.e||'none'} · 火抗 ${m.resFire||0}／水抗 ${m.resWater||0}／風抗 ${m.resWind||0}／地抗 ${m.resEarth||0}`:'目前沒有目標';
  else if(k==='sk_abs_barrier'){c.buffs[k]={until:now+s.dur*1000,d:{invulnerable:1}};result=`無敵且無法行動 ${s.dur} 秒`;}
  else if(k==='sk_charm'){if(abnormalHit(c.lv,b,m,rng,12)){c.summons={skill:k,until:now+3600000,damage:Math.max(1,Math.floor(((m.dmg?.[0]||1)+(m.dmg?.[1]||4))/2)),count:1,lastAt:now};c.buffs[k]={until:now+3600000,d:{summon:1}};target!.hp=0;target!.respawnAt=now+ordinaryRespawnMs(c,now);syncTarget(c);result='迷魅成功 · 3600 秒';}else result='目標抵抗了迷魅';}
 }
 else if(s.type==='buff'){
  const d=buffModifiers(k,s,c.lv,c.elfEle);c.buffs[k]={until:now+(s.dur||300)*1000,d};
  if(k==='sk_summon'){c.summonContract=summonPlan;delete c.summons;d.summon=summonPlan!.entities.length;result=`${summonPlan!.entities[0].form} ×${summonPlan!.entities.length} · 60 分鐘`;for(const other of ['sk_zombie','sk_elf_summon','sk_elf_summon2'])delete c.buffs[other];}
  else if(['sk_zombie','sk_elf_summon','sk_elf_summon2'].includes(k)){delete c.summonContract;delete c.buffs.sk_summon;const count=Math.max(1,Math.min(5,Math.floor(b.cha/6)));c.summons={skill:k,until:c.buffs[k].until,damage:Math.max(1,(s.tier||1)*3+Math.floor(b.int/2)),count,lastAt:now};d.summon=count;}
  if(s.stormInterval){c.stormClocks||={};c.stormClocks[k]=now+s.stormInterval*100;}
  if(!result)result=effectText(d)+` · ${s.dur||300} 秒`;
 }
 else if(s.type==='heal'){
  if(s.hot){c.healingOverTime={skill:k,amount:fixedHealing(s.fixedHeal,b),nextAt:now+s.hot.intervalMs,remaining:s.hot.ticks};result='每3秒恢復HP，共5次';}
  else if(purify[k]){for(const status of purify[k])delete c.buffs['status_'+status];result='已解除對應負面狀態';}
  else{
   const members:{hp:number;maxHp:number;apply:(n:number)=>void}[]=[{hp:c.hp,maxHp:b.maxHp,apply:n=>dragonHealing(c,n,now,'skill')}];
   for(const entity of c.summonContract?.entities||[])if(entity.hp>0)members.push({hp:entity.hp,maxHp:entity.maxHp,apply:n=>{entity.hp=Math.min(entity.maxHp,entity.hp+n);}});
   for(const name of petNamesOut(c)){const p=ensurePet(c,name,now);if(p.hp!>0)members.push({hp:p.hp!,maxHp:p.maxHp!,apply:n=>{p.hp=Math.min(p.maxHp!,p.hp!+n);}});}
   const beneficiaries=s.groupHeal?members:[members.reduce((a,x)=>x.hp/x.maxHp<a.hp/a.maxHp?x:a)];let total=0;
   for(const member of beneficiaries){let amount=healingAmount(s,b,member.maxHp-member.hp,rng,w?.groupHealMult||1);if(member===members[0]&&!s.ignoreWaterVital&&c.buffs.sk_elf_watervital?.until>now){amount*=2;delete c.buffs.sk_elf_watervital;c.skillCooldowns||={};c.skillCooldowns.sk_elf_watervital=now+7000;}amount=Math.min(member.maxHp-member.hp,amount);member.apply(amount);total+=amount;}
   result=`恢復 ${total} HP${s.groupHeal?'（全隊）':''}`;
  }
 }
 else if(s.type==='convert'){const gain=s.drain?(abnormalHit(c.lv,b,m,rng)?rollDice(1,Math.max(1,Math.floor((m.lv||1)/2)),rng)+(b.manaDrainBonus||0):0):(s.mpGain||0);c.mp=Math.min(b.maxMp,c.mp+gain);result=`HP −${s.hpCost||0} → MP +${gain}`;}
 else if(s.type==='atk'){
  const targets=k!=='sk_elf_triple'&&s.target==='all'?(c.arena||[]).map((m,slot)=>({m,slot})).filter(x=>x.m.hp>0).slice(0,s.maxTargets||Infinity):[{m:target!,slot:savedTarget}];let total=0;
  for(const {m:live,slot}of targets){if(live.hp<=0)continue;c.arenaTarget=slot;syncTarget(c);const def=monsterData(c,live.id,live),mr=live.effects?.mrDown?.until!>now?(def.mr||0)/2:def.mr||0;
   if(k==='sk_elf_triple'){
    for(let h=0;h<3&&live.hp>0;h++){
     c.arenaTarget=slot;syncTarget(c);
     total+=normalWeaponAttack(c,live,now+h*TRIPLE_SHOT_GAP_MS,rng,usedArrow,k);
    }
    continue;
   }
   if(k==='sk_shock_stun'){
    // A control skill is one skill strike, never the full normal-attack proc chain.
    const strike=playerStrike(c,b,def,rng,undefined,now,{skill:true});
    if(strike.miss){
     event(c,'attack',now,{slot,uid:live.uid,mob:live.id,mobHp:live.hp,damage:0,miss:true,skill:k,source:'physical'});
    }else{
     const damage=Math.max(1,strike.damage+(s.skillAddDmg||0)+elementalWeaponDamage(c,def.e||'none'));
     damageMonster(c,damage,now,rng,k,'physical');total+=c.lastHit;
     const hit=c.events?.findLast(e=>e.kind==='attack'&&e.skill===k&&e.uid===live.uid);
     if(hit){hit.critical=strike.critical;hit.heavy=strike.heavy;hit.graze=strike.graze;}
    }
    let stunned=false;
    if(!strike.miss&&live.hp>0&&!(live.effects?.stun?.until!>now)&&rng()<(s.stunChance??.1))
     stunned=!!applySpellStatus(c,live,def,{kind:'stun',dur:6},k,b,now,rng);
    if(!stunned)event(c,'state',now,{skill:k,slot,uid:live.uid,mob:live.id,miss:true,effect:'衝暈失敗'});
    continue;
   }
   if(s.darkCrit){const max=w?(def.s==='L'?w.dmgL:w.dmgS)||2:2,damage=Math.max(0,max+b.meleeDmg+b.extraDmg-(def.dr||0))*(1+b.meleeCritDmg/100)*critMult;damageMonster(c,damage,now,rng,k,'physical');total+=c.lastHit;const hit=c.events?.findLast(e=>e.kind==='attack');if(hit)hit.critical=true;continue;}
   if(s.dmgType==='physical'){for(let h=0;h<(s.hits||1)&&live.hp>0;h++){const strike=playerStrike(c,b,def,rng,usedArrow,now,{skill:true,forceCrit:!!s.darkCrit,forceHeavy:!!s.darkCrit,forceHit:!!s.darkCrit,dice:k==='sk_elf_triple'?(def.s==='L'?usedArrow?.dmgL:usedArrow?.dmgS):undefined});if(strike.miss){event(c,'attack',now+h*TRIPLE_SHOT_GAP_MS,{slot,uid:live.uid,mob:live.id,mobHp:live.hp,damage:0,miss:true,skill:k,source:'physical'});continue;}const damage=((strike.damage+(s.skillAddDmg||0)+(s.darkCrit?(def.hardSkin||0):0))*critMult*(s.darkCrit&&def.race==='血盟'?2:1))+elementalWeaponDamage(c,def.e||'none');damageMonster(c,damage,now+h*TRIPLE_SHOT_GAP_MS,rng,k,'physical');total+=c.lastHit;if(s.stun&&rng()<(s.stunChance||0))applySpellStatus(c,live,def,{kind:'stun',dur:s.stun/10,force:true},k,b,now,rng);const e=c.events?.findLast(e=>e.kind==='attack');if(e){e.critical=strike.critical;e.heavy=strike.heavy;e.graze=strike.graze;}}continue;}
   const outcome={critical:false},damage=spellDamage(s,b,lineageWMagicTarget(w,c.equipment.weapon?.en||0,{...def,mr}),rng,c.cls,outcome);if(damage){damageMonster(c,damage,now,rng,k,'magic');const hit=c.events?.findLast(e=>e.kind==='attack');if(hit)hit.critical=outcome.critical;total+=c.lastHit;if(s.lifesteal)c.hp=Math.min(b.maxHp,c.hp+c.lastHit);if(live.effects?.mrDown)delete live.effects.mrDown;if(live.hp>0){if(w?.lwGrade==='mythic'&&w.wcat==='staff')applyLineageWAbsorption(c,live,c.lastHit,now,rng);applyMythicWeaponProcs(c,live,now,rng,true);}}
   if(live.hp>0&&s.status)applySpellStatus(c,live,def,s.status,k,b,now,rng);if(live.hp>0&&s.freeze)applySpellStatus(c,live,def,{kind:'freeze',dur:6},k,b,now,rng);
   if(live.hp>0&&s.instakill&&!def.boss&&(s.instakill.tag==='undead'?def.un:s.instakill.tag==='element'?def.elem:false)&&(k==='sk_undead_bane'?rng()*100<Math.max(1,Math.min(95,32+c.lv-(def.lv||0)+targetMagicHit(b,def)*2.5-(def.mr||0)/2)):abnormalHit(c.lv,b,def,rng,s.instakill.cap||12)))damageMonster(c,live.hp,now,rng,k,'magic');
  }
  c.arenaTarget=savedTarget;syncTarget(c);result=`攻擊實扣 ${total} HP`;
 }
 if(channel){c.spellCooldowns||={};c.spellCooldowns[channel]=nextSpellAt(c.spellCooldowns[channel],now,(s.fixedHeal?b.healIntervalMs:b.castIntervalMs),silent);}
 if(k==='sk_elf_triple'){c.tripleNeedsNormal=true;delete c.tripleResumeAt;}
 if(k==='sk_shock_stun'||s.darkCrit){c.skillCooldowns||={};c.skillCooldowns[k]=now+(s.darkCrit?30000:6000);}
 if(s.healCooldownTicks||k==='sk_abs_barrier'){c.skillCooldowns||={};c.skillCooldowns[k]=now+(k==='sk_abs_barrier'?(s.dur+12)*1000:s.healCooldownTicks*100);}
 if(c.hp>oldHp)event(c,'heal',now,{skill:k,damage:c.hp-oldHp});if(!silent)log(c,`施放 ${s.n}：${result}`,'magic',now);event(c,'magic',now,{skill:k,effect:result});
}
function statusKey(kind:string){return ({mrhalf:'mrDown',magicseal:'silence',vacuum:'silence',armorbreak:'vulnerable',weaken:'weak',disease:'disease',broken:'broken'} as Record<string,string>)[kind]||kind;}
function applySpellStatus(c:Character,target:Encounter,m:any,status:any,id:string,b:Record<string,number>,now:number,rng:()=>number){
 if(m.boss)return;
 if(status.pct!==undefined&&rng()*100>=status.pct||!status.force&&!abnormalHit(c.lv,b,m,rng,20,(status.hitOff||0)+(status.kind==='stun'?b.stunHit||0:status.kind==='blind'?b.blindHit||0:0)))return;
 const key=statusKey(status.kind),value=key==='poison'?rollDice(...(status.dmg||[1,8]) as [number,number],rng):key==='blind'?status.hit||4:key==='slow'?100:key==='vulnerable'?58:key==='weak'?5:1;
 target.effects||={};target.effects[key]={until:now+(status.dur||6)*1000,value,nextAt:now+(status.tick||3)*1000};event(c,'magic',now,{slot:c.arena!.indexOf(target),uid:target.uid,mob:target.id,skill:id,...(id==='sk_shock_stun'?{effect:'狀態命中'}:{}),targetEffects:structuredClone(target.effects)});return true;
}
function applyLineageWAbsorption(c:Character,target:Encounter,dealt:number,now:number,rng:()=>number){
 const eq=c.equipment.weapon,p=lineageWEffectProfile(DATA.items[eq?.id||''],eq?.en||0);if(!p||dealt<=0)return;
 const b=stats(c,now),slot=c.arena!.indexOf(target);
 if(p.hpAbsorb){const amount=Math.min(Math.max(0,b.maxHp-c.hp),dealt,Math.max(1,Math.floor(dealt*LW_EFFECT_RULES.lifeFraction)));if(amount>0){c.hp+=amount;event(c,'heal',now,{weaponProc:true,skill:'lw_hp_drain',effectName:'HP吸收',slot,uid:target.uid,mob:target.id,damage:amount,effect:`吸收 HP +${amount}`});}}
 if(p.mpAbsorb&&target.hp>0){const missing=Math.max(0,b.maxMp-c.mp),available=Math.max(0,target.mp||0);if(missing&&available){const amount=Math.min(missing,available,LW_EFFECT_RULES.manaMin+Math.floor(rng()*(LW_EFFECT_RULES.manaMax-LW_EFFECT_RULES.manaMin+1)));target.mp=available-amount;c.mp+=amount;event(c,'state',now,{weaponProc:true,skill:'lw_mp_drain',effectName:'MP吸收',slot,casterSlot:slot,uid:target.uid,mob:target.id,monsterMp:target.mp,effect:`吸收 MP +${amount}`});}}
}
function applyLineageWEquipmentProcs(c:Character,target:Encounter,now:number,rng:()=>number){
 const slot=c.arena?.indexOf(target)??-1;if(slot<0||target.hp<=0||(c.arenaTarget||0)!==slot)return;
 const eq=c.equipment.weapon,item=DATA.items[eq?.id||''];
 for(const proc of rollLineageWEquipmentProcs(item,eq?.en||0,rng)){
  if(target.hp<=0||c.arena?.[slot]?.uid!==target.uid)break;
  const m=monsterData(c,target.id,target),def=lineageWEffectDefinition(proc.skill)!;if(def.guard||def.undeadOnly&&!m.un)continue;const damage=lineageWProcDamage(proc.skill,stats(c,now),m,rng);
  if(damage>0)damageMonster(c,damage,now,rng,proc.skill,def.physical?'physical':'magic',undefined,undefined,undefined,true);
  else event(c,'magic',now,{weaponProc:true,skill:proc.skill,effectName:def.name,slot,uid:target.uid,mob:target.id});
  if(def.drain&&damage>0){const amount=Math.min(Math.max(0,stats(c,now).maxHp-c.hp),Math.floor(c.lastHit*def.drain));if(amount>0){c.hp+=amount;event(c,'heal',now,{weaponProc:true,slot,uid:target.uid,mob:target.id,skill:proc.skill,damage:amount,effectName:def.name});}}
  if(target.hp>0){
   if(def.status&&!m.boss&&!m['imm'+def.status[0].toUpperCase()+def.status.slice(1)]&&!(def.status==='slow'&&m.immSlow)){target.effects||={};const old=target.effects[def.status];target.effects[def.status]={until:Math.max(old?.until||0,now+(def.seconds||3)*1000),value:Math.max(old?.until!>now?old.value:0,def.value||1)};}
   if(proc.skill==='lw_ice_cone'&&!m.boss&&!m.immSlow){target.effects||={};const old=target.effects.slow,active=(old?.until||0)>now;target.effects.slow={until:Math.max(active?old.until:0,now+LW_EFFECT_RULES.iceSeconds*1000),value:Math.max(active?old.value:0,LW_EFFECT_RULES.iceSlowPct)};}
   if(proc.skill==='lw_venom_burst'&&!m.boss&&!m.immPoison&&!m.poisonImmune){target.effects||={};const old=target.effects.poison,active=(old?.until||0)>now;target.effects.poison={until:Math.max(active?old.until:0,now+LW_EFFECT_RULES.venomSeconds*1000),value:Math.max(active?old.value:0,LW_EFFECT_RULES.venomTickDamage),tickMs:LW_EFFECT_RULES.venomTickMs,nextAt:active&&old.nextAt?old.nextAt:now+LW_EFFECT_RULES.venomTickMs};}
   const attack=c.events?.findLast(e=>e.weaponProc&&e.skill===proc.skill&&e.uid===target.uid&&e.at===now&&e.kind!=='heal');if(attack&&target.effects)attack.targetEffects=structuredClone(target.effects);
  }
 }
}
function absorbMythicMana(c:Character,target:Encounter,now:number,rng:()=>number){
 const item=DATA.items[c.equipment.weapon?.id||''];if(!item?.lwMythicId||lineageWProfile(item,c.equipment.weapon?.en||0)?.kind!=='staff'||!target.mp)return;
 const missing=Math.max(0,stats(c,now).maxMp-c.mp);if(!missing)return;
 const amount=Math.min(target.mp,missing,1+Math.floor(rng()*5));target.mp-=amount;c.mp+=amount;
 const slot=c.arena!.indexOf(target);event(c,'state',now,{casterSlot:slot,uid:target.uid,mob:target.id,monsterMp:target.mp,effect:`吸收 MP +${amount}`});
}
function applyMythicWeaponProcs(c:Character,target:Encounter,now:number,rng:()=>number,spell=false){
 const slot=c.arena?.indexOf(target)??-1;if(slot<0||target.hp<=0||(c.arenaTarget||0)!==slot)return;
 const equipped=c.equipment.weapon,item=DATA.items[equipped?.id||''];if(spell&&lineageWProfile(item,equipped?.en||0)?.kind!=='staff')return;
 const procs=rollMythicProcs(item,equipped?.en||0,rng);
 for(const proc of procs){
  if(target.hp<=0||c.arena?.[slot]?.uid!==target.uid)break;
  const definition=mythicProcDefinition(proc.skill)!;
  if(proc.skill==='lw_dispel_barrier'&&!mythicCancelHit(!!monsterData(c,target.id,target).immCancel,stats(c,now).cancelImmuneBypass||0,rng))continue;
  if(proc.skill==='lw_holy_magic'){for(const key of MYTHIC_CLEANSE_KEYS)delete c.buffs[key];event(c,'magic',now,{weaponProc:true,skill:proc.skill,effectName:definition.name,effect:'聖潔魔法 · 解除中毒、緩速、失明與沉默'});}
  else if(applyMythicState(proc.skill,target,now))event(c,'magic',now,{weaponProc:true,slot,uid:target.uid,mob:target.id,skill:proc.skill,effectName:definition.name,effect:proc.skill==='lw_reveal'?'揭露 · 5 秒 · 防禦弱化 10':'消除聖結界 · 3 秒內無法重新施放',targetEffects:structuredClone(target.effects)});
  else {const mob=monsterData(c,target.id,target),lightning=proc.skill==='lw_lightning_assault',damage=lightning?mythicLightningDamage(item,equipped?.en||0,stats(c,now),mob,rng):mythicAssaultDamage(item,equipped?.en||0,stats(c,now),mob,rng);damageMonster(c,damage*(lightning?1:mob.dmgTakenMult||1),now,rng,proc.skill,lightning?'magic':'physical',undefined,undefined,undefined,true);}
 }
}
function applyWeaponMagic(c:Character,now:number,rng:()=>number,lockedTarget?:Encounter){if(lockedTarget){if(lockedTarget.hp<=0||c.arena?.[c.arenaTarget||0]!==lockedTarget)return;}const magic=triggeredWeaponMagic(c,rng);if(!magic)return;syncTarget(c);if(!c.mob)return;const s=magic.definition,b=stats(c,now),saved=c.arenaTarget||0;event(c,'magic',now,{weaponProc:true,slot:saved,uid:c.arena![saved].uid,mob:c.mob,skill:magic.skill,effectName:s.n,effect:'武器附加魔法 · 不消耗 MP'});if(s.type==='buff'){c.buffs[magic.skill]={until:now+(s.dur||60)*1000,d:s.moveSpeedMult?{moveSpeedMult:s.moveSpeedMult}:{...(s.d||{})}};return;}const targets=!lockedTarget&&s.target==='all'?c.arena!.map((m,slot)=>({m,slot})).filter(x=>x.m.hp>0):[{m:c.arena![saved],slot:saved}];for(const {m:target,slot}of targets){if(target.hp<=0)continue;c.arenaTarget=slot;syncTarget(c);const m=monsterData(c,target.id,target);if(s.status){const status=s.status;if(rng()*100>=Math.max(5,Math.min(95,(status.pbase||100)+b.int-(m.mr||0))))continue;target.effects||={};const value=status.kind==='poison'?diceWeaponPoison(status.dmg||[1,8],rng):50;target.effects[status.kind]={until:now+status.dur*1000,value,nextAt:now+(status.tick||3)*1000};event(c,'magic',now,{weaponProc:true,slot,uid:target.uid,mob:target.id,skill:magic.skill,targetEffects:structuredClone(target.effects)});}else damageMonster(c,weaponMagicDamage(s,b,m,rng),now,rng,magic.skill,'magic',undefined,undefined,undefined,true);}c.arenaTarget=saved;syncTarget(c);}
function diceWeaponPoison(d:number[],rng:()=>number){let n=0;for(let j=0;j<d[0];j++)n+=1+Math.floor(rng()*d[1]);return n;}
function applyDollAttack(c:Character,now:number,rng:()=>number,lockedTarget?:Encounter){if(lockedTarget&&(lockedTarget.hp<=0||c.arena?.[c.arenaTarget||0]!==lockedTarget))return;syncTarget(c);if(!c.mob)return;const target=c.arena![c.arenaTarget||0];const effects=dollAttackEffects(c,stats(c,now),monsterData(c,target.id,target),rng);for(const fx of effects){if(lockedTarget&&(lockedTarget.hp<=0||c.arena?.[c.arenaTarget||0]!==lockedTarget))break;syncTarget(c);if(!c.mob)break;const live=c.arena![c.arenaTarget||0];if(fx.poison){live.effects||={};const old=live.effects.poison;live.effects.poison={until:Math.max(old?.until||0,now+10000),value:Math.max(old?.value||0,fx.poison),nextAt:old?.nextAt||now+3000};event(c,'magic',now,{source:'doll',dollKind:'attack',slot:c.arenaTarget||0,uid:live.uid,mob:live.id,skill:'sk_poison_curse',effectName:'毒咒',effect:'娃娃施毒 · 10 秒',targetEffects:structuredClone(live.effects)});}else if(fx.damage){if(fx.skill)event(c,'magic',now,{source:'doll',dollKind:'attack',slot:c.arenaTarget||0,uid:live.uid,mob:live.id,skill:fx.skill,effectName:fx.name,effect:'娃娃觸發 · 不消耗 MP'});damageMonster(c,fx.damage,now,rng,fx.skill,'doll');}}}
function damageMonster(c:Character,raw:number,now:number,rng:()=>number,skill?:string,source:CombatEvent['source']='physical',pet?:string,summonUid?:string,petUid?:string,weaponProc=false){const slot=c.arenaTarget||0,target=c.arena?.[slot];if(!target||!Number.isFinite(target.hp)||target.hp<=0)return;const controlled=Object.entries(target.effects||{}).some(([k,v])=>['stun','freeze','sleep','stone','paralyze','blind','disease','weak','slow','poison','silence'].includes(k)&&v.until>now),barrier=(target.effects?.holyBarrier?.until||target.effects?.sk_holy_barrier?.until||0)>now,modifiers=controlled||barrier?stats(c,now):{};const computed=monsterBarrierDamage(target,raw,now,modifiers.ignoreDamageReductionPct||0)*(controlled?1+(modifiers.statusDamagePct||0)/100:1)*(target.effects?.vulnerable?.until!>now?1+target.effects!.vulnerable.value/100:1);const damage=Math.min(target.hp,Math.max(0,Number.isFinite(computed)?Math.floor(computed):0));recordBossDamage(c,target,damage,source,now);if(damage&&skill!=='sk_poison_curse'&&target.effects?.sleep)delete target.effects.sleep;target.hp-=damage;c.mobHp=target.hp;c.lastHit=damage;event(c,'attack',now,{slot,uid:target.uid,mob:target.id,damage,mobHp:target.hp,skill,source,pet,summonUid,petUid,weaponProc,effectName:mythicProcDefinition(skill)?.name||lineageWEffectDefinition(skill)?.name});log(c,`${pet?`${pet} 攻擊`:skill?DATA.skills[skill]?.n:'攻擊'} ${monsterData(c,target.id,target).n} −${damage}`,'attack',now);if(target.hp===0)award(c,target.id,rng,now);}
function defeat(c:Character,now:number,rng:()=>number){if(c.lastDeathAt===now)return;c.lastDeathAt=now;c.atkClock=0;c.mobClock=0;delete c.previousAttackInterval;delete c.healingOverTime;clearDragonSummons(c);resetBossParticipation(c);c.deaths++;c.running=false;c.hp=Math.max(1,Math.round(stats(c,now).maxHp*.25));c.zone='town_silver_knight';petMaintenance(c,now);delete c.summons;delete c.summonContract;for(const id of Object.keys(c.buffs))if(id.startsWith('status_')||c.buffs[id].d.summon)delete c.buffs[id];delete c.population;delete c.targetSlot;log(c,'你被擊敗，已返回銀騎士村。停止狩獵。','death',now);ensureArena(c,rng,now);event(c,'state',now);}
function tickHealingOverTime(c:Character,now:number){
 const hot=c.healingOverTime;if(hot){while(hot.remaining>0&&hot.nextAt<=now){const at=hot.nextAt,before=c.hp;dragonHealing(c,Math.min(hot.amount,Math.max(0,stats(c,at).maxHp-c.hp)),at,'hot');if(c.hp>before)event(c,'heal',at,{skill:hot.skill,damage:c.hp-before});hot.remaining--;hot.nextAt+=3000;}if(!hot.remaining)delete c.healingOverTime;}
}
function tickSpecialCombat(c:Character,begin:number,now:number,rng:()=>number){
 const stormTarget=c.arenaTarget||0;for(const [id,buff]of Object.entries(c.buffs)){const sk=DATA.skills[id];if(!sk?.stormInterval||buff.until<=now)continue;c.stormClocks||={};let at=c.stormClocks[id]??begin+sk.stormInterval*100;while(at<=now&&at<buff.until){for(let slot=0;slot<(c.arena?.length||0);slot++){const target=c.arena![slot];if(target.hp<=0)continue;c.arenaTarget=slot;syncTarget(c);const m=monsterData(c,target.id,target);damageMonster(c,spellDamage(sk,stats(c,at),lineageWMagicTarget(DATA.items[c.equipment.weapon?.id||''],c.equipment.weapon?.en||0,m),rng,c.cls),at,rng,id,'magic');if(id==='sk_blizzard_storm'&&target.hp>0)applySpellStatus(c,target,m,{kind:'freeze',dur:6,hitOff:sk.freezeHitOff},id,stats(c,at),at,rng);}at+=sk.stormInterval*100;}c.stormClocks[id]=at;}c.arenaTarget=stormTarget;syncTarget(c);
 const originalTarget=c.arenaTarget||0;if(Math.floor(now/3000)>Math.floor(begin/3000)&&c.buffs.status_poison?.until>now&&!(c.buffs.sk_abs_barrier?.until>now)&&!stats(c,now).immPoison){const damage=Math.min(c.hp,Math.max(1,Math.floor((c.buffs.status_poison.d.poison||5)*(1-(stats(c,now).poisonReductionPct||0)/100))));c.hp-=damage;event(c,'hurt',now,{damage});if(c.hp<=0){defeat(c,now,rng);return;}}
 for(let slot=0;slot<(c.arena?.length||0);slot++){const m=c.arena![slot],poison=m.effects?.poison;
  if(poison?.tickMs&&poison.nextAt){while(m.hp>0&&poison.nextAt<=now&&poison.nextAt<=poison.until){const at=poison.nextAt;poison.nextAt+=poison.tickMs;c.arenaTarget=slot;syncTarget(c);damageMonster(c,poison.value,at,rng,'sk_poison_curse','poison');if(!c.running)return;}}
  else if(m.hp>0&&poison?.until!>now&&(poison!.nextAt?now>=poison!.nextAt:Math.floor(now/3000)>Math.floor(begin/3000))){if(poison!.nextAt)poison!.nextAt=now+3000;c.arenaTarget=slot;syncTarget(c);damageMonster(c,poison!.value,now,rng,'sk_poison_curse','poison');if(!c.running)return;}
 }
 c.arenaTarget=originalTarget;syncTarget(c);const summon=c.summons;if(summon&&summon.until>now&&c.buffs[summon.skill]?.until>now&&now-summon.lastAt>=2000){summon.lastAt=now;syncTarget(c);if(c.mob)damageMonster(c,summon.damage*summon.count,now,rng,summon.skill,'summon');}
 syncTarget(c);
}
function recoverArena(c:Character,now:number){for(let slot=0;slot<(c.arena?.length||0);slot++){const m=c.arena![slot],hp=m.hp,mp=m.mp;recoverMonster(m,now);if(m.hp!==hp||m.mp!==mp)event(c,'state',now,{casterSlot:slot,uid:m.uid,mob:m.id,mobHp:m.hp,monsterMp:m.mp});}}

export function petSnapshot(c:Character,now:number):PetSnapshot[]{return petNamesOut(c).map(form=>{const p=ensurePet(c,form,now),d=petStats(c,form,p);return {uid:`pet-${c.id}-${form}`,form,lv:p.lv,hp:p.hp!,mp:p.mp!,maxHp:p.maxHp!,maxMp:p.maxMp!+d.mmpBonus,deadAt:p.deadAt};});}
function petAttack(c:Character,name:string,now:number,rng:()=>number,magic=false){const p=ensurePet(c,name,now),d=petStats(c,name,p),uid=`pet-${c.id}-${name}`;if(p.hp!<=0||p.actionUntil!>now||['stun','freeze','sleep'].some(k=>p.effects?.[k]?.until!>now))return;syncTarget(c);if(!c.mob)return;const slot=c.arenaTarget||0,target=c.arena![slot],m=monsterData(c,target.id,target),cha=Math.floor(stats(c,now).cha*.1);let skill:any;if(magic){skill=petSkill(c,name,now,rng);if(!skill)return;}
 const effectName=skill?.n;const key=skill?.n?.includes('寒冷戰慄')?'sk_cold_shiver':skill?.ele==='fire'?'sk_fireball':skill?.ele==='water'?'sk_ice_spike':skill?.ele==='earth'?'sk_earthquake':skill?.ele==='wind'?'sk_windblade':'sk_lightarrow';if(skill)event(c,'magic',now,{source:'pet',petName:name,petUid:uid,skill:key,effectName,slot,uid:target.uid,mob:target.id});
 if(!skill||skill.kind==='extra'){const hit=summonHit(p.lv+d.hit+cha-m.lv+m.ac,rng),roll=summonRoll(1,20,rng),heavy=skill?.crit||roll===20,miss=!heavy&&(roll===1||hit<roll);if(miss){event(c,'attack',now,{slot,uid:target.uid,mob:target.id,mobHp:target.hp,damage:0,miss:true,source:'pet',pet:name,petUid:uid});return;}const raw=(heavy?d.dice:summonRoll(1,d.dice,rng))+d.flat+cha+(skill?.add||0)-Math.floor((m.dr||0)*(1-d.drPierce)),damage=Math.max(1,Math.floor(Math.max(1,raw)*d.damageMult*d.attackMult));if(!skill)p.actionUntil=now+300;damageMonster(c,damage,now,rng,undefined,'pet',name,undefined,uid);return;}
 if(skill.kind==='selfbuff'){p.effects||={};p.effects.harden={until:now+(skill.dur||6)*1000,value:(skill.dr||10)+Math.floor(p.lv/10)};return;}
 const targets=skill.aoe?c.arena!.map((m,slot)=>({m,slot})).filter(x=>x.m.hp>0):[{m:target,slot}];for(const x of targets){if(x.m.hp<=0)continue;const mob=monsterData(c,x.m.id,x.m);c.arenaTarget=x.slot;syncTarget(c);x.m.effects||={};if(skill.kind==='debuff'){if(rng()*100<(skill.acc||50)){const kind=skill.debuff==='weaken'?'weak':skill.debuff;x.m.effects[kind]={until:now+10000,value:kind==='slow'?50:kind==='weak'?20:4};event(c,'magic',now,{source:'pet',petName:name,petUid:uid,skill:kind==='slow'?'sk_slow':'sk_weaken',effectName,slot:x.slot,uid:x.m.uid,mob:x.m.id,targetEffects:structuredClone(x.m.effects)});}continue;}if(skill.kind==='dot'){x.m.effects.poison={until:now+(skill.dur||6)*1000,value:Math.max(1,Math.floor((skill.dps||10)*(1+p.lv/10))),nextAt:now+1000};continue;}const counter=({fire:'earth',water:'fire',wind:'water',earth:'wind'} as Record<string,string>)[skill.ele]===mob.e?1.4:({fire:'earth',water:'fire',wind:'water',earth:'wind'} as Record<string,string>)[mob.e]===skill.ele?.6:1,base=resistanceDamage(summonRoll(skill.d[0],skill.d[1],rng)+d.skillFlat,mob.mr||0)*counter,damage=Math.max(1,Math.floor(Math.max(1,base-(mob.dr||0))*d.damageMult*d.magicMult));event(c,'magic',now,{source:'pet',petName:name,petUid:uid,skill:key,effectName,slot:x.slot,uid:x.m.uid,mob:x.m.id});damageMonster(c,damage,now,rng,key,'pet',name,undefined,uid);if(skill.drainHalf)p.hp=Math.min(p.maxHp!,p.hp!+Math.floor(damage/2));if(skill.freezeCh&&x.m.hp>0&&!mob.boss&&rng()*100<skill.freezeCh)x.m.effects.stun={until:now+4000,value:1};}c.arenaTarget=slot;syncTarget(c);}
function monsterHitsPet(c:Character,m:any,target:Encounter,now:number,rng:()=>number,magic?:any){const pets=petNamesOut(c).filter(n=>ensurePet(c,n,now).hp!>0),weights=pets.map(n=>PET_BOOK[n].kind==='phys'?4:PET_BOOK[n].kind==='spec'?3:2),total=weights.reduce((a,b)=>a+b,0),summons=c.summonContract?.entities.filter(e=>e.hp>0).length||0;let pick=rng()*(1+total+summons*4);if(pick>=total)return false;let index=0;while(pick>=weights[index])pick-=weights[index++];const name=pets[index],p=ensurePet(c,name,now),uid=`pet-${c.id}-${name}`;let result={damage:0,miss:false};if(!magic||magic.dmg)result=petTakeHit(c,name,m,now,rng,magic);else{const kind=magic.type==='magicseal'?'silence':magic.type==='frost_breath'?'freeze':magic.type==='paralyze'||magic.type==='stone'?'stun':magic.type;p.effects||={};if(kind==='poison')p.effects.poison={until:now+(magic.dur||6)*1000,value:magic.d||5,nextAt:now+3000};if(['slow','stun','freeze','sleep','silence'].includes(kind)&&rng()*100<Math.max(0,(magic.pbase||100)-petStats(c,name,p).mr))p.effects[kind]={until:now+(magic.dur||6)*1000,value:1};}if(magic?.vamp)target.hp=Math.min(target.maxHp||m.hp,target.hp+int(magic.vamp[0],magic.vamp[1],rng));event(c,'state',now,{motion:magic?'skill':'attack',mobHp:target.hp,source:'monster',petUid:uid,petName:name,damage:result.damage,miss:result.miss,casterSlot:c.arena!.indexOf(target),uid:target.uid,mob:target.id});if(p.hp!<=0)log(c,`${name} 倒下；5秒後可消耗復活卷軸重返戰鬥`,'pet',now);return true;}

function summonMaintenance(c:Character,now:number,rng:()=>number){
 const old=c.summons;if(old?.skill==='sk_summon'){delete c.summons;if(old.until>now){try{const contract=buildSummons(c,stats(c,now),now);contract.until=old.until;c.summonContract=contract;}catch{delete c.buffs.sk_summon;}}}
 const x=c.summonContract;if(!x)return;
 if(x.until<=now||c.buffs.sk_summon?.until<=now)x.entities=[];
 x.entities=x.entities.filter(e=>e.hp>0||now-(e.diedAt||0)<2200);
 if(c.running&&x.auto&&!x.entities.some(e=>e.hp>0)&&now>=x.retryAt&&!DATA.towns[c.zone]){x.retryAt=now+2000;try{cast(c,'sk_summon',now,rng,true);}catch{}}
}
function summonAttack(c:Character,s:SummonEntity,now:number,rng:()=>number){
 if(s.hp<=0||!c.summonContract||c.summonContract.until<=now)return;syncTarget(c);if(!c.mob)return;const slot=c.arenaTarget||0,target=c.arena![slot],m=monsterData(c,target.id,target),b=stats(c,now),hit=summonPhysical(c,s,b,m,rng);event(c,'state',now,{summonUid:s.uid,summonName:s.form,source:'summon'});
 if(hit.miss){event(c,'attack',now,{slot,uid:target.uid,mob:target.id,mobHp:target.hp,damage:0,miss:true,source:'summon',summonUid:s.uid,summonName:s.form});return;}
 damageMonster(c,hit.damage,now,rng,undefined,'summon',s.form,s.uid);if(target.hp<=0)return;
 const entry=summonEntry(s.form)!,d=summonNumbers(c,s.form,b);
 for(const proc of ('proc' in entry.mob?entry.mob.proc:[])||[]){if(rng()>=proc.p)continue;const all=proc.kind.endsWith('All'),targets=all?c.arena!.map((m,slot)=>({m,slot})).filter(x=>x.m.hp>0):[{m:target,slot}];
 for(const x of targets){if(x.m.hp<=0)continue;const mob=monsterData(c,x.m.id,x.m);c.arenaTarget=x.slot;syncTarget(c);
 if(proc.kind.startsWith('poison')){x.m.effects||={};x.m.effects.poison={until:now+15000,value:Math.max(1,Math.floor(d.skillPower/2)),nextAt:now+3000};event(c,'magic',now,{slot:x.slot,uid:x.m.uid,mob:x.m.id,source:'summon',summonUid:s.uid,summonName:s.form,skill:'sk_poison_curse',effectName:proc.name,targetEffects:structuredClone(x.m.effects)});}
 else{const ele=String(('ele' in proc&&proc.ele)||'none'),counter=({fire:'earth',water:'fire',wind:'water',earth:'wind'} as Record<string,string>)[ele]===mob.e?1.5:1,base=(summonRoll(2,Math.max(2,Math.ceil(s.lv*.6)),rng)+d.skillPower)*d.mult*Number(('heavy' in proc&&proc.heavy)||1),mr=Math.max(0,(mob.mr||0)-(x.m.effects?.mrDown?.until!>now?x.m.effects!.mrDown.value:0)),damage=Math.max(1,Math.floor(resistanceDamage(base,mr)*counter));
 const key=ele==='fire'?'sk_fireball':ele==='water'?'sk_ice_lance':ele==='earth'?'sk_earthquake':'sk_lightarrow';event(c,'magic',now,{slot:x.slot,uid:x.m.uid,mob:x.m.id,source:'summon',summonUid:s.uid,summonName:s.form,skill:key,effectName:proc.name});damageMonster(c,damage,now,rng,key,'summon',s.form,s.uid);
 if(x.m.hp>0&&rng()*100<Math.max(0,(100-(mob.mr||0))/2)){x.m.effects||={};if('slow' in proc&&proc.slow)x.m.effects.slow={until:now+8000,value:50};if('stun' in proc&&proc.stun)x.m.effects.stun={until:now+3000,value:1};}
 }
 }
 c.arenaTarget=slot;syncTarget(c);
 }
}
function monsterHitsSummon(c:Character,m:any,target:Encounter,now:number,rng:()=>number,magic?:any){const entities=c.summonContract?.entities.filter(s=>s.hp>0)||[];if(!entities.length)return false;const pick=Math.floor(rng()*(1+entities.length*4));if(!pick)return false;const s=entities[Math.min(entities.length-1,Math.floor((pick-1)/4))],d=summonNumbers(c,s.form,stats(c,now));let damage=0,miss=false;
 if(magic?.dmg){damage=Math.max(1,Math.floor(monsterMagicRoll(magic,m,rng))-d.dr);}else{const r=summonRoll(1,20,rng),hv=summonHit(m.lv+(m.hit||0)-s.lv+d.ac-(target.effects?.blind?.until!>now?target.effects!.blind.value:0),rng);miss=r===1||(r!==20&&hv<r);if(!miss)damage=Math.max(1,monsterRoll(m,rng,r===20)-d.dr);}
 if(magic?.vamp)target.hp=Math.min(target.maxHp||m.hp,target.hp+int(magic.vamp[0],magic.vamp[1],rng));damage=Math.max(0,Math.floor(damage*(target.effects?.weak?.until!>now?1-target.effects!.weak.value/100:1)));damage=Math.min(s.hp,damage);s.hp-=damage;if(s.hp<=0){s.diedAt=now;if(c.summonContract&&!c.summonContract.entities.some(e=>e.hp>0))c.summonContract.retryAt=now+2000;log(c,`${s.form} 倒下消散了`,'magic',now);}event(c,'state',now,{motion:magic?'skill':'attack',source:'monster',summonUid:s.uid,summonName:s.form,damage,miss,casterSlot:c.arena!.indexOf(target),uid:target.uid,mob:target.id});log(c,`${m.n}${magic?' 魔法':' 攻擊'} ${s.form}${miss?'：未命中':` −${damage}`}`,'summon',now);return true;}


function clearDragonSummons(c:Character){for(const m of c.arena||[])if(m.summonedBy)m.hp=0;}
function expireDragonSummons(c:Character,now:number){for(let slot=0;slot<(c.arena?.length||0);slot++){const m=c.arena![slot];if(m.hp>0&&m.expiresAt!==undefined&&m.expiresAt<=now){m.hp=0;event(c,'state',now,{casterSlot:slot,uid:m.uid,mob:m.id,mobHp:0});}}}
function emitLineageWProtection(c:Character,hit:ReturnType<typeof lineageWIncomingDamage>,now:number){
 if(hit.guarded&&!hit.mythicEvents?.some(p=>p.skill==='lw_hl_mythic_guard'))event(c,'magic',now,{weaponProc:true,skill:'lw_hl_guard',effectName:'傷害減免',effect:'本次傷害減半'});
 for(const proc of hit.mythicEvents||[])event(c,proc.heal?'heal':'magic',now,{weaponProc:true,skill:proc.skill,effectName:lineageWEffectDefinition(proc.skill)?.name,damage:proc.heal||undefined,effect:proc.effect});
}
function dragonHealing(c:Character,gain:number,now:number,origin:'potion'|'skill'|'hot'){
 const polluted=c.buffs.status_pollutedWater?.until>now ? .5 : 1;
 const erosion=waterErosionActive(c.buffs[origin==='potion'?'status_potionErosion':'status_healingErosion'],now);
 const b=stats(c,now),boosted=origin==='potion'?gain:mythicHealing(gain,b,origin==='hot'),amount=erosion?Math.max(0,Math.floor(boosted*polluted)):Math.min(Math.max(0,b.maxHp-c.hp),Math.max(0,Math.floor(boosted*polluted)));
 if(erosion){c.hp=Math.max(0,c.hp-amount);event(c,'hurt',now,{damage:amount,source:'magic'});log(c,'侵蝕效果使治療轉為傷害','magic',now);if(c.hp<=0)defeat(c,now,Math.random);}else c.hp+=amount;
}
function dragonTurn(c:Character,target:Encounter,m:any,slot:number,now:number,rng:()=>number){
 const memory=target.dragonState||=(dragonMemory()),others=(c.arena||[]).filter(x=>x.uid!==target.uid&&x.hp>0),companionHp=others.length?Math.min(...others.map(x=>x.hp/(x.maxHp||1)*100)):undefined;
 const selected=chooseDragonSkill(m.dragon381,memory,target.hp/(target.maxHp||m.hp)*100,target.mp||0,now,rng,{companionHp,distance:1});
 // Unavailable or failed source skills fall back to the NPC's normal physical attack.
 const choice:DragonChoice=selected||{row:{actNo:'basic',Leverage:'10',SkillId:'0',SummonId:'0',SummonMin:'0',SummonMax:'0'},type:1,physical:true,name:'普通攻擊',gfx:0,action:1,element:m.e};
 if(!choice)return;
 const cost=Number(choice.skill?.mpConsume||0);target.mp=Math.max(0,(target.mp||0)-cost);
 const effect=dragonEffectGfx(choice),duration=Math.max(450,Math.min(1800,Number(choice.physical?m.atkSpd*1000:1800)));
 event(c,choice.physical&&!effect?'state':'magic',now,{source:'monster',motion:choice.physical?'attack':'skill',casterSlot:slot,uid:target.uid,mob:target.id,monsterMp:target.mp,effectName:choice.name,dragonAction:choice.action,dragonGfx:m.sourceGfx,dragonEffect:effect,dragonSkill:Number(choice.row.SkillId)||0,dragonNpc:m.dragon381,dragonDuration:duration,slot:choice.type===3?slot:undefined});
 log(c,`${m.n} ${choice.name}`,'magic',now);
 const summonId=Number(choice.row.SummonId)||0;
 if(choice.type===3&&summonId){
  const id=dragonMobId(summonId),data=DATA.mobs[id];if(!data)return;
  const wanted=int(Math.max(1,Number(choice.row.SummonMin)),Math.max(1,Number(choice.row.SummonMax)),rng);
  for(let n=0;n<Math.min(5,wanted);n++){
   let free=c.arena!.findIndex(x=>x.hp<=0&&!!x.summonedBy);if(free<0){if(c.arena!.length>=6)break;free=c.arena!.length;}
   const actor=createEncounter(c,id,now);actor.summonedBy=target.uid;actor.expiresAt=now+60000;c.arena![free]=actor;event(c,'spawn',now,{slot:free,spawn:{...actor},uid:actor.uid,mob:id});
  }return;
 }
 if([15,16].includes(choice.type)){
  const objectGfx=dragonGfx(summonId);if(objectGfx)event(c,'magic',now,{source:'monster',casterSlot:slot,uid:target.uid,mob:target.id,effectName:choice.name,dragonGfx:m.sourceGfx,dragonEffect:objectGfx,dragonAction:choice.action,dragonDuration:1800});
  if(choice.type===15&&!dollResistance(c,'poison',rng,now)&&!stats(c,now).immPoison)c.buffs.status_poison={until:now+Math.min(30,Number(choice.row.Leverage)||10)*1000,d:{poison:Math.max(5,Math.floor(m.lv/3))}};
  return;
 }
 const b=lineageWDefenseStats(stats(c,now),m);let damage=0,hit=true;if(c.buffs.sk_abs_barrier?.until>now||choice.physical&&c.buffs.sk_elf_earthshield?.until>now)return;
 if(choice.physical&&(b.invisible&&!m.seeInsight||monsterHitsPet(c,m,target,now,rng)||monsterHitsSummon(c,m,target,now,rng)))return;
 if(choice.physical){const strike=monsterStrike(m,c.lv,b.ac,b.er,b.dr,rng,0,b[m.ranged?'ignoreRangedCrit':'ignoreMeleeCrit']||0);hit=!strike.miss;damage=Math.max(0,Math.floor(strike.damage*Math.max(.1,Number(choice.row.Leverage||10)/10))-physicalArmorReduction(c.cls,b.ac,rng));}
 else if(choice.type===2){
  const raw=dragonDamage(choice,(a,z)=>int(a,z,rng)),key='res'+choice.element[0].toUpperCase()+choice.element.slice(1);
  damage=Math.max(0,resistanceDamage(raw,b.mr,b[key]||0,choice.element==='none'?b.magicDrNonEle:0)-b.dr);
  const barrier=Object.keys(c.buffs).find(k=>c.buffs[k].until>now&&c.buffs[k].d.magicBarrier);if(barrier){delete c.buffs[barrier];damage=0;hit=false;c.magicBarrierCooldown=now+3000;}
 }
 if(choice.physical&&hit){const barrier=Object.keys(c.buffs).find(k=>c.buffs[k].until>now&&c.buffs[k].d.magicBarrier);if(barrier){delete c.buffs[barrier];damage=0;hit=false;c.magicBarrierCooldown=now+3000;}}
 if(choice.physical&&hit&&c.buffs.sk_dark_stealth?.until>now){delete c.buffs.sk_dark_stealth;c.skillCooldowns||={};c.skillCooldowns.sk_dark_stealth=now+5000;damage=0;hit=false;}if(choice.physical&&hit&&c.buffs.sk_dark_dodge?.until>now&&rng()<.2){damage=0;hit=false;}if(!choice.physical&&damage>0&&c.buffs.sk_elf_mirror?.until>now&&rng()*100<b.wis){const old=c.arenaTarget;c.arenaTarget=slot;syncTarget(c);damageMonster(c,damage,now,rng,'sk_elf_mirror','magic');c.arenaTarget=old;syncTarget(c);damage=0;}
 const control=dragonControl(choice.type);const status=(key:string,d:Record<string,number>,seconds=12)=>{c.buffs['status_'+key]={until:now+seconds*1000,d};};
 if(control==='cancel'){for(const key of Object.keys(c.buffs))if(!key.startsWith('status_'))delete c.buffs[key];}
 if(control==='stun'&&!b.immStone&&!dollResistance(c,'stun',rng,now))status('stun',{stun:1},int(2,5,rng));
 if(control==='silence'&&!dollResistance(c,'silence',rng,now))status('silence',{silence:1},16);
 if((control==='slow'||control==='windShackle')&&!dollResistance(c,'slow',rng,now))status(control,{atkSpdPct:-25},16);
 if(control==='weaponBreak')status('weaponBreak',{meleeDmg:-10,rangedDmg:-10},16);
 if(control==='potionErosion'||control==='healingErosion')applyWaterErosion(c,b,control==='potionErosion'?'I':'II',now);
 if(control==='pollutedWater'||control==='potionSeal')status(control,{[control]:1},control==='potionSeal'?16:12);
 if(!damage)return;
 if(!choice.physical)damage=mythicMonsterMagicDamage(damage,b,m,rng);
 const reduced=Math.max(0,Math.floor(damage*(1-clamp(b.damageReductionPct,0,100)/100))),final=dollDamageReduction(c,reduced,rng);
 if(!choice.physical&&monsterHitsPet(c,m,target,now,rng,{dmg:[final,final],damageMode:'range',skn:choice.name,ele:choice.element}))return;
 if(!choice.physical&&monsterHitsSummon(c,m,target,now,rng,{dmg:[final,final],damageMode:'range',skn:choice.name}))return;
 const protectedHit=lineageWIncomingDamage(c,b,final,now,rng,!choice.physical,m);emitLineageWProtection(c,protectedHit,now);if(protectedHit.absorbed)event(c,'state',now,{effect:`保護盾吸收 ${protectedHit.absorbed}`});if(protectedHit.evaded)hit=false;damage=Math.min(c.hp,protectedHit.damage);c.hp-=damage;c.lastTaken=damage;event(c,'hurt',now,{slot,uid:target.uid,mob:target.id,damage,miss:!hit});
 if(c.hp<=0)defeat(c,now,rng);
}

function dollResistance(c:Character,kind:string,rng:()=>number,at:number){const resisted=equipmentResistsStatus(stats(c,at),kind,rng);if(resisted)event(c,'magic',at,{...(c.doll&&dollDefinition(c)?.enabled?{source:'doll' as const,dollKind:'guard' as const}:{}),effectName:'異常抵抗',effect:'裝備／增益／娃娃抵抗異常狀態'});return resisted;}
function autoCastSpells(c:Character,cfg:AutoConfig,now:number,rng:()=>number){
 if(!c.running||c.hp<=0||['stun','freeze','stone','silence'].some(k=>c.buffs['status_'+k]?.until>now))return;
 const attackReady=spellReady(c.spellCooldowns,'attack',now),healReady=!!cfg.heal&&spellReady(c.spellCooldowns,'heal',now),convertReady=!!cfg.convert&&spellReady(c.spellCooldowns,'convert',now);
 if(!healReady&&!convertReady&&(!(cfg.attack||cfg.opener)||!attackReady))return;
 const b=stats(c,now),tryCast=(id:string)=>{if(id==='sk_elf_triple'&&(c.tripleNeedsNormal||(c.tripleResumeAt||0)>now))return false;try{cast(c,id,now,rng,true);return true;}catch{return false;}};
 // Restore HP and MP independently before checking the offensive threshold.
 if(healReady&&c.hp/b.maxHp*100<=cfg.healBelow)tryCast(cfg.heal);
 if(convertReady&&!DATA.towns[c.zone]&&c.hp/b.maxHp*100>cfg.convertHpAbove&&c.mp/Math.max(1,b.maxMp)*100<cfg.convertMpBelow)tryCast(cfg.convert);
 syncTarget(c);if(!c.mob||!spellReady(c.spellCooldowns,'attack',now))return;
 const uid=c.arena![c.arenaTarget||0].uid;
 if(c.openedUid!==uid){c.openedUid=uid;if(cfg.opener&&c.mp/Math.max(1,b.maxMp)*100>=cfg.openerMpAbove&&tryCast(cfg.opener))return;}
 if(cfg.attack&&c.mp/Math.max(1,b.maxMp)*100>=cfg.mpAbove)tryCast(cfg.attack);
}
function second(c:Character,now:number,rng:()=>number,rules:WorldRules,duration=1000){const begin=now-duration,dt=duration/1000;ensureArena(c,rng,begin);const dollMessage=renewDoll(c,begin);if(dollMessage)log(c,dollMessage,'info',begin);const polyMessage=tickPolymorph(c,begin,rng);if(polyMessage)log(c,polyMessage,'magic',begin);const b=stats(c,begin);recoverLineageWShield(c,b,begin,now);c.hp=Math.min(c.hp,b.maxHp);c.mp=Math.min(c.mp,b.maxMp);const dollHp=c.hp,dollMp=c.mp;dollRecovery(c,begin,now,b.maxHp,b.maxMp);if(c.hp>dollHp||c.mp>dollMp)event(c,'magic',begin,{source:'doll',dollKind:'recovery',effectName:'娃娃恢復',effect:`HP +${c.hp-dollHp} · MP +${c.mp-dollMp}`});const doll=dollBonus(c.doll&&dollDefinition(c)?.enabled?dollDefinition(c):undefined),hpTicks=Math.floor(now/16000)-Math.floor(begin/16000),mpInterval=Math.max(1000,16000-Math.floor(b.wis/10)*1000),mpTicks=Math.floor(now/mpInterval)-Math.floor(begin/mpInterval);c.hp=Math.min(b.maxHp,c.hp+(doll.hpR||0)*hpTicks);c.mp=Math.min(b.maxMp,c.mp+(doll.mpR||0)*mpTicks);
 expireDragonSummons(c,begin);recoverArena(c,begin);petMaintenance(c,begin);
 if(Math.floor(now/5000)>Math.floor(begin/5000))for(const m of c.arena||[]){if(!m.definition&&m.hp>0&&!(m.effects?.noRegen?.until!>now)){const gain=playableBoss(c.zone)?0:DATA.mobs[m.id].regenHp||0;m.hp=Math.min(m.maxHp||DATA.mobs[m.id].hp,m.hp+gain*(m.effects?.muddywater?.until!>now?.5:1));}}syncTarget(c);
 summonMaintenance(c,begin,rng);
 if(!c.running){tickHealingOverTime(c,now);recoverArena(c,now);c.hp=Math.min(b.maxHp,c.hp+(b.hpR-(doll.hpR||0))*(Math.floor(now/1000)-Math.floor(begin/1000)));c.mp=Math.min(b.maxMp,c.mp+(b.mpR-(doll.mpR||0))*(Math.floor(now/1000)-Math.floor(begin/1000)));for(let slot=0;slot<(c.arena?.length||0);slot++)if(!playableBoss(c.zone)&&c.arena![slot].respawnAt&&c.arena![slot].respawnAt!<=now)replacement(c,slot,rng,c.arena![slot].respawnAt!);return;}
 if(!c.arena?.length){c.running=false;return;}
 if(c.buffs.sk_heal_energy_storm?.until>begin&&Math.floor(now/3000)>Math.floor(begin/3000))c.hp=Math.min(b.maxHp,c.hp+b.hpR-(doll.hpR||0));
 selectHealingPotion(c,begin);const cfg=autoConfig(c);const antidote=autoAntidote(c,!!cfg.aux.new_item_237?.enabled,begin);if(antidote){log(c,antidote,'magic',begin);event(c,'magic',begin,{item:'new_item_237',effect:'解除中毒'});}const arrows=restockArrows(c,!!cfg.arrowBuy);if(arrows)log(c,arrows,'info',begin);if(c.autoPotion&&c.hp/b.maxHp*100<=c.threshold){try{useAutomaticItem(c,c.potion,cfg.potionDirectGold,begin,rng);}catch{}}
 for(const [id,setting] of Object.entries(cfg.aux)){if(!setting.enabled||['scroll_poly','new_item_237'].includes(id)||c.buffs[id]?.until>begin)continue;try{useAutomaticItem(c,id,setting.directGold,begin,rng);}catch{}}
 if(Math.floor(now/5000)>Math.floor(begin/5000)){const hp=c.hp;if(!(c.buffs.sk_heal_energy_storm?.until>begin))c.hp=Math.min(b.maxHp,c.hp+b.hpR-(doll.hpR||0));c.mp=Math.min(b.maxMp,c.mp+b.mpR-(doll.mpR||0));if(c.hp>hp)event(c,'heal',begin,{damage:c.hp-hp});}

 if(Math.floor(now/1000)>Math.floor(begin/1000))for(const k of [...new Set([...cfg.buffs,...(c.autoConfig?[]:c.autoSkills)])]){const sk=DATA.skills[k];if(sk?.type==='buff'&&c.buffs[k]?.until<=begin||sk?.type==='buff'&&!c.buffs[k]){try{cast(c,k,begin,rng,true);}catch{}}}

 tickSpecialCombat(c,begin-duration,begin,rng);if(!c.running)return;
 const timeline:{time:number;poisonTick?:boolean;healTick?:boolean;autoSpell?:boolean;slot?:number;uid?:string;respawn?:boolean;monsterMagic?:string;petName?:string;petMagic?:boolean;summonUid?:string}[]=[];const interval=b.attackInterval;c.atkClock=rescaleAttackClock(c.atkClock,c.previousAttackInterval,interval);c.previousAttackInterval=interval;for(let t=interval-c.atkClock;t<=dt+1e-9;t+=interval)timeline.push({time:Math.max(0,t)});c.atkClock=(c.atkClock+dt)%interval;
 for(const name of petNamesOut(c)){const p=ensurePet(c,name,begin),d=petStats(c,name,p);if(p.hp!<=0)continue;let next=Math.max(begin,p.nextAt||begin);while(next<=now){timeline.push({time:(next-begin)/1000,petName:name});next+=d.atkItv*100*(p.effects?.slow?.until!>next?2:1);}p.nextAt=next;if(d.castItv&&Math.max(begin,p.castAt||begin)<=now)timeline.push({time:(Math.max(begin,p.castAt||begin)-begin)/1000,petName:name,petMagic:true});}
 for(const e of c.summonContract?.entities||[]){if(e.hp<=0)continue;const interval=summonNumbers(c,e.form,b).interval;for(let at=Math.max(begin,e.nextAt);at<=now;at+=interval)timeline.push({time:(at-begin)/1000,summonUid:e.uid});e.nextAt=Math.max(begin,e.nextAt);while(e.nextAt<=now)e.nextAt+=interval;}
 if(cfg.attack||cfg.opener||cfg.heal||cfg.convert)for(let at=(Math.floor(begin/AUTO_SPELL_CHECK_MS)+1)*AUTO_SPELL_CHECK_MS;at<=now;at+=AUTO_SPELL_CHECK_MS)timeline.push({time:(at-begin)/1000,autoSpell:true});
 c.arena.forEach((m,slot)=>{if(m.hp<=0){if(!playableBoss(c.zone)&&m.respawnAt&&m.respawnAt<=now)timeline.push({time:Math.max(0,(m.respawnAt-begin)/1000),slot,uid:m.uid,respawn:true});return;}const poison=m.effects?.poison;if(poison?.tickMs&&poison.nextAt)for(let at=poison.nextAt;at<=now&&at<=poison.until;at+=Math.max(1,poison.tickMs))timeline.push({time:Math.max(0,(at-begin)/1000),slot,uid:m.uid,poisonTick:true});const data=monsterData(c,m.id,m),gap=Math.max(.4,(data.atkSpd||2)*(m.effects?.slow?.until!>begin?1+m.effects!.slow.value/100:1));m.clock=rescaleAttackClock(m.clock,m.previousAttackGap,gap);m.previousAttackGap=gap;if(!data.noAttack)for(let t=gap-m.clock;t<=dt+1e-9;t+=gap)timeline.push({time:Math.max(0,t),slot,uid:m.uid});m.clock=(m.clock+dt)%gap;m.magicClocks||={};for(const key of magicKeys(data)){const magic=magicData(data,key);if(!magic||!(magic.cd>0))continue;const clock=combatClock(m.magicClocks[key],magic.cd);for(let t=magic.cd-clock;t<=dt+1e-9;t+=magic.cd)timeline.push({time:Math.max(0,t),slot,uid:m.uid,monsterMagic:key});m.magicClocks[key]=(clock+dt)%magic.cd;}});timeline.sort((a,b)=>a.time-b.time||Number(!!b.respawn)-Number(!!a.respawn)||Number(!!b.autoSpell)-Number(!!a.autoSpell)||Number(!!b.petMagic)-Number(!!a.petMagic));
 if(c.healingOverTime)for(let at=c.healingOverTime.nextAt;at<=now;at+=3000)timeline.push({time:Math.max(0,(at-begin)/1000),healTick:true});timeline.sort((a,b)=>a.time-b.time);
 for(const turn of timeline){if(!c.running)break;const at=begin+Math.round(turn.time*1000);if(turn.healTick){tickHealingOverTime(c,at);continue;}if(!mapIsOpen(c.zone,c.mapAccess,at)){ensureArena(c,rng,at);break;}if(turn.respawn){const m=c.arena[turn.slot!];if(m.uid===turn.uid&&m.hp<=0)replacement(c,turn.slot!,rng,at);syncTarget(c);continue;}if(turn.poisonTick){const target=c.arena[turn.slot!],poison=target?.effects?.poison;if(target?.uid===turn.uid&&target.hp>0&&poison?.tickMs&&poison.nextAt&&poison.nextAt<=at&&at<=poison.until){poison.nextAt+=poison.tickMs;const saved=c.arenaTarget;c.arenaTarget=turn.slot!;syncTarget(c);damageMonster(c,poison.value,at,rng,'sk_poison_curse','poison');c.arenaTarget=saved;syncTarget(c);}continue;}recoverArena(c,at);if(turn.autoSpell){autoCastSpells(c,cfg,at,rng);continue;}const current=stats(c,at);
 if(turn.summonUid){const entity=c.summonContract?.entities.find(s=>s.uid===turn.summonUid);if(entity)summonAttack(c,entity,at,rng);}
 else if(turn.petName){petAttack(c,turn.petName,at,rng,!!turn.petMagic);}
 else if(turn.slot===undefined){if(c.buffs.sk_abs_barrier?.until>at||c.buffs.status_stun?.until>at||c.buffs.status_freeze?.until>at||c.buffs.status_stone?.until>at)continue;syncTarget(c);if(!c.mob)continue;const target=c.arena[c.arenaTarget||0],w=DATA.items[baseItem(c.equipment.weapon?.id||'')];let arrow:any;if(w?.isBow){const message=restockArrows(c,!!cfg.arrowBuy);if(message)log(c,message,'info',at);if(arrowCount(c)<1){log(c,'箭矢不足，弓攻擊略過；請補箭或開啟自動補購','info',at);continue;}arrow=Object.entries(c.bag).map(([id,count])=>({id,count})).filter(x=>x.count>0&&!c.locked?.includes(x.id)).map(x=>DATA.items[baseItem(x.id)]).find(i=>i?.isArrow);consumeArrows(c,1);}normalWeaponAttack(c,target,at,rng,arrow,undefined,current);if(c.tripleNeedsNormal){c.tripleNeedsNormal=false;c.tripleResumeAt=at+ARROW_FLIGHT_MS;}}
 else {const target=c.arena[turn.slot];if(!target||target.uid!==turn.uid||target.hp<=0||target.expiresAt!==undefined&&target.expiresAt<=at)continue;if(['stun','sleep','stone','freeze','paralyze'].some(k=>target.effects?.[k]?.until!>at)||turn.monsterMagic&&target.effects?.silence?.until!>at)continue;if(c.buffs.sk_abs_barrier?.until>at)continue;if(!turn.monsterMagic&&c.buffs.sk_elf_earthshield?.until>at)continue;const m=monsterData(c,target.id,target),current=lineageWDefenseStats(stats(c,at),m);if(m.dragon381&&turn.monsterMagic==='dragon381'){dragonTurn(c,target,m,turn.slot,at,rng);continue;}if(!turn.monsterMagic&&monsterHitsPet(c,m,target,at,rng))continue;if(!turn.monsterMagic&&monsterHitsSummon(c,m,target,at,rng))continue;const strike=monsterStrike({...m,hit:(m.hit||0)-(target.effects?.weak?.until!>at?2:0)-(target.effects?.disease?.until!>at?4:0)},c.lv,current.ac,current.er,current.dr,rng,target.effects?.blind?.until!>at?target.effects!.blind.value:0,current[m.ranged?'ignoreRangedCrit':'ignoreMeleeCrit']||0);if(!strike.miss)strike.damage=Math.max(1,strike.damage-(target.effects?.weak?.until!>at?4:0)-(target.effects?.broken?.until!>at?2:0));let hit=!strike.miss;if(current.invisible&&!turn.monsterMagic&&!m.seeInsight)continue;const elementKey='res'+String(m.e||'none')[0].toUpperCase()+String(m.e||'none').slice(1);let damage=hit?Math.max(1,Math.floor(strike.damage*(1-clamp(current[elementKey]||0,0,100)/100))-physicalArmorReduction(c.cls,current.ac,rng))*(1-clamp(current.damageReductionPct,0,100)/100):0;if(turn.monsterMagic){hit=true;const magic=magicData(m,turn.monsterMagic);if(magic.chance!==undefined&&rng()>=magic.chance)continue;if(magic.hpBelow!==undefined&&target.hp/(target.maxHp||m.hp)*100>magic.hpBelow)continue;const cost=magic.mpCost||0;if((target.mp||0)<cost)continue;target.mp=(target.mp||0)-cost;event(c,'magic',at,{source:'monster',casterSlot:turn.slot,monsterMp:target.mp,skill:magic.skill,effectName:magic.skn,effect:`${m.n} 施放 ${magic.skn||'魔法'}`,slot:magic.type==='heal'||magic.type==='self_haste'||magic.type==='haste'||magic.type==='holy_barrier'?turn.slot:undefined,uid:target.uid,mob:target.id});if(!['heal','self_haste','haste','holy_barrier'].includes(magic.type)&&monsterHitsPet(c,m,target,at,rng,magic))continue;if(magic.dmg&&monsterHitsSummon(c,m,target,at,rng,magic))continue;const barrier=['self_haste','haste','heal','holy_barrier'].includes(magic.type)?undefined:Object.keys(c.buffs).find(k=>c.buffs[k].until>at&&c.buffs[k].d.magicBarrier);if(barrier){delete c.buffs[barrier];c.magicBarrierCooldown=at+3000;damage=0;hit=false;log(c,'魔法屏障抵擋了一次魔法攻擊','magic',at);}else if(magic.dmg){const key='res'+String(magic.ele||'none')[0].toUpperCase()+String(magic.ele||'none').slice(1);damage=Math.max(0,resistanceDamage(monsterMagicRoll(magic,m,rng),current.mr,current[key]||0,magic.ele==='none'?current.magicDrNonEle:0)-current.dr)*(1-clamp(current.damageReductionPct,0,100)/100);damage=mythicMonsterMagicDamage(damage,current,{...m,...magic},rng);if(magic.sec&&rng()<clamp(((magic.sec.pbase||100)-current.mr)/100,.05,.95)&&!current.immStone&&!dollResistance(c,'freeze',rng,at))c.buffs.status_freeze={until:at+(magic.sec.dur||3)*1000,d:{freeze:1}};if(magic.vamp)target.hp=Math.min(target.maxHp||m.hp,target.hp+int(magic.vamp[0],magic.vamp[1],rng));}else{damage=0;const kind=magic.type==='frost_breath'?'freeze':['stone','paralyze'].includes(magic.type)?'stun':magic.type==='magicseal'?'silence':magic.type;if(kind==='holy_barrier'){if(applyMonsterHolyBarrier(target,at,magic.dur||32,magic.value??50))event(c,'state',at,{source:'monster',casterSlot:turn.slot,slot:turn.slot,uid:target.uid,mob:target.id,skill:'sk_holy_barrier',effectName:'聖結界',targetEffects:structuredClone(target.effects)});}else if(kind==='heal'){target.hp=Math.min(target.maxHp||m.hp,target.hp+(magic.healRange?int(magic.healRange[0],magic.healRange[1],rng):(magic.heal||magic.value||0)));}else if(kind==='slow'&&!dollResistance(c,'slow',rng,at)){c.buffs.status_slow={until:at+(magic.dur||10)*1000,d:{atkSpdPct:-Math.min(80,magic.value||50)}};}else if(kind==='self_haste'||kind==='haste')target.effects={...target.effects,slow:{until:at+(magic.dur||8)*1000,value:-Math.min(80,magic.value||30)}};else if(kind==='extra_attack'){const range=magic.physicalRange||m.dmg;damage=Math.max(1,int(range[0],range[1],rng)-current.dr);if(rng()<(magic.stunChance||0)/100&&!dollResistance(c,'stun',rng,at))c.buffs.status_stun={until:at+3000,d:{stun:1}};}else if(kind==='stat_debuff')c.buffs['status_debuff']={until:at+(magic.dur||6)*1000,d:{ac:-(magic.acUp||0),er:-(magic.erDown||0)}};else if(['poison','stun','freeze','silence','vulnerable','repulsion'].includes(kind)&&!dollResistance(c,['stone','paralyze'].includes(magic.type)?'paralyze':kind,rng,at)&&!(kind==='poison'&&current.immPoison)&&!(['stun','freeze'].includes(kind)&&current.immStone)&&rng()<clamp(((magic.pbase||100)-current.mr)/100,.05,.95))c.buffs['status_'+kind]={until:at+(magic.dur||6)*1000,d:kind==='vulnerable'?{incomingDamagePct:magic.value||10}:{[kind]:kind==='poison'?magic.d||5:1}};}}if(!turn.monsterMagic&&hit){const barrier=Object.keys(c.buffs).find(k=>c.buffs[k].until>at&&c.buffs[k].d.magicBarrier);if(barrier){delete c.buffs[barrier];damage=0;hit=false;c.magicBarrierCooldown=at+3000;}}if(!turn.monsterMagic&&hit&&c.buffs.sk_dark_stealth?.until>at){damage=0;hit=false;delete c.buffs.sk_dark_stealth;c.skillCooldowns||={};c.skillCooldowns.sk_dark_stealth=at+5000;}if(!turn.monsterMagic&&hit&&c.buffs.sk_dark_dodge?.until>at&&rng()<.2){damage=0;hit=false;}if(turn.monsterMagic&&damage>0&&c.buffs.sk_elf_mirror?.until>at&&rng()*100<current.wis){const old=c.arenaTarget;c.arenaTarget=turn.slot;syncTarget(c);damageMonster(c,damage,at,rng,'sk_elf_mirror','magic');c.arenaTarget=old;syncTarget(c);damage=0;}const beforeDoll=Math.max(0,Math.floor(damage)),afterDoll=dollDamageReduction(c,beforeDoll,rng);if(afterDoll<beforeDoll)event(c,'magic',at,{source:'doll',dollKind:'guard',effectName:'娃娃減傷',effect:`減少 ${beforeDoll-afterDoll} 傷害`});const protectedHit=lineageWIncomingDamage(c,current,afterDoll,at,rng,!!turn.monsterMagic,m);emitLineageWProtection(c,protectedHit,at);if(protectedHit.absorbed)event(c,'state',at,{effect:`保護盾吸收 ${protectedHit.absorbed}`});if(protectedHit.evaded)hit=false;damage=Math.min(c.hp,protectedHit.damage);c.hp-=damage;c.lastTaken=damage;event(c,'hurt',at,{motion:turn.monsterMagic?'skill':'attack',slot:turn.slot,uid:target.uid,mob:target.id,damage,miss:!hit});if(turn.monsterMagic)event(c,'state',at,{casterSlot:turn.slot,uid:target.uid,mob:target.id,mobHp:target.hp,monsterMp:target.mp});if(!turn.monsterMagic&&hit&&c.hp>0&&target.hp>0&&c.buffs.sk_counter_barrier?.until>at&&(!(m.ignoreCounterPct>0)||rng()*100>=Math.max(0,m.ignoreCounterPct-(current.counterIgnoreDefensePct||0)))){const w=DATA.items[baseItem(c.equipment.weapon?.id||'')];if(['sword','tohandsword'].includes(w?.wcat||'')&&rng()<.5){const old=c.arenaTarget;c.arenaTarget=turn.slot;syncTarget(c);const counter=playerStrike(c,current,m,rng,undefined,at,{skill:true,forceHit:true});damageMonster(c,Math.max(1,Math.floor(counter.damage*(w.wcat==='sword'?1:.5))),at,rng,'sk_counter_barrier','physical');c.arenaTarget=old;syncTarget(c);}}if(hit)log(c,`${m.n}${turn.monsterMagic?` 施放 ${magicData(m,turn.monsterMagic).skn||'魔法'}`:' 攻擊你'}`,'hurt',at);if(c.hp<=0){defeat(c,at,rng);}}
 for(let slot=0;slot<c.arena.length;slot++){const m=c.arena[slot];if(!playableBoss(c.zone)&&m.hp<=0&&m.respawnAt&&m.respawnAt<=now&&!timeline.some(t=>t.respawn&&t.uid===m.uid)){timeline.push({time:(m.respawnAt-begin)/1000,slot,uid:m.uid,respawn:true});timeline.sort((a,b)=>a.time-b.time||Number(!!b.respawn)-Number(!!a.respawn)||Number(!!b.autoSpell)-Number(!!a.autoSpell)||Number(!!b.petMagic)-Number(!!a.petMagic));}}
 }
 if(!mapIsOpen(c.zone,c.mapAccess,now))ensureArena(c,rng,now);recoverArena(c,now);syncTarget(c);
 const sold=autoSellGear(c);if(sold)log(c,sold,'loot',now);
}
function bindDollCollections(save:Save){const all=new Set(save.dollCollection||[]),dex={...(save.dollCardDex||{})};for(const c of save.characters){migrateDolls(c);for(const id of c.dollCollection||[])all.add(id);for(const [id,score]of Object.entries(c.dollCardDex||{}))dex[id]=Math.max(dex[id]||0,score);}save.dollCollection=[...all];save.dollCardDex=dex;for(const c of save.characters){c.dollCollection=save.dollCollection;c.dollCardDex=save.dollCardDex;}}
function bindBossRooms(save:Save){save.bossRooms||={};for(const c of save.characters)c.bossRooms=save.bossRooms;}
/** Normalize legacy saves before any online or offline combat is awarded. */
export function singleHunt(save:Save,now=save.at){
 const running=save.characters.filter(c=>c.running);
 const keep=running.find(c=>c.id===save.active)||running[0];
 for(const c of running)if(c!==keep){c.running=false;log(c,'同帳號僅能一位角色狩獵，已停止此角色。','info',now);}
}
/** Selecting a different character ends the previous character's hunt after
 * advance() has settled all elapsed time. Rewards stay with their owner. */
function stopHuntOnCharacterSwitch(save:Save,nextId:string,now:number){
 if(save.active===nextId)return;
 for(const character of save.characters){
  if(character.running){character.running=false;log(character,'切換角色，狩獵與離線收益已暫停。','info',now);}
 }
}
/** Login-only arithmetic settlement. save.at is the server-owned last-save timestamp.
 * Existing CAS persistence commits both rewards and this timestamp atomically.
 * Legacy catchup rewards are already in the character: carry their receipt only.
 */
export function settleOfflineGains(save:Save,now:number,rng:()=>number=Math.random){
 const prior=save.catchup;
 const elapsed=Math.max(0,Math.floor((now-save.at)/1000));
 const priorSeconds=Math.max(0,prior?.seconds||0);
 const seconds=Math.min(elapsed,Math.max(0,MAX_OFFLINE_SECONDS-priorSeconds));
 singleHunt(save);bindBossRooms(save);bindDollCollections(save);bindPolymorphUnlocks(save);
 const hunter=save.characters.find(c=>c.id===prior?.characterId)||save.characters.find(c=>c.running);
 let xp=0,gold=0,effectiveMinutes=0,isDead=false;
 if(hunter?.running&&hunter.hp>0&&!DATA.towns[hunter.zone]&&!playableBoss(hunter.zone)&&mapPool(hunter.zone,hunter.mapPools).length&&mapIsOpen(hunter.zone,hunter.mapAccess,now)){
  const rate=MAP_EFFICIENCY[hunter.zone]||DEFAULT_OFFLINE_EFFICIENCY;
  const gains=calculateOfflineGains(seconds,rate,rng);
  ({xp,gold,effectiveMinutes,isDead}=gains);
  upgradeAbilityPoints(hunter);hunter.xp+=xp;hunter.gold+=gold;
  // Bounded by the 99-level cap, never by offline duration.
  while(hunter.xp>=xpNeed(hunter.lv)&&hunter.lv<99){hunter.xp-=xpNeed(hunter.lv);hunter.points+=levelPointGain(hunter.lv,hunter.lv+1);hunter.lv++;const b=stats(hunter,now);hunter.hp=b.maxHp;hunter.mp=b.maxMp;}
  if(isDead)defeat(hunter,now,rng);
 }
 for(const c of save.characters){
  c.events=[];c.atkClock=0;c.mobClock=0;
  for(const m of c.arena||[]){m.clock=0;for(const key of Object.keys(m.magicClocks||{}))m.magicClocks![key]=0;}
  event(c,'state',now);
 }
 save.at=Math.max(save.at,now);delete save.catchup;
 const report={seconds:priorSeconds+seconds,kills:prior?.kills||0,gold:(prior?.gold||0)+gold,xp:(prior?.xp||0)+xp,drops:{...(prior?.drops||{})},characterName:prior?.characterName||hunter?.name||'冒險者',characterId:prior?.characterId||hunter?.id,pendingSeconds:0,offline:!!hunter||!!prior,effectiveMinutes:prior?undefined:effectiveMinutes,isDead};
 rememberOfflineIncome(save,report,save.at);
 return report;
}
/** Online polling retains exact combat; offline intervals use arithmetic above. */
export function advance(save:Save,now=Date.now(),rng:()=>number=Math.random,config:WorldRules|WorldConfig=DEFAULT_WORLD_RULES,budgetMs=Infinity){
 if(!Number.isFinite(now)||!Number.isFinite(save.at))throw Error('無效的存檔時間');
 for(const c of save.characters)repairCombatClocks(c);
 if(now<=save.at)return {seconds:0,kills:0,gold:0,xp:0,drops:{},pendingSeconds:0,offline:false};
 if(save.characterDeletions){bindBossRooms(save);bindDollCollections(save);bindPolymorphUnlocks(save);settleCharacterDeletions(save,now);}
 if(save.catchup?.mode!=='online'&&(save.catchup||now-save.at>30000))return settleOfflineGains(save,now,rng);
 const prior=save.catchup,target=prior?.targetAt??now,start=save.at;
 singleHunt(save);bindBossRooms(save);bindDollCollections(save);bindPolymorphUnlocks(save);
 for(const c of save.characters){migrateDolls(c);upgradeAbilityPoints(c);upgradeSupply(c,start);}
 const ledger:IncomeLedger={xp:prior?.xp||0,drops:{...(prior?.drops||{})}};
 const beneficiary=save.characters.find(c=>c.id===prior?.characterId)||save.characters.find(c=>c.running)||save.characters.find(c=>c.id===save.active);
 if(beneficiary)incomeLedgers.set(beneficiary,ledger);
 const before=save.characters.reduce((a,c)=>a+c.kills,0),gold=save.characters.reduce((a,c)=>a+c.gold,0),began=performance.now();
 let end=start;
 try{
  for(let t=start;t<target;){
   const next=Math.min(target,t+1000),rules=worldRulesAt(config,next);
   for(const c of save.characters)second(c,next,rng,rules,next-t);
   for(const c of save.characters)settleBossRewards(c,next,rng);
   t=next;end=next;
   if(t<target&&Number.isFinite(budgetMs)&&performance.now()-began>=Math.max(0,budgetMs))break;
  }
  for(const c of save.characters){const dollMsg=renewDoll(c,end);if(dollMsg)log(c,dollMsg,'info',end);const msg=tickPolymorph(c,end,rng);if(msg)log(c,msg,'magic',end);}
  bindDollCollections(save);save.at=end;
  const report={xp:ledger.xp,drops:ledger.drops,characterName:beneficiary?.name||'冒險者',characterId:beneficiary?.id,seconds:(prior?.seconds||0)+(end-start)/1000,kills:(prior?.kills||0)+save.characters.reduce((a,c)=>a+c.kills,0)-before,gold:(prior?.gold||0)+save.characters.reduce((a,c)=>a+c.gold,0)-gold,pendingSeconds:Math.max(0,Math.ceil((target-end)/1000)),offline:false};
  if(report.pendingSeconds)save.catchup={...report,mode:'online',targetAt:target};else delete save.catchup;
  return report;
 }finally{for(const c of save.characters)incomeLedgers.delete(c);}
}

export function action(save:Save,a:any,now=Date.now(),rng:()=>number=Math.random){if(a.type==='interfaceTheme'){if(a.theme!=='classic'&&a.theme!=='ice')throw Error('不支援的介面色系');save.interfaceTheme=a.theme;return;}if(a.type==='bossVictoryDismiss'){const c=save.characters.find(c=>c.id===a.characterId);if(c)acknowledgeBossVictory(c,a.id);return;}if(a.type==='offlineIncomeDismiss'){acknowledgeOfflineIncome(save,a.id);return;}singleHunt(save);bindBossRooms(save);bindDollCollections(save);bindPolymorphUnlocks(save);if(a.type==='create'){if(save.characters.length>=MAX_CHARACTERS)throw new Error('最多建立三位角色');const c=createCharacter(String(a.name||''),String(a.cls),String(a.gender),a.allocation||{},now);stopHuntOnCharacterSwitch(save,c.id,now);save.characters.push(c);bindPolymorphUnlocks(save);save.active=c.id;return;}
 if(a.type==='deleteCharacter'){requestCharacterDeletion(save,String(a.id),now);return;}
 if(a.type==='cancelCharacterDeletion'){cancelCharacterDeletion(save,String(a.id),String(a.token),now);return;}
 if(a.type==='select'){if(!save.characters.some(x=>x.id===a.id))throw Error('角色不存在');if(save.characterDeletions?.[a.id])throw Error('此角色正在等待刪除，請先取消刪除');stopHuntOnCharacterSwitch(save,String(a.id),now);save.active=a.id;return;}
 const c=save.characters.find(x=>x.id===save.active);if(c&&save.characterDeletions?.[c.id])throw Error('此角色正在等待刪除，請先取消刪除');if(!c)throw new Error('請先建立角色');migrateDolls(c);upgradeAbilityPoints(c);ensureArena(c,rng,now);const i=DATA.items[a.item];
 if(String(a.type).startsWith('mastery')){log(c,masteryAction(c,a,now),'info',now);return;}
 switch(a.type){
 case 'redeemCode':log(c,redeemChatCode(save,c,a.code,now),'info',now);break;
 case 'collectionRegister':{const row=registerCollection(c,String(a.id));log(c,`登錄圖鑑 ${row.name}`,'info',now);break;}
 case 'summonChoice':{const name=String(a.form||'');if(!summonRing(c))throw Error('必須穿戴召喚控制戒指才能選怪');if(name&&!summonEligible(c,name,stats(c,now).cha))throw Error('等級或魅力不足');c.summonChoice=name||undefined;log(c,name?`召喚目標：${name}`:'召喚目標已改回預設','info',now);break;}
 case 'summonDismiss':{delete c.summonContract;delete c.buffs.sk_summon;c.autoSkills=c.autoSkills.filter(k=>k!=='sk_summon');if(c.autoConfig)c.autoConfig.buffs=c.autoConfig.buffs.filter(k=>k!=='sk_summon');log(c,'召喚物已解散','info',now);event(c,'state',now);break;}
 case 'petTraining':if(a.pet!==''&&!PET_NAMES.includes(a.pet))throw Error('寵物不存在');c.petTraining=a.pet;if(a.pet)ensurePet(c,a.pet,now);break;
 case 'petSummon':{const name=String(a.pet||'');if(name&&!PET_NAMES.includes(name))throw Error('寵物不存在');if(!name){c.petActives=[];c.petActive='';break;}const cha=stats(c,now).cha,out=[...petNamesOut(c)],idx=out.indexOf(name);if(idx>=0)out.splice(idx,1);else{const cap=[6,12,15,20].filter(n=>cha>=n).length;if(cha<PET_BOOK[name].cha||out.length>=cap)throw Error('魅力不足或出戰名額已滿');ensurePet(c,name,now);out.push(name);c.petTraining=name;}c.petActives=out;c.petActive=out[0]||'';log(c,idx>=0?`收回 ${name}`:`${name} 出戰`,'info',now);event(c,'state',now);break;}
 case 'petReset':{const name=String(a.pet);if(!PET_NAMES.includes(name))throw Error('寵物不存在');c.pets||={};for(const eq of Object.values(c.pets[name]?.gear||{}))addItem(c,eq.id);delete c.pets[name];ensurePet(c,name,now);log(c,`${name} 已重練`,'info',now);break;}
 case 'petRevive':{const p=ensurePet(c,String(a.pet),now);if(p.hp!>0)throw Error('寵物尚未倒下');if(a.method==='spell'){const skill=DATA.skills.sk_resurrection;if(!c.skills.includes('sk_resurrection'))throw Error('尚未學會返生術');if(c.mp<(skill.mp||50))throw Error('MP 不足');c.mp-=skill.mp||50;}else{if(now-(p.deadAt||now)<5000)throw Error('倒下5秒後才能使用卷軸');const id=Object.keys(c.bag).find(k=>baseItem(k)==='scroll_revive'&&c.bag[k]>0&&!c.locked?.includes(k));if(!id)throw Error('沒有未鎖定的復活卷軸');consume(c,id);}revivePet(p,now);event(c,'state',now);break;}
 case 'petGear':{const name=String(a.pet),p=ensurePet(c,name,now),slot=String(a.slot);if(!['weapon','armor'].includes(slot))throw Error('寵物部位無效');const id=String(a.item||''),item=DATA.items[id];p.gear||={};if(id){if(!(c.bag[id]>0)||c.locked?.includes(id)||isCursed(c,id))throw Error('物品不可穿戴');if(slot==='weapon'?item?.slot!=='petwpn':item?.slot!=='petarm')throw Error('需要寵物專用裝備');}if(p.gear[slot])addItem(c,p.gear[slot].id);if(id){consume(c,id);p.gear[slot]={id,en:c.enh[id]||0};}else delete p.gear[slot];event(c,'state',now);break;}
 case 'dollSynthesize':log(c,synthDolls(c,Number(a.tier),Number(a.count),a.all===true),'loot',now);break;
 case 'dollOpen':log(c,openDollBox(c,String(a.item),a.all===true),'loot',now);break;
 case 'dollReroll':log(c,rerollDolls(c,a.all===true),'loot',now);break;
 case 'dollLegacy':log(c,exchangeLegacyFragments(c,Number(a.tier)),'loot',now);break;
 case 'dollCardExchange':log(c,exchangeDollCards(c,Number(a.tier)),'loot',now);break;
 case 'dollCardSynthesize':log(c,synthDollCards(c),'loot',now);break;
 case 'run':if(a.value&&!playableBoss(c.zone)&&!mapPool(c.zone,c.mapPools).length)throw Error('此地圖目前沒有啟用的怪物');if(!DATA.maps[c.zone]&&!playableBoss(c.zone))throw new Error('請先選擇狩獵場');if(a.value&&playableBoss(c.zone)&&!c.mob)throw new Error('世界王尚未重生');if(a.value)for(const other of save.characters)if(other.id!==c.id&&other.running){other.running=false;log(other,'已切換至另一位角色狩獵。','info',now);}if(c.running!==!!a.value){delete c.tripleNeedsNormal;delete c.tripleResumeAt;}c.running=!!a.value;log(c,c.running?'開始自動狩獵':'停止自動狩獵','info',now);break;
 case 'zone':{const z=String(a.zone);if(isPausedDragonZone(z))throw Error('此四龍版本已暫停開放');if(!mapIsOpen(z,c.mapAccess,now))throw Error('此地圖已關閉，請選擇其他地圖');const boss=playableBoss(z);if(!DATA.maps[z]&&!DATA.towns[z]&&!boss)throw new Error('地圖不存在或重生排程尚未確認');if(boss&&(c.bossRooms?.[z]?.respawnAt||0)>now)throw new Error('世界王尚未重生，請等待倒數結束');if(boss&&c.lv<(boss.minLv||0))throw new Error(`需要 Lv.${boss.minLv} 才能進入`);const def=Object.values(DATA.mapCategories).flat().find(x=>x.v===z);if(def?.acReq&&stats(c,now).ac>def.acReq)throw new Error(`需要 AC ${def.acReq} 以下`);if(c.zone!==z&&boss?.enterGold){if(c.gold<boss.enterGold)throw Error('入場金幣不足');c.gold-=boss.enterGold;log(c,`王房入場費 ${boss.enterGold} 金幣`,'info',now);}if(c.zone!==z){clearDragonSummons(c);resetBossParticipation(c);delete c.population;delete c.targetSlot;}c.zone=z;c.mob=null;c.mobHp=0;delete c.targetSlot;if(DATA.towns[z]||boss)c.running=false;break;}
 case 'buy':{const n=Number(a.n);if(typeof a.item!=='string'||a.item.includes('@'))throw new Error('不能購買裝備實例');if(!i||!Number.isInteger(n)||n<1||n>1000||!a.npc&&(i.noShop||!Number.isFinite(i.p)||i.p<=0||i.noSell))throw new Error('無法購買');const cost=a.npc?purchaseCost(c.zone,String(a.npc),a.item,n,c.npcConfig):i.p*n;if(!Number.isSafeInteger(cost)||cost<0)throw Error('購買金額無效');if(c.gold<cost)throw new Error('金幣不足');c.gold-=cost;addItem(c,a.item,n);log(c,`購買 ${i.n} ×${n}`,'info',now);break;}
 case 'npcRecipe':save.npcDaily||={};log(c,craftRecipe(c,String(a.npc),String(a.recipe),Number(a.n),save.npcDaily,now),'loot',now);break;
 case 'useItem':{if(!i||!c.bag[a.item]||c.locked?.includes(a.item))throw Error('沒有此道具或已鎖定');if(i.eff==='dollBox'){log(c,openDollBox(c,String(a.item)),'loot',now);}else if(i.eff==='dollCard'){log(c,useDollCard(c,String(a.item)),'loot',now);}else if(i.eff==='dollContract'){const tier=Number(i.dollContract?.tier);if(![1,2,3].includes(tier))throw Error('契約書階級無效');const result=unlockDoll(c,tier,rng);consume(c,a.item);log(c,result,'loot',now);}else if(i.type==='skillbk'){action(save,{type:'learn',skill:i.sk,book:a.item},now,rng);}else if(i.eff==='panacea'){if(c.lv<(i.plv||50)||!i.pstat||c.attrs[i.pstat]>=60||(c.panaceaUsed||0)>=20)throw Error('萬能藥需要 Lv.50，最多 20 瓶，能力上限 60');consume(c,a.item);c.attrs[i.pstat]++;c.panaceaUsed=(c.panaceaUsed||0)+1;log(c,`${i.n}：永久能力 +1`,'info',now);}else if(a.item==='new_item_237'){if(!c.buffs.status_poison)throw Error('目前未中毒');consume(c,a.item);delete c.buffs.status_poison;}else throw Error('此物品使用規則尚未取得');break;}
 case 'sellUnused':if(a.extra!==undefined&&(!Array.isArray(a.extra)||a.extra.length>200||a.extra.some((k:any)=>typeof k!=='string'||!c.bag[k])))throw new Error('販售清單無效');log(c,sellUnused(c,a.extra||[]),'loot',now);break;
 case 'useScroll':if(c.locked?.includes(a.item))throw new Error('請先解除卷軸鎖定');if(!i||!c.bag[a.item])throw new Error('沒有此卷軸');if(i.eff==='poly'){if(hasPolyControl(c)&&!a.id)throw new Error('請先在自選介面選擇變身');log(c,usePolymorph(c,a.id,now,rng,a.item),'magic',now);}else if(i.eff==='magicbarrier'){if((c.magicBarrierCooldown||0)>now)throw new Error('魔法屏障冷卻中');consume(c,a.item);c.buffs[a.item]={until:now+16000,d:{magicBarrier:1}};event(c,'magic',now,{item:a.item,effect:'魔法屏障 · 16 秒 · 抵擋一次魔法攻擊'});}else if(i.eff==='teleport_scroll'){consume(c,a.item);resetBossParticipation(c);c.zone='town_silver_knight';c.running=false;log(c,'瞬間移動回銀騎士村','magic',now);}else throw new Error('此卷軸效果的完整規則未公開');break;
 case 'sell':if(c.locked?.includes(a.item))throw new Error('道具已鎖定');if(!i||i.noSell||!Number.isFinite(i.p)||i.p<=0||c.doll===a.item||Object.values(c.equipment).some(x=>x.id===a.item))throw new Error('無法出售已裝備或不可出售的道具');consume(c,a.item);c.gold+=Math.floor(i.sellP??i.p*.25);if(!c.bag[a.item]&&!c.bank[a.item]){delete c.enh[a.item];if(c.affixes)delete c.affixes[a.item];if(c.darkAffixes)delete c.darkAffixes[a.item];}break;
 case 'equip':{if(i?.doll){log(c,summonDoll(c,a.item,now),'info',now);break;}if(!i||!usable(c,i)||!c.bag[a.item]||!['wpn','arm','acc'].includes(i.type)||i.noEquip||i.isArrow)throw new Error('無法裝備');let slot=i.type==='wpn'?'weapon':i.slot||'armor';if(slot==='ring'){slot=a.slot==='ring2'?'ring2':a.slot==='ring'?'ring':!c.equipment.ring?'ring':!c.equipment.ring2?'ring2':'ring';if(Object.values(c.equipment).some(e=>e.id===a.item)&&(c.bag[a.item]||0)<2)throw new Error('需要第二件戒指才能同時穿戴');}if(slot==='ear1'){slot=a.slot==='ear2'?'ear2':!c.equipment.ear1?'ear1':!c.equipment.ear2?'ear2':'ear1';if(Object.values(c.equipment).some(e=>e.id===a.item)&&(c.bag[a.item]||0)<2)throw Error('需要第二件耳環才能同時穿戴');}if(slot==='shield'&&(DATA.items[c.equipment.weapon?.id]?.w2h||DATA.items[c.equipment.weapon?.id]?.twohanded))throw new Error('雙手武器不能同時裝備盾牌');if(c.equipment[slot]?.id!==a.item&&isCursed(c,c.equipment[slot]?.id||''))throw Error('目前穿戴裝備被詛咒，請先找碧恩解除詛咒');if((i.w2h||i.twohanded)&&isCursed(c,c.equipment.shield?.id||''))throw Error('盾牌被詛咒，不能改穿雙手武器');if(i.w2h||i.twohanded)delete c.equipment.shield;c.equipment[slot]={id:a.item,en:c.enh[a.item]||0};log(c,`裝備 ${i.n}`,'info',now);break;}
 case 'unequip':if(a.slot==='doll')c.doll=null;else{if(isCursed(c,c.equipment[String(a.slot)]?.id||''))throw Error('裝備被詛咒，請先找碧恩解除詛咒');delete c.equipment[String(a.slot)];}break;
 case 'potion':if(i?.eff==='poly')log(c,usePolymorph(c,undefined,now,rng),'magic',now);else potion(c,a.item,now);break;
 case 'polyUse':log(c,usePolymorph(c,a.id,now,rng,a.item),'magic',now);break;
 case 'polyUnlock':log(c,unlockPolymorph(c,String(a.id)),'magic',now);break;
 case 'polyCancel':delete c.poly;c.autoPoly=false;if(c.autoConfig?.aux.scroll_poly)c.autoConfig.aux.scroll_poly.enabled=false;log(c,'已解除變身並停止自動續用','info',now);break;
 case 'polySettings':for(const key of ['autoPoly','autoBuyPoly','polyLook'] as const){if(a[key]!==undefined){if(typeof a[key]!=='boolean')throw new Error('變身設定無效');c[key]=a[key];}}if(c.autoConfig)c.autoConfig.aux.scroll_poly={enabled:!!c.autoPoly,directGold:!!c.autoBuyPoly};break;
 case 'autoConfig':c.autoConfig=validateAutoConfig(c,a.config);if(c.autoConfig.aux.scroll_poly){c.autoPoly=c.autoConfig.aux.scroll_poly.enabled;c.autoBuyPoly=c.autoConfig.aux.scroll_poly.directGold;}break;
 case 'sellAll':{if(!i||i.noSell||!(i.p>0)||c.locked?.includes(a.item)||c.doll===a.item||Object.values(c.equipment).some(e=>e.id===a.item))throw new Error('無法出售穿戴或鎖定物品');const n=c.bag[a.item];if(!Number.isInteger(n)||n<1)throw new Error('沒有此物品');consume(c,a.item,n);c.gold+=n*Math.floor(i.sellP??i.p*.25);if(!c.bank[a.item]){delete c.enh[a.item];if(c.affixes)delete c.affixes[a.item];if(c.darkAffixes)delete c.darkAffixes[a.item];}log(c,`全部售出 ${i.n} ×${n}`,'loot',now);break;}
 case 'settings':c.autoPotion=!!a.autoPotion;c.threshold=clamp(Number(a.threshold)||70,10,95);if(['potion_heal','potion_strong','potion_ult'].includes(a.potion))c.potion=a.potion;break;
 case 'point':if(!['str','dex','con','int','wis','cha'].includes(a.attr)||c.points<=0)throw new Error('沒有可用配點');if(c.attrs[a.attr]>=60)throw new Error('單一能力升級配點上限為 60');c.attrs[a.attr]++;c.points--;break;
 case 'elfElement':{if(c.cls!=='elf'||!['fire','water','wind','earth'].includes(a.element))throw Error('妖精屬性無效');if(c.running)throw Error('請先停止狩獵再更換屬性');c.elfEle=a.element;for(const k of Object.keys(c.buffs))if(DATA.skills[k]?.reqEle||DATA.skills[k]?.reqEleAny)delete c.buffs[k];log(c,'妖精屬性已變更','magic',now);break;}
 case 'learn':{const sk=DATA.skills[a.skill];if(!sk||!specialSkillSupported(a.skill,sk.type)||c.skills.includes(a.skill)||c.lv<skillLevel(c,sk))throw Error('未符合職業或等級需求，或已學會此魔法');const reason=elementError(c,sk);if(reason)throw Error(reason);if(a.npc!==undefined){if(!isGilenTeacher(c.zone,findNpc(c.zone,String(a.npc),c.npcConfig)))throw Error('請至目前村莊的吉倫學習');const book=Object.keys(gilenBookStock()).find(id=>DATA.items[id].sk===a.skill);if(!book)throw Error('吉倫僅傳授 1～3 級一般魔法');const cost=purchaseCost(c.zone,String(a.npc),book,1,c.npcConfig);if(c.gold<cost)throw Error('金幣不足');c.gold-=cost;}else{const book=a.book!==undefined?String(a.book):availableSkillBook(c,a.skill);if(book&&(!c.bag[book]||c.locked?.includes(book)||DATA.items[baseItem(book)]?.type!=='skillbk'||DATA.items[baseItem(book)]?.sk!==a.skill))throw Error('需要背包中未鎖定的對應技能書');if(!book)throw Error('需要背包中未鎖定的對應技能書');consume(c,book);}c.skills.push(a.skill);log(c,`學會 ${sk.n}`,'magic',now);break;}
 case 'cast':{const before=c.eventSeq||0;cast(c,a.skill,now,rng);for(const event of c.events||[])if(event.seq>before)event.manual=true;break;}
 case 'autoSkill':if(!c.skills.includes(a.skill))throw new Error('尚未學習');c.autoSkills=c.autoSkills.includes(a.skill)?c.autoSkills.filter(k=>k!==a.skill):[...c.autoSkills,a.skill].slice(-4);if(c.autoConfig){const kind=DATA.skills[a.skill]?.type;if(kind==='buff'){const buffs=c.autoConfig.buffs;c.autoConfig=validateAutoConfig(c,{buffs:buffs.includes(a.skill)?buffs.filter(id=>id!==a.skill):[...buffs,a.skill]});}else if(['atk','heal','convert'].includes(kind)){const key=kind==='atk'?'attack':kind;c.autoConfig=validateAutoConfig(c,{[key]:c.autoConfig[key as 'attack'|'heal'|'convert']===a.skill?'':a.skill});}}break;
 case 'target':if(!Number.isInteger(a.slot)||!c.arena?.[a.slot]?.hp)throw new Error('目標不存在');c.arenaTarget=a.slot;syncTarget(c);break;
 case 'enhance':if(a.expectedEn!==undefined&&a.expectedEn!==(c.enh[a.item]||0))throw new Error('裝備強化值已變更，請重新點選');log(c,enhanceGear(c,String(a.item),String(a.mode||'normal'),rng),'loot',now);break;
 case 'affix':log(c,affixGear(c,String(a.item),rng,String(a.npc||''),a.material===undefined?undefined:String(a.material)),'loot',now);break;
 case 'attrMagic':log(c,weaponMagicGear(c,String(a.item),rng,String(a.npc||''),undefined,a.element||'fire',Number(a.goal||0),Number(a.maxCount||1)),'loot',now);break;
 case 'uncurse':log(c,uncurseGear(c,String(a.item),String(a.npc||''),a.material===undefined?undefined:String(a.material)),'loot',now);break;
 case 'buyAffix':throw new Error('舊賦予祝福卷軸已停用，請使用元素武器強化卷軸');
 case 'lockItem':if(!i||!c.bag[a.item])throw new Error('沒有此道具');c.locked=c.locked?.includes(a.item)?c.locked.filter(x=>x!==a.item):[...(c.locked||[]),a.item];break;
 case 'autoSell':if(!canAutoSell(String(a.item||'')))throw new Error('此物品不可自動販賣');if(a.enabled!==undefined&&typeof a.enabled!=='boolean')throw new Error('自動販賣設定無效');{const key=baseItem(a.item),enabled=a.enabled??!c.autoSell?.includes(key);if(enabled&&!c.autoSell?.includes(key)&&!Object.entries(c.bag).some(([id,n])=>n>0&&baseItem(id)===key)&&!Object.values(c.equipment).some(eq=>baseItem(eq.id)===key))throw new Error('只能新增背包或身上持有的物品');c.autoSell=enabled?[...new Set([...(c.autoSell||[]),key])]:(c.autoSell||[]).filter(x=>x!==key);}break;
 case 'bank':if(i?.noWh)throw new Error('此道具不能存入倉庫');if(!i)throw new Error('道具不存在');if(c.doll===a.item&&backpackCount(c,a.item)<1||Object.values(c.equipment).some(x=>x.id===a.item))throw new Error('請先卸下裝備');if(a.direction==='in'){consume(c,a.item);c.bank[a.item]=(c.bank[a.item]||0)+1;}else{if(!c.bank[a.item])throw new Error('倉庫沒有道具');c.bank[a.item]--;if(!c.bank[a.item])delete c.bank[a.item];addItem(c,a.item);}break;
 case 'doll':log(c,summonDoll(c,a.item,now),'info',now);break;
 case 'drawDoll':throw Error('活動期間抽卡暫停，請使用娃娃契約書');
 case 'gacha':{if(c.gold<300000)throw new Error('需要 300,000 金幣');const total=weightedPool.reduce((s,k)=>s+DATA.items[k].gachaWeight,0);let roll=rng()*total;let id=weightedPool[weightedPool.length-1];for(const k of weightedPool){roll-=DATA.items[k].gachaWeight;if(roll<0){id=k;break;}}c.gold-=300000;addItem(c,id);log(c,`黑市抽中 ${DATA.items[id].n}`,'loot',now);break;}
 default:throw new Error('不支援的操作');
 }
 for(const ch of save.characters)settleBossRewards(ch,now,rng);bindDollCollections(save);bindPolymorphUnlocks(save);ensureArena(c,rng,now);const b=stats(c,now);c.hp=clamp(c.hp,1,b.maxHp);event(c,'state',now);c.mp=clamp(c.mp,0,b.maxMp);
}

