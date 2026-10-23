"""Remaining47 import. Reruns pin the exact original baseline, not a moving tree."""
import json,pathlib,sys,subprocess,shutil,re
from lineagew_mythic_normalize import normalize
from lineagew_hl_normalize import SLOTS,WEAPONS,CLASSES
ROOT=pathlib.Path(__file__).resolve().parents[1];GAME=ROOT/'lib/game';CACHE=pathlib.Path(sys.argv[1]);BASE='cacd61dbcc64d80f97eedfd3466ad68d7e685fdc'
def pinned(f):return json.loads(subprocess.check_output(['git','show',BASE+':lib/game/'+f],cwd=ROOT))
def write(f,x,pretty=False):(GAME/f).write_text(json.dumps(x,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n')
rows=json.loads((CACHE/'records.json').read_text());existing={'919276','919284','919283','919278'};assert len(rows)==51;rows=[r for r in rows if str(r['sourceId']) not in existing];assert len(rows)==47
active=pinned('gamedata.json');new={};refs={};profile_fields=['hit','damage','minS','maxS','minL','maxL','undead','ignoreDr','ignoreEr','ignoreAc']
for row in rows:
 sid=int(row['sourceId']);id='lw_equipment_'+str(sid);cat=row['category'];kind=WEAPONS.get(cat);slot='weapon' if kind else SLOTS[cat];info=row['info'];stats,pending=normalize(row['attributes']);growth={'0':{}};applied=[]
 for stage,lines in row['enhancements'].items():
  g,p=normalize(lines);assert not p,(id,stage,p);growth[stage]=g
 assert not pending,(id,pending)
 if not kind:
  for d in [stats,*growth.values()]:
   for src,dst in [('ignoreDr','allIgnoreDr'),('ignoreEr','ignoreErBonus'),('ignoreAc','ignoreAcBonus')]:
    if src in d:d[dst]=d.pop(src)
 for stage,lines in [(None,row['attributes'])]+[(int(n),v) for n,v in row['enhancements'].items()]:
  for t in lines:
   a,p=normalize([t])
   for k,v in a.items():applied.append({'text':t,'stage':stage,'key':k,'value':v})
 refs[id]={**row,'sourceId':sid,'sourceUrl':f'https://6sword.com/zh-TW/lw/items/{sid}','grade':'神話','stats':stats,'growth':growth,'pending':[],'appliedEffects':applied}
 req=[CLASSES[c] for c in row['classes'] if c in CLASSES] or list(CLASSES.values());cap=max(map(int,growth))
 item={'n':row['name'],'type':'wpn' if kind else 'acc' if slot in ['ring','amulet','belt'] else 'arm','slot':slot,'req':','.join(req),'safe':int(info.get('安全強化','0')),'source':'lineagew','sourceId':sid,'lwCatalogId':id,'lwGrade':'mythic','sourceIcon':f'/assets/lineagew/equipment/{sid}.webp','noAffix':True,'p':3000000,'sellP':750000,'priceSource':'永夜神話分級價格；非來源售價','noShop':True,'weight':float(info.get('重量','0').replace(',','')),'enhCap':cap,'noEnh':info.get('強化')=='不可' or cap==0,'d':'神話能力及來源機率；未公開公式採永夜規則。'}
 item.update({k:v for k,v in stats.items() if k not in profile_fields})
 if kind:
  assert all(k in stats for k in ['minS','maxS','minL','maxL'])
  item.update(dmgS=stats['maxS'],dmgL=stats['maxL'],hit=stats.get('hit',0),dmgBonus=stats.get('damage',0),wcat=kind,sourceKind=kind,spd=1.2)
  if kind=='bow':item.update(isBow=True,ranged=True)
  if '雙手武器' in row['attributes'] or kind in ['tohandsword','bow','dual','claw']:item['twohanded']=True
 if info.get('倉庫保管')=='不可':item['noWh']=True
 new[id]=item
retired={id:active['items'][id] for id in ['ap381_weapon_12','ap381_weapon_61','ap381_weapon_86','ap381_weapon_213','ap381_weapon_217']};mapping={'ap381_weapon_61':'lw_weapon_919276','ap381_weapon_86':'lw_weapon_919283'}
active['items']={id:i for id,i in active['items'].items() if id not in retired};active['items'].update(new);active['sets']={id:s for id,s in active['sets'].items() if not any(i in retired for i in s.get('items',[]))}
def transform(x):
 if isinstance(x,str):return mapping.get(x) if x in retired else x
 if isinstance(x,list):return [y for v in x if (y:=transform(v)) is not None]
 if isinstance(x,dict):
  if 'item' in x and x['item'] in retired and x['item'] not in mapping:return None
  return {mapping.get(k,k):transform(v) for k,v in x.items() if k not in retired or k in mapping}
 return x
for k in active:
 if k not in ['items','sets']:active[k]=transform(active[k])
write('gamedata.json',active)
for f in ['monster-drops.json','monster-drop-rates.json']:write(f,transform(pinned(f)))
ref=pinned('reference-equipment.json');ref['items']=[r for r in ref['items'] if r['id'] not in retired];ref['counts']={k:sum(r['category']==k for r in ref['items']) for k in ref['counts']};write('reference-equipment.json',ref)
counts={t:sum(r['type']==t for r in rows) for t in ['武器','防具','戒指','項鍊','腰帶']};assert counts=={'武器':11,'防具':32,'戒指':2,'項鍊':1,'腰帶':1}
manifest={'version':'lineagew-mythic-v1','baselineCommit':BASE,'verifiedAt':'2026-10-23','source':'https://6sword.com/zh-TW/lw','sourceAllJobs':89,'selected':51,'existing':4,'imported':47,'counts':counts,'retired':len(retired),'mapped':len(mapping),'enhancementPolicy':'依來源逐件上限；永夜卷軸機率。不可強化保留；逐階為相對+0總追加值。','priceRules':'永夜神話估價3000000／出售750000；不加入一般商店；製作與世界王沿用永夜規則。','color':'#ffd700'}
write('lineagew-mythic-catalog-reference.json',{'items':refs,'manifest':manifest},True);write('lineagew-mythic-retired.json',{'items':retired,'mapping':mapping},True);write('lineagew-mythic-retirement-index.json',{'items':{id:{'n':i['n']} for id,i in retired.items()},'mapping':mapping})
icons=ROOT/'public/assets/lineagew/equipment';dims=pinned('item-icon-dimensions.json')
for r in rows:
 f=CACHE/'icons'/(str(r['sourceId'])+'.webp');assert f.read_bytes()[:4]==b'RIFF';shutil.copyfile(f,icons/f.name);dims[new['lw_equipment_'+str(r['sourceId'])]['sourceIcon']]=[128,128]
write('item-icon-dimensions.json',dims);write('lineagew-mythic-activation.json',{'version':manifest['version'],'enabled':True,'items':47,'icons':47,'retired':len(retired)})
print(json.dumps(manifest,ensure_ascii=False))
