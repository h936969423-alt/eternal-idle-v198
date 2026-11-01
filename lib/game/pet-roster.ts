import petGear from './sunrise-pet-items.json';
import type {Character,Save} from './engine';
import {PET_BOOK,ensurePet,petNamesOut,petForm,type PetState} from './pet-system';
import raw from './gamedata.json';
export const PET_STORAGE_MAX=32,PET_CARRY_MAX=4;
export const PET_LURES:Record<string,{name:string;mobs:Record<string,string>}>= {
 general:{name:'一般誘捕',mobs:Object.fromEntries(['狼','牧羊犬','杜賓狗','哈士奇','熊','貓','浣熊','聖伯納犬','狐狸','小獵犬','柯利'].map(n=>[n,n]))},
 rabbit:{name:'暴走兔誘捕',mobs:{暴走兔:'暴走兔'}},tiger:{name:'虎男誘捕',mobs:{老虎:'虎男'}},kangaroo:{name:'袋鼠誘捕',mobs:{袋鼠:'袋鼠'}},panda:{name:'熊貓誘捕',mobs:{熊貓:'熊貓'}},monkey:{name:'猴子誘捕',mobs:{猴子:'猴子'}},korea:{name:'高麗幼犬誘捕',mobs:{高麗幼犬:'高麗幼犬'}}
};
export const PET_ITEMS:Record<string,any>={};
for(const [key,lure] of Object.entries(PET_LURES))PET_ITEMS['sunrise_pet_lure_'+key]={n:lure.name+'藥劑',type:'cons',p:5000,weight:1,petLure:key,d:'使用後600秒內，擊殺對應動物取得一隻寵物；捕獲後消耗誘捕狀態。'};
for(const [key,n,price] of [['evolve','進化果實',100000],['victory','勝利果實',500000]] as const)PET_ITEMS['sunrise_pet_fruit_'+key]={n,type:'cons',p:price,weight:1,petFruit:key,d:'30級以上、可進化的一般寵物使用。'};
for(const [key,form] of [['naughty','頑皮龍'],['playful','淘氣龍'],['curse','詛咒蜥蜴'],['doom','厄運蜥蜴']] as const)PET_ITEMS['sunrise_pet_egg_'+key]={n:form+'蛋',type:'cons',p:200000,weight:1,petEgg:form,d:'孵化後送入寵物保管。'};
Object.assign(PET_ITEMS,petGear);
Object.assign(raw.items,PET_ITEMS);
// Meat now grants the general lure (see engine potion); describe it at runtime so the locked item catalogue stays unchanged.
for(const item of Object.values(raw.items as Record<string,any>))if(item?.eff==='meat')item.d='食用後獲得一般誘捕狀態300秒：擊殺狼、牧羊犬、杜賓狗、哈士奇、熊等動物可取得寵物（與一般誘捕藥劑相同，捕獲後消耗）';

/** Account save is authoritative. Never merge stale character mirrors back over the roster. */
export function bindPetRoster(save:Save,now:number){
 if(save.petRosterVersion!==1){
  const roster:Record<string,PetState>={};
  for(const c of save.characters){const remap:Record<string,string>={};for(const [key,p] of Object.entries(c.pets||{})){const form=p.form||key;if(!PET_BOOK[form])continue;if(p.v!==2){const dead=p.hp===0;ensurePet(c,key,now);if(dead){p.hp=0;p.deadAt??=now;}}const oldNeed=Math.max(1,Math.floor(80*Math.pow(p.lv,2.1)/10)),newNeed=p.lv>=49?3606509:p.lv>=45?Math.floor([729360,1508416,3495263,9912189][p.lv-45]/10):oldNeed;p.xp=Math.floor(Math.min(.999999,(p.xp||0)/oldNeed)*newNeed);const uid=p.uid||`pet-${c.id}-${key}`;remap[key]=uid;roster[uid]||={...p,uid,form,...((c.petActives||(c.petActive?[c.petActive]:[])).includes(key)?{owner:c.id}:{})};}
   c.petActives=(c.petActives||(c.petActive?[c.petActive]:[])).map(id=>remap[id]).filter(Boolean);c.petActive=c.petActives[0]||'';c.petTraining='';
  }
  save.petRoster=roster;save.petRosterVersion=1;
 }
 const roster=save.petRoster||={};const owners=new Set(save.characters.map(c=>c.id));
 for(const p of Object.values(roster))if(p.owner&&!owners.has(p.owner))delete p.owner;
 for(const c of save.characters){c.pets=roster;c.petRosterVersion=1;c.petActives=Object.keys(roster).filter(id=>roster[id].owner===c.id);c.petActive=c.petActives[0]||'';}
}
export function acquirePet(c:Character,form:string,now:number){
 if(!PET_BOOK[form])throw Error('寵物型態不存在');c.pets||={};if(Object.keys(c.pets).length>=PET_STORAGE_MAX)throw Error('寵物保管已滿（32隻）');
 const uid=crypto.randomUUID(),def=PET_BOOK[form],p:PetState={uid,form,lv:def.lv0||5,xp:0,hit:0,damage:0,potPct:0,name:'',locked:false};c.pets[uid]=p;ensurePet(c,uid,now);return p;
}
export function controlledPet(c:Character,id:string,now:number){const p=c.pets?.[id];if(!p)throw Error('找不到這隻寵物');if(p.owner&&p.owner!==c.id)throw Error('此寵物正由其他角色出戰，請先收回');return ensurePet(c,id,now);}
export function petCharmUsed(c:Character){return petNamesOut(c).reduce((n,id)=>n+(PET_BOOK[petForm(c,id)]?.cha||6),0);}
export function deployPet(c:Character,id:string,cha:number,now:number){const p=controlledPet(c,id,now);if(p.owner===c.id){delete p.owner;c.petActives=petNamesOut(c).filter(x=>x!==id);}else{if(petNamesOut(c).length>=4)throw Error('最多出戰4隻寵物');if(petCharmUsed(c)+(PET_BOOK[p.form!].cha||6)>cha)throw Error('魅力不足，需加總所有出戰寵物需求');p.owner=c.id;c.petActives=[...petNamesOut(c),id];}c.petActive=c.petActives[0]||'';}
export function usePetItem(c:Character,key:string,now:number){const id=key.split('@')[0],item=PET_ITEMS[id];if(!item||!c.bag[key]||c.locked?.includes(key))throw Error('沒有可用的寵物道具');
 if(item.petEgg){acquirePet(c,item.petEgg,now);}else if(item.petLure){c.buffs['sunrise_pet_lure_'+item.petLure]={until:now+600000,d:{}};}else throw Error('請在寵物保管中選擇進化方向或裝備');
 c.bag[key]--;if(!c.bag[key])delete c.bag[key];
}
export function capturePet(c:Character,mobName:string,now:number){if(Object.keys(c.pets||{}).length>=32)return undefined;for(const key of ['korea','rabbit','tiger','kangaroo','panda','monkey','general']){const buff='sunrise_pet_lure_'+key,form=PET_LURES[key].mobs[mobName];if(form&&c.buffs[buff]?.until>now){const pet=acquirePet(c,form,now);delete c.buffs[buff];return pet;}}}
export function evolvePet(c:Character,id:string,fruit:string,now:number){const p=controlledPet(c,id,now),def=PET_BOOK[p.form!];if(p.lv<30)throw Error('寵物30級以上才能進化');if(def.tier!==0||!def.evo)throw Error('此型態不能再進化');const item=PET_ITEMS[fruit];if(!item?.petFruit||!c.bag[fruit]||c.locked?.includes(fruit))throw Error('缺少未鎖定的進化果實');
 p.form=item.petFruit==='victory'?'黃金龍':def.evo;p.lv=1;p.xp=0;p.maxHp=Math.max(1,Math.floor((p.skillBaseMaxHp||p.maxHp!)*.5));p.maxMp=Math.max(0,Math.floor(p.maxMp!*.5));p.hp=p.maxHp;p.mp=p.maxMp;delete p.skillBaseMaxHp;p.skillBuffs={};p.effects={};delete p.deadAt;c.bag[fruit]--;if(!c.bag[fruit])delete c.bag[fruit];
 // Evolution can raise charm cost: store that pet instead of silently exceeding the limit.
 if(p.owner===c.id){delete p.owner;c.petActives=petNamesOut(c).filter(x=>x!==id);c.petActive=c.petActives[0]||'';}
}

export function enforcePetCarry(c:Character,cha:number){let used=0,count=0;const kept:string[]=[];for(const id of petNamesOut(c)){const p=c.pets![id],need=PET_BOOK[p.form||id]?.cha||6;if(count>=4||used+need>cha){delete p.owner;continue;}used+=need;count++;kept.push(id);}c.petActives=kept;c.petActive=kept[0]||'';}
