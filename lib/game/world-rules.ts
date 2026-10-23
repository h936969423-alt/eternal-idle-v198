export type WorldRules={countMultiplier:number;respawnMultiplier:number;baseRespawnMs:number};
export type WorldChange=WorldRules&{at:number;by:string};
export type WorldConfig=WorldRules&{revision:number;updatedAt:number;history:WorldChange[]};
export const DEFAULT_WORLD_RULES:WorldRules={countMultiplier:2,respawnMultiplier:2,baseRespawnMs:1000};
export const LEGACY_WORLD_RULES:WorldRules={countMultiplier:1,respawnMultiplier:1,baseRespawnMs:1000};
export function worldRulesAt(config:WorldRules|WorldConfig,now:number):WorldRules{
 if(!('history' in config))return config;
 let result=LEGACY_WORLD_RULES;
 for(const change of config.history){if(change.at>now)break;result=change;}
 return result;
}
export function validateWorldChange(input:any):WorldRules{
 if(!Number.isInteger(input?.countMultiplier)||input.countMultiplier<1||input.countMultiplier>10)throw new Error('怪物數量倍率須為 1–10 的整數');
 if(!Number.isInteger(input?.respawnMultiplier)||input.respawnMultiplier<1||input.respawnMultiplier>10)throw new Error('重生時間倍率須為 1–10 的整數');
 return {countMultiplier:input.countMultiplier,respawnMultiplier:input.respawnMultiplier,baseRespawnMs:1000};
}
