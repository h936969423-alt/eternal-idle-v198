// Retain decoded images while a form is active to avoid fetching/decoding its
// layers for the first time in the middle of a cast. Only used in the browser.
const images = new Map<string, HTMLImageElement>();
export function preloadSprites(paths: string[]) {
  const active = new Set(paths);
  for (const path of images.keys()) if (!active.has(path)) images.delete(path);
  if (typeof Image === 'undefined') return;
  for (const path of paths) {
    if (images.has(path)) continue;
    const image = new Image();
    images.set(path, image);
    image.src = path;
    image.decode?.().catch(() => {images.delete(path);});
  }
}
