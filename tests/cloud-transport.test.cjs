const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../shelly-transport.js');
const credentials={server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE-TEST-KEY'},cover={id:'deadbeef0011',channel:0,position:'close'};
test('progress counts queued, active and completed requests without exposing destinations or credentials',async()=>{
 let clock=100000,release,started;const active=new Promise(r=>started=r),wait=new Promise(r=>release=r),events=[];
 const transport=T.create({now:()=>clock,sleep:async ms=>{clock+=ms},onChange:s=>{events.push(s);if(s.active)started()},fetch:async()=>{await wait;return {status:200,text:async()=> '[]'}}});
 const a=transport.request(credentials,'status',{ids:['deadbeef0011']}),b=transport.request(credentials,'status',{ids:['deadbeef0022']});await active;
 assert.equal(transport.stats().active,1);assert.equal(transport.stats().queued,1);assert.equal(transport.stats().completed,0);release();await Promise.all([a,b]);
 assert.deepEqual(transport.stats(),{queued:0,active:0,sent:2,completed:2,failed:0,cancelled:0,lastFailure:null});
 const text=JSON.stringify(events);for(const secret of [credentials.authKey,credentials.server,'deadbeef0011','deadbeef0022'])assert.equal(text.includes(secret),false);
 assert.ok(events.every(s=>s.queued>=0&&s.active>=0));
});
test('rate-limit failures and generation cancellations finish counters without retrying commands',async()=>{
 let clock=100000,sends=0;const t=T.create({now:()=>clock,sleep:async ms=>{clock+=ms},fetch:async()=>{sends++;return {status:429,text:async()=>''}}});
 await assert.rejects(t.request(credentials,'cover',cover),/Limite/);assert.equal(t.stats().failed,1);assert.equal(t.stats().completed,1);assert.equal(t.stats().lastFailure,'limit');assert.equal(sends,1);
 await assert.rejects(t.request(credentials,'cover',cover,()=>false),/cancelado/);assert.equal(t.stats().cancelled,1);assert.equal(t.stats().queued,0);assert.equal(t.stats().active,0);assert.equal(t.stats().sent,1);assert.equal(sends,1);
});
test('429 pauses subsequent traffic, respects Retry-After and does not retry the command',async()=>{
 let clock=100000,sends=0;const t=T.create({now:()=>clock,sleep:async ms=>clock+=ms,fetch:async()=>{sends++;return {status:429,headers:{get:()=> '60'},text:async()=> ''}}});
 await assert.rejects(t.request(credentials,'cover',cover),/Limite/);assert.equal(t.stats().retryAt,160000);
 await assert.rejects(t.request(credentials,'cover',cover),/não foi enviado/);assert.equal(sends,1);
 clock=160001;await assert.rejects(t.request(credentials,'status',{ids:['deadbeef0011']}),/Limite/);assert.equal(sends,2);
});
test('priority aborts only an active status query, freeing the queue without retrying an actuator or reporting a network failure',async()=>{
 let clock=100000,started;const begun=new Promise(r=>started=r),calls=[];
 const t=T.create({now:()=>clock,sleep:async ms=>clock+=ms,fetch:async(url,{signal})=>{calls.push(new URL(url).pathname);if(url.includes('/get?')){started();return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('fixture abort'),{name:'AbortError'}))))}assert.equal(t.cancelStatus(),false);return {status:200,text:async()=> '{}'}}});
 const read=t.request(credentials,'status',{ids:['deadbeef0011']});await begun;assert.equal(t.cancelStatus(),true);const action=t.request(credentials,'cover',cover);await assert.rejects(read,/prioridade/);assert.equal((await action).accepted,true);assert.equal(calls.length,2);assert.equal(t.stats().failed,0);assert.equal(t.stats().cancelled,1);assert.equal(t.stats().sent,2);assert.equal(t.stats().lastFailure,null);
});
test('two windows serialize Cloud requests through a shared lock and space them after response completion',async()=>{
 let clock=100000,queue=Promise.resolve();const map=new Map(),calls=[],storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},locks={request:(_name,_options,run)=>{const p=queue.then(run);queue=p.catch(()=>{});return p}},options={storage,locks,now:()=>clock,sleep:async ms=>{clock+=ms},fetch:async(url)=>{calls.push(clock);clock+=600;return {status:200,text:async()=> '[]'}}};
 const first=T.create(options),second=T.create(options);await Promise.all([first.request(credentials,'status',{ids:['deadbeef0011']}),second.request(credentials,'status',{ids:['deadbeef0022']})]);assert.equal(calls.length,2);assert.ok(calls[1]-calls[0]>=2100);const stored=JSON.stringify([...map]);assert.equal(stored.includes(credentials.authKey),false);assert.equal(stored.includes('deadbeef'),false);
});
test('rate-limit fallback starts at 2.5 seconds, backs off and is shared across reloads/windows',async()=>{
 let clock=100000,sends=0,status=429;const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},options={storage,now:()=>clock,sleep:async ms=>{clock+=ms},fetch:async()=>{sends++;return {status,text:async()=>status===200?'[]':''}}};const first=T.create(options);
 await assert.rejects(first.request(credentials,'status',{ids:['deadbeef0011']}),/Limite/);assert.equal(first.stats().retryAt,102500);
 const second=T.create(options);assert.equal(second.stats(credentials.server).retryAt,102500);await assert.rejects(second.request(credentials,'cover',cover),/não foi enviado/);assert.equal(sends,1);
 clock=102501;await assert.rejects(second.request(credentials,'status',{ids:['deadbeef0011']}),/Limite/);assert.equal(second.stats().retryAt,107501);
 clock=107502;status=200;await second.request(credentials,'status',{ids:['deadbeef0011']});clock+=2000;status=429;await assert.rejects(second.request(credentials,'status',{ids:['deadbeef0011']}),/Limite/);assert.equal(second.stats().retryAt,clock+2500);assert.equal(sends,4);
});
