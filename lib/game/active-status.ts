import {dollDefinition} from './companions';
import {dollBonus} from './doll-config';
import type {Character} from './engine';
export function activeStatuses(c:Character,now=Date.now()){const effects=Object.entries(c.buffs||{}).filter(([,b])=>b.until>now).map(([id,b])=>({id,until:b.until,effects:b.d,kind:'buff' as const}));return [...effects,...(c.doll&&dollDefinition(c)&&dollDefinition(c)?.enabled?[{id:c.doll,until:Number.MAX_SAFE_INTEGER,effects:dollBonus(dollDefinition(c)),kind:'doll' as const}]:[]),...(c.petActive?[{id:c.petActive,until:Number.MAX_SAFE_INTEGER,effects:{},kind:'pet' as const}]:[]),...(c.poly&&c.poly.until>now?[{id:c.poly.id,until:c.poly.until,effects:{},kind:'poly' as const}]:[])];}
