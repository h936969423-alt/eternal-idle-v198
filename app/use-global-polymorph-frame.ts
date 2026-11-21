'use client';
import {useEffect, useState} from 'react';
import type {GlobalPolymorphFrame} from '@/lib/game/lineage-global-polymorph';

export function useGlobalPolymorphFrame(frame: GlobalPolymorphFrame | undefined) {
 const src = frame?.src;
 const [ready, setReady] = useState<{src: string; width: number; height: number}>();
 useEffect(() => {
  if (!src) return;
  const image = new Image();
  image.onload = () => setReady({src, width: image.naturalWidth, height: image.naturalHeight});
  image.onerror = () => setReady(undefined);
  image.src = src;
  return () => {
   image.onload = null;
   image.onerror = null;
  };
 }, [src]);
 if (!frame || !ready || ready.src !== src || frame.x + 96 > ready.width || frame.y + 112 > ready.height) return;
 return {...frame, ...ready};
}
