import type {CombatEvent} from './engine';
// Buffer confirmed events briefly so variable response times do not become burst/pause playback.
export const REPLAY_BUFFER_MS=650;
export const REPLAY_MAX_AHEAD_MS=1500;
export function replayOffset(events:Pick<CombatEvent,'at'>[],now:number,previous:number|null){
 if(!events.length)return previous;
 const oldest=Math.min(...events.map(e=>e.at)),newest=Math.max(...events.map(e=>e.at));
 const buffered=Math.min(now-oldest+REPLAY_BUFFER_MS,now-newest+REPLAY_MAX_AHEAD_MS);
 if(previous===null||oldest+previous<now+80)return buffered;
 // Keep the established clock during ordinary delivery jitter. Bound excessive lag after a long batch.
 return Math.min(previous,now-newest+REPLAY_MAX_AHEAD_MS);
}

/** A skipped historical spawn must reset the replay to canonical arena state. */
export function replayHasGap(events:Pick<CombatEvent,'seq'>[],seen:number){return events.length>0&&events[0].seq>seen+1;}

/** Start the first confirmed manual event now; preserve 70ms triple-shot spacing. */
export function manualReplayOffset(events:Pick<CombatEvent,'at'|'manual'>[],now:number){const manual=events.filter(e=>e.manual);return now-Math.min(...(manual.length?manual:events).map(e=>e.at));}

/** Confirmed triple bursts should not wait behind the general jitter buffer. */
export function tripleReplayOffset(events:Pick<CombatEvent,'at'|'kind'|'skill'>[],now:number):number|null{
 const hits=events.filter(e=>e.kind==='attack'&&e.skill==='sk_elf_triple');
 if(!hits.length)return null;
 // A cast's closing magic event carries its start time, even after a lethal first hit.
 const casts=events.filter(e=>e.kind==='magic'&&e.skill==='sk_elf_triple');
 const start=casts.length?Math.max(...casts.map(e=>e.at)):Math.min(...hits.map(e=>e.at));
 return now-start;
}
