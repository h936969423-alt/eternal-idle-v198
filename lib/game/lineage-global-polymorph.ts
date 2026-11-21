import forms from './lineage-global-polymorph.json';

type FrameReference = [sheet: number, index: number, columns: number];
type Action = 'idle' | 'walk' | 'attack' | 'skill' | 'hurt' | 'death';
type Form = { spriteId: number; actionTableId: number; actions: Partial<Record<Action, Record<string, FrameReference[]>>> };
const catalog = forms as Record<string, Form>;
const prefix = '/assets/lineage-global/polymorph/';
export const globalPolymorphAssetKeys = new Set(
 Object.values(catalog).flatMap(form =>
  Object.values(form.actions).flatMap(directions =>
   Object.values(directions).flatMap(frames =>
    frames.map(([sheet]) => `lineage-global/polymorph/${form.spriteId}/${sheet}.webp`),
   ),
  ),
 ),
);
export const globalPolymorphAssetPrefix = prefix;

export type GlobalPolymorphFrame = { src: string; x: number; y: number };

export function globalPolymorphFrame(
 formId: string | undefined, action: string, direction: number, frame: number, nativeCount = 0,
): GlobalPolymorphFrame | undefined {
 if (!formId || !Object.hasOwn(forms, formId)) return;
 const form = catalog[formId];
 if (!Object.hasOwn(form.actions, action)) return;
 const frames = form.actions[action as Action]?.[direction];
 if (!frames?.length) return;
 const index = nativeCount > 0
  ? Math.min(frames.length - 1, Math.floor(Math.max(0, frame) * frames.length / nativeCount))
  : Math.max(0, frame) % frames.length;
 const [sheet, cell, columns] = frames[index];
 return {
  src: `${prefix}${form.spriteId}/${sheet}.webp`,
  x: (cell % columns) * 96,
  y: Math.floor(cell / columns) * 112,
 };
}
