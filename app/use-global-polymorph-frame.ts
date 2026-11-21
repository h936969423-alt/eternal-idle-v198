'use client';

import { useEffect, useState } from 'react';
import type { GlobalPolymorphFrame } from '@/lib/game/lineage-global-polymorph';

type SheetSize = { width: number; height: number };

export function useGlobalPolymorphFrame(frame: GlobalPolymorphFrame | undefined) {
 const sheets = frame?.sheets;
 const [ready, setReady] = useState<{ sheets: string; sizes: Map<string, SheetSize> }>();

 useEffect(() => {
  if (!sheets) return;
  const sources = sheets.split(' ');
  const sizes = new Map<string, SheetSize>();
  let failed = false;
  const images = sources.map(src => {
   const image = new Image();
   image.onload = () => {
    if (failed) return;
    sizes.set(src, { width: image.naturalWidth, height: image.naturalHeight });
    if (sizes.size === sources.length) setReady({ sheets, sizes });
   };
   image.onerror = () => {
    failed = true;
    setReady(undefined);
   };
   image.src = src;
   return image;
  });
  return () => {
   for (const image of images) {
    image.onload = null;
    image.onerror = null;
   }
  };
 }, [sheets]);

 if (!frame || ready?.sheets !== sheets) return;
 const size = ready?.sizes.get(frame.src);
 if (!size || frame.x + 96 > size.width || frame.y + 112 > size.height) return;
 return { ...frame, ...size };
}
