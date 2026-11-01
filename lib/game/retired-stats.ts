/** Stats that no longer do anything. Items, dolls and skills may still carry them, but they are not shown. */
export const RETIRED_STAT_KEYS:ReadonlySet<string>=new Set(['weightCap']);
export const isRetiredStat=(key:string)=>RETIRED_STAT_KEYS.has(key);
