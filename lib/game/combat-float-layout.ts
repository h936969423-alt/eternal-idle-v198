/** Three local rows keep rapid hits from climbing indefinitely into the HP/header area. */
export function combatFloatLayout(lane:number){
 const n=Math.max(0,Math.floor(lane));
 // Three rows by three columns, spaced for three-digit numbers, so a Triple Arrow volley plus normal
 // hits stay readable instead of stacking on one spot.
 return {top:'10%',marginTop:`${n%3*20}px`,marginLeft:`${(Math.floor(n/3)%3-1)*34}px`};
}
