'use client';
import {useEffect,useState} from 'react';

/** Temporary diagnostics: open the game once with ?debug=monster (remembered on this device; ?debug=off
 * clears it) to see how each monster sprite is sized here. Shows nothing otherwise. */
export default function MonsterSizeDebug({gm=false}:{gm?:boolean}){
 const [lines,setLines]=useState<string[]|null>(null);
 useEffect(()=>{
  if(typeof location==='undefined')return;
  // Signing in reloads '/' and drops the query, so remember the switch on this device (?debug=off clears it).
  const flag=new URLSearchParams(location.search).get('debug')??(location.hash.includes('debug')?'monster':null);
  try{if(flag==='off')localStorage.removeItem('eternal-debug-monster');else if(flag!==null)localStorage.setItem('eternal-debug-monster','1');}catch{}
  let on=false;try{on=localStorage.getItem('eternal-debug-monster')==='1';}catch{on=flag!==null&&flag!=='off';}
  // Temporarily always on for GM accounts while the iPhone sizing issue is investigated.
  if(!on&&!gm)return;
  const r=(v:number)=>Math.round(v*10)/10;
  const read=()=>{
   const out=[`UA ${navigator.userAgent.replace(/.*(iPhone OS [\d_]+|Version\/[\d.]+).*/,'$1')} · dpr ${devicePixelRatio} · vw ${innerWidth}`,
    `supports cqw ${CSS.supports('width','1cqw')} · container ${CSS.supports('container-type','inline-size')} · aspect ${CSS.supports('aspect-ratio','1')}`];
   const root=document.querySelector('.game-root');out.push(`root ${root?.className.split(' ').filter(c=>c.startsWith('display-')).join(',')||'?'} · battle-scene ${!!document.querySelector('.battle-scene')}`);
   document.querySelectorAll('.static-arena .four-monster').forEach((m,i)=>{
    const art=m.querySelector('.four-monster-art') as HTMLElement|null,child=art?.firstElementChild as HTMLElement|null;
    if(!art){out.push(`#${i} no art`);return;}
    const a=art.getBoundingClientRect(),cs=child?getComputedStyle(child):null,cr=child?.getBoundingClientRect();
    out.push(`#${i} ${m.querySelector('.monster-ground-name')?.textContent||''} art ${r(a.width)}×${r(a.height)} ${getComputedStyle(art).display}/${getComputedStyle(art).alignItems}`);
    out.push(`  child <${child?.tagName.toLowerCase()} .${child?.className}> ${cr?r(cr.width)+'×'+r(cr.height):'-'} css ${cs?.width}×${cs?.height}`);
    out.push(`  vars w=${cs?.getPropertyValue('--frame-w')||'∅'} h=${cs?.getPropertyValue('--frame-h')||'∅'} ar=${cs?.getPropertyValue('--frame-ar')||'∅'} drop=${cs?.getPropertyValue('--foot-drop')||'∅'} inline="${child?.getAttribute('style')?.slice(0,90)||''}"`);
   });
   setLines(out);
  };
  read();const t=setInterval(read,1000);return()=>clearInterval(t);
 },[gm]);
 if(!lines)return null;
 return <pre style={{position:'fixed',left:4,right:4,top:'calc(env(safe-area-inset-top) + 4px)',zIndex:99999,maxHeight:'45vh',overflow:'auto',margin:0,padding:6,font:'10px/1.35 ui-monospace,monospace',whiteSpace:'pre-wrap',wordBreak:'break-all',color:'#e8f5e9',background:'rgba(0,0,0,.85)',border:'1px solid #4caf50',borderRadius:6,pointerEvents:'auto',userSelect:'text',WebkitUserSelect:'text'}}>{lines.join('\n')}</pre>;
}
