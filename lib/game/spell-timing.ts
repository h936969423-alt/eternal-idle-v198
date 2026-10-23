export const AUTO_SPELL_CHECK_MS = 100;
export type SpellChannel = 'attack' | 'heal' | 'convert' | 'purify' | `manual:${string}`;
export type SpellCooldowns = Partial<Record<string, number>>;

import polymorph from './polymorph.json';
const classIntervals: Record<string, number> = {royal:1400,knight:1300,elf:1200,mage:1000,dark:1400,dragon:1300,warrior:1400,illusion:1000};
export function spellChannel(type: string): SpellChannel | undefined {
  return type === 'atk' ? 'attack' : type === 'heal' || type === 'convert' ? type : undefined;
}
export function spellIntervalMs(cls: string, morph?: string) {
  const form=polymorph.forms.find(f=>f.name===morph);
  return form?Math.round(2000*(1-form.bonus.speedPct/100)):classIntervals[cls]||1200;
}
export function spellReady(clocks: SpellCooldowns | undefined, channel: SpellChannel, now: number) {
  return now >= (clocks?.[channel] || 0);
}
export function nextSpellAt(previous: number | undefined, now: number, interval: number, automatic: boolean) {
  // Carry a fractional polling overrun, but never accumulate casts while idle.
  const due = automatic && previous !== undefined && previous <= now && now - previous < AUTO_SPELL_CHECK_MS ? previous : now;
  return due + interval;
}
