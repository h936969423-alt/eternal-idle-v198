import {lineageWActiveId} from './lineagew-migration';
import {NPC_HUB,NPC_HUB_ZONE,hubLegacySetting,hubDefaultStock,hubAliases,hubShopSetting} from './npc-hub';
import raw from './gamedata.json';
import {gilenBookStock,isGilenTeacher} from './npc-magic';
const towns=raw.towns as Record<string,any>,items=raw.items as Record<string,any>;
export const npcFunctions={original:'原有專屬服務',shop:'商品販售',warehouse:'倉庫',skill:'魔法學習',blackmarket:'黑市抽取',info:'說明文字'} as const;
export type NpcFunction=keyof typeof npcFunctions;
export type NpcDefinition={id:string;n:string;title:string;d:string;type:string;hide?:boolean;group?:string};
type NpcProfile={n:string;title:string;d:string;function:NpcFunction};
export type NpcConfig={revision:number;hidden:Record<string,boolean>;shops:Record<string,Record<string,number>>;custom?:Record<string,NpcDefinition[]>;profiles?:Record<string,NpcProfile>;history:{at:number;by:string;text:string}[]};
export const initialNpcConfig=():NpcConfig=>({revision:0,hidden:{},shops:{},custom:{},profiles:{},history:[]});
export const npcKey=(zone:string,npc:string)=>`${zone}:${npc}`;
export function townNpcs(zone:string,config?:NpcConfig):NpcDefinition[]{
 if(!Object.hasOwn(towns,zone))return [];
 return [...towns[zone].npcs,...(zone===NPC_HUB_ZONE?Object.values(config?.custom||{}).flat():[])].map((n:NpcDefinition)=>{const p=hubLegacySetting(n.id,config?.profiles);const resolved=p?{...n,n:p.n,title:p.title,d:p.d,type:p.function==='original'?n.type:p.function}:n;return isGilenTeacher(zone,resolved)?{...resolved,type:'shop'}:resolved;});
}
export function npcCatalog(config?:NpcConfig){return Object.entries(towns).flatMap(([zone,t])=>townNpcs(zone,config).map(n=>({...n,zone,town:t.n,key:npcKey(zone,n.id)})));}
export function findNpc(zone:string,id:string,config?:NpcConfig){return typeof zone==='string'?townNpcs(zone,config).find(n=>n.id===id):undefined;}
export function npcOriginalService(zone:string,id:string,config?:NpcConfig){const profile=hubLegacySetting(id,config?.profiles);return npcVisible(zone,id,config)&&(!profile||profile.function==='original');}
export function npcVisible(zone:string,id:string,config?:NpcConfig){const n=findNpc(zone,id,config);if(!n)return false;const hidden=hubLegacySetting(id,config?.hidden);return hidden===undefined?!n.hide:!hidden;}
function baseStock(zone:string,id:string,config?:NpcConfig):string[]{
 const npc=findNpc(zone,id,config);if(!npc||!['shop','event'].includes(npc.type)||id.startsWith('gm_npc_'))return [];
 return Object.entries(items).filter(([,i])=>{if(!(i.p>0)||i.noShop)return false;if(id==='npc_axile')return /冰涼/.test(i.n);if(i.noSell)return false;if(id==='npc_wino')return i.type==='wpn';if(id==='npc_vangil')return ['arm','acc'].includes(i.type);if(['npc_linda','npc_bayes'].includes(id))return i.type==='skillbk';if(id==='npc_evert')return /布料|線/.test(i.n);return ['pot','scroll'].includes(i.type)||id==='npc_skvati'&&i.type==='wpn'&&i.req==='dark';}).map(([key])=>key);
}
export function merchantInventory(zone:string,npc:string,config?:NpcConfig):Record<string,number>{if(!['shop','event'].includes(findNpc(zone,npc,config)?.type||''))return {};const custom=hubShopSetting(npc,config?.shops);if(custom!==undefined)return Object.fromEntries(Object.entries(custom).flatMap(([id,price])=>{const active=lineageWActiveId(id)||(NPC_HUB.sourceItemMap as Record<string,string>)[id];return active&&Object.hasOwn(items,active)?[[active,price]]:[];}));return (hubDefaultStock(npc)??(isGilenTeacher(zone,findNpc(zone,npc,config))?gilenBookStock():Object.fromEntries(baseStock(zone,npc,config).map(id=>[id,items[id].p]))));}
export function vendorStock(zone:string,npc:string,config?:NpcConfig){return npcVisible(zone,npc,config)?Object.keys(merchantInventory(zone,npc,config)):[];}
export function vendorPrice(zone:string,npc:string,item:string,config?:NpcConfig){return vendorStock(zone,npc,config).includes(item)?merchantInventory(zone,npc,config)[item]:undefined;}
export function purchaseCost(zone:string,npc:string,item:string,n:number,config?:NpcConfig){
 if(typeof item!=='string'||item.includes('@')||!Object.hasOwn(items,item)||!Number.isSafeInteger(n)||n<1||n>1000)throw Error('購買物品或數量無效');
 const price=vendorPrice(zone,npc,item,config);if(price===undefined)throw Error('此 NPC 沒有販售該物品或目前未顯示');const total=price*n;if(!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(total))throw Error('購買金額超出可用範圍');return total;
}
export function updateNpcConfig(old:NpcConfig,input:any,by:string,at:number):NpcConfig{
 const {zone,npc,action}=input;
 if(typeof zone!=='string'||!Object.hasOwn(towns,zone))throw Error('村莊不存在');if(zone!==NPC_HUB_ZONE)throw Error('NPC 已集中於銀騎士村，請在銀騎士村設定');
 const n=findNpc(zone,npc,old);if(action!=='createNpc'&&!n)throw Error('NPC 不存在');
 const key=npcKey(zone,npc),next: NpcConfig={...old,hidden:{...old.hidden},shops:{...old.shops},custom:{...old.custom},profiles:{...old.profiles},revision:old.revision+1};let text='';
 if(action==='createNpc'||action==='updateNpc'){
  const clean=(value:any,label:string,max:number,required=false)=>{if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error(`${label}格式無效（最多 ${max} 字）`);return value.trim();};
  const name=clean(input.name,'名字',40,true),title=clean(input.title,'稱號',60),description=clean(input.description,'說明',500),fn=input.function;
  if(typeof fn!=='string'||!Object.hasOwn(npcFunctions,fn)||action==='createNpc'&&fn==='original')throw Error('NPC 功能無效');
  if(action==='createNpc'){
   if(npcCatalog(old).length>=1000)throw Error('NPC 數量已達 1000 位');
   if(typeof npc!=='string'||!/^gm_npc_[a-z0-9_-]{8,64}$/.test(npc)||npcCatalog(old).some(x=>x.id===npc))throw Error('新增 NPC 編號無效或重複');
   next.custom![zone]=[...(old.custom?.[zone]??[]),{id:npc,n:name,title,d:description,type:fn}];text=`${towns[zone].n} 新增 NPC ${name}（${npcFunctions[fn as NpcFunction]}）`;
  }else{
   next.profiles![key]={n:name,title,d:description,function:fn as NpcFunction};text=`${towns[zone].n} · ${n!.n} 更新為 ${name}（${npcFunctions[fn as NpcFunction]}）`;
  }
 }
 else if(action==='visibility'){if(typeof input.visible!=='boolean')throw Error('顯示設定無效');next.hidden[key]=!input.visible;text=`${towns[zone].n} · ${n!.n} ${input.visible?'顯示':'隱藏'}`;}
 else{if(!['shop','event'].includes(n!.type))throw Error('此 NPC 不是一般販售商人');
  if(action==='resetShop'){delete next.shops[key];for(const oldKey of Object.keys(next.shops))if(hubAliases(npc).includes(oldKey)||oldKey.endsWith(':'+npc))delete next.shops[oldKey];text=`${n!.n} 恢復預設商品與價格`;}
  else{const id=input.item;if(typeof id!=='string'||id.includes('@')||!Object.hasOwn(items,id))throw Error('物品不存在');const stock={...merchantInventory(zone,npc,old)};
   if(action==='upsertItem'){if(!Number.isSafeInteger(input.price)||input.price<0)throw Error('售價必須為 0 或正整數金幣');stock[id]=input.price;text=`${n!.n} · ${items[id].n} 售價 ${input.price} 金幣`;}
   else if(action==='removeItem'){if(!Object.hasOwn(stock,id))throw Error('商人沒有販售此物品');delete stock[id];text=`${n!.n} 下架 ${items[id].n}`;}else throw Error('操作無效');for(const oldKey of Object.keys(next.shops))if(oldKey!==key&&(hubAliases(npc).includes(oldKey)||oldKey.endsWith(':'+npc)))delete next.shops[oldKey];next.shops[key]=stock;
  }
 }
 next.history=[...old.history,{at,by,text}].slice(-30);return next;
}
