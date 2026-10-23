"""Compile the audited SQL catalog into runtime data; preserve source definitions separately."""
import json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def read(path): return json.loads((ROOT/path).read_text())
def write(path, data):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
def table(name): return [r['values'] for r in read('docs/equipment381/source/'+name+'.json')['rows']]
def num(v): return int(float(v or 0))
def norm(n): return re.sub(r'[\s．·・]', '',n)

catalog=read('lib/game/equipment381-catalog.json')
legacy=read('docs/equipment381/legacy-equipment.json')
raw=read('lib/game/gamedata.json')
items={k:v for k,v in raw['items'].items() if k not in legacy and not k.startswith('ap381_')}
byname={}
for row in sorted(catalog['items'],key=lambda r:r['sourceId']):
    byname.setdefault(norm(row['name']),[]).append(row)
mapping={}
for key,old in legacy.items():
    matches=[r for r in byname.get(norm(old['n']),[]) if (r['sourceTable']=='weapon')==(old['type']=='wpn')]
    if matches: mapping[key]=matches[0]['id']
write('lib/game/equipment381-reference-map.json',mapping)

fields={'add_str':'str','add_dex':'dex','add_con':'con','add_int':'int','add_wis':'wis','add_cha':'cha','add_hp':'mhp','add_mp':'mmp','add_hpr':'hpR','add_mpr':'mpR','add_sp':'sp','m_def':'mr','damage_reduction':'dr','weight_reduction':'weightCap','bow_hit_modifier':'rangedHit','bow_dmg_modifier':'rangedDmg','hit_modifier':'meleeHit','dmg_modifier':'meleeDmg','magic_hit_modifier':'magicHit','magicdmgmodifier':'mdmg','regist_stun':'stunResist','regist_stone':'stoneResist','regist_sleep':'sleepResist','regist_freeze':'freezeResist','regist_sustain':'sustainResist','regist_blind':'blindResist','up_hp_potion':'potionBonus','uhp_number':'potionFlat','critical':'meleeCrit','bow_critical':'rangedCrit','magic_critical':'magicCrit','exp_point':'expPct','PVPdmg':'pvpDmg','PVPdmgReduction':'pvpDr'}
for ele in ['water','wind','fire','earth']:fields['defense_'+ele]='res'+ele.title()
twohanded={'tohandsword','tohandstaff','tohandblunt','tohandbow','bow','gauntlet','claw','edoryu','kiringku','chainsword'}
rows=[]
for row in catalog['items']:
    v=row['sourceValues']; weapon=row['sourceTable']=='weapon'
    kind='wpn' if weapon else 'acc' if row['category'] not in ['武器','防具'] else 'arm'
    d={'n':row['name'],'type':kind,'slot':row['slot'],'req':','.join(row['classes']) or 'none','safe':row['safeEnchant'],'source':'apang381','sourceId':row['sourceId'],'sourceTable':row['sourceTable'],'sourceKind':row['kind'],'sourceIcon':f"/assets/equipment381/icons/{row['inventoryGraphic']}.webp",'sourceDetails':f"/assets/equipment381/details/{row['id']}.json",'minLv':row['minimumLevel'],'maxLv':row['maximumLevel'],'material':row['material'],'weight':row['weight']/1000,'bless':num(v.get('bless')),'greater':num(v.get('greater',-1)),'sourceClass':row['specialClass'],'p':0,'sellP':0,'noSell':True,'noAffix':True,'assetChecks':row['assetChecks'],'abilityStatus':'base-stats-and-sets','fullParity':False}
    for source,dest in fields.items():
        n=num(v.get(source))
        if n:d[dest]=n
    if weapon:
        d.update(dmgS=row['damageSmall'],dmgL=row['damageLarge'],hit=row['hitModifier'],dmgBonus=row['damageModifier'],spd=1.2,wcat=row['kind'],doubleChance=num(v.get('double_dmg_chance')))
        if row['kind'] in twohanded:d['twohanded']=True
        if row['kind'] in ['bow','tohandbow','singlebow','gauntlet']:d.update(isBow=True,ranged=True)
        if row['material'] in ['silver','mithril','oriharukon']:d['unBonus']=True
        d['magicPending']=bool(row['powerSlots'] or row['weaponSkill'] or row['specialClass']!='0')
    else:d['ac']=-row['ac']
    if num(v.get('haste_item')):d['sourceHaste']=True
    if row['safeEnchant']<0 or d['bless']>=128 or not weapon and d['greater']==3 or weapon and 246<=row['sourceId']<=255:d['noEnh']=True
    if row['sourceId']==20281:d['polyCtrl']=True
    if row['sourceId']==20284:d['summonCtrl']=True
    # Reuse the existing game's economy only for exact-name replacements; never invent a source price.
    old=[legacy[k] for k,new in mapping.items() if new==row['id'] and legacy[k].get('p',0)>0]
    if old:
        price=min(i['p'] for i in old);d.update(p=price,sellP=int(price*.25),noSell=False,priceSource='永夜既有同名商店價格')
    d['d']='阿胖 3.81 原始裝備數值。特殊能力與素材支援狀態請見下方。'
    items[row['id']]=d
    write('public'+d['sourceDetails'],row)
    rows.append({'id':row['id'],'sourceId':row['sourceId'],'name':row['name'],'category':row['category'],'icon':d['sourceIcon']})

raw['items']=items
sets={}
setfields={'ac':'ac','hp':'mhp','mp':'mmp','hpr':'hpR','mpr':'mpR','mr':'mr','str':'str','dex':'dex','con':'con','wis':'wis','cha':'cha','intl':'int','modifier_dmg':'meleeDmg','reduction_dmg':'dr','magic_modifier_dmg':'mdmg','magic_reduction_dmg':'magicDrNonEle','bow_modifier_dmg':'rangedDmg','sp':'sp','hit_modifier':'meleeHit','bow_hit_modifier':'rangedHit','magiccritical_chance':'magicCrit','regist_stun':'stunResist','regist_stone':'stoneResist','regist_sleep':'sleepResist','regist_freeze':'freezeResist','regist_sustain':'sustainResist','regist_blind':'blindResist'}
for ele in ['water','wind','fire','earth']:setfields['defense_'+ele]='res'+ele.title()
sourceIds={str(r['sourceId']):r['id'] for r in catalog['items']}
for row in table('armor_set'):
    ids=[sourceIds[n] for n in re.findall(r'\d+',row['sets'])]
    assert ids and all(n in items for n in ids)
    d={'n':row['note'],'items':ids,'sourceId':num(row['id']),'source':'apang381'}
    for f,dest in setfields.items():
        n=num(row.get(f))
        if n:d[dest]=-n if f=='ac' else n
    if num(row.get('haste')):d['sourceHaste']=True
    sets['ap381_set_'+row['id']]=d
raw['sets']=sets
write('lib/game/gamedata.json',raw)
write('lib/game/reference-equipment.json',{'source':'阿胖3.81','counts':catalog['counts'],'items':rows})
target=ROOT/'public/assets/equipment381/icons';target.mkdir(parents=True,exist_ok=True)
for icon in (ROOT/'staged-assets/equipment381/icons').glob('*.webp'):shutil.copy2(icon,target/icon.name)

# Replace names in existing drop lists only where the source has an exact matching item.
# Unmatched old equipment is removed rather than redirected to unrelated gear.
dropdir=ROOT/'docs/equipment381/pre-replacement-drops';dropdir.mkdir(exist_ok=True)
def itemid(id):return mapping.get(id,id if id not in legacy else None)
for path in ['lib/game/monster-drops.json','lib/game/monster-drop-rates.json']:
    dest=dropdir/Path(path).name
    if not dest.exists():shutil.copy2(ROOT/path,dest)
    def visit(x):
        if isinstance(x,list):
            out=[]
            for value in x:
                if isinstance(value,str):
                    new=itemid(value)
                    if new is not None:out.append(new)
                elif isinstance(value,dict) and 'item' in value:
                    new=itemid(value['item'])
                    if new is not None:out.append({**value,'item':new})
                else:out.append(visit(value))
            return out
        if isinstance(x,dict):return {k:visit(v) for k,v in x.items()}
        return x
    write(path,visit(read(path)))

mechanics=read('docs/equipment381/source/equipment-mechanics-implementation.json')
power=mechanics['classes']['com/lineage/server/model/Instance/L1ItemPower.java']
load=next(m['source'] for m in power['methods'] if m['method']=='load')
maps={}
for name,id,value in re.findall(r'(MR|MPR|SP|X2|HIT|HP|DMG_REDUCE)\.put\(Integer\.valueOf\((\d+)\), new Integer\((-?\d+)\)\)',load):maps.setdefault(name,{})[id]=int(value)
write('lib/game/equipment381-growth.json',{'maps':maps,'accessories':mechanics['accessoryGreaterTiers'],'armorTables':{k:table(v) for k,v in {'arm':'強化防具加乘系統','ring':'強化戒指加乘系統','amulet':'強化項鏈加乘系統'}.items()}})
write('lib/game/equipment381-activation.json',{'version':'apang381-equipment-v1','enabled':True,'total':len(rows),'sourceSha256':catalog['sourceSha256'],'sourceFieldParity':True,'inventoryGraphics':True,'fullGraphicParity':False,'fullAbilityParity':False,'policy':'使用者於 2026-10-17 指示替換；啟用數值與圖示，保留缺件及未移植能力標示。'})
write('docs/equipment381/replacement-summary.json',{'items':len(rows),'sets':len(sets),'legacyRemoved':len(legacy),'exactNameDropMappings':len(mapping),'unmatchedLegacyDropIdsRemoved':len(legacy)-len(mapping),'allInventoryIcons':1046,'unimplementedSpecialAbilitiesRemainMarked':True})
print(f"Compiled {len(rows)} items, {len(sets)} sets, {len(mapping)} exact-name reference mappings; originals archived, full parity remains false.")
