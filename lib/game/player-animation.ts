type Frames=Record<string,string[]|undefined>;
// A missing pose must never change an active polymorph's visual identity.
export function playerAnimationClips(base:string,frames:Frames,direction:number,poly?:Frames){
 const first=(...clips:(string[]|undefined)[])=>clips.find(c=>c?.length)||[];
 if(poly){
  const idle=first(poly.idle,poly.attack,poly.skill,poly.cast,poly.hurt);
  const attack=first(poly.attack,idle);
  return {idle,attack,skill:first(poly.skill,poly.cast,attack,idle),hurt:first(poly.hurt,idle),death:first(poly.death,poly.hurt,idle)};
 }
 const get=(kind:string)=>first(base==='knight_2hsword'?frames[`knight8/${kind}/${direction}`]:undefined,frames[`${base}/${kind}/2`],frames[`${base}/${kind}`]);
 const attack=get('attack');
 // Knight attacks have directional clips, but the old casting sheet is a
 // single direction. Prefer a matching pose rather than turning for a cast.
 const skill=base==='knight_2hsword'&&frames[`knight8/attack/${direction}`]?.length
  ?first(frames[`knight8/skill/${direction}`],frames[`knight8/cast/${direction}`],attack)
  :first(get('skill'),get('cast'),attack);
 return {idle:get('idle'),attack,skill,hurt:get('hurt'),death:get('death')};
}
