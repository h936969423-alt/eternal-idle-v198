import fx from '@/lib/game/magic-fx.json';
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
 const name=(raw.skills as Record<string,{n:string}>)[skill]?.n;
 const config=(fx as Record<string,{frames?:string[];layers?:string[][];directions?:string[][]}>)[name];
 if(!config)return [];
 return [config.frames||[],...(config.layers||[]),...(config.directions||[])].flatMap(frames=>full?frames:frames.slice(0,2));
}
export function preloadSkillEffect(skill:string){preload(paths(skill,true));}
export function preloadLearnedEffects(skills:string[]){preload(skills.flatMap(id=>paths(id,false)));}
