'use client';
import {createContext,useContext,useId,useState,type ReactNode} from 'react';
import {ChevronDown,ChevronUp} from 'lucide-react';
import {Button} from '@/components/ui/button';

const Panels=createContext<{open:Record<string,boolean>;fallback:boolean;toggle:(id:string)=>void}|null>(null);
export function GmPanels({children}:{children:ReactNode}){
 const [open,setOpen]=useState<Record<string,boolean>>({}),[fallback,setFallback]=useState(false);
 function all(value:boolean){setFallback(value);setOpen({});}
 return <Panels.Provider value={{open,fallback,toggle:id=>setOpen(old=>({...old,[id]:!(old[id]??fallback)}))}}><div className="gm-collapse-toolbar"><Button variant="outline" onClick={()=>all(true)}>全部展開</Button><Button variant="outline" onClick={()=>all(false)}>全部收起</Button></div>{children}</Panels.Provider>;
}
export function GmPanel({title,children,className='',actions}:{title:ReactNode;children:ReactNode;className?:string;actions?:ReactNode}){
 const id=useId(),panels=useContext(Panels),[local,setLocal]=useState(false);
 const expanded=panels?(panels.open[id]??panels.fallback):local;
 return <section className={`gm-collapsible ${className}`}><div className="gm-panel-heading"><h2><button type="button" aria-expanded={expanded} aria-controls={`${id}-body`} onClick={()=>panels?panels.toggle(id):setLocal(!local)}><span>{title}</span><span className="gm-panel-toggle">{expanded?'收起':'展開'}{expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</span></button></h2></div><div id={`${id}-body`} hidden={!expanded} className="gm-panel-body">{actions&&<div className="gm-panel-actions">{actions}</div>}{children}</div></section>;
}
