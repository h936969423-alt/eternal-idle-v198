'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';

/** Size a monster sprite to its slot in plain pixels: never larger than the source frame, shrunk
 * proportionally when the frame is larger than the slot, and dropped so the idle ground contact
 * sits on the slot bottom. iPhone Safari did not resolve the equivalent CSS min() expression, so
 * the arithmetic happens here and CSS only reads finished px values. */
export function useMonsterFit(enabled:boolean,frame:{w:number;h:number}|undefined,footY:number|undefined){
 const ref=useRef<HTMLSpanElement>(null);
 const [slot,setSlot]=useState<[number,number]|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  const parent=ref.current?.parentElement;if(!parent)return;
  const update=()=>{const w=parent.clientWidth,h=parent.clientHeight;setSlot(old=>old&&old[0]===w&&old[1]===h?old:[w,h]);};
  update();
  if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(update);observer.observe(parent);return()=>observer.disconnect();
 },[enabled]);
 if(!enabled||!frame||!slot||!(slot[0]>0)||!(slot[1]>0))return {ref,vars:undefined};
 const scale=Math.min(1,slot[0]/frame.w,slot[1]/frame.h),px=(v:number)=>`${Math.round(v*100)/100}px`;
 const drop=Math.max(0,frame.h-(footY??frame.h))*scale;
 return {ref,vars:{'--fit-w':px(frame.w*scale),'--fit-h':px(frame.h*scale),'--fit-drop':px(drop)} as CSSProperties};
}
