import config from './polymorph.json';
import items from './gamedata.json';
import type { Character, Save } from './engine';
export const POLYMORPH=config;
export type PolyForm=(typeof config.forms)[number];
export const LEGACY_POLY_IDS:Record<string,string>={morph_42:'morph_red_deathknight',morph_43:'morph_flame_deathknight',morph_44:'morph_heruby',morph_45:'morph_zeus',morph_46:'morph_esti'};
const canonical=(id:string)=>LEGACY_POLY_IDS[id]||id;
export function polyBand(level:number){return config.levelBands.filter(n=>level>=n).at(-1)??0;}
export function selectableForms(c:Character){const band=polyBand(c.lv),index=config.levelBands.indexOf(band),previous=config.levelBands[Math.max(0,index-1)];return config.forms.filter(f=>f.level===band||f.level===previous);}
export function unlockedForm(c:Character,form:PolyForm){return c.lv>=form.level&&selectableForms(c).some(f=>f.id===form.id)&&(!form.crystals||c.polyUnlocked?.some(id=>canonical(id)===form.id));}
export function activeForm(c:Character,now=Date.now()){return c.poly&&c.poly.until>now?config.forms.find(f=>f.id===canonical(c.poly!.id)):undefined;}
export function polySpeed(c:Character,now=Date.now()){return activeForm(c,now)?.bonus.speedPct||0;}
export function polyBonus(c:Character,now=Date.now()):Record<string,number>{const {speedPct,...bonus}=activeForm(c,now)?.bonus||{};return bonus;}
export function bindPolymorphUnlocks(save:Save){
 const valid=new Set(config.forms.filter(f=>f.crystals).map(f=>f.id));
 const unlocked=[...new Set([...(save.polyUnlocked||[]),...save.characters.flatMap(c=>c.polyUnlocked||[])].map(canonical))].filter(id=>valid.has(id));
 save.polyUnlocked=unlocked;
 for(const c of save.characters){c.polyUnlocked=unlocked;if(c.poly)c.poly.id=canonical(c.poly.id);if(c.polyPreferred)c.polyPreferred=canonical(c.polyPreferred);}
}
export function hasPolyControl(c:Character){const isControl=(key:string)=>{const id=key.split('@')[0],item=(items.items as Record<string,any>)[id];return id==='ap381_armor_20281'||item?.sourceTable==='armor'&&item?.sourceId===20281;};return Object.entries(c.bag).some(([key,count])=>count>0&&isControl(key))||Object.values(c.equipment).some(e=>isControl(e.id));}
export function polymorphScrolls(c:Character){return Object.entries(c.bag).filter(([key,count])=>count>0&&!c.locked?.includes(key)&&(items.items as Record<string,any>)[key.split('@')[0]]?.eff==='poly');}
function consumeScroll(c:Character,requested?:string){const key=requested||polymorphScrolls(c)[0]?.[0];if(!key||(c.bag[key]||0)<1||(items.items as Record<string,any>)[key.split('@')[0]]?.eff!=='poly')throw new Error('需要一張變形卷軸');if(c.locked?.includes(key))throw new Error('請先解除卷軸鎖定');c.bag[key]--;if(!c.bag[key])delete c.bag[key];}
export function usePolymorph(c:Character,id:string|undefined,now=Date.now(),rng:()=>number=Math.random,scrollItem?:string){
 let form:PolyForm|undefined;
 if(id){form=config.forms.find(f=>f.id===canonical(id));if(!form)throw new Error('變身不存在');if(!hasPolyControl(c))throw new Error('指定變身需要持有變形控制戒指');if(!unlockedForm(c,form))throw new Error('只能選擇目前與上一等級段已開啟的變身');}
 else {const band=polyBand(c.lv);let available=config.forms.filter(f=>f.level===band&&(!f.crystals||c.polyUnlocked?.some(id=>canonical(id)===f.id)));if(!available.length&&band===55)available=config.forms.filter(f=>f.level===52);form=available[Math.min(available.length-1,Math.floor(Math.max(0,rng())*available.length))];}
 if(!form)throw new Error('沒有可使用的變身');consumeScroll(c,scrollItem);c.poly={id:form.id,until:now+config.durationSeconds*1000};if(id)c.polyPreferred=form.id;return `變身為 ${form.name}，持續 ${config.durationSeconds} 秒`;
}
export function polymorphUnlockError(c:Character,id:string){const form=config.forms.find(f=>f.id===canonical(id));if(!form||!form.crystals)return '此變身不需要解鎖';if(c.lv<form.level)return `需要 Lv.${form.level}`;if(!hasPolyControl(c))return '開啟變身需要持有變形控制戒指';if(c.polyUnlocked?.some(id=>canonical(id)===form.id))return '此帳號已永久解鎖';if(c.gold<config.unlockCost.gold)return '需要金幣 6000 萬';for(const [item,count]of Object.entries(config.unlockCost.items)){if((c.bag[item]||0)<count)return `需要 ${(items.items as Record<string,any>)[item]?.n||item} ×${count}`;if(c.locked?.includes(item))return '請先解除解鎖材料的鎖定';}return null;}
export function unlockPolymorph(c:Character,id:string){const error=polymorphUnlockError(c,id);if(error)throw new Error(error);const form=config.forms.find(f=>f.id===canonical(id))!;c.gold-=config.unlockCost.gold;for(const [item,count]of Object.entries(config.unlockCost.items)){c.bag[item]-=count;if(!c.bag[item])delete c.bag[item];}c.polyUnlocked||=[];c.polyUnlocked.push(form.id);return `帳號永久解鎖 ${form.name}`;}
export function tickPolymorph(c:Character,now:number,rng:()=>number){
 if(activeForm(c,now))return null;
 const expired=!!c.poly;delete c.poly;
 if(c.running&&c.autoPoly){
  if(!polymorphScrolls(c).length&&c.autoBuyPoly&&c.gold>=items.items.scroll_poly.p){c.gold-=items.items.scroll_poly.p;c.bag.scroll_poly=1;}
  if(polymorphScrolls(c).length){const preferred=hasPolyControl(c)&&config.forms.some(f=>f.id===canonical(c.polyPreferred||'')&&unlockedForm(c,f))?c.polyPreferred:undefined;return usePolymorph(c,preferred,now,rng);}
 }
 return expired?'變身效果已結束':null;
}
