import {skillVisual} from './skill-visuals';
import {canonicalWSkill} from './lineagew-skill-data';
import legacyEffectNames from './legacy-skill-effect-names.json';
import type {TargetSpellAtlas} from './spell-effect-layout';
import effects from './magic-fx.json';
import raw from './gamedata.json';
import type {CombatEvent} from './engine';

export type MagicVisual={atlas?:TargetSpellAtlas;frames:string[];fps:number;self:boolean;proj?:number|boolean;layers?:string[][];shadowFrames?:string[];directions?:string[][];shadowDirections?:string[][];dirs?:number;nw?:number;nh?:number;oh?:number|boolean;h?:number;w?:number;width?:number;blend?:string;ax?:number;ay?:number;targetVc?:number;projScale?:number;imported?:boolean;hitFrame?:number};
export function magicVisual(event:Pick<CombatEvent,'skill'|'effectName'|'item'>){
 const names=legacyEffectNames as Record<string,string>,id=event.skill?canonicalWSkill(event.skill):undefined,skill=id?(raw.skills as Record<string,any>)[id]:undefined;
 const original=names[skill?.lwLegacyId||event.skill||''];
 const name=event.effectName||(event.skill?names[event.skill]||skill?.n:event.item?((raw.items as Record<string,any>)[event.item]?.eff==='magicbarrier'?'魔法屏障':(raw.items as Record<string,any>)[event.item]?.n):'');
 const fallback=skill?.lwSourceId?(skill.type==='heal'?'初級治癒術':skill.type==='buff'?'保護罩':skill.dmgType==='physical'?'衝擊之暈':'光箭'):undefined;
 return {name,config:(effects as Record<string,MagicVisual>)[name]||(original?(effects as Record<string,MagicVisual>)[original]:undefined)||(skill?.lwSourceId&&skill.type!=='passive'?skillVisual(event.skill!,skill):fallback?(effects as Record<string,MagicVisual>)[fallback]:undefined)};
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
export function magicVisualPaths(config:MagicVisual){if(config.atlas)return [config.atlas.src];return [...new Set([config.frames,...(config.layers||[]),config.shadowFrames||[],...(config.directions||[]),...(config.shadowDirections||[])].flat())];}
export function magicEffectLifetime(event:CombatEvent){
 const {config}=magicVisual(event);
 return config?Math.max(2000,Math.ceil(Math.max(config.frames.length,...(config.layers||[]).map(layer=>layer.length))*1000/config.fps)+100):2000;
}

/** Impact timing in the visual's own frame clock. A configured hitFrame is
 * authoritative; otherwise use the last visible frame, not a global 500ms. */
export function spellImpactMs(event:Pick<CombatEvent,'skill'|'effectName'|'item'>){
 const config=magicVisual(event).config;
 if(!config)return 500;
 const frames=Math.max(1,config.frames.length,...(config.layers||[]).map(layer=>layer.length),...(config.directions||[]).map(dir=>dir.length));
 const frame=Math.max(0,Math.min(frames-1,config.hitFrame??frames-1));
 return Math.round(frame*1000/Math.max(1,config.fps));
}

