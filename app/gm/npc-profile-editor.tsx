'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import raw from '@/lib/game/gamedata.json';
import {npcFunctions,type NpcFunction} from '@/lib/game/npc-config';
export default function NpcProfileEditor({npc,zone,busy,save,onClose}:{npc?:{id:string;n:string;title:string;d:string;type:string;function?:NpcFunction};zone:string;busy:boolean;save:(input:any)=>Promise<boolean|undefined>;onClose?:()=>void}){
 const [village,setVillage]=useState(zone),[name,setName]=useState(npc?.n||''),[title,setTitle]=useState(npc?.title||''),[description,setDescription]=useState(npc?.d||''),[fn,setFn]=useState<NpcFunction>(npc?.function||'original');
 const [createdFunction,setCreatedFunction]=useState<NpcFunction>('shop');
 return <form className="gm-merchant-editor" onSubmit={async e=>{e.preventDefault();const ok=await save({action:npc?'updateNpc':'createNpc',zone:village,npc:npc?.id||`gm_npc_${crypto.randomUUID().replaceAll('-','')}`,name,title,description,function:npc?fn:createdFunction});if(ok){if(npc)onClose?.();else{setName('');setTitle('');setDescription('');}}}}>
 {!npc&&<label>所在村莊<select value={village} disabled={busy} onChange={e=>setVillage(e.target.value)}>{Object.entries(raw.towns).filter(([id])=>id==='town_silver_knight').map(([id,t])=><option key={id} value={id}>{t.n}</option>)}</select></label>}
 <label>NPC 名字<input value={name} required maxLength={40} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="輸入 NPC 名字"/></label>
 <label>稱號<input value={title} maxLength={60} disabled={busy} onChange={e=>setTitle(e.target.value)}/></label>
 <label>NPC 功能<select value={npc?fn:createdFunction} disabled={busy} onChange={e=>npc?setFn(e.target.value as NpcFunction):setCreatedFunction(e.target.value as NpcFunction)}>{Object.entries(npcFunctions).filter(([key])=>!!npc||key!=='original').map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>對話／說明<textarea value={description} maxLength={500} rows={3} disabled={busy} onChange={e=>setDescription(e.target.value)}/></label>
 <p>{(npc?fn:createdFunction)==='shop'?'新增商人預設為空清單，儲存後請在「商人物品與售價管理」上架商品。':(npc?fn:createdFunction)==='blackmarket'?'使用現有黑市規則，每次抽取消耗 300,000 金幣。':(npc?fn:createdFunction)==='original'?'使用此 NPC 原本的服務；只修改名字時，請維持目前的功能選項。':'儲存後會於角色下一次同步套用。'}</p>
 <Button type="submit" disabled={busy||!name.trim()}>{npc?'儲存 NPC 資料':'新增 NPC'}</Button>{onClose&&<Button type="button" variant="outline" disabled={busy} onClick={onClose}>取消修改</Button>}
 </form>;
}
