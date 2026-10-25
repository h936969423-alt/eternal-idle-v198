import rareEquipment from './rare-equipment-reference.json';
import advancedEquipment from './advanced-equipment-reference.json';
import normalEquipment from './normal-equipment-reference.json';
import {defaultEquipmentRank} from './equipment-ranks';
import raw from './gamedata.json';
import retiredNormal from './lineagew-retirement-index.json';
import retiredHigh from './lineagew-hl-retirement-index.json';
import retiredMythic from './lineagew-mythic-retirement-index.json';
export type ItemRarity='normal'|'advanced'|'rare'|'hero'|'legend'|'mythic'|'relic';
export const ITEM_RARITY_OPTIONS=['normal','advanced','rare','hero','legend','mythic'] as const;
export type LootEffect='off'|'text'|'sparkles';
export type LootPosition='monster'|'player';
export type LootStyle={effect:LootEffect;position:LootPosition;durationMs:number;template:string;color?:string};
export type ItemAppearance=Partial<LootStyle>&{rarity?:ItemRarity;name?:string;description?:string};
export type LootAppearanceConfig={rareEquipmentVersion?:number;advancedEquipmentVersion?:number;normalEquipmentVersion?:number;revision:number;defaults:Record<ItemRarity,LootStyle>;items:Record<string,ItemAppearance>;history:{at:number;by:string;action:string;count:number}[]};
export type LootNotice={spawnPoint?:{x:number;y:number};item:string;name:string;quantity:number;rarity:ItemRarity;style:LootStyle;layout:'ordinary'|'boss'|'dragon';slots:number};
export const RARITY_NAMES:Record<ItemRarity,string>={normal:'普通',advanced:'高級',rare:'稀有',hero:'英雄',legend:'傳說',mythic:'神話',relic:'遺物'};
export const RARITY_COLORS:Record<ItemRarity,string>={normal:'#e5e7eb',advanced:'#00ff00',rare:'#0080ff',hero:'#ff4040',legend:'#b366ff',mythic:'#ffd700',relic:'#4cc9f0'};
export const DEFAULT_LOOT_STYLE={normal:{effect:'off',position:'monster',durationMs:1600,template:'✦ {name} ×{count} ✦'},legend:{effect:'sparkles',position:'monster',durationMs:1600,template:'✦ {name} ×{count} ✦'},relic:{effect:'sparkles',position:'monster',durationMs:1600,template:'✦ {name} ×{count} ✦'}} as Record<ItemRarity,LootStyle>;
for(const rarity of ['advanced','rare','hero','mythic'] as ItemRarity[])DEFAULT_LOOT_STYLE[rarity]={...DEFAULT_LOOT_STYLE[rarity==='advanced'||rarity==='rare'?'normal':'legend']};
export function initialLootAppearance():LootAppearanceConfig{return {revision:0,defaults:structuredClone(DEFAULT_LOOT_STYLE),items:{},history:[]};}
const items=raw.items as Record<string,any>;
const archivedNames:Record<string,{n:string}>={...retiredNormal.items,...retiredHigh.items,...retiredMythic.items};
export function itemRarity(id:string,config?:Pick<LootAppearanceConfig,'items'>):ItemRarity{const base=id.split('@')[0],i=items[base];return config?.items[base]?.rarity||(Object.hasOwn(rareEquipment.items,base)?'rare':Object.hasOwn(advancedEquipment.items,base)?'advanced':Object.hasOwn(normalEquipment.items,base)?'normal':i?.relic?'relic':i?.legend?'legend':defaultEquipmentRank(base,i));}
export function lootAppearance(id:string,config?:LootAppearanceConfig){const base=id.split('@')[0],rarity=itemRarity(base,config),override=config?.items[base]||{};return {rarity,style:{...DEFAULT_LOOT_STYLE[rarity],...config?.defaults[rarity],...override}};}
export function itemDisplayName(id:string,config?:Pick<LootAppearanceConfig,'items'>){const base=id.split('@')[0];return config?.items[base]?.name||items[base]?.n||archivedNames[base]?.n||base;}
export function itemTextColor(id:string,config?:Pick<LootAppearanceConfig,'items'>){const i=items[id.split('@')[0]];return config?.items[id.split('@')[0]]?.color||(i?.lwCatalogId?RARITY_COLORS[itemRarity(id,config)]:undefined);}
export function itemDescription(id:string,config?:Pick<LootAppearanceConfig,'items'>){const base=id.split('@')[0];return config?.items[base]?.description??(typeof items[base]?.d==='string'?items[base].d:'');}
export function lootText(notice:Pick<LootNotice,'style'|'name'|'quantity'>){return notice.style.template.replace(/\{name\}/g,notice.name).replace(/\{count\}/g,String(notice.quantity));}
function styleField(key:string,value:unknown){if(key==='effect'&&['off','text','sparkles'].includes(value as string))return value;if(key==='position'&&['monster','player'].includes(value as string))return value;if(key==='durationMs'&&Number.isInteger(value)&&Number(value)>=500&&Number(value)<=5000)return value;if(key==='template'&&typeof value==='string'&&value.trim().length>0&&value.length<=100){if(/\{[^}]*\}/g.test(value.replace(/\{name\}|\{count\}/g,'')))throw Error('提示文字僅支援 {name} 與 {count}');if(!value.includes('{name}'))throw Error('提示文字需包含 {name}');return value;}throw Error('掉落顯示設定無效：'+key);}
export function validateLootPatch(input:unknown):Record<string,unknown>{if(!input||typeof input!=='object'||Array.isArray(input))throw Error('物品設定格式無效');const out:Record<string,unknown>={};for(const [key,value]of Object.entries(input)){if(!['rarity','effect','position','durationMs','template','name','description','color'].includes(key))throw Error('不能修改此設定欄位');if(value===null){out[key]=null;continue;}if(key==='name'){if(typeof value!=='string'||!value.trim()||value.trim().length>80)throw Error('物品名稱需為 1–80 字');out[key]=value.trim();}else if(key==='description'){if(typeof value!=='string'||value.length>1000)throw Error('物品說明最多 1000 字');out[key]=value;}else if(key==='color'){if(typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))throw Error('字體顏色需為 #RRGGBB');out[key]=value.toLowerCase();}else if(key==='rarity'){if(![...ITEM_RARITY_OPTIONS,'relic'].includes(String(value)))throw Error('物品分類無效');out[key]=value;}else out[key]=styleField(key,value);}if(!Object.keys(out).length)throw Error('請選擇要修改的欄位');return out;}
export function applyLootPatch(config:LootAppearanceConfig,ids:unknown,patch:unknown){if(!Array.isArray(ids)||!ids.length||ids.length>500||ids.some(id=>typeof id!=='string'||id.includes('@')||!Object.hasOwn(items,id)))throw Error('請選擇 1–500 件有效物品');const change=validateLootPatch(patch),next={...config,items:{...config.items}};for(const id of new Set(ids as string[])){const row={...next.items[id]} as Record<string,unknown>;for(const [key,value]of Object.entries(change)){if(value===null)delete row[key];else row[key]=value;}if(Object.keys(row).length)next.items[id]=row as ItemAppearance;else delete next.items[id];}return next;}
export function validateLootDefaults(value:unknown):Record<ItemRarity,LootStyle>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('預設設定格式無效');const out={} as Record<ItemRarity,LootStyle>;for(const rarity of [...ITEM_RARITY_OPTIONS,'relic'] as ItemRarity[]){const row=(value as any)[rarity]??DEFAULT_LOOT_STYLE[rarity];if(!row||Object.keys(row).sort().join(',')!=='durationMs,effect,position,template')throw Error('請完整填寫分類的預設效果');out[rarity]={effect:styleField('effect',row.effect),position:styleField('position',row.position),durationMs:styleField('durationMs',row.durationMs),template:styleField('template',row.template)} as LootStyle;}return out;}

/** Frames follow classification, independently of custom text colors. */
export function itemFrameColor(id:string,config?:Pick<LootAppearanceConfig,'items'>){return RARITY_COLORS[itemRarity(id,config)];}

