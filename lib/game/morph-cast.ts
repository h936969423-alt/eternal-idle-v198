import legacyCasts from './polymorph-cast.json';
import catalogue from './polymorph-cast-catalog.json';
import directionalAttacks from './polymorph-attack.json';

export type MorphCastClip = {
  source: string;
  body: string[];
  shadow: (string | null)[];
  weapon: (string | null)[];
  layout: {viewBox: number[]; x: number; y: number; width: number; height: number};
};
type CastDirections = Record<string, MorphCastClip>;
type CastEntry = {directions: CastDirections};
export function morphAttackFor(form: {id: string}, direction: number): MorphCastClip | undefined {
  const directions = (directionalAttacks as Record<string, CastDirections>)[form.id];
  return directions?.[String(direction)] || directions?.['2'];
}

export function playerBattleDirection(_target: number | undefined, _poly?: {id: string}) {
  // Keep base and polymorph attacks/casts in the same fixed direction.
  return 2;
}

const aliases: Record<string, string> = {
  '真‧死亡騎士': '死亡騎士',
  '真‧克特': '克特',
  '高等黑暗精靈': '黑暗精靈',
};

export function morphCastFor(form: {id: string; name: string}, direction: number): MorphCastClip | undefined {
  // Keep the audited size/foot anchor of existing game forms. New exact-name
  // forms and source-confirmed aliases can use the complete casting catalogue.
  const directions = (legacyCasts as Record<string, CastDirections>)[form.id]
    || (catalogue.forms as Record<string, CastEntry>)[aliases[form.name] || form.name]?.directions;
  return directions?.[String(direction)] || directions?.['2'];
}

export function morphCastFrames(form: {id: string; name: string}) {
  const paths = new Set<string>();
  for (const direction of [0, 1, 2]) {
    for (const clip of [morphCastFor(form, direction), morphAttackFor(form, direction)]) {
      if (clip) for (const path of [...clip.body, ...clip.shadow, ...clip.weapon]) if (path) paths.add(path);
    }
  }
  return [...paths];
}

export function morphCastLayers(clip: MorphCastClip, frame: number) {
  const index = Math.max(0, Math.min(clip.body.length - 1, Math.floor(frame)));
  // Missing secondary-layer frames are hidden, never stretched or reused.
  return {body: clip.body[index], shadow: clip.shadow[index] || undefined, weapon: clip.weapon[index] || undefined};
}
