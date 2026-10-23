"""Reapply the two explicit classic utility-ring exceptions after catalog imports."""
import json,pathlib,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];GAME=ROOT/'lib/game'
IDS=('ap381_armor_20281','ap381_armor_20284')
def read(file):return json.loads((GAME/file).read_text())
def write(file,data):(GAME/file).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def pinned(file):return json.loads(subprocess.check_output(['git','show','a52fb2be668a82a495e7edbb4f163e77808238fb:lib/game/'+file],cwd=ROOT))
data=read('gamedata.json');archived=read('lineagew-retired.json')['items']
for id in IDS:data['items'][id]=archived[id]
write('gamedata.json',data)
file='reference-equipment.json';data=read(file);data['items']=[r for r in data['items'] if r['id'] not in IDS]+[r for r in pinned(file)['items'] if r['id'] in IDS];data['counts']={k:sum(r['category']==k for r in data['items']) for k in data['counts']};write(file,data)
file='monster-drops.json';data=read(file)
for section in ['mobs','worldBossDrops']:
 for mob,row in pinned(file).get(section,{}).items():
  drops=row.get('drops',[]) if isinstance(row,dict) else row;selected=[id for id in drops if id in IDS]
  if not selected:continue
  current=data.setdefault(section,{}).setdefault(mob,{'drops':[]} if isinstance(row,dict) else [])
  target=current.setdefault('drops',[]) if isinstance(current,dict) else current
  target.extend(id for id in selected if id not in target)
write(file,data)
file='monster-drop-rates.json';data=read(file)
for mob,rows in pinned(file).get('mobs',{}).items():
 selected=[r for r in rows if r.get('item') in IDS]
 if selected:
  target=data.setdefault('mobs',{}).setdefault(mob,[]);target.extend(r for r in selected if not any(x.get('item')==r['item'] for x in target))
write(file,data)
print('Restored classic polymorph/summon control rings, catalog and original drop references.')
