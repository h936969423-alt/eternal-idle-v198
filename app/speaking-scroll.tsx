'use client';

import {useEffect, useRef, useState} from 'react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {mapIsOpen} from '@/lib/game/map-access';
import {isPausedDragonZone} from '@/lib/game/dragon-availability';
import {scrollRegions} from '@/lib/game/scroll-map-data';
import type {Character} from '@/lib/game/engine';
import './speaking-scroll.css';

export default function SpeakingScroll({c, busy, close, travel}: {
  c: Character; busy: boolean; close: () => void; travel: (id: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'all'|'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [traveling, setTraveling] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const storageKey = `speaking-scroll:${c.id}`;
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setFavorites(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
    } catch { setFavorites([]); }
  }, [storageKey]);

  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter(entry => entry !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }

  function jump(index: number) {
    const list = scroller.current;
    const target = list?.querySelector<HTMLElement>(`[data-region="${index}"]`);
    if (list && target) list.scrollTop = target.offsetTop;
  }

  const regions = scrollRegions.map(region => ({
    ...region,
    maps: mode === 'all' ? region.maps : region.maps.filter(map => favorites.includes(map.id)),
  }));
  const location = scrollRegions.flatMap(region => region.maps).find(map => map.id === c.zone)?.name ?? c.zone;
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="speaking-scroll">
      <header>
        <DialogTitle>說話卷軸・地區傳送</DialogTitle>
        <DialogDescription>選擇目的地</DialogDescription>
      </header>
      <nav className="scroll-modes" aria-label="地圖模式">
        <button type="button" aria-pressed={mode === 'all'} onClick={() => { setMode('all'); jump(-1); }}>全部地圖</button>
        <button type="button" aria-pressed={mode === 'favorites'} onClick={() => { setMode('favorites'); jump(-1); }}>常用地圖</button>
      </nav>
      <div className="scroll-destinations" ref={scroller}>
        <nav className="scroll-regions" data-region="-1" aria-label="地圖分區">
          {regions.map((region, index) => <button type="button" key={region.name} disabled={!region.maps.length} onClick={() => jump(index)}>
            {region.name}{mode === 'all' && !region.maps.length && '（尚未開放）'}
          </button>)}
        </nav>
        {mode === 'favorites' && !favorites.length && <p>在全部地圖點選 ☆ 加入常用地圖。</p>}
        {regions.map((region, index) => region.maps.length > 0 && <section key={region.name} data-region={index}>
          <div className="scroll-region-title"><h3>【{region.name}】</h3><button type="button" onClick={() => jump(-1)}>回到分區 ↑</button></div>
          {region.maps.map(map => {
            const here = c.zone === map.id;
            const open = map.exists && mapIsOpen(map.id, c.mapAccess) && !isPausedDragonZone(map.id);
            const status = here ? '目前位置' : !open ? '尚未開放' : index === 0 ? '安全樓層' : '免費';
            const favorite = favorites.includes(map.id);
            return <div className="scroll-map-row" key={map.id}>
              <button type="button" disabled={busy || traveling || here || !open} onClick={async () => {
                setTraveling(true);
                try { await travel(map.id); } finally { setTraveling(false); }
              }}><span>{map.name}</span><small>{status}</small></button>
              {open && <button type="button" className="scroll-favorite" aria-label={`${favorite ? '移除' : '收藏'}${map.name}`} aria-pressed={favorite} onClick={() => toggleFavorite(map.id)}>{favorite ? '★' : '☆'}</button>}
            </div>;
          })}
        </section>)}
      </div>
      <footer><span>目前位置：{location}</span><span>一般傳送免費</span></footer>
    </DialogContent>
  </Dialog>;
}
