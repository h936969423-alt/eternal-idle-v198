import urllib.request,json,time,re,concurrent.futures,pathlib,sys
from lxml import html
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/lw-catalog');root.mkdir(parents=True,exist_ok=True)
def fetch(path,name):
 p=root/name
 if p.exists():return p.read_bytes()
 for attempt in range(4):
  try:
   data=urllib.request.urlopen('https://6sword.com'+path,timeout=45).read();p.write_bytes(data);return data
  except Exception:
   if attempt==3:raise
   time.sleep(1+attempt)
def listing(page):
 d=html.fromstring(fetch('/zh-TW/lw/items?type=equipment&page='+str(page),'page'+str(page)+'.html'))
 rows=[]
 for a in d.xpath('//a[h3 or .//h3]'):
  h=a.get('href','');m=re.fullmatch(r'/zh-TW/lw/items/(\d+)',h)
  if not m:continue
  g=a.xpath('.//span[contains(@class,"shrink-0")]/text()')
  if not g or g[0] not in ['一般','高級','稀有']:continue
  rows.append({'sourceId':int(m[1]),'name':a.xpath('.//h3')[0].text_content(),'grade':g[0],'category':a.xpath('.//p')[0].text or '', 'icon':a.xpath('.//img/@src')[0]})
 return rows
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=sum(list(pool.map(listing,range(1,21))),[])
(root/'listing.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('LISTED',len(rows),flush=True)
print('CATEGORIES',sorted(set(r['category'] for r in rows)),flush=True)
def detail(r):
 sid=r['sourceId'];d=html.fromstring(fetch('/zh-TW/lw/items/'+str(sid),'item'+str(sid)+'.html'))
 r['info']={x.xpath('./dt')[0].text_content():x.xpath('./dd')[0].text_content() for x in d.xpath('(//dl)[1]/div[dt and dd]')[:10]}
 for label,key in [('屬性','attributes'),('可裝備職業','classes')]:
  hs=d.xpath('//h2[normalize-space(text())="'+label+'"]')
  if hs:
   par=hs[0].getparent();r[key]=[x.text_content() for x in par.xpath('.//li')] if key=='attributes' else [x.text_content() for x in par.xpath('.//li')]
  else:r[key]=[]
 r['enhancements']={}
 for tr in d.xpath('//table[.//th[contains(text(),"階段")]]//tbody/tr'):
  m=re.match(r'\+(\d+)',tr.xpath('./th')[0].text_content())
  if m:r['enhancements'][m[1]]=[x.text_content() for x in tr.xpath('.//li')]
 r['officialIds']=[]
 hs=d.xpath('//h2[normalize-space(text())="官方 ID"]')
 if hs:r['officialIds']=re.findall(r'\d+',hs[0].getparent().xpath('./p[contains(@class,"break-words")]')[0].text_content())
 return r
# First collect all details: class filtering needs detail facts.
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 data=[]
 for i,r in enumerate(pool.map(detail,rows)):
  data.append(r)
  if i%25==0:print('DETAIL',i+1,'/',len(rows),r['name'],r['classes'],flush=True)
(root/'details.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('DONE',len(data),flush=True)
