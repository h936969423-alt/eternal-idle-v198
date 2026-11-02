import {wSkill} from './lineagew-skill-data';
import {dollDefinition} from './companions';
import {dollBonus} from './doll-config';
import type {Character} from './engine';
export function activeStatuses(c:Character,now=Date.now()){const effects=Object.entries(c.buffs||{}).filter(([id,b])=>b.until>now&&!id.startsWith('companion_haste_')&&wSkill(id,c.cls)?.type!=='passive'&&!(['sk_abs_barrier','status_action_lock'].includes(id)&&Object.keys(c.buffs).some(k=>k.startsWith('lw_skill_')&&c.buffs[k].until>now&&c.buffs[k].d.lwActionLock))).map(([id,b])=>({id,until:b.until,effects:b.d,kind:'buff' as const}));return [...effects,...(c.doll&&dollDefinition(c)&&dollDefinition(c)?.enabled?[{id:c.doll,until:Number.MAX_SAFE_INTEGER,effects:dollBonus(dollDefinition(c)),kind:'doll' as const}]:[]),...(c.petActives||(c.petActive?[c.petActive]:[])).map(id=>({id,until:Number.MAX_SAFE_INTEGER,effects:{},kind:'pet' as const})),...(c.poly&&c.poly.until>now?[{id:c.poly.id,until:c.poly.until,effects:{},kind:'poly' as const}]:[])];}

