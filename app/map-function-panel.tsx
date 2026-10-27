'use client';
import type {ReactNode} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {X} from 'lucide-react';

/** Only tools enter the portal. BattleArena remains mounted outside this panel. */
export default function MapFunctionPanel({enabled,open,onClose,title,theme,landscape,children}:{enabled:boolean;open:boolean;onClose:()=>void;title:string;theme:string;landscape:boolean;children:ReactNode}){
 if(!enabled)return <>{children}</>;
 return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}>
  <DialogContent className="game-dialog map-function-dialog" positioning="viewport" showCloseButton={false} onCloseAutoFocus={event=>{
   event.preventDefault();document.querySelector<HTMLButtonElement>('.map-first-layout .main-nav [data-state="active"]')?.focus();
  }}>
   <header className="map-function-header">
    <div><DialogTitle>{title}</DialogTitle><DialogDescription>關閉面板即可返回地圖，狩獵持續進行。</DialogDescription></div>
    <Button variant="outline" onClick={onClose} aria-label="收合功能並返回地圖"><X size={16}/>收合</Button>
   </header>
   <div className={`game-root screenshot-layout interface-${theme} ${landscape?'display-landscape':'display-portrait'} map-panel-scope main-tabs`}>{children}</div>
  </DialogContent>
 </Dialog>;
}
