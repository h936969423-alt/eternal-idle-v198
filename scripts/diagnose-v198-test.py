"""Read-only availability diagnostics. Never print tokens, bindings or save contents."""
import datetime,json,os,urllib.request,urllib.error
account=os.environ['CLOUDFLARE_ACCOUNT_ID']
headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'}
base='https://api.cloudflare.com/client/v4'
def call(path,body=None):
    req=urllib.request.Request(base+path,headers=headers,data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
    except urllib.error.HTTPError as e:
        try:return json.loads(e.read())
        except Exception:return {'httpStatus':e.code}
settings=call('/accounts/'+account+'/workers/scripts/eternal-idle-v198-test/settings')
if settings.get('success'):
    s=settings['result']
    print('WORKER_CONFIG',json.dumps({k:s.get(k) for k in ['limits','observability','compatibility_date']}))
else: print('WORKER_CONFIG_ERROR',json.dumps(settings.get('errors',settings)))
now=datetime.datetime.now(datetime.timezone.utc)
query='''query Metrics($accountTag: string, $start: string, $end: string, $script: string) {
 viewer { accounts(filter:{accountTag:$accountTag}) {
 workersInvocationsAdaptive(limit:100,filter:{scriptName:$script,datetime_geq:$start,datetime_leq:$end}) {
 dimensions { status } sum { requests errors } quantiles { cpuTimeP50 cpuTimeP99 }
 } } } }'''
for minutes in (360,60,15):
    variables={'accountTag':account,'script':'eternal-idle-v198-test','start':(now-datetime.timedelta(minutes=minutes)).isoformat(),'end':now.isoformat()}
    result=call('/graphql',{'query':query,'variables':variables})
    print('WORKER_METRICS',minutes,json.dumps(result))
db=call('/accounts/'+account+'/d1/database/827dd8d1-53b2-460c-9594-2435db824432/query',{'sql':'SELECT COUNT(*) AS saves, MAX(length(payload)) AS largest_save_chars, MAX(updated_at) AS latest_update FROM game_saves','params':[]})
if db.get('success'):
    print('D1_HEALTH',json.dumps([{'success':r.get('success'),'results':r.get('results'),'duration':r.get('meta',{}).get('duration')} for r in db.get('result',[])]))
else: print('D1_ERROR',json.dumps(db.get('errors',db)))
