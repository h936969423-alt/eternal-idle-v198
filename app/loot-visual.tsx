'use client';
import type {CSSProperties} from 'react';
import {lootText,RARITY_COLORS,type LootNotice} from '@/lib/game/loot-appearance';
export function LootVisual({notice}:{notice:LootNotice}){const color=notice.style.color||(notice.rarity==='normal'?'#ffe08a':RARITY_COLORS[notice.rarity]);return <div className="loot-visual" style={{'--loot-color':color,'--loot-duration':`${notice.style.durationMs}ms`} as CSSProperties} role="status"><span className="loot-toast-text">{lootText(notice)}</span>{notice.style.effect==='sparkles'&&Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return <i key={i} className="loot-spark" style={{'--spark-x':`${Math.cos(a)*(35+i%3*13)}px`,'--spark-y':`${Math.sin(a)*(30+i%3*10)-8}px`,'--spark-delay':`${i%4*25}ms`} as CSSProperties}/>;})}</div>;}
