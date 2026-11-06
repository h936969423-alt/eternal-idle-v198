// Plays the isolated test Worker with a newly registered QA account in an iPhone-sized browser.
const {chromium,devices}=require('playwright'),crypto=require('crypto');
const BASE='https://eternal-idle-v198-test.h936969423.workers.dev',ZONE=process.env.WORLD_ZONE||'talking_island';
const username='qa_walk_'+crypto.randomBytes(4).toString('hex'),password=crypto.randomBytes(24).toString('base64url');
const allocation=c=>{const out={};let left=c.pts;for(const k of ['str','dex','con','int','wis','cha']){out[k]=Math.min(left,20-c[k]);left-=out[k];}return out;};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']}),context=await browser.newContext({...devices['iPhone 13']}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(r.status()+' '+r.url().replace(BASE,''));});
 await page.goto(BASE,{waitUntil:'domcontentloaded'});
 const api=async(path,data)=>{const r=await page.request.post(BASE+path,{data,headers:{Origin:BASE}});const j=await r.json();if(!r.ok())throw Error(path+' '+JSON.stringify(j).slice(0,200));return j;};
 await api('/api/account',{username,password,register:true});
 const classes=require(require('path').resolve('lib/game/classes.json')),cls=process.env.WORLD_CLASS||'knight';
 const made=await api('/api/game',{type:'create',name:'走路驗證',cls,gender:'m',allocation:allocation(classes[cls])});const cid=made.save.active;
 await api('/api/game',{type:'select',id:cid});await api('/api/game',{type:'zone',zone:ZONE});await api('/api/game',{type:'run',value:true});
 await page.goto(BASE,{waitUntil:'load'});await page.waitForSelector('.four-battle',{timeout:60000});await page.waitForTimeout(6000);
 const sample=()=>page.evaluate(()=>{const el=document.querySelector('.character-sprite'),p=document.querySelector('.four-player')?.getBoundingClientRect(),plane=document.querySelector('.world-map-plane');return {action:el?.getAttribute('data-action'),src:(el?.getAttribute('src')||'').split('/').slice(-2).join('/'),x:p&&Math.round(p.x),y:p&&Math.round(p.y),plane:plane?.style.transform||'',arena:document.querySelector('.static-arena')?.className.includes('world-map-arena'),monsters:document.querySelectorAll('.four-monster').length,w:el?.naturalWidth,h:el?.naturalHeight};});
 const log=[];for(let i=0;i<120;i++){log.push(await sample());await page.waitForTimeout(100);}
 const actions={},walkSrc=new Set();let planeMoves=0;for(let i=0;i<log.length;i++){const s=log[i];actions[s.action]=(actions[s.action]||0)+1;if(s.action==='walk')walkSrc.add(s.src);if(i&&s.plane!==log[i-1].plane)planeMoves++;}
 console.log('RESULT',JSON.stringify({zone:ZONE,cls,worldMap:log[0].arena,monsters:log[0].monsters,actions,walkFrames:[...walkSrc],planeMoves,first:log[0],errors:errors.slice(0,8)}));
 const shot=async name=>{const b=await page.screenshot({type:'jpeg',quality:50,clip:{x:0,y:80,width:390,height:600}});console.log('PREVIEW-BEGIN '+name);const t=b.toString('base64');for(let i=0;i<t.length;i+=3000)console.log('B64 '+t.slice(i,i+3000));console.log('PREVIEW-END '+name);};
 await shot('hunt');
 const before=await sample();await page.mouse.click(90,260);await page.waitForTimeout(250);const moving=[];for(let i=0;i<30;i++){moving.push((await sample()).action);await page.waitForTimeout(100);}console.log('TAP',JSON.stringify({before:before.plane,after:(await sample()).plane,actions:moving.join(',')}));await shot('tap');
 await api('/api/game',{type:'run',value:false}).catch(()=>{});await api('/api/account',{logout:true}).catch(()=>{});await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
