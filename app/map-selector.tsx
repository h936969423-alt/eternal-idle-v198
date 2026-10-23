'use client';
import {mapIsOpen} from '@/lib/game/map-access';
import {SocialPanel} from './reference-panels';
import {useState} from 'react';
import MapMonsters from './map-monsters';
import BossRoomList from './boss-room-list';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import type {Character} from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
import {isPausedDragonZone} from '@/lib/game/dragon-availability';
const D=raw as any,shownLevels:Record<string,number>={'新兵修練場':3,'銀騎士地區':10,'說話之島周邊':6,'妖精森林周邊':9,'說話之島港口':19,'妖魔森林':15};
export default function MapSelector({c,busy,act,inspectBoss}:{c:Character;busy:boolean;act:(a:any)=>Promise<any>;inspectBoss:(id:string)=>void}){const [cat,setCat]=useState(D.worldBosses[c.zone]?'special':'wild');const rows=(category:string)=>D.mapCategories[category]?.filter((z:any)=>!isPausedDragonZone(z.v)&&mapIsOpen(z.v,c.mapAccess)).map((z:any)=>{const mobs=(D.maps[z.v]||[]).map((id:string)=>D.mobs[id]).filter(Boolean),lv=shownLevels[z.t]??(mobs.length?Math.min(...mobs.map((m:any)=>m.lv)):0),here=z.v===c.zone;return <button key={z.v} className={`reference-map-row ${here?'selected':''}`} disabled={busy} onClick={()=>act({type:'zone',zone:z.v})}><span>{z.t}{category!=='village'&&<small className="map-player-count" title="目前私人冒險角色數">(當前{here?1:0}人)</small>}</span><span>{category==='village'?'安全區':`建議 Lv.${lv}`}{here&&category==='village'?'　[目前]':''}</span></button>});return <section className="zone-panel reference-maps"><Tabs value={cat} onValueChange={setCat}><TabsList className="sub-tabs"><TabsTrigger value="village">村莊</TabsTrigger><TabsTrigger value="wild">野外</TabsTrigger><TabsTrigger value="dungeon">地監</TabsTrigger><TabsTrigger value="special">世界王</TabsTrigger><TabsTrigger value="party">隊伍</TabsTrigger></TabsList><TabsContent value="village"><div className="zone-list">{rows('village')}</div></TabsContent><TabsContent value="wild"><h3 className="map-continent">亞丁大陸</h3><div className="zone-list">{rows('wild')}</div></TabsContent><TabsContent value="dungeon"><div className="zone-list">{rows('dungeon')}<h3 className="map-continent">龍之棲息地</h3>{rows('special')}</div></TabsContent><TabsContent value="special"><BossRoomList c={c} busy={busy} act={act} inspect={inspectBoss}/></TabsContent><TabsContent value="party"><SocialPanel kind="party" c={c}/></TabsContent></Tabs></section>;}
