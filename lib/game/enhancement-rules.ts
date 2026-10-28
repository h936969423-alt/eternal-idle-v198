// Published reference: https://zxc518zxc.github.io/enhance.html (2026-10-05).
// Rare success rates use the published rounded values; complementary hold rates sum to 100%.
export function enhancementRates(type:string,en:number,safe:number,blessed:boolean,guaranteed:boolean,special?:number){
 if(guaranteed||en<safe)return {success:1,hold:0,destroy:0};
 if(special!==undefined){const success=Math.max(0,Math.min(1,special/100));return {success,hold:0,destroy:1-success};}
 if(type==='acc'){const success=[.5,.4,.3][en]??.2;return {success,hold:0,destroy:1-success};}
 if(type==='wpn'){const success=en<9?1/3:blessed?1/(3*(en+1)):en>=12?Math.max(Number.MIN_VALUE,.0074*Math.pow(.9,en-11)):({9:.009,10:.0081,11:.0074} as Record<number,number>)[en];return {success,hold:en<9?0:1/3-success,destroy:2/3};}
 const offset=en-safe,base=1/(offset+4);const success=offset<5?base:blessed?1/((offset+4)*(offset+5)):({5:.003,6:.0024,7:.002} as Record<number,number>)[offset];return {success,hold:offset<5?0:base-success,destroy:1-base};
}
export function blessingGainRange(type:string,en:number,special:boolean):[number,number]{return special?[1,1]:type==='acc'?[1,3]:en<3?[1,3]:en<6?[1,2]:[1,1];}
