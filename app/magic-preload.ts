import {magicVisual,magicVisualPaths} from '@/lib/game/magic-visuals';
const loading=new Set<string>();
const inFlight=new Map<string,HTMLImageElement>();
function preload(paths:string[],priority:'high'|'low'='low'){
 if(typeof window==='undefined')return;
 for(const src of new Set(paths)){
  if(!src)continue;
  if(loading.has(src)){if(priority==='high'){const image=inFlight.get(src);if(image)image.fetchPriority='high';}continue;}
  loading.add(src);const image=new Image();inFlight.set(src,image);image.decoding='async';image.fetchPriority=priority;
  image.onload=()=>{image.onload=null;inFlight.delete(src);void image.decode?.().catch(()=>{});};
  image.onerror=()=>{loading.delete(src);inFlight.delete(src);};image.src=src;
 }
}
function paths(skill:string,firstOnly=false){
 const {config}=magicVisual({skill});if(!config)return [];
 if(config.atlas)return [config.atlas.src];
 if(!firstOnly)return magicVisualPaths(config);
 return [...new Set([config.frames[0],...(config.layers||[]).map(x=>x[0]),config.shadowFrames?.[0],...(config.directions||[]).map(x=>x[0]),...(config.shadowDirections||[]).map(x=>x[0])].filter((x):x is string=>!!x))];
}
export function preloadSkillEffect(skill:string){preload(paths(skill,true),'high');preload(paths(skill),'high');}
let backgroundGeneration=0;
export function preloadLearnedEffects(skills:string[]){
 // Warm the opening frame of EVERY learned spell and direction. A global
 // 100-image slice left later spells cold until their first click.
 preload(skills.flatMap(id=>paths(id,true)),'high');
 const generation=++backgroundGeneration,remaining=[...new Set(skills.flatMap(id=>paths(id)))];let cursor=0;
 const next=()=>{if(generation!==backgroundGeneration||typeof window==='undefined')return;preload(remaining.slice(cursor,cursor+16));cursor+=16;if(cursor<remaining.length)schedule();};
 const schedule=()=>{if(typeof window==='undefined')return;if(window.requestIdleCallback)window.requestIdleCallback(next,{timeout:500});else setTimeout(next,50);};
 schedule();
}
