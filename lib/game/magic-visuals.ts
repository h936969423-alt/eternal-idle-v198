import effects from './magic-fx.json';
import raw from './gamedata.json';
import type {CombatEvent} from './engine';

export type MagicVisual={frames:string[];fps:number;self:boolean;proj?:number|boolean;layers?:string[][];shadowFrames?:string[];directions?:string[][];shadowDirections?:string[][];dirs?:number;nw?:number;nh?:number;oh?:number|boolean;h?:number;w?:number;width?:number;blend?:string;ax?:number;ay?:number;targetVc?:number;projScale?:number;imported?:boolean};
export function magicVisual(event:Pick<CombatEvent,'skill'|'effectName'|'item'>){
 const name=event.effectName||(event.skill?(raw.skills as Record<string,{n:string}>)[event.skill]?.n:event.item?((raw.items as Record<string,any>)[event.item]?.eff==='magicbarrier'?'魔法屏障':(raw.items as Record<string,any>)[event.item]?.n):'');
 return {name,config:(effects as Record<string,MagicVisual>)[name]};
}
export function magicDirection(config:MagicVisual,dx:number,dy:number){
 const base=Math.round((Math.atan2(dx,-dy)*180/Math.PI+360)%360/45)%8;
 const index=config.dirs===4?[1,2,3,3,1,3,3,2][base]:(base+1)%8;
 return {frames:config.directions?.[index]?.length?config.directions[index]:config.frames,shadow:config.shadowDirections?.[index]||config.shadowFrames,flip:config.dirs===4&&base>=5};
}
export function magicFlightMs(distance:number){return Math.max(140,Math.min(380,Math.max(0,distance)/1600*1000));}
export function isFlyingMagic(event:CombatEvent){
 return event.kind==='attack'&&event.slot!==undefined&&event.source!=='monster'&&event.source!=='pet'&&event.source!=='summon'&&event.source!=='poison'&&!!magicVisual(event).config?.proj;
}
export function magicFrame(elapsed:number,fps:number,count:number,loop=false){
 if(count<1)return -1;
 const frame=Math.floor(Math.max(0,elapsed)*fps/1000);
 return loop?frame%count:frame<count?frame:-1;
}
export function magicVisualPaths(config:MagicVisual){return [...new Set([config.frames,...(config.layers||[]),config.shadowFrames||[],...(config.directions||[]),...(config.shadowDirections||[])].flat())];}
