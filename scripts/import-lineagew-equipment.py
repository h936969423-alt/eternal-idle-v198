"""Build the pinned W catalog from cached public HTML. Run crawl-lineagew-equipment.py first.
Only facts, item identifiers and source attribution are retained; unknown abilities are explicit.
"""
import json,re,pathlib,sys,hashlib,concurrent.futures,urllib.request,time
from lxml import html
from lineagew_effects import parse_effect
ROOT=pathlib.Path(__file__).resolve().parents[1];CACHE=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/lw-catalog');GAME=ROOT/'lib/game'
SLOTS={'頭盔':'helm','面甲':'helm','盔甲':'armor','T恤':'tshirt','手套':'gloves','斗篷':'cloak','鞋':'boots','脛甲':'pants','盾牌、臂甲、輔助':'shield','戒指':'ring','項鍊':'amulet','皮帶':'belt'}
WEAPONS={'匕首':'dagger','單手劍':'sword','雙手劍':'tohandsword','弓':'bow','魔杖':'staff','鋼爪':'claw','雙刀':'dual','斧':'blunt','槍':'spear','雙手斧':'tohandblunt'}
CLASSES={'騎士':'knight','妖精':'elf','魔法師':'mage','黑暗妖精':'dark'}
GRADES={'一般':'normal','高級':'advanced','稀有':'rare'}
FIELDS={'暴擊機率':'critPct','雙倍機率':'doubleChance','金幣獎勵':'goldPct','物理防禦力':'ac','魔法防禦力':'mr','最大HP':'mhp','最大MP':'mmp','HP恢復':'hpR','MP恢復':'mpR','STR':'str','DEX':'dex','CON':'con','INT':'int','WIS':'wis','CHA':'cha','重量獎勵':'weightCap','傷害減免':'dr','近距離傷害':'meleeDmg','遠距離傷害':'rangedDmg','近距離命中':'meleeHit','遠距離命中':'rangedHit','魔法傷害':'mdmg','魔法命中':'magicHit','魔法增幅力':'sp','PVP追加傷害':'pvpDmg','PVP傷害減免':'pvpDr','藥水恢復率':'potionBonus','藥水恢復量':'potionFlat','攻擊速度':'atkSpdPct','增加最大HP':'maxHpPct','增加最大MP':'maxMpPct','近距離暴擊':'meleeCrit','遠距離暴擊':'rangedCrit','魔法暴擊':'magicCrit','近距離迴避力':'er','遠距離迴避力':'er','無視傷害減免':'ignoreDr','無視物理防禦力':'ignoreAc','無視遠距離迴避力':'ignoreEr','無視近距離迴避力':'ignoreEr','火屬性防禦':'resFire','水屬性防禦':'resWater','風屬性防禦':'resWind','地屬性防禦':'resEarth','昏迷抗性':'stunResist','石化抗性':'stoneResist','睡眠抗性':'sleepResist','失明抗性':'blindResist','束縛抗性':'sustainResist'}
def normalize(lines):
 out={};pending=[]
 for text in lines:
  effect=parse_effect(text)
  if effect:out[effect[0]]=effect[1];continue
  m=re.fullmatch(r'(小型目標傷害|大型目標傷害)\s+([\d.]+)~([\d.]+)',text)
  if m:
   size='S' if m[1]=='小型目標傷害' else 'L';out['min'+size]=int(float(m[2]));out['max'+size]=int(float(m[3]));continue
  if text in ['防止武器損壞','雙手武器']:continue
  m=re.fullmatch(r'不死族追加傷害 1~(\d+)',text)
  if m:out['undead']=int(m[1]);continue
  m=re.fullmatch(r'(.+?)\s+([+-]?[\d.]+)(%)?',text)
  if m:
   label,value,percent=m.groups();value=float(value);value=int(value) if value.is_integer() else value
   if label in FIELDS:out[FIELDS[label]]=out.get(FIELDS[label],0)+value;continue
   if label in ['武器命中','武器追加傷害']:out['hit' if label=='武器命中' else 'damage']=value;continue
   if label=='不死族追加傷害':out['undead']=value;continue
  pending.append(text)
 return out,pending
rows=json.loads((CACHE/'listing.json').read_text());references={};new={};excluded=[]
for r in rows:
 cat=r['category'];sid=r['sourceId'];
 if cat not in SLOTS and cat not in WEAPONS:excluded.append({'sourceId':sid,'reason':'非指定部位'});continue
 doc=html.fromstring((CACHE/f'item{sid}.html').read_bytes())
 def section(label):
  hs=doc.xpath('//h2[normalize-space(text())="'+label+'"]');return [x.text_content() for x in hs[0].getparent().xpath('.//li')] if hs else []
 classes=section('可裝備職業');req=[CLASSES[c] for c in classes if c in CLASSES]
 if classes and not req:excluded.append({'sourceId':sid,'reason':'僅其他職業'});continue
 if not req:req=list(CLASSES.values())
 attrs=section('屬性');stats,pending=normalize(attrs);growth={'0':{}};enh={}
 for tr in doc.xpath('//table[.//th[contains(text(),"階段")]]//tbody/tr'):
  m=re.match(r'\+(\d+)',tr.xpath('./th')[0].text_content())
  if not m:continue
  stage=m[1];lines=[x.text_content() for x in tr.xpath('.//li')];enh[stage]=lines;g,p=normalize(lines);growth[stage]=g;pending.extend('+'+stage+'：'+a for a in p)
 info={x.xpath('./dt')[0].text_content():x.xpath('./dd')[0].text_content() for x in doc.xpath('(//dl)[1]/div[dt and dd]')}
 id='lw_equipment_'+str(sid);slot='weapon' if cat in WEAPONS else SLOTS[cat];kind=WEAPONS.get(cat);grade=GRADES[r['grade']]
 official=doc.xpath('//*[self::h2 or self::h3][normalize-space(text())="官方 ID"]');officialPs=official[0].getparent().xpath('./p[contains(@class,"break-words")]') if official else [];officialIds=re.findall(r'\d+',officialPs[0].text_content()) if officialPs else [str(sid)]
 ref={**r,'sourceSha256':hashlib.sha256((CACHE/f'item{sid}.html').read_bytes()).hexdigest(),'sourceUrl':'https://6sword.com/zh-TW/lw/items/'+str(sid),'iconUrl':'https://6sword.com'+r['icon'],'classes':classes,'info':info,'attributes':attrs,'enhancements':enh,'stats':stats,'growth':growth,'pending':pending,'officialIds':officialIds};references[id]=ref
 applied=[]
 for stage,lines in [(None,attrs)]+[(int(n),lines) for n,lines in enh.items()]:
  for text in lines:
   effect=parse_effect(text)
   if effect:applied.append({'text':text,'stage':stage,'key':effect[0],'value':effect[1]})
 if applied:ref['appliedEffects']=applied
 item={'n':r['name'],'type':'wpn' if kind else 'acc' if slot in ['ring','amulet','belt'] else 'arm','slot':slot,'req':','.join(req),'safe':int(info.get('安全強化','0')) if info.get('安全強化','').isdigit() else 0,'source':'lineagew','sourceId':sid,'lwCatalogId':id,'lwGrade':grade,'sourceIcon':'/assets/lineagew/equipment/'+str(sid)+'.webp','noAffix':True,'p':{'normal':500,'advanced':10000,'rare':50000}[grade],'sellP':{'normal':125,'advanced':2500,'rare':12500}[grade],'priceSource':'永夜品質分級價格；非來源售價','weight':float(info.get('重量','0').replace(',','')),'d':'天堂 W 公開裝備資料；特殊能力支援狀態及強化表見下方。'}
 # These raw fields are added once by stats(); weapon rolls/hit/damage are supplied by the W profile.
 item.update({k:v for k,v in stats.items() if k not in ['hit','damage','minS','maxS','minL','maxL','undead','ignoreDr','ignoreEr','ignoreAc']})
 if kind:
  if not all(k in stats for k in ['minS','maxS','minL','maxL']):raise ValueError('weapon damage missing '+id)
  item.update(dmgS=stats['maxS'],dmgL=stats['maxL'],hit=stats.get('hit',0),dmgBonus=stats.get('damage',0),wcat=kind,sourceKind=kind,spd=1.2)
  if cat=='弓':item.update(isBow=True,ranged=True)
  if '雙手武器' in attrs:item['twohanded']=True
 if not enh:item['noEnh']=True
 if info.get('倉庫保管')=='不可':item['noWh']=True
 new[id]=item
# Archive exact old definitions. Reruns always use the pinned pre-migration baseline.
import subprocess
baseline=json.loads(subprocess.check_output(['git','show','a52fb2be668a82a495e7edbb4f163e77808238fb:lib/game/gamedata.json'],cwd=ROOT))
# Recompute the retirement scope from the pinned baseline and the previous appearance classifications.
oldrefs={tier:json.loads((GAME/(tier+'-equipment-reference.json')).read_text())['items'] for tier in ['normal','advanced','rare']}
mythic={'ap381_weapon_12','ap381_weapon_61','ap381_weapon_86','ap381_weapon_213','ap381_weapon_217'}
def oldrank(id,i):
 for tier in ['rare','advanced','normal']:
  if id in oldrefs[tier]:return tier
 if id in mythic:return 'mythic'
 level=i.get('minLv',0);price=i.get('p',0)
 return 'legend' if level>=70 or price>=500000 else 'hero' if level>=55 or price>=150000 else 'rare' if level>=40 or price>=30000 else 'advanced' if level>=15 or price>=3000 else 'normal'
retired={id:i for id,i in baseline['items'].items() if i.get('source')=='apang381' and i.get('type') in ['wpn','arm','acc'] and not any(i.get(k) for k in ['noEquip','isArrow','doll','petEquip','petEquipment','petOnly']) and (i.get('type')=='wpn' or i.get('slot') in SLOTS.values()) and (i.get('req','all')=='all' or set(i.get('req','').split(','))&set(CLASSES.values())) and oldrank(id,i) in GRADES.values()};mapping={};ambiguous=[]
def name(n):return n.replace(' ','').replace('腰帶','皮帶').replace('魔法杖','魔杖')
kindmap={'tohandstaff':'staff','edoryu':'dual','singlebow':'bow','singlespear':'spear','gauntlet':'bow'}
for old,i in retired.items():
 candidates=[]
 for id,j in new.items():
  if name(i['n'])!=name(j['n']) or i['slot']!=j['slot']:continue
  if i['type']=='wpn' and kindmap.get(i.get('sourceKind'),i.get('sourceKind'))!=j.get('wcat'):continue
  oldclasses=set(i.get('req','all').split(','))&set(CLASSES.values())
  if not oldclasses<=set(j['req'].split(',')):continue
  candidates.append(id)
 # Prefer an ordinary, unqualified source record over an event/store duplicate.
 plain=[id for id in candidates if new[id]['n']==i['n'] and not re.search(r'活動|商店|見習|刻印',new[id]['n'])]
 if len(plain)==1:candidates=plain
 if len(candidates)==1:mapping[old]=candidates[0]
 elif candidates:ambiguous.append({'id':old,'candidates':candidates})
# Explicit class starter choices, all ordinary source weapons, also used to replace unmatched old starter drops.
starters={}
for cls,cat in [('knight','單手劍'),('elf','弓'),('dark','鋼爪'),('mage','魔杖')]:
 choices=[id for id,i in new.items() if references[id]['category']==cat and i['lwGrade']=='normal' and cls in i['req'].split(',') and not re.search(r'活動|商店|見習',i['n'])]
 if not choices:raise ValueError('missing starter '+cls)
 starters[cls]=min(choices,key=lambda id:new[id]['sourceId'])
# Do not pretend a different-name starter is an exact held-item conversion; new characters use this table.
manifest={'version':'lineagew-nar-v1','source':'https://6sword.com/zh-TW/lw','verifiedAt':'2026-10-22','baselineCommit':'a52fb2be668a82a495e7edbb4f163e77808238fb','listed':len(rows),'imported':len(new),'excluded':excluded,'retired':len(retired),'mapped':len(mapping),'ambiguous':ambiguous,'starters':starters,'counts':{},'priceRules':'永夜設定：普通500、高級10000、稀有50000；出售25%。非天堂W原價。'}
for id,i in new.items():manifest['counts'].setdefault(i['lwGrade'],{});counts=manifest['counts'][i['lwGrade']];counts[references[id]['category']]=counts.get(references[id]['category'],0)+1
manifest['effectsVersion']=1;manifest['effectsAffected']=sum(bool(r.get('appliedEffects')) for r in references.values())
out={'items':references,'manifest':manifest};(GAME/'lineagew-equipment-reference.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');(GAME/'lineagew-retired.json').write_text(json.dumps({'items':retired,'mapping':mapping},ensure_ascii=False,indent=2)+'\n')
(GAME/'lineagew-retirement-index.json').write_text(json.dumps({'items':{id:{'n':i['n']} for id,i in retired.items()},'mapping':mapping},ensure_ascii=False,separators=(',',':'))+'\n')
active=baseline;active['items']={id:i for id,i in active['items'].items() if id not in retired};active['items'].update(new)
active['sets']={id:s for id,s in active['sets'].items() if not any(i in retired for i in s.get('items',[]))}
# Repoint only known-equivalent equipment references; unsupported legacy sources are removed, never substituted arbitrarily.
def transform(x):
 if isinstance(x,str):return mapping.get(x) if x in retired else x
 if isinstance(x,list):return [y for v in x if (y:=transform(v)) is not None]
 if isinstance(x,dict):
  if 'item' in x and x['item'] in retired and x['item'] not in mapping:return None
  return {k:transform(v) for k,v in x.items() if not(k in retired and k not in mapping)}
 return x
# Non-equipment gamedata sections can refer to item IDs; raw definitions are deliberately untouched.
for k in active:
 if k not in ['items','sets']:active[k]=transform(active[k])
(GAME/'gamedata.json').write_text(json.dumps(active,ensure_ascii=False,separators=(',',':')))
for filename in ['monster-drops.json','monster-drop-rates.json']:
 original=json.loads(subprocess.check_output(['git','show','a52fb2be668a82a495e7edbb4f163e77808238fb:lib/game/'+filename],cwd=ROOT));(GAME/filename).write_text(json.dumps(transform(original),ensure_ascii=False,separators=(',',':')))
# Retired entries disappear from the active reference browser; the complete original is preserved in git + retired sidecar.
original=json.loads(subprocess.check_output(['git','show','a52fb2be668a82a495e7edbb4f163e77808238fb:lib/game/reference-equipment.json'],cwd=ROOT));original['items']=[r for r in original['items'] if r['id'] not in retired];original['counts']={k:sum(r['category']==k for r in original['items']) for k in original['counts']};(GAME/'reference-equipment.json').write_text(json.dumps(original,ensure_ascii=False,separators=(',',':')))
# Missing recipe materials must hide the recipe, never become free ingredients.
icons=ROOT/'public/assets/lineagew/equipment';icons.mkdir(parents=True,exist_ok=True)
def image(pair):
 id,r=pair;p=ROOT/'public'/new[id]['sourceIcon'].lstrip('/')
 if p.exists():return
 for attempt in range(4):
  try:
   data=urllib.request.urlopen(r['iconUrl'],timeout=45).read()
   if data[:4]!=b'RIFF':raise ValueError('invalid WebP '+id)
   p.write_bytes(data);return
  except Exception:
   if attempt==3:raise
   time.sleep(attempt+1)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(image,references.items()))
(GAME/'lineagew-equipment-activation.json').write_text(json.dumps({'version':manifest['version'],'enabled':True,'items':len(new),'icons':len(list(icons.glob('*.webp'))),'retired':len(retired)},indent=2)+'\n')
print(json.dumps({k:manifest[k] for k in ['imported','retired','mapped','starters','counts']},ensure_ascii=False,indent=2))

# Explicit control-ring restoration is applied after a historical import.
if (GAME/'control-ring-restoration.ts').exists():
 subprocess.run([sys.executable,str(ROOT/'scripts/restore-control-rings.py')],cwd=ROOT,check=True)
