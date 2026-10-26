/** pp771007/idle-lineage-class css/style.css: 800x450 viewport, 242px ground
 * band, unscaled pixel sprites and a 185px cap for bosses/large canvases. */
export const SUNRISE_SCENE_WIDTH=800;
export const SUNRISE_GROUND_HEIGHT=242;
export const SUNRISE_BOSS_HEIGHT=185;
export const SUNRISE_MONSTER_HEIGHT=134;
const large=new Set(['遺忘之島飛龍','哈維','遺忘之島哈維','希爾黛斯']);
export function sunriseMonsterSize(name:string,width:number,height:number,boss=false){
 const cap=boss||large.has(name)?SUNRISE_BOSS_HEIGHT:SUNRISE_MONSTER_HEIGHT;
 const scale=height>0?Math.min(1,cap/height):1;
 return {width:width*scale,height:height*scale,scale};
}
