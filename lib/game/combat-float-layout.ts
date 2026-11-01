/** Four local rows keep rapid hits from climbing indefinitely into the HP/header area. */
export function combatFloatLayout(lane:number){
 const n=Math.max(0,Math.floor(lane));
 // One column, one line per number (afei style): a Triple Arrow volley reads as three stacked
 // numbers on its target; four rows before reusing the top line.
 return {top:'10%',marginTop:`${n%4*19}px`,marginLeft:'0px'};
}
