import atlases from './four-dragon-atlases.json';
import animations from './combat-animation.json';
import {fourDragon} from './four-dragons';
export type DragonSheet={src:string;count:number;w:number;h:number;cols:number;rows:number};
export type DragonClip={body:DragonSheet;shadow?:DragonSheet;weapon?:DragonSheet};
const offsets:Record<string,{ox:number;oy:number;delay:number;hold:number}>={antaras:{ox:161,oy:135,delay:8,hold:2},fafurion:{ox:39,oy:129,delay:0,hold:0},valakas:{ox:286,oy:189,delay:0,hold:0},lindvior:{ox:226,oy:338,delay:0,hold:0}};
export const DRAGON_SOURCE_FPS=8;
export function sourceDragonClip(id:string,action:string):DragonClip|undefined{
 const custom=(atlases as Record<string,Record<string,DragonSheet>>)[id];
 if(id==='lindvior')return custom?.[action]?{body:custom[action],shadow:custom[action+'_s']}:undefined;
 return (animations as unknown as Record<string,{root:Record<string,DragonClip>}>)[fourDragon(id)?.n]?.root[action];
}
export function sourceDragonFx(id:string){const sheet=(atlases as Record<string,Record<string,DragonSheet>>)[id]?.skill_effect;return sheet?{sheet,...offsets[id]}:undefined;}
export function sourceDragonFrame(elapsed:number,count:number,loop=false){const frame=Math.floor(Math.max(0,elapsed)*DRAGON_SOURCE_FPS/1000);return loop?frame%count:frame<count?frame:-1;}
export function sourceDragonFxFrame(id:string,elapsed:number){const fx=sourceDragonFx(id);if(!fx)return -1;const frame=Math.floor(Math.max(0,elapsed)*DRAGON_SOURCE_FPS/1000)-fx.delay;return frame<0||frame>=fx.sheet.count+fx.hold?-1:Math.min(fx.sheet.count-1,frame);}
export function sourceDragonClipMs(id:string,action:string){return (sourceDragonClip(id,action)?.body.count||8)*1000/DRAGON_SOURCE_FPS;}
