"""Import a reviewed reference snapshot without overwriting existing IDs."""
import argparse,json,pathlib,shutil,collections
p=argparse.ArgumentParser();p.add_argument('--catalog',required=True);p.add_argument('--source-root',required=True);a=p.parse_args()
root=pathlib.Path('.'); catalog=json.loads(pathlib.Path(a.catalog).read_text()); source=pathlib.Path(a.source_root); data=json.loads((root/'lib/game/gamedata.json').read_text()); icons=json.loads((root/'lib/game/asset-map.json').read_text()); manifest=[]
for row in catalog['items']:
 id='ref_'+row['id']; d=dict(row['definition']); original=dict(d)
 d.update(source='autumn-reference',sourceId=row['id'],sourceCategory=row['category'],sourceDefinition=original,sourceIcon=f'/assets/reference-equipment/{id}.png',noShop=True,_noGacha=True)
 d['noEnh']=bool(d.get('noEnh') or d.get('noEnhance'));d['slot']={'ear':'ear1','shin':'pants'}.get(d.get('slot'),d.get('slot')) if d.get('slot') else d.get('slot')
 if d.get('slot') is None:d.pop('slot',None)
 if d.get('slot') in ['petwpn','petarm','doll']:d['noEquip']=True;d['noEnh']=True;d['sourceUseNote']='寵物裝備／娃娃的專屬使用規則尚未接入，保留名稱、圖示與能力資料。'
 if d.get('extraMp') is not None:d['sp']=d.get('sp',0)+d['extraMp']
 if d.get('extraMpPerEn') is not None:d['spPerEn']=d['extraMpPerEn'];d.pop('extraMpPerEn',None)
 if d.get('extraDmgPerEn') is not None:d['extraDmgPerEn']=d['extraDmgPerEn']
 data['items'][id]=d
 dst=root/'public'/d['sourceIcon'].lstrip('/');dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/row['icon'],dst)
 icons['icons']['items'].setdefault(d['n'],d['sourceIcon'])
 manifest.append({'id':id,'sourceId':row['id'],'name':d['n'],'category':row['category'],'icon':d['sourceIcon']})
for path in ['lib/game/gamedata.json','public/gamedata.json']:(root/path).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
(root/'lib/game/asset-map.json').write_text(json.dumps(icons,ensure_ascii=False,separators=(',',':')))
(root/'lib/game/reference-equipment.json').write_text(json.dumps({'source':catalog['source'],'commit':catalog['commit'],'counts':catalog['counts'],'items':manifest},ensure_ascii=False,separators=(',',':')))
print(json.dumps({'imported':len(manifest),'totalItems':len(data['items']),'counts':collections.Counter(r['category'] for r in manifest)},ensure_ascii=False))
