import {magicVisual,magicVisualPaths} from '@/lib/game/magic-visuals';
import raw from '@/lib/game/gamedata.json';
const loading=new Set<string>();
function preload(paths:string[]){
 if(typeof window==='undefined')return;
 for(const src of new Set(paths)){
  if(!src||loading.has(src))continue;
  loading.add(src);const image=new Image();image.onload=()=>{image.onload=null;};image.onerror=()=>{loading.delete(src);};image.src=src;
 }
}
function paths(skill:string,full:boolean){
 const {config}=magicVisual({skill});
 if(!config)return [];
 return config.atlas?[config.atlas.src]:full?magicVisualPaths(config):config.frames.slice(0,2);
}
export function preloadSkillEffect(skill:string){preload(paths(skill,true));}
// Predecode full animation sequences for learned offensive spells while the
// player is browsing/idle, so the first confirmed hit does not reveal frames
// one HTTP request at a time. Keep utility/buff previews lightweight.
const OFFENSIVE_FX=new Set(['光箭','冰箭','風刃','寒冷戰慄','火箭','地獄之牙','極光雷電','寒冰氣息','燃燒的火球','吸血鬼之吻','岩牢','極道落雷','冰錐','地裂術','烈炎術','冰矛圍籬','龍捲風','冰雪暴','震裂術','雷霆風暴','火風暴','流星雨','究極光裂術','衝擊之暈']);
export function preloadLearnedEffects(skills:string[]){
 const definitions=raw.skills as Record<string,{n:string}>;
 const primary=skills.filter(id=>OFFENSIVE_FX.has(definitions[id]?.n));
 // Bound initial image requests on mobile; a cast still preloads its entire FX.
 const offensive=primary.flatMap(id=>paths(id,true)).slice(0,100);
 const utility=skills.filter(id=>!OFFENSIVE_FX.has(definitions[id]?.n)).flatMap(id=>paths(id,false)).slice(0,Math.max(0,100-offensive.length));
 preload([...offensive,...utility]);
}

