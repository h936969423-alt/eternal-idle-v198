#!/usr/bin/env python3
"""One-time catalog change: remove Lineage W equipment, restore the archived equipment, retarget drops and shops."""
import json,pathlib,re,collections
G=pathlib.Path(__file__).resolve().parent.parent/'lib/game'
load=lambda n:json.loads((G/n).read_text());raw=load('gamedata.json');items=raw['items']
old={};mapping={}
for f in ['lineagew-retired','lineagew-hl-retired','lineagew-mythic-retired']:
 d=load(f+'.json');old.update(d['items']);mapping.update(d['mapping'])
worn=lambda k:re.fullmatch(r'lw_(equipment|weapon)_\d+',k)
W={k:v for k,v in items.items() if worn(k)}
assert len(W)==784
reverse=collections.defaultdict(list)
for o,w in mapping.items():reverse[w].append(o)
byname=collections.defaultdict(list)
for k,v in old.items():byname[(v['n'],v.get('slot'))].append(k)
num=lambda k:[int(x) if x.isdigit() else x for x in re.split(r'(\d+)',k)]
def dest(w):
 c=sorted(reverse.get(w,[]),key=num) or sorted(byname.get((W[w]['n'],W[w].get('slot')),[]),key=num)
 return c[0] if c else None
replace={w:dest(w) for w in W};replace={k:v for k,v in replace.items() if v}
archive={k:{'n':v['n'],'slot':v.get('slot'),'sellP':750000 if v.get('rarity')=='mythic' and not v.get('sellP') else v.get('sellP',0)} for k,v in W.items()}
(G/'lineagew-equipment-removal.json').write_text(json.dumps({'items':archive,'replace':replace},ensure_ascii=False,separators=(',',':')))
def retarget(v):
 if isinstance(v,str):return replace.get(v,v)
 if isinstance(v,list):
  out=[]
  for x in v:
   if isinstance(x,str)and worn(x)and x not in replace:continue
   y=retarget(x)
   if isinstance(y,(str,int,float)) and y in out:continue
   out.append(y)
  return out
 if isinstance(v,dict):
  out={}
  for k,x in v.items():
   if worn(k)and k not in replace:continue
   out[replace.get(k,k)]=retarget(x)
  return out
 return v
for f in ['monster-drops.json','monster-drop-rates.json','npc-hub-data.json']:
 data=retarget(load(f));s=json.dumps(data,ensure_ascii=False,separators=(',',':'))
 assert not re.search(r'"lw_(equipment|weapon)_\d+"',s),f
 (G/f).write_text(s+'\n')
for k in W:del items[k]
for k,v in old.items():items.setdefault(k,{**v,'n':v['n'].replace('\\aH','')})
(G/'gamedata.json').write_text(json.dumps(raw,ensure_ascii=False,separators=(',',':'))+'\n')
print('removed',len(W),'restored',len(old),'replacements',len(replace))
