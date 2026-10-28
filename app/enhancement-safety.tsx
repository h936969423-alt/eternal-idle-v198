'use client';
import {enhancementSafety} from '@/lib/game/enhancement-safety';
export default function EnhancementSafety({id,item,en}:{id:string;item:any;en:number}){
 const info=enhancementSafety(id,item);if(!info)return null;
 return <div className="enhancement-safety"><p>目前強化：+{en}</p>{info.canEnhance?<><p>安定值：+{info.safe}</p><p>{info.safe>0?'+0 至 +'+info.safe+' 為安全強化範圍。':'沒有安全強化區間。'}從 +{info.safe} 衝 +{info.safe+1} 起為過安定強化，成功率與爆裝風險依卷軸預覽。</p><p>強化上限：{Number.isFinite(info.cap)?'+'+info.cap:'無上限'}</p></>:<p>強化：不可強化</p>}</div>;
}
