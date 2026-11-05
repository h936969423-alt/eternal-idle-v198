'use client';
import {useCallback,useEffect,useRef,useState,type PointerEvent} from 'react';
import {cellBlocked,cellCenter,findMapPath,pixelCell,type MapCell} from '@/lib/game/client-map-path';
type Manifest={id:string;label:string;cols:number;rows:number;originX:number;originY:number;width:number;height:number;chunk:number;chunks:[number,number][];offsetY:number;spawn:[number,number];edges:string[]};
const REGIONS=[['talking','說話之島'],['gludio','古魯丁'],['giran','奇岩']] as const;
const BASE='/assets/client-map-preview/v1/';
const STEP_MS=170;
export default function MapPreview(){
 const [region,setRegion]=useState<string>('giran'),[map,setMap]=useState<Manifest|null>(null),[error,setError]=useState(''),[collision,setCollision]=useState(true),[zoom,setZoom]=useState(1);
 const [size,setSize]=useState({w:390,h:700}),[camera,setCamera]=useState({x:0,y:0}),[actor,setActor]=useState<{a:number;b:number}|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null),drag=useRef<{x:number;y:number;cx:number;cy:number;moved:boolean}|null>(null),path=useRef<MapCell[]>([]),follow=useRef(true),position=useRef<MapCell>({a:0,b:0});
 useEffect(()=>{const update=()=>setSize({w:window.innerWidth,h:window.innerHeight});update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);},[]);
 useEffect(()=>{let live=true;setMap(null);setError('');path.current=[];fetch(BASE+region+'/manifest.json').then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<Manifest>;}).then((m:Manifest)=>{if(!live)return;const c={a:m.spawn[0],b:m.spawn[1]};position.current=c;setActor(c);follow.current=true;setCamera(cellCenter(c.a,c.b,m.offsetY));setMap(m);}).catch(()=>{if(live)setError('地圖載入失敗，請重新整理。');});return()=>{live=false;};},[region]);
 useEffect(()=>{if(!map)return;let frame=0,last=0,progress=0,from=position.current;const tick=(now:number)=>{frame=requestAnimationFrame(tick);const next=path.current[0];if(!next){last=now;progress=0;from=position.current;return;}const dt=last?now-last:0;last=now;progress+=dt/STEP_MS;if(progress>=1){progress=0;position.current=next;from=next;path.current.shift();setActor(next);if(follow.current)setCamera(cellCenter(next.a,next.b,map.offsetY));return;}const a=from.a+(next.a-from.a)*progress,b=from.b+(next.b-from.b)*progress;setActor({a,b});if(follow.current)setCamera(cellCenter(a,b,map.offsetY));};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[map]);
 const toScreen=useCallback((x:number,y:number)=>({x:(x-camera.x)*zoom+size.w/2,y:(y-camera.y)*zoom+size.h/2}),[camera,zoom,size]);
 useEffect(()=>{const c=canvas.current;if(!c)return;const dpr=Math.min(window.devicePixelRatio||1,2);c.width=size.w*dpr;c.height=size.h*dpr;const g=c.getContext('2d');if(!g)return;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,size.w,size.h);if(!map||!collision)return;
  g.strokeStyle='#ffe128';g.lineWidth=Math.max(1,1.5*zoom);g.fillStyle='rgba(255,40,40,.42)';
  for(let a=0;a<map.cols;a++)for(let b=0;b<map.rows;b++){const center=cellCenter(a,b,map.offsetY),s=toScreen(center.x,center.y),hw=24*zoom,hh=12*zoom;if(s.x<-hw||s.y<-hh||s.x>size.w+hw||s.y>size.h+hh)continue;const e=Number(map.edges[a][b]);if(cellBlocked(map,a,b)){g.beginPath();g.moveTo(s.x,s.y-hh);g.lineTo(s.x+hw,s.y);g.lineTo(s.x,s.y+hh);g.lineTo(s.x-hw,s.y);g.closePath();g.fill();}if(e&1){g.beginPath();g.moveTo(s.x-hw,s.y);g.lineTo(s.x,s.y-hh);g.stroke();}if(e&2){g.beginPath();g.moveTo(s.x,s.y-hh);g.lineTo(s.x+hw,s.y);g.stroke();}}
 },[map,collision,toScreen,size]);
 const onDown=(e:PointerEvent<HTMLDivElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,moved:false};};
 const onMove=(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>8){d.moved=true;follow.current=false;}if(d.moved)setCamera({x:d.cx-dx/zoom,y:d.cy-dy/zoom});};
 const onUp=(e:PointerEvent<HTMLDivElement>)=>{const d=drag.current;drag.current=null;if(!d||d.moved||!map)return;const x=(e.clientX-size.w/2)/zoom+camera.x,y=(e.clientY-size.h/2)/zoom+camera.y,target=pixelCell(x,y,map.offsetY);follow.current=true;path.current=findMapPath(map,position.current,target);};
 const visible=map?.chunks.filter(([x,y])=>{const s=toScreen(x*map.chunk,y*map.chunk),k=map.chunk*zoom;return s.x+k>0&&s.y+k>0&&s.x<size.w&&s.y<size.h;})||[];
 const at=map&&actor?cellCenter(actor.a,actor.b,map.offsetY):null,dot=at?toScreen(at.x,at.y):null,world=map&&actor?`${Math.round(map.originX+actor.a)}, ${Math.round(map.originY+actor.b)}`:'';
 return <main data-testid="map-preview" style={{position:'fixed',inset:0,overflow:'hidden',background:'#050505',color:'#f3e7c8',fontSize:14,touchAction:'none',userSelect:'none',WebkitUserSelect:'none'}}>
  <div data-testid="map-surface" role="application" aria-label="地圖預覽，點地面移動，拖曳看地圖" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={()=>{drag.current=null;}} style={{position:'absolute',inset:0}}>
   {map&&visible.map(([x,y])=>{const s=toScreen(x*map.chunk,y*map.chunk);return <img key={`${map.id}-${x}-${y}`} src={`${BASE}${map.id}/${x}_${y}.webp`} alt="" draggable={false} style={{position:'absolute',left:s.x,top:s.y,maxWidth:'none',transform:`scale(${zoom})`,transformOrigin:'0 0',pointerEvents:'none'}}/>;})}
   <canvas ref={canvas} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
   {dot&&<div data-testid="map-actor" style={{position:'absolute',left:dot.x-10,top:dot.y-26,width:20,height:30,borderRadius:'10px 10px 4px 4px',background:'#2f8fd0',border:'2px solid #fff',boxSizing:'border-box',pointerEvents:'none'}}/>}
  </div>
  <div style={{position:'absolute',left:'max(8px,env(safe-area-inset-left))',right:'max(8px,env(safe-area-inset-right))',top:'max(8px,env(safe-area-inset-top))',display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
   {REGIONS.map(([id,label])=><button key={id} onClick={()=>setRegion(id)} aria-pressed={region===id} style={buttonStyle(region===id)}>{label}</button>)}
   <button onClick={()=>setCollision(v=>!v)} aria-pressed={collision} style={buttonStyle(collision)}>碰撞</button>
   <button onClick={()=>setZoom(z=>z===1?.5:1)} style={buttonStyle(false)}>{zoom===1?'縮小':'放大'}</button>
   <a href="/" target="_top" style={{...buttonStyle(false),display:'inline-flex',alignItems:'center',textDecoration:'none'}}>回遊戲</a>
  </div>
  <div style={{position:'absolute',left:8,bottom:'max(8px,env(safe-area-inset-bottom))',padding:'4px 8px',background:'#10171be6',borderRadius:4,pointerEvents:'none'}}>{error||(map?`${map.label} · 座標 ${world}`:'載入中…')}</div>
 </main>;
}
function buttonStyle(active:boolean){return {minHeight:40,padding:'0 12px',borderRadius:6,border:`1px solid ${active?'#e7cb89':'#7b704a'}`,background:active?'#5a4720':'#10171be6',color:'#f3e7c8',fontSize:14} as const;}
