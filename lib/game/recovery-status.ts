export type RecoveryStatus={available:boolean;pending:boolean;characters:{id:string;name:string;level:number;running:boolean}[];remainingSeconds:number|null};

/** Recovery is diagnostic only; never let an invalid response replace game state. */
export function parseRecoveryStatus(value:unknown):RecoveryStatus|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.available!=='boolean'||typeof v.pending!=='boolean'||!Array.isArray(v.characters))return null;
 const characters:RecoveryStatus['characters']=[];
 for(const entry of v.characters){
  if(!entry||typeof entry!=='object')return null;
  const c=entry as Record<string,unknown>;
  if(typeof c.id!=='string'||typeof c.name!=='string'||typeof c.level!=='number'||!Number.isFinite(c.level)||typeof c.running!=='boolean')return null;
  characters.push({id:c.id,name:c.name,level:c.level,running:c.running});
 }
 const remaining=v.remainingSeconds;
 if(remaining!==undefined&&remaining!==null&&(typeof remaining!=='number'||!Number.isFinite(remaining)||remaining<0))return null;
 return {available:v.available,pending:v.pending,characters,remainingSeconds:typeof remaining==='number'?remaining:null};
}
