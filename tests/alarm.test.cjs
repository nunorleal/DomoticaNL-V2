const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../alarm-core.js'),C=require('../shelly-core.js'),E=require('../ev-core.js'),T=require('../shelly-transport.js'),B=require('../backup-core.js');
const base=()=>({schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'',rememberKey:false,bindings:{}});
const setup=()=>({arm:{deviceId:'aabbcc112233',channel:1,activeWhenOn:true},trigger:{deviceId:'ddeeff112233',channel:0,activeWhenOn:true}});
const r=on=>({online:true,hasOutput:true,on,errors:[],fetchedAt:100});
test('alarm is optional and old configurations remain unchanged',()=>{assert.deepEqual(C.config(base()),base());const cfg=C.config({...base(),alarm:setup()});assert.deepEqual(cfg.alarm,setup());assert.deepEqual(C.deviceIds(cfg),['aabbcc112233','ddeeff112233']);assert.deepEqual(C.config({...base(),alarm:{}}).alarm,{})});
test('arm actuator cannot reuse another actuator or its own trigger output',()=>{
 const alarm=setup();assert.throws(()=>C.config({...base(),lightBindings:{living:{deviceId:alarm.arm.deviceId,channel:1,type:'switch'}},alarm}));
 assert.throws(()=>C.config({...base(),alarm:{...alarm,trigger:{...alarm.arm}}}));
 assert.throws(()=>C.config({...base(),ev:{relay:{deviceId:alarm.arm.deviceId,channel:1}},alarm}));
 const cfg=C.config({...base(),alarm:{...alarm,trigger:{...alarm.trigger,deviceId:alarm.arm.deviceId,channel:0}}});assert.equal(C.deviceIds(cfg).length,1);
 for(const b of [{...alarm.arm,deviceId:'XB123456'},{...alarm.arm,channel:-1},{...alarm.arm,activeWhenOn:'true'}])assert.throws(()=>C.config({...base(),alarm:{arm:b}}));
});
test('two independent Boolean inputs distinguish armed, disarmed and actual firing',()=>{
 const a=setup();assert.equal(A.state(a,{arm:r(true),trigger:r(false)},101).visual,'armed');assert.equal(A.state(a,{arm:r(false),trigger:r(false)},101).visual,'disarmed');
 for(const arm of [r(true),r(false),{...r(true),online:false}]){const s=A.state(a,{arm,trigger:r(true)},101);assert.equal(s.triggered,true);assert.equal(s.visual,'sounding')}
 assert.equal(A.state(a,{arm:r(true),trigger:r(false)},101).triggered,false);
});
test('missing, offline, malformed, errored and stale inputs never fabricate safe silence',()=>{
 const a=setup();for(const trigger of [null,{...r(false),online:false},{...r(false),error:true},{...r(false),on:null},{...r(false),errors:['overpower']},{...r(false),fetchedAt:-50000}]){
  const s=A.state(a,{arm:r(true),trigger},101);assert.equal(s.armed,true);assert.equal(s.triggered,null);assert.equal(s.visual,'partial');
 }
 const stale=A.state(a,{arm:r(true),trigger:r(false)},50000);assert.equal(stale.armed,null);assert.equal(stale.triggered,null);assert.equal(stale.visual,'unknown');assert.equal(stale.canControl,false);
});
test('the siren need not be configured to read or control the independent arm output',()=>{
 const s=A.state({arm:setup().arm},{arm:r(true)},101);assert.equal(s.armed,true);assert.equal(s.triggerConfigured,false);assert.equal(s.triggered,null);assert.equal(s.canControl,true);
 const onlyTrigger=A.state({trigger:setup().trigger},{trigger:r(true)},101);assert.equal(onlyTrigger.visual,'sounding');assert.equal(onlyTrigger.canControl,false);
});
test('polarity is explicit and commands always target only the configured arm output',()=>{
 const a=setup();assert.deepEqual(A.command(a,true),{id:a.arm.deviceId,channel:1,type:'switch',on:true});assert.deepEqual(A.command(a,false),{id:a.arm.deviceId,channel:1,type:'switch',on:false});
 a.arm.activeWhenOn=false;assert.equal(A.command(a,true).on,false);assert.equal(A.state(a,{arm:r(false),trigger:r(false)},101).armed,true);
 a.trigger.activeWhenOn=false;assert.equal(A.state(a,{arm:r(false),trigger:r(false)},101).visual,'sounding');assert.throws(()=>A.command({},true));assert.throws(()=>A.command(a,'toggle'));
});
test('Gen1 and Gen2 reads use exact relay channels; power and light outputs never indicate alarm',()=>{
 const a=setup();const gen1=E.relayStatus({online:1,status:{relays:[{ison:false},{ison:true}]}},a.arm),gen2=E.relayStatus({online:1,status:{'switch:1':{output:true}}},a.arm);
 for(const d of [gen1,gen2])assert.equal(A.state(a,{arm:{...d,fetchedAt:100}},101).armed,true);
 const wrong=E.relayStatus({online:1,status:{'light:1':{output:true},'switch:0':{output:true},emeters:[{power:1000}]}},a.arm);assert.equal(A.state(a,{arm:{...wrong,fetchedAt:100}},101).armed,null);
});
test('rejected arm command sends exactly once to arm, never to trigger',async()=>{
 const a=setup(),calls=[],t=T.create({interval:0,fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {status:400,text:async()=>JSON.stringify({error:'DEVICE_FAILED_COMMAND'})}}});
 await assert.rejects(t.request({server:base().server,authKey:'FAKE-ALARM-ONLY'},'light',A.command(a,true)));assert.equal(calls.length,1);assert.match(calls[0].url,/set\/switch/);assert.deepEqual(calls[0].body,{id:a.arm.deviceId,channel:1,on:true});
});
test('backup preserves both roles and rejects an invalid import atomically',()=>{
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base(),alarm:setup()})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.52')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).alarm,setup());const before=storage.getItem('casa-nl-shelly-cloud-v1');backup.data['casa-nl-shelly-cloud-v1'].alarm.trigger.channel=-1;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-shelly-cloud-v1'),before);
});
