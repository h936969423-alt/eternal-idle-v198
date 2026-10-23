import type {Character} from '@/lib/game/engine';
import {blessingLines} from '@/lib/game/affix-rules';
export default function AffixDetails({c,item}:{c:Character;item:string}){const rows=blessingLines(c,item);return rows.length?<div className="affix-details">{rows.map((r,j)=><p className={r.className} key={j}><strong>{r.name}</strong><span>{r.text}</span></p>)}</div>:<p className="muted">尚無賦予或暗黑詞條</p>;}
