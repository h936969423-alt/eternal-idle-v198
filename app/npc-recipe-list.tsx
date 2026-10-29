'use client';
import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {recipesFor,availableMaterial,recipeUnavailable} from '@/lib/game/npc-recipes';
import type {Character} from '@/lib/game/engine';
import raw from '@/lib/game/gamedata.json';
const items=raw.items as Record<string,any>,classes:Record<string,string>={knight:'騎士',elf:'妖精',mage:'法師',dark:'黑暗妖精',royal:'王族'};
export default function NpcRecipeList({c,npc,busy,act}:{c:Character;npc:string;busy:boolean;act:(a:any)=>Promise<any>}){
 const [quantity,setQuantity]=useState(1),[search,setSearch]=useState(''),[limit,setLimit]=useState(30),recipes=useMemo(()=>recipesFor(npc,c),[npc,c.lootAppearance]);
 const shown=recipes.filter(r=>!search||items[r.output]?.n.includes(search)||r.source.includes(search));
 return <div className="npc-stock"><p className="section-hint">實際扣除材料與金幣。鎖定、穿戴及帶詞綴物品不會被消耗；一般配方只使用 +0 物品，指定 +9 活動配方只使用符合強化值的裝備。</p><label>搜尋配方<input value={search} onChange={e=>{setSearch(e.target.value);setLimit(30);}} placeholder="搜尋裝備、原 NPC 或配方來源"/></label><label className="auto-check">製作次數<input aria-label="製作兌換數量" type="number" min={1} max={999} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
  {shown.slice(0,limit).map(r=>{const valid=Number.isInteger(quantity)&&quantity>=1&&quantity<=999,reason=recipeUnavailable(r,c),enough=valid&&!reason&&c.gold>=r.gold*quantity&&Object.entries(r.materials).every(([id,n])=>availableMaterial(c,id,r.materialEnhancements?.[id]||0)>=n*quantity);return <section className="auto-card" key={r.id}><h3>{items[r.output]?.n} ×{(r.outputCount||1)*(valid?quantity:1)}</h3>{Object.entries(r.materials).map(([id,n])=><p key={id}>{r.materialEnhancements?.[id]?`+${r.materialEnhancements[id]} `:''}{items[id]?.n}：持有 {availableMaterial(c,id,r.materialEnhancements?.[id]||0)}／需要 {n*(valid?quantity:1)}</p>)}{r.classes&&<p>職業：{r.classes.map(id=>classes[id]||id).join('、')}</p>}{r.minLv&&<p>製作等級：Lv.{r.minLv}</p>}{r.gold>0&&<p>金幣：{(r.gold*(valid?quantity:1)).toLocaleString()}</p>}{r.dailyCap&&<p>每帳號每日最多 {r.dailyCap} 次；伺服器檢查剩餘次數。</p>}{reason&&<p role="status">{reason}</p>}<small>{r.source}</small><Button className="gold-button" disabled={busy||!enough} onClick={()=>act({type:'npcRecipe',npc,recipe:r.id,n:quantity})}>{reason||(!valid?'請輸入有效次數':enough?'製作／兌換':'材料或金幣不足')}</Button></section>;})}
  {shown.length>limit&&<Button variant="outline" onClick={()=>setLimit(n=>n+30)}>顯示更多配方（{limit}／{shown.length}）</Button>}{!shown.length&&<p>沒有符合的配方。</p>}
 </div>;
}
