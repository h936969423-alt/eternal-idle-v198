import json, urllib.request, time, sqlite3, glob, subprocess
log=open('../http-worker.log','w')
server=subprocess.Popen(['node','--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port','8788','--inspector-port','0'],stdout=log,stderr=log)
base='http://127.0.0.1:8788';cookie=''
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
def req(path,data=None):
 global cookie
 headers={'Content-Type':'application/json'}
 if cookie:headers['Cookie']=cookie
 r=opener.open(urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=headers),timeout=30)
 if r.headers.get('Set-Cookie'):cookie=r.headers['Set-Cookie'].split(';')[0]
 return json.load(r)
try:
 for attempt in range(100):
  if server.poll() is not None:raise RuntimeError('Worker exited; see http-worker.log')
  try:
   opener.open(base,timeout=1);break
  except Exception:time.sleep(.2)
 else:raise RuntimeError('Worker startup timeout')
 username='offline_test_'+str(int(time.time()))[-8:];password='LocalOnlyTest_2026'
 req('/api/account',{'username':username,'password':password,'register':True});assert req('/api/account')['account']['username']==username
 s=req('/api/game')['save'];assert s['characters']==[]
 b=json.load(open('lib/game/classes.json'))['knight'];allocation={};left=b['pts']
 for k in ['str','dex','con','int','wis','cha']:
  allocation[k]=min(left,20-b[k]);left-=allocation[k]
 s=req('/api/game',{'type':'create','name':'離線實測','cls':'knight','gender':'m','allocation':allocation})['save'];cid=s['active']
 req('/api/account',{'logout':True});cookie='';req('/api/account',{'username':username,'password':password});assert req('/api/game')['save']['active']==cid
 for f in glob.glob('.wrangler/state/v3/d1/**/*.sqlite',recursive=True):
  db=sqlite3.connect(f)
  if db.execute("SELECT name FROM sqlite_master WHERE name='game_saves'").fetchone():break
  db.close()
 owner='standalone:'+username
 row=db.execute('SELECT payload FROM game_saves WHERE owner=?',(owner,)).fetchone();stored=json.loads(row[0]);c=stored['characters'][0];c.update(lv=60,gold=123,xp=0,zone='talking_island',arenaZone='talking_island',arena=[],running=True,hp=100)
 stored['at']=int(time.time()*1000)-25*3600000;stored.pop('catchup',None)
 db.execute('UPDATE game_saves SET payload=?,revision=revision+1 WHERE owner=?',(json.dumps(stored),owner));db.commit()
 t=time.monotonic();result=req('/api/game');ms=(time.monotonic()-t)*1000
 assert result['report']['pendingSeconds']==0,result['report'];assert result['report']['gold']==72000,result['report'];assert result['report']['xp']==144000
 s=result['save'];assert s['characters'][0]['gold']==72123;receipt=s['offlineIncome'];assert receipt['seconds']==86400
 again=req('/api/game');assert again['save']['offlineIncome']['id']==receipt['id'];assert again['report']['offline']==False
 req('/api/game',{'type':'offlineIncomeDismiss','id':receipt['id']});assert req('/api/game')['save']['offlineIncome']['seen']==True
 req('/api/account',{'logout':True});cookie='';req('/api/account',{'username':username,'password':password});reloaded=req('/api/game');assert reloaded['save']['active']==cid;assert reloaded['save']['offlineIncome']['id']==receipt['id'];assert reloaded['save']['offlineIncome']['seen']==True
 print(json.dumps({'status':'PASS','checks':['register','login','create','logout/login save','level60 no VIP','25h capped at24h','instant receipt','retry no duplicate','dismiss persisted','relogin persisted'],'settlementRequestMs':round(ms,1)},ensure_ascii=False))
finally:
 server.terminate()
 try:server.wait(timeout=10)
 except subprocess.TimeoutExpired:server.kill()
 log.close()
