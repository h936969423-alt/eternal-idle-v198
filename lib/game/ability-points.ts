import type {Character} from './engine';
export const earnedLevelPoints=(level:number)=>Math.max(0,level-50);
export const levelPointGain=(from:number,to:number)=>Math.max(0,earnedLevelPoints(to)-earnedLevelPoints(from));
// Retain spent attributes; remove only unspent grants from the former Lv.2–50 rule, once.
export function upgradeAbilityPoints(c:Character){if(c.levelPointsVersion===2)return;c.points=Math.max(0,c.points-Math.max(0,Math.min(49,c.lv-1)));c.levelPointsVersion=2;}
