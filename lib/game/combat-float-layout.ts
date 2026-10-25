/** Two local rows keep rapid hits from climbing indefinitely into the HP/header area. */
export function combatFloatLayout(lane:number){
 const n=Math.max(0,Math.floor(lane));
 return {top:'10%',marginTop:`${n%2*18}px`,marginLeft:`${(Math.floor(n/2)%3-1)*22}px`};
}
