"""Exercise only a newly registered QA account on the isolated test Worker."""
import http.cookiejar,json,secrets,time,urllib.error,urllib.parse,urllib.request
BASE='https://eternal-idle-v198-test.h936969423.workers.dev'
jar=http.cookiejar.CookieJar()
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
username='qa_loop_'+secrets.token_hex(4)
password=secrets.token_urlsafe(30)
cursor=None
cid=None
registered=False
checks=0
def request(path,data=None):
    req=urllib.request.Request(BASE+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json','Origin':BASE,'User-Agent':'Mozilla/5.0'})
    started=time.monotonic()
    try:response=opener.open(req,timeout=30)
    except urllib.error.HTTPError as error:response=error
    body=response.read()
    try:result=json.loads(body)
    except Exception:raise AssertionError('HTTP '+str(response.status)+' returned non-JSON')
    assert response.status==200,'HTTP '+str(response.status)+' '+str(result.get('error','request failed'))[:150]
    return result,round((time.monotonic()-started)*1000)
def game(action=None):
    global cursor,checks
    query='?'+urllib.parse.urlencode(cursor) if cursor else ''
    result,ms=request('/api/game'+query,action)
    assert result['report']['pendingSeconds']==0,'Live request reopened settlement: '+str(result['report']['pendingSeconds'])
    assert not result['save'].get('catchup'),'Live request left a catch-up queue'
    active=result['save'].get('active')
    if active:
        character=next(c for c in result['save']['characters'] if c['id']==active)
        assert active in result['derived'],'Ready snapshot omitted character stats'
        cursor={'character':active,'after':character.get('eventSeq',0),'settings':result['sync']['settingsKey']}
    checks+=1
    return result,ms
try:
    request('/api/account',{'username':username,'password':password,'register':True})
    registered=True
    base=json.load(open('lib/game/classes.json'))['knight'];allocation={};left=base['pts']
    for key in ['str','dex','con','int','wis','cha']:
        allocation[key]=min(left,20-base[key]);left-=allocation[key]
    result,_=game({'type':'create','name':'同步驗證','cls':'knight','gender':'m','allocation':allocation})
    cid=result['save']['active'];game({'type':'select','id':cid})
    for i in range(3):
        time.sleep(6);_,ms=game();print(json.dumps({'phase':'idle','poll':i+1,'pendingSeconds':0,'requestMs':ms}),flush=True)
    request('/api/account',{'logout':True});jar.clear();cursor=None
    request('/api/account',{'username':username,'password':password})
    result,_=game();assert result['save']['active']==cid
    game({'type':'select','id':cid});game({'type':'zone','zone':'training'});result,_=game({'type':'run','value':True})
    assert result['save']['characters'][0]['running']
    for i in range(20):
        time.sleep(1.5);_,ms=game();print(json.dumps({'phase':'hunt','poll':i+1,'pendingSeconds':0,'requestMs':ms}),flush=True)
    for i in range(3):
        time.sleep(6);_,ms=game();print(json.dumps({'phase':'slow-live-poll','poll':i+1,'pendingSeconds':0,'requestMs':ms}),flush=True)
    print(json.dumps({'status':'PASS','readyGameResponses':checks,'checks':['registration','create/select','six-second idle polling','logout/login','twenty live polls','six-second live polling','no repeated settlement queue']}),flush=True)
finally:
    if registered:
        try:
            if cid:request('/api/game',{'type':'run','value':False})
            request('/api/account',{'logout':True})
        except Exception:print('QA cleanup could not be confirmed',flush=True)
