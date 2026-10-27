import type {MagicVisual} from './magic-visuals';
/** Original Eternal vector effects; no claim to reproduce W's proprietary animation. */
const cache=new Map<string,MagicVisual>();
export function skillVisual(id:string,s:any):MagicVisual{
 const cached=cache.get(id);if(cached)return cached;
 const seed=Number(s.lwSourceId)||0;
 const color=({fire:'#ff7749',water:'#69dfff',wind:'#aaff8c',earth:'#e3bc67'} as Record<string,string>)[s.ele]||({normal:'#fff3ce',advanced:'#8dff9f',rare:'#5dc9ff',hero:'#ff7979',legend:'#ca97ff',mythic:'#ffe477'} as Record<string,string>)[s.lwGrade]||'#fff3ce';
 const self=!['atk'].includes(s.type),frames:string[]=[];
 for(let i=0;i<18;i++){
  const progress=i/17,opacity=Math.sin(Math.PI*(.1+progress*.9)),r=16+progress*40,turn=seed%360+progress*70;
  const ring=`<circle cx="64" cy="64" r="${r}" fill="none" stroke-width="${4-2*progress}"/><circle cx="64" cy="64" r="${r*.7}" fill="none" stroke-width="1" stroke-dasharray="8 5" transform="rotate(${turn} 64 64)"/>`;
  const cross='<path d="M57 31h14v26h26v14H71v26H57V71H31V57h26Z" stroke-width="1"/>';
  const slash=`<path d="M${20+progress*14} 100Q${50+progress*45} 68 101 19Q90 68 30 104Z" stroke-width="2"/>`;
  const seal='<path d="M64 23 99 43 99 85 64 105 29 85 29 43Z M64 35v58M39 50l50 28M39 78l50-28" fill="none" stroke-width="2"/>';
  const wave=`<path d="M22 80Q42 ${10+progress*50} 64 50T106 45M24 93Q45 ${25+progress*40} 70 67T108 60" fill="none" stroke-width="4"/>`;
  const glyph=s.type==='heal'?cross:s.dmgType==='physical'?slash:s.type==='buff'||s.lwStatus?seal:wave;
  const spark=Array.from({length:6},(_,j)=>{const a=(turn+j*60)*Math.PI/180,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;return `<circle cx="${x}" cy="${y}" r="${1.5+(seed+j)%3}"/>`;}).join('');
  frames.push('data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g opacity="${opacity.toFixed(3)}" stroke="${color}" fill="${color}">${ring}${glyph}${spark}</g></svg>`));
 }
 const result={frames,fps:24,self,width:140,blend:'screen'};cache.set(id,result);return result;
}
