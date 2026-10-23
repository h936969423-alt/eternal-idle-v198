"""Import verified HL facts into the current catalog, preserving the NAR migration.
Usage: python scripts/import-lineagew-hero-legend.py /tmp/lw-hero-legend
Reruns use the pinned pre-HL source state, never a moving working tree.
"""
import json,re,pathlib,sys,subprocess,shutil
from lineagew_hl_normalize import normalize,SLOTS,WEAPONS,CLASSES,GRADES
from lineagew_hl_effects import parse_hl_effect,PROCS
from lineagew_effects import parse_effect
ROOT=pathlib.Path(__file__).resolve().parents[1];GAME=ROOT/'lib/game';CACHE=pathlib.Path(sys.argv[1]);BASE='8c6467547a5e5198ccc6339a723af1484df061b3'
def pinned(file):return json.loads(subprocess.check_output(['git','show',BASE+':lib/game/'+file],cwd=ROOT))
def write(file,obj,pretty=False):
 (GAME/file).write_text(json.dumps(obj,ensure_ascii=False,indent=2 if pretty else None,separators=None if pretty else (',',':'))+'\n')
rows=json.loads((CACHE/'records.json').read_text());assert len(rows)==298
assert {g:sum(r['grade']==g for r in rows) for g in GRADES}=={'英雄':147,'傳說':151}
new={};refs={};unknown=[]
for row in rows:
 r={**row,'sourceId':int(row['sourceId'])};sid=r['sourceId'];id='lw_equipment_'+str(sid);cat=r['category'];grade=GRADES[r['grade']]
 stats,pending=normalize(r['attributes']);enh=r['enhancements'];growth={'0':{}};applied=[]
 for stage,lines in [(None,r['attributes'])]+[(int(n),ls) for n,ls in enh.items()]:
  if stage is not None:
   g,p=normalize(lines);growth[str(stage)]=g;pending.extend('+'+str(stage)+'：'+a for a in p)
  for text in lines:
   effect=parse_hl_effect(text) or parse_effect(text)
   if effect:applied.append({'text':text,'stage':stage,'key':effect[0],'value':effect[1]})
 if pending:unknown.append({'id':id,'name':r['name'],'pending':pending})
 r.update(stats=stats,growth=growth,pending=pending,appliedEffects=applied);refs[id]=r
 kind=WEAPONS.get(cat);slot='weapon' if kind else SLOTS[cat];req=[CLASSES[c] for c in r['classes'] if c in CLASSES] or list(CLASSES.values());info=r['info']
 item={'n':r['name'],'type':'wpn' if kind else 'acc' if slot in ['belt','ring','amulet'] else 'arm','slot':slot,'req':','.join(req),'safe':int(info.get('安全強化','0')) if info.get('安全強化','').isdigit() else 0,'source':'lineagew','sourceId':sid,'lwCatalogId':id,'lwGrade':grade,'sourceIcon':f'/assets/lineagew/equipment/{sid}.webp','noAffix':True,'p':200000 if grade=='hero' else 1000000,'sellP':50000 if grade=='hero' else 250000,'priceSource':'永夜品質分級價格；非來源售價','weight':float(info.get('重量','0').replace(',','')),'d':'天堂 W 公開裝備資料；來源機率、永夜傷害與狀態規則見下方。'}
 profile_fields=['hit','damage','minS','maxS','minL','maxL','undead','ignoreDr','ignoreEr','ignoreAc']
 item.update({k:v for k,v in stats.items() if k not in profile_fields})
 if not kind:
  for src,dest in [('ignoreDr','allIgnoreDr'),('ignoreEr','ignoreErBonus'),('ignoreAc','ignoreAcBonus')]:
   if src in stats:item[dest]=stats[dest]=stats.pop(src)
  for g in growth.values():
   for src,dest in [('ignoreDr','allIgnoreDr'),('ignoreEr','ignoreErBonus'),('ignoreAc','ignoreAcBonus')]:
    if src in g:g[dest]=g.pop(src)
 if kind:
  assert all(k in stats for k in ['minS','maxS','minL','maxL']),id
  item.update(dmgS=stats['maxS'],dmgL=stats['maxL'],hit=stats.get('hit',0),dmgBonus=stats.get('damage',0),wcat=kind,sourceKind=kind,spd=1.2)
  if cat=='弓':item.update(isBow=True,ranged=True)
  if cat=='發射體魔杖':item.update(magicProjectile=True,ranged=True)
  if '雙手武器' in r['attributes']:item['twohanded']=True
 if not enh:item['noEnh']=True
 if info.get('倉庫保管')=='不可':item['noWh']=True
 new[id]=item
if unknown:
 (CACHE/'import-unknown.json').write_text(json.dumps(unknown,ensure_ascii=False,indent=2));raise ValueError('Unmapped clauses; see import-unknown.json')
active=pinned('gamedata.json');current=json.loads((GAME/'gamedata.json').read_text())
for id,i in active['items'].items():
 if i.get('lwMythicId') and current['items'].get(id,{}).get('noEnh') is False:
  for field in ['noEnh','enhCap','d']:
   if field in current['items'][id]:i[field]=current['items'][id][field]
oldrefs={tier:pinned(tier+'-equipment-reference.json')['items'] for tier in ['normal','advanced','rare']};mythic={'ap381_weapon_12','ap381_weapon_61','ap381_weapon_86','ap381_weapon_213','ap381_weapon_217'}
def rank(id,i):
 for tier in ['rare','advanced','normal']:
  if id in oldrefs[tier]:return tier
 if id in mythic:return 'mythic'
 return 'legend' if i.get('minLv',0)>=70 or i.get('p',0)>=500000 else 'hero' if i.get('minLv',0)>=55 or i.get('p',0)>=150000 else 'other'
retired={id:i for id,i in active['items'].items() if i.get('source')=='apang381' and i.get('type') in ['wpn','arm','acc'] and not any(i.get(k) for k in ['noEquip','isArrow','doll','petEquip','petEquipment','petOnly']) and not i.get('slot','').startswith('pet') and (i.get('type')=='wpn' or i.get('slot') in SLOTS.values()) and (i.get('req','all')=='all' or set(i.get('req','').split(','))&set(CLASSES.values())) and rank(id,i) in ['hero','legend']}
def name(n):return n.replace(' ','').replace('腰帶','皮帶').replace('魔法杖','魔杖')
mapping={};ambiguous=[];kindmap={'tohandstaff':'staff','edoryu':'dual','singlebow':'bow','singlespear':'spear','gauntlet':'bow'}
for old,i in retired.items():
 candidates=[]
 for id,j in new.items():
  if name(i['n'])!=name(j['n']) or i.get('slot')!=j.get('slot'):continue
  if i['type']=='wpn' and kindmap.get(i.get('sourceKind'),i.get('sourceKind'))!=j.get('wcat'):continue
  oldclasses=set(CLASSES.values()) if i.get('req','all')=='all' else set(i['req'].split(','))&set(CLASSES.values())
  if not oldclasses<=set(j['req'].split(',')):continue
  candidates.append(id)
 plain=[id for id in candidates if new[id]['n']==i['n'] and not re.search(r'活動|商店|見習|刻印',new[id]['n'])]
 if len(plain)==1:candidates=plain
 if len(candidates)==1:mapping[old]=candidates[0]
 elif candidates:ambiguous.append({'id':old,'candidates':candidates})
counts={g:{t:sum(r['grade']==g and r['type']==t for r in rows) for t in ['武器','防具','腰帶','戒指','項鍊']} for g in GRADES}
assert counts=={'英雄':{'武器':40,'防具':89,'腰帶':7,'戒指':7,'項鍊':4},'傳說':{'武器':27,'防具':98,'腰帶':6,'戒指':9,'項鍊':11}}
manifest={'version':'lineagew-hl-v1','baselineCommit':BASE,'verifiedAt':'2026-10-22','imported':298,'counts':counts,'retired':len(retired),'mapped':len(mapping),'ambiguous':ambiguous,'source':'https://6sword.com/zh-TW/lw','priceRules':'永夜價格：英雄200000／傳說1000000；出售25%，非來源售價。','colors':{'hero':'#ff4040','legend':'#b366ff'},'procNames':PROCS}
write('lineagew-hero-legend-reference.json',{'items':refs,'manifest':manifest},True);write('lineagew-hl-retired.json',{'items':retired,'mapping':mapping},True);write('lineagew-hl-retirement-index.json',{'items':{id:{'n':i['n']} for id,i in retired.items()},'mapping':mapping})
active['items']={id:i for id,i in active['items'].items() if id not in retired};active['items'].update(new);active['sets']={id:s for id,s in active['sets'].items() if not any(id in retired for id in s.get('items',[]))}
def transform(x):
 if isinstance(x,str):return mapping.get(x) if x in retired else x
 if isinstance(x,list):return [y for v in x if (y:=transform(v)) is not None]
 if isinstance(x,dict):
  if 'item' in x and x['item'] in retired and x['item'] not in mapping:return None
  return {mapping.get(k,k):transform(v) for k,v in x.items() if not(k in retired and k not in mapping)}
 return x
for k in active:
 if k not in ['items','sets']:active[k]=transform(active[k])
write('gamedata.json',active)
for file in ['monster-drops.json','monster-drop-rates.json']:write(file,transform(pinned(file)))
reference=pinned('reference-equipment.json');reference['items']=[r for r in reference['items'] if r['id'] not in retired];reference['counts']={k:sum(r['category']==k for r in reference['items']) for k in reference['counts']};write('reference-equipment.json',reference)
icons=ROOT/'public/assets/lineagew/equipment';icons.mkdir(parents=True,exist_ok=True)
for r in rows:
 p=CACHE/'icons'/(str(r['sourceId'])+'.webp');assert p.read_bytes()[:4]==b'RIFF',str(p);shutil.copyfile(p,icons/p.name)
dims=pinned('item-icon-dimensions.json');dims.update({i['sourceIcon']:[128,128] for i in new.values()});write('item-icon-dimensions.json',dims)
write('lineagew-hl-activation.json',{'version':manifest['version'],'enabled':True,'items':298,'icons':298,'retired':len(retired)})
print(json.dumps(manifest,ensure_ascii=False,indent=2))

# Explicit control-ring restoration is applied after a historical import.
if (GAME/'control-ring-restoration.ts').exists():
 subprocess.run([sys.executable,str(ROOT/'scripts/restore-control-rings.py')],cwd=ROOT,check=True)
