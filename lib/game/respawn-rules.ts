import {activeSpeedStages} from './reusable-speed';
import raw from './gamedata.json';
import {activeForm} from './polymorph';
import {mapGeneration} from './map-pools';
import type {Character} from './engine';

const items=raw.items as Record<string,any>;
export function moveDelayMultiplier(c:Character,now:number){
 const stages=activeSpeedStages(c,now);
 const on=(id:string)=>c.buffs[id]?.until>now;
 const form=activeForm(c,now) as (ReturnType<typeof activeForm>&{walkTicks?:number});
 let mult=(form?.walkTicks??16)/16;
 const gear=Object.values(c.equipment).map(eq=>items[eq.id.split('@')[0]]).filter(Boolean);
 if(stages.has(1)||['potion_haste','sk_haste_spell','sk_greater_haste','sk_helm_dex2'].some(on)||gear.some(i=>i.eff==='haste'))mult/=1.33;
 if(stages.has(2)||on('potion_brave'))mult/=1.33;
 const wind=on('sk_elf_winddash'),dash=wind?'sk_elf_winddash':on('sk_holy_dash')?'sk_holy_dash':null;
 if(dash)mult/=(raw.skills as Record<string,any>)[dash]?.moveSpeedMult||1.33;
 if(on('new_item_139')&&!wind&&!stages.has(2))mult/=1.15;
 if(on('sk_dark_walkhaste'))mult/=1.15;
 if(stages.has(3))mult/=1.33;
 let movePct=gear.reduce((sum,i)=>sum+(i.moveSpeedPct||0),0);
 for(const b of Object.values(c.buffs))if(b.until>now)movePct+=b.d.moveSpeedPct||0;
 if(movePct)mult/=1+Math.max(-95,movePct)/100;
 return Math.max(.001,mult);
}
export function ordinaryRespawnMs(c:Character,now:number,stats?:Record<string,number>){
 const g=mapGeneration(c.zone,c.mapPools);
 let mult=moveDelayMultiplier(c,now);
 if(c.buffs.sk_sunlight?.until>now)mult*=.8;
 if(Object.entries(c.buffs).some(([id,b])=>/sherine|shilen/.test(id)&&b.until>now))mult*=.8;
 // Preserve 1–2% W boot bonuses instead of rounding them away at 100ms precision.
 const precise=Object.values(c.equipment).some(eq=>{const i=items[eq.id.split('@')[0]];return i?.lwCatalogId&&(i.moveSpeedPct||0)>0;});
 return precise?Math.max(500,Math.round(g.respawnSeconds*1000*mult)):Math.max(5,Math.round(g.respawnSeconds*10*mult))*100;
}
