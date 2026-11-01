import {ARROW_FLIGHT_MS,TRIPLE_FLIGHT_MS,isTripleArrow} from './projectile-timing';
export {ARROW_FLIGHT_MS,TRIPLE_FLIGHT_MS} from './projectile-timing';
import footOffsets from './darkelf-foot-offsets.json';
/** Retain the death knight's existing pixel scale and foot anchor. The dark
 * elf sheet has far less transparent padding, so equal CSS boxes doubled it. */
export function playerSpriteLayout(formId?:string){return formId==='darkelf'?{viewBox:[113,102],x:30,y:29,width:59,height:66}:undefined;}
/** Red and Flame Death Knight sheets carry more transparent padding than the
 * original Death Knight sheet, so fitting each into the same box made them look
 * smaller. Scale them up to match the Death Knight's on-screen body size. */
export const POLYMORPH_DISPLAY_SCALE:Record<string,number>={morph_red_deathknight:1.2,morph_flame_deathknight:1.35};
export function polymorphDisplayScale(formId?:string){return (formId&&POLYMORPH_DISPLAY_SCALE[formId])||1;}
export function arrowFlight(from:{x:number;y:number},to:{x:number;y:number},interval:number){return {angle:Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI,delay:Math.min(1500,Math.max(30,interval*1000*.5)),duration:Math.min(240,Math.max(120,Math.hypot(to.x-from.x,to.y-from.y)/1100*1000))};}
export const PLAIN_ARROW='/assets/effects/arrows/plain/arrow.svg';
export const GREEN_ARROW='/assets/effects/arrows/green/arrow.svg';
export function arrowSprite(polyName?:string,showPolymorph=true){return showPolymorph&&(polyName==='黑暗精靈'||polyName==='高等黑暗精靈')?GREEN_ARROW:PLAIN_ARROW;}

export function playerSpriteFootOffset(formId:string|undefined,body:string){return formId==='darkelf'?(footOffsets as Record<string,number>)[body]||0:0;}

/** One arrow per confirmed hit; 70ms launch spacing is independent of each 200ms flight. */
export function combatArrowFlight(from:{x:number;y:number},to:{x:number;y:number},interval:number,skill?:string){const flight=arrowFlight(from,to,interval);return {...flight,delay:0,duration:isTripleArrow(skill)?TRIPLE_FLIGHT_MS:ARROW_FLIGHT_MS};}
