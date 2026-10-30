import {enhanceGear} from './gear';
import type {Character} from './engine';
import type {EnhancementReceipt} from './enhancement-result';
export function executeEnhancement(c:Character,input:{item:unknown;mode:unknown;expectedEn?:unknown;requestId?:unknown;sequence?:unknown},rng:()=>number,now:number){
 if(typeof input.item!=='string'||typeof input.mode!=='string')throw Error('強化資料格式無效');
 const tracked=input.requestId!==undefined||input.sequence!==undefined,state=c.enhancement;
 if(tracked){
  if(typeof input.requestId!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(input.requestId)||!Number.isSafeInteger(input.sequence)||!Number.isSafeInteger(input.expectedEn))throw Error('強化識別資料無效，請重新開啟強化視窗');
  const previous=state?.history.find(r=>r.requestId===input.requestId);
  if(previous){if(previous.originalKey!==input.item||previous.mode!==input.mode||previous.from!==input.expectedEn||previous.sequence!==input.sequence)throw Error('強化請求內容不符');return {message:previous.message,receipt:previous,replayed:true};}
  if(input.sequence!==(state?.sequence||0)+1)throw Error('強化狀態已更新，請重新開啟強化視窗');
 }
 if(input.expectedEn!==undefined&&input.expectedEn!==(c.enh[input.item]||0))throw Error('裝備強化值已變更，請重新點選');
 const message=enhanceGear(c,input.item,input.mode,rng),result=c.lastGear?.enhancement;
 if(!result)throw Error('強化結果尚未確認');
 if(!tracked)return {message,receipt:undefined,replayed:false};
 const receipt:EnhancementReceipt={...result,requestId:input.requestId as string,sequence:(state?.sequence||0)+1,at:now};
 c.enhancement={sequence:receipt.sequence,history:[receipt,...(state?.history||[])].slice(0,32)};
 return {message,receipt,replayed:false};
}
