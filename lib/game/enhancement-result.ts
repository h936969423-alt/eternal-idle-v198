export type EnhancementOutcome='success'|'hold'|'destroyed';
export type EnhancementResult={id:string;originalKey:string;key:string;item:string;mode:string;from:number;to:number|null;outcome:EnhancementOutcome;scroll:string;consumed:number;message:string};
export type EnhancementReceipt=EnhancementResult&{requestId:string;sequence:number;at:number};
export type EnhancementState={sequence:number;history:EnhancementReceipt[]};
