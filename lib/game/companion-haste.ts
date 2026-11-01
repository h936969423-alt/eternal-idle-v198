import raw from './gamedata.json';
/** Green potion (自我加速藥水) for pets and summons: +33% attack speed, like the player's. */
export type CompanionKind='pet'|'summon';
export const COMPANION_HASTE_BUFF:Record<CompanionKind,string>={pet:'companion_haste_pet',summon:'companion_haste_summon'};
export const COMPANION_HASTE_ITEM='potion_haste';
export const COMPANION_HASTE_MULT=1.33;
const items=raw.items as Record<string,{p?:number;dur?:number;n?:string}>;
export const COMPANION_HASTE_MS=(items[COMPANION_HASTE_ITEM]?.dur||300)*1000;
export const COMPANION_HASTE_PRICE=items[COMPANION_HASTE_ITEM]?.p||200;
const label:Record<CompanionKind,string>={pet:'寵物',summon:'召喚物'};
type Holder={buffs:Record<string,{until:number;d:Record<string,number>}>;bag:Record<string,number>;locked?:string[];gold:number;companionHasteAuto?:Partial<Record<CompanionKind,boolean>>};
export function companionHasteUntil(c:Pick<Holder,'buffs'>,kind:CompanionKind){return c.buffs?.[COMPANION_HASTE_BUFF[kind]]?.until||0;}
/** Attack interval divisor for a companion at time `at`. */
export function companionHasteFactor(c:Pick<Holder,'buffs'>,kind:CompanionKind,at:number){return companionHasteUntil(c,kind)>at?COMPANION_HASTE_MULT:1;}
/** Uses one unlocked 自我加速藥水 from the bag, otherwise pays its shop price in gold. Refreshes, never stacks. */
export function giveCompanionHaste(c:Holder,kind:CompanionKind,active:number,now:number):string{
 if(active<=0)throw Error(`沒有出戰中的${label[kind]}`);
 const fromBag=(c.bag[COMPANION_HASTE_ITEM]||0)>0&&!c.locked?.includes(COMPANION_HASTE_ITEM);
 if(!fromBag&&c.gold<COMPANION_HASTE_PRICE)throw Error(`金幣不足（需 ${COMPANION_HASTE_PRICE}）`);
 if(fromBag){c.bag[COMPANION_HASTE_ITEM]--;if(!c.bag[COMPANION_HASTE_ITEM])delete c.bag[COMPANION_HASTE_ITEM];}else c.gold-=COMPANION_HASTE_PRICE;
 // d stays empty so the player's own stats never read this buff.
 c.buffs[COMPANION_HASTE_BUFF[kind]]={until:now+COMPANION_HASTE_MS,d:{}};
 return `${label[kind]}喝下綠水：攻擊速度 +33%，${COMPANION_HASTE_MS/1000} 秒（${fromBag?'消耗自我加速藥水 ×1':`扣 ${COMPANION_HASTE_PRICE} 金幣`}）`;
}
/** Auto-renew when enabled and expired; silently skips when nothing to pay with. */
export function autoCompanionHaste(c:Holder,counts:Record<CompanionKind,number>,now:number):string[]{
 const out:string[]=[];
 for(const kind of ['pet','summon'] as CompanionKind[]){
  if(!c.companionHasteAuto?.[kind]||counts[kind]<=0||companionHasteUntil(c,kind)>now)continue;
  try{out.push(giveCompanionHaste(c,kind,counts[kind],now));}catch{}
 }
 return out;
}
