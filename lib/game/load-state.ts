import type {Save} from './engine';
/** A bounded foreground combat catch-up is not an offline loading screen. */
export function offlineSettlementPending(save:Pick<Save,'catchup'>|null,pendingSeconds:number){return pendingSeconds>0&&save?.catchup?.mode!=='online';}
export function blockingGameLoad(save:Pick<Save,'catchup'>|null,loading:boolean,pendingSeconds:number){return loading||!save||offlineSettlementPending(save,pendingSeconds);}
