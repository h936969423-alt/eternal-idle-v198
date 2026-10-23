import json,pathlib,re
from lineagew_effects import parse_effect
root=pathlib.Path(__file__).resolve().parents[1];game=root/'lib/game';path=game/'lineagew-equipment-reference.json';ref=json.loads(path.read_text());raw=json.loads((game/'gamedata.json').read_text());affected=0
for id,row in ref['items'].items():
 if not row['pending']:continue
 affected+=1;applied=row.setdefault('appliedEffects',[]);remaining=[]
 for pending in row['pending']:
  m=re.fullmatch(r'\+(\d+)：(.*)',pending);stage=int(m[1]) if m else None;text=m[2] if m else pending;effect=parse_effect(text)
  if not effect:remaining.append(pending);continue
  key,value=effect;target=row['stats'] if stage is None else row['growth'].setdefault(str(stage),{});target[key]=value
  if stage is None:raw['items'][id][key]=value
  applied.append({'text':text,'stage':stage,'key':key,'value':value})
 if remaining:raise ValueError((id,remaining))
 row['pending']=remaining
ref['manifest']['effectsVersion']=1;ref['manifest']['effectsAffected']=sum(bool(r.get('appliedEffects')) for r in ref['items'].values())
path.write_text(json.dumps(ref,ensure_ascii=False,indent=2)+'\n');(game/'gamedata.json').write_text(json.dumps(raw,ensure_ascii=False,separators=(',',':')))
print('Activated',affected,'items; source labels and stage probabilities retained')
