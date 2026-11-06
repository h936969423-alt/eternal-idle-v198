import clips from './motion-pilot.json';

export const motionPilot = clips;


export function pilotAttackFrame(frame: number, count: number, weights: readonly number[]) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = Math.max(0, frame) * total / Math.max(1, count);
  for (let i = 0; i < weights.length - 1; i++) {
    remaining -= weights[i];
    if (remaining < 0) return i;
  }
  return weights.length - 1;
}

// Map both sides of the contact separately so the existing hit lands on the
// imported contact frame while each segment keeps its relative frame weights.
export function pilotPlayerAttackFrame(
  frame: number, count: number, contact: number, weights: readonly number[], importedContact: number,
) {
  if (frame === contact) return importedContact;
  if (frame < contact) return pilotAttackFrame(frame, contact, weights.slice(0, importedContact));
  const afterContact = weights.slice(importedContact + 1);
  return afterContact.length
    ? importedContact + 1 + pilotAttackFrame(frame - contact - 1, count - contact - 1, afterContact)
    : importedContact;
}
