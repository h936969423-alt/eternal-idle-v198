'use client';

import {useCallback,useEffect,useRef,useState} from 'react';

type Sample = {
  second:number;
  fps:number;
  avgFrameMs:number;
  longTasks:number;
  longTaskMs:number;
  magicEffects:number;
  importedEffects:number;
  domNodes:number;
  heapMB:number|null;
  hidden:boolean;
};

type LongTaskEntry = PerformanceEntry & {duration:number};

export default function PerfDiagnostic(){
  const [enabled,setEnabled]=useState(false);
  const [running,setRunning]=useState(false);
  const [samples,setSamples]=useState<Sample[]>([]);
  const [message,setMessage]=useState('');
  const [report,setReport]=useState('');
  const frames=useRef(0);
  const frameMs=useRef(0);
  const lastFrame=useRef<number|null>(null);
  const longTasks=useRef(0);
  const longTaskMs=useRef(0);
  const observer=useRef<PerformanceObserver|null>(null);
  const raf=useRef<number|undefined>(undefined);
  const startAt=useRef(0);
  const lastSampleAt=useRef(0);
  const mounted=useRef(true);

  useEffect(()=>{
    mounted.current=true;
    setEnabled(new URLSearchParams(window.location.search).get('perfdiag')==='1');
    return()=>{mounted.current=false;if(raf.current!==undefined)cancelAnimationFrame(raf.current);observer.current?.disconnect();};
  },[]);

  const stop=useCallback(()=>{
    if(raf.current!==undefined)cancelAnimationFrame(raf.current);
    raf.current=undefined;
    observer.current?.disconnect();
    setRunning(false);
    setMessage('偵測完成。請複製報告傳回來。');
  },[]);

  const start=useCallback(()=>{
    setSamples([]);
    setReport('');
    setMessage('前 3 秒保持不施法作為基準，之後連續放魔法直到 20 秒結束。');
    frames.current=0;
    frameMs.current=0;
    lastFrame.current=null;
    longTasks.current=0;
    longTaskMs.current=0;
    startAt.current=performance.now();
    lastSampleAt.current=startAt.current;
    setRunning(true);
    try{
      if(typeof PerformanceObserver!=='undefined'&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){
        observer.current=new PerformanceObserver(list=>{
          for(const entry of list.getEntries()){
            longTasks.current++;
            longTaskMs.current+=entry.duration;
          }
        });
        observer.current.observe({type:'longtask',buffered:true});
      }
    }catch{observer.current=null;}

    const tick=(now:number)=>{
      if(!mounted.current)return;
      frames.current++;
      if(lastFrame.current!==null)frameMs.current+=now-lastFrame.current;
      lastFrame.current=now;
      const elapsed=now-startAt.current;
      if(now-lastSampleAt.current>=1000){
        const seconds=Math.min(20,Math.max(1,Math.round(elapsed/1000)));
        const memory=(performance as Performance&{memory?:{usedJSHeapSize?:number}}).memory;
        const sample:Sample={
          second:seconds,
          fps:Math.round(frames.current/((now-lastSampleAt.current)/1000)),
          avgFrameMs:Math.round((frameMs.current/Math.max(1,frames.current-1))*10)/10,
          longTasks:longTasks.current,
          longTaskMs:Math.round(longTaskMs.current),
          magicEffects:document.querySelectorAll('.magic-effect').length,
          importedEffects:document.querySelectorAll('[data-effect-code]').length,
          domNodes:document.getElementsByTagName('*').length,
          heapMB:typeof memory?.usedJSHeapSize==='number'?Math.round(memory.usedJSHeapSize/1048576*10)/10:null,
          hidden:document.hidden
        };
        setSamples(prev=>[...prev,sample]);
        frames.current=0;
        frameMs.current=0;
        lastSampleAt.current=now;
        if(elapsed>=20000){
          const all=[...samplesRef.current,sample];
          const result={
            title:'永夜放置 20 秒效能偵測',
            startedAt:new Date(Date.now()-elapsed).toISOString(),
            durationMs:Math.round(elapsed),
            browser:navigator.userAgent,
            screen:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio},
            longTaskObserverSupported:!!observer.current,
            notes:'iOS Safari 通常不提供 performance.memory；FPS 為 requestAnimationFrame 取樣估計，不代表 GPU 使用率。',
            samples:all
          };
          setReport(JSON.stringify(result,null,2));
          if(raf.current!==undefined)cancelAnimationFrame(raf.current);
          raf.current=undefined;
          observer.current?.disconnect();
          setRunning(false);
          setMessage('偵測完成。請複製報告傳回來。');
          return;
        }
      }
      raf.current=requestAnimationFrame(tick);
    };
    // Keep a ref synchronized with state so the final sample includes all prior seconds.
    samplesRef.current=[];
    raf.current=requestAnimationFrame(tick);
  },[]);

  const samplesRef=useRef<Sample[]>([]);
  useEffect(()=>{samplesRef.current=samples;},[samples]);

  const copy=useCallback(async()=>{
    if(!report)return;
    try{await navigator.clipboard.writeText(report);setMessage('報告已複製，請回到聊天貼上。');}
    catch{setMessage('瀏覽器未允許自動複製，請長按下方報告文字並選取複製。');}
  },[report]);

  if(!enabled)return null;
  return <section aria-label="20 秒效能偵測" style={{position:'fixed',right:10,bottom:10,zIndex:2147483000,width:'min(390px,calc(100vw - 20px)',maxHeight:'75vh',overflow:'auto',background:'#101820',color:'#eef6ff',border:'1px solid #6c8ba8',borderRadius:12,padding:12,boxShadow:'0 8px 32px #0009',fontSize:12}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <strong style={{fontSize:14}}>20 秒效能偵測</strong>
      <button type="button" onClick={()=>setEnabled(false)} disabled={running} style={{padding:'4px 8px'}}>關閉</button>
    </div>
    <p style={{margin:'8px 0'}}>按開始後：前 3 秒先不要施法，接著持續放魔法至結束。完成後把報告貼回聊天。</p>
    <button type="button" onClick={start} disabled={running} style={{padding:'8px 12px',borderRadius:8,background:'#c5e6ff',color:'#102030',fontWeight:700}}>
      {running?'偵測中…':'開始 20 秒偵測'}
    </button>
    {running&&<p role="status">已記錄 {samples.length} / 20 秒</p>}
    {message&&<p role="status" style={{margin:'8px 0'}}>{message}</p>}
    {samples.length>0&&<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}><thead><tr>{['秒','FPS','幀 ms','長任務','魔法特效','匯入特效','DOM'].map(x=><th key={x} style={{textAlign:'left',padding:3,borderBottom:'1px solid #456'}}>{x}</th>)}</tr></thead><tbody>{samples.map(s=><tr key={s.second}>{[s.second,s.fps,s.avgFrameMs,s.longTasks,s.magicEffects,s.importedEffects,s.domNodes].map((v,i)=><td key={i} style={{padding:3,borderBottom:'1px solid #283a49'}}>{v}</td>)}</tr>)}</tbody></table></div>}
    {report&&<><button type="button" onClick={copy} style={{marginTop:8,padding:'7px 10px',borderRadius:7}}>複製完整報告</button><textarea readOnly value={report} aria-label="完整效能報告" style={{display:'block',width:'100%',height:90,marginTop:8,background:'#071018',color:'#dcecff',fontSize:10}}/></>}
  </section>;
}
