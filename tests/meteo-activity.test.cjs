const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../meteo-activity-core.js'),M=require('../meteo-core.js');
const disk=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}};
const sample=(id,time,active=true)=>({id,configured:true,identity:'FAKE-'+id,active,fetchedAt:time,powerWatts:active?100:0});
test('settings validate selected roles, preserve older preferences, and reject duplicates or arbitrary IDs',()=>{
 assert.deepEqual(M.preferences({activityEnabled:true,activityDevices:['heater','ev']}),{activityEnabled:true,activityDevices:['heater','ev']});assert.deepEqual(M.preferences({seconds:false}),{seconds:false});for(const value of [['ev','ev'],['unknown-device'],null,{},['heater',{}]])assert.throws(()=>M.preferences({activityDevices:value}));assert.throws(()=>M.preferences({activityEnabled:'yes'}));
});
test('only selected-timer proof/current activity produces rows; standby, stale, offline/demo are not active',()=>{
 let now=100000;const c=C.create({now:()=>now}),s=sample('washer',now,false);assert.equal(c.update([s]).length,0);s.active=null;assert.equal(c.update([s]).length,0);s.active=true;s.fetchedAt=now-45001;assert.equal(c.update([s]).length,0);s.fetchedAt=now;s.configured=false;assert.equal(c.update([s]).length,0);
 const timer={id:'heater',configured:true,identity:'FAKE',on:true,remaining:132};assert.equal(c.update([timer]).length,0);timer.timerActive=true;assert.equal(c.update([timer])[0].remaining,132);timer.on=false;assert.equal(c.update([timer]).length,0);timer.on=true;timer.timerActive=false;timer.timerEstimated=true;assert.equal(c.update([timer])[0].estimated,true);timer.remaining=0;assert.equal(c.update([timer]).length,0);
 assert.equal(c.update([sample('tv',now,false),sample('ev',now,false)]).length,0);
});
test('washing machine pause survives briefly, resumes original elapsed, then ends after five minutes of low power',()=>{
 let now=100000;const c=C.create({now:()=>now});let s=sample('washer',now);assert.equal(c.update([s])[0].elapsed,0);now+=60000;s=sample('washer',now,false);let row=c.update([s])[0];assert.equal(row.elapsed,60);assert.equal(row.paused,true);now+=60000;s=sample('washer',now);assert.equal(c.update([s])[0].elapsed,120);now+=60000;s=sample('washer',now,false);c.update([s]);for(let i=0;i<5;i++){now+=60000;s=sample('washer',now,false);row=c.update([s])[0]}assert.equal(row,undefined);
});
test('unknown readings hide activity; charging stops immediately; elapsed restores only for a recent matching association',()=>{
 let now=100000;const storage=disk(),open=()=>C.create({storage,key:'test',now:()=>now});let c=open(),s=sample('dishwasher',now);c.update([s]);now+=30000;c=open();s=sample('dishwasher',now);assert.equal(c.update([s])[0].elapsed,30);s={...s,active:null};assert.equal(c.update([s]).length,0);s={...s,active:true,identity:'OTHER-FAKE'};assert.equal(c.update([s])[0].elapsed,0);now+=400000;c=open();s=sample('dishwasher',now);assert.equal(c.update([s])[0].elapsed,0);assert.equal(c.update([sample('ev',now)])[0].kind,'charging');assert.equal(c.update([sample('ev',now,false)]).length,0);
});
test('adapter consumes only cached readers, uses each house association, and exposes no identity or credentials',()=>{
 const source=fs.readFileSync(require.resolve('../meteo-activity.js'),'utf8'),now=Date.now(),b={deviceId:'deadbeef0011',channel:0},setup={server:'https://example.test',authKey:'SECRET',heater:b,dehumidifier:b,kitchenBindings:{washer:b,dishwasher:b},mediaBindings:{tv:b,playstation:b},ev:{meter:b},balconyMeters:{washer:b},dishwasherMeter:b,tvMeter:b,evMeter:b};const storage=disk();storage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(setup));const meter={configured:true,activity:true,fresh:true,powerWatts:200,fetchedAt:now,reading:{fetchedAt:now}},api={heaterSnapshot:()=>({on:true,timerActive:true,timerRemainingSeconds:120}),dehumidifierSnapshot:()=>({on:false}),mediaSnapshot:()=>meter,evSnapshot:()=>({charging:true,powerKW:3.5,reading:{fetchedAt:now},readings:{meter:{fetchedAt:now}}}),balconyApplianceSnapshot:()=>meter,dishwasherSnapshot:()=>meter,tvSnapshot:()=>({...meter,activity:'on'})};
 const window={CasaMeteoActivityCore:C,CasaShelly:api,CasaCloudRead:api,CasaShellySetup:{snapshot:()=>setup},addEventListener:()=>{}};vm.runInNewContext(source,{window,localStorage:storage,queueMicrotask:fn=>fn()});const rows=window.CasaMeteoActivity.snapshot();assert.deepEqual(Array.from(rows,r=>r.id),['heater','washer','dishwasher','tv','ev','playstation']);assert(!JSON.stringify(rows).includes('SECRET'));assert(!JSON.stringify(rows).includes('deadbeef'));assert.equal(window.CasaMeteoActivity.devices().length,17);
 const activity=window.CasaMeteoActivity;
 assert(rows.every(row=>row.source==='local'));
 const remote=C.encodeShared([{id:'washer',kind:'machine',elapsed:9120,powerWatts:800}],now);
 const synced={meteo_activity:remote,meteo_activity_at:new Date(now).toISOString(),writer_expires_at:new Date(now+360000).toISOString()};
 activity.setShared(synced);
 assert.deepEqual(Array.from(activity.snapshot(),row=>[row.id,row.source,row.powerWatts]),[['washer','emitter',800]]);
 assert(activity.snapshot()[0].elapsed>=9120);
 assert(activity.exportShared().some(row=>row.id==='heater'));
 activity.setShared({...synced,meteo_activity:[]});
 assert.equal(activity.snapshot().length,0);
 activity.setShared({...synced,meteo_activity_at:new Date(now-900000).toISOString()});
 assert(activity.snapshot().some(row=>row.id==='heater'&&row.source==='local'));
 activity.setShared(null);
 assert(activity.snapshot().some(row=>row.id==='heater'&&row.source==='local'));
});

test('explicit reported power OFF ends a machine immediately without the low-consumption grace',()=>{let now=100000;const c=C.create({now:()=>now});c.update([sample('washer',now)]);now+=1000;assert.equal(c.update([{...sample('washer',now,false),stopped:true}]).length,0)});

test('TV counts observed on-time, restores a recent session and resets at off or regeneration',()=>{
 let now=100000;const storage=disk(),open=()=>C.create({storage,key:'tv-test',now:()=>now});let c=open();assert.equal(c.update([sample('tv',now)])[0].elapsed,0);
 now+=90000;let row=c.update([sample('tv',now)])[0];assert.equal(row.kind,'tv');assert.equal(row.elapsed,90);
 c=open();now+=30000;assert.equal(c.update([sample('tv',now)])[0].elapsed,120);
 assert.equal(c.update([sample('tv',now,false)]).length,0);now+=30000;assert.equal(c.update([sample('tv',now)])[0].elapsed,0);
 now+=45001;assert.equal(c.update([sample('tv',now-45001)]).length,0);
 now+=400000;assert.equal(open().update([sample('tv',now)])[0].elapsed,0);
 const different={...sample('tv',now),identity:'OTHER-FAKE-TV'};assert.equal(c.update([different])[0].elapsed,0);
});

test('extra devices are selectable, count fresh active time and reset when inactive',()=>{
 const extras=['playstation','soundbar','vodafone','unifi','monitor','apollo','terramaster','blackdrive'];assert.deepEqual(M.preferences({activityDevices:extras}).activityDevices,extras);
 let now=100000;const storage=disk(),c=C.create({storage,key:'extra-test',now:()=>now});let rows=c.update(extras.map(id=>sample(id,now)));assert.equal(rows.length,8);assert(rows.every(r=>r.kind==='device'&&r.elapsed===0));
 now+=60000;rows=c.update(extras.map(id=>sample(id,now)));assert(rows.every(r=>r.elapsed===60));
 const reopened=C.create({storage,key:'extra-test',now:()=>now});assert.equal(reopened.update([sample('playstation',now)])[0].elapsed,60);assert.equal(reopened.update([sample('playstation',now,false)]).length,0);assert.equal(reopened.update([sample('playstation',now)])[0].elapsed,0);
 now+=45001;assert.equal(reopened.update([sample('playstation',now-45001)]).length,0);
});

for(const id of ['heater','dehumidifier'])test(`${id}: manual consumption counts up, restores briefly, and timer takes priority`,()=>{
 let now=100000;const storage=disk(),open=()=>C.create({storage,key:'manual-test',now:()=>now});let c=open();
 const s=()=>({...sample(id,now),on:true,timerActive:false});
 assert.equal(c.update([s()])[0].kind,'manual');now+=31000;assert.equal(c.update([s()])[0].elapsed,31);
 c=open();assert.equal(c.update([s()])[0].elapsed,31);
 let row=c.update([{...s(),timerActive:true,remaining:60}])[0];assert.equal(row.kind,'timer');assert.equal(row.remaining,60);
 now+=1000;assert.equal(c.update([s()])[0].elapsed,0);
 assert.equal(c.update([{...s(),powerWatts:0}]).length,0);now+=1000;assert.equal(c.update([s()])[0].elapsed,0);
 assert.equal(c.update([{...s(),on:false}]).length,0);now+=1000;assert.equal(c.update([s()])[0].elapsed,0);
 for(const extra of [{powerWatts:null},{powerWatts:-1},{on:null},{configured:false},{fetchedAt:now-45001}])assert.equal(c.update([{...s(),...extra}]).length,0);
 now+=400000;assert.equal(open().update([s()])[0].elapsed,0);
 assert.equal(c.update([{...s(),identity:'OTHER-FAKE'}])[0].elapsed,0);
});
test('manual adapter reads cached consumption, hides zero/unknown power and never calls actuators',()=>{
 const source=fs.readFileSync(require.resolve('../meteo-activity.js'),'utf8'),now=Date.now(),b={deviceId:'deadbeef0011',channel:0},setup={server:'https://example.test',heater:b,dehumidifier:b},storage=disk();storage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(setup));let watts=1500,on=true,fresh=true;
 const snapshot=()=>({on,powerWatts:fresh?watts:null,powerFetchedAt:now});
 const api={heaterSnapshot:snapshot,dehumidifierSnapshot:snapshot,consumptionSnapshot:()=>({fresh,reading:{power:watts,fetchedAt:now}}),mediaSnapshot:()=>({}),evSnapshot:()=>({}),balconyApplianceSnapshot:()=>({}),dishwasherSnapshot:()=>({}),tvSnapshot:()=>({})};
 const window={CasaMeteoActivityCore:C,CasaShelly:api,CasaCloudRead:api,CasaShellySetup:{snapshot:()=>setup},addEventListener:()=>{}};vm.runInNewContext(source,{window,localStorage:storage,queueMicrotask:fn=>fn()});
 let rows=window.CasaMeteoActivity.snapshot();assert.equal(rows.length,2);assert(rows.every(r=>r.kind==='manual'&&r.powerWatts===1500));
 watts=0;assert.equal(window.CasaMeteoActivity.snapshot().length,0);watts=null;assert.equal(window.CasaMeteoActivity.snapshot().length,0);watts=1500;fresh=false;assert.equal(window.CasaMeteoActivity.snapshot().length,0);fresh=true;on=null;assert.equal(window.CasaMeteoActivity.snapshot().length,0);
});

test('Bosch boiler is selectable and counts positive consumption without the washing-machine pause',()=>{
 assert.deepEqual(M.preferences({activityDevices:['boiler']}).activityDevices,['boiler']);
 let now=100000;const storage=disk(),open=()=>C.create({storage,key:'boiler',now:()=>now});let c=open();
 assert.equal(c.update([sample('boiler',now)])[0].elapsed,0);now+=32000;assert.equal(c.update([sample('boiler',now)])[0].elapsed,32);
 c=open();assert.equal(c.update([sample('boiler',now)])[0].elapsed,32);assert.equal(c.update([sample('boiler',now,false)]).length,0);
 now+=1000;assert.equal(c.update([sample('boiler',now)])[0].elapsed,0);assert.equal(c.update([{...sample('boiler',now),stopped:true}]).length,0);
 assert.equal(c.update([{...sample('boiler',now),fetchedAt:now-45001}]).length,0);
});
test('boiler adapter uses this house cached binding and watts strictly above 30W',()=>{
 const source=fs.readFileSync(require.resolve('../meteo-activity.js'),'utf8'),now=Date.now(),b={deviceId:'deadbeefb055',channel:0},setup={server:'https://example.test',kitchenBindings:{boiler:b},balconyMeters:{boiler:b}},storage=disk();storage.setItem('casa-nl-shelly-cloud-v1',JSON.stringify(setup));let watts=31;
 const boiler=()=>({powerWatts:watts,fetchedAt:now,reading:{fetchedAt:now},fresh:true,activity:false});
 const api={heaterSnapshot:()=>({}),dehumidifierSnapshot:()=>({}),mediaSnapshot:id=>id==='boiler'?boiler():{},balconyApplianceSnapshot:id=>id==='boiler'?boiler():{},dishwasherSnapshot:()=>({}),tvSnapshot:()=>({}),evSnapshot:()=>({})};
 const window={CasaMeteoActivityCore:C,CasaShelly:api,CasaCloudRead:api,CasaShellySetup:{snapshot:()=>setup},addEventListener:()=>{}};vm.runInNewContext(source,{window,localStorage:storage,queueMicrotask:fn=>fn()});
 const row=window.CasaMeteoActivity.snapshot()[0];assert.equal(row.id,'boiler');assert.equal(row.name,'Caldeira Bosch');assert.equal(row.powerWatts,31);assert.equal(row.elapsed,0);
 assert.equal(window.CasaMeteoActivity.devices().find(d=>d.id==='boiler').configured,true);
 for(const value of [0,2,29.9,30,null,-1]){watts=value;assert.equal(window.CasaMeteoActivity.snapshot().length,0)}
});

test('boiler threshold resets observed time at 30W and starts a new session above it',()=>{let now=100000;const c=C.create({now:()=>now});const s=watts=>({...sample('boiler',now),powerWatts:watts});assert.equal(c.update([s(30)]).length,0);assert.equal(c.update([s(30.1)])[0].elapsed,0);now+=20000;assert.equal(c.update([s(31)])[0].elapsed,20);assert.equal(c.update([s(30)]).length,0);now+=1000;assert.equal(c.update([s(31)])[0].elapsed,0)});

test('shared activity continues between syncs, freezes stale elapsed time and removes expired timers',()=>{
 const time=Date.UTC(2026,10,11,12);
 const rows=C.encodeShared([
  {id:'washer',kind:'machine',elapsed:9120,paused:false,powerWatts:123,identity:'PRIVATE'},
  {id:'heater',kind:'timer',remaining:132,estimated:true}
 ],time);
 assert.equal(JSON.stringify(rows).includes('PRIVATE'),false);
 const current=C.readShared(rows,time,time+360000,time+60000);
 assert.equal(current[0].elapsed,9180);
 assert.equal(current[1].remaining,72);
 assert.equal(current[1].estimated,true);
 assert.equal(current[0].stale,false);
 const stale=C.readShared(rows,time,time+360000,time+270000);
 assert.equal(stale.length,1);
 assert.equal(stale[0].elapsed,9120);
 assert.equal(stale[0].stale,true);
 assert.equal(C.readShared(rows,time,NaN,time+1000)[0].stale,true);
 assert.equal(C.readShared(rows,time,time+360000,time+900000),null);
});
test('an empty shared snapshot clears activity and invalid input does not invent devices',()=>{
 const time=Date.UTC(2026,10,11,12);
 assert.equal(C.readShared(null,time,time,time),null);
 assert.deepEqual(C.readShared([],time,time+360000,time),[]);
 assert.deepEqual(C.readShared([null,{id:'not-a-device',kind:'device',startedAt:time-1000},{id:'tv',kind:'timer',endsAt:time+1000}],time,time+360000,time),[]);
});
test('the AEG circuits are independently selectable and retain activity on the receiver',()=>{
 assert.deepEqual(M.preferences({activityDevices:C.IDS}).activityDevices,C.IDS);
 const now=Date.now(),tracker=C.create({now:()=>now});
 const rows=tracker.update([{...sample('hob',now),powerWatts:950},{...sample('oven',now),powerWatts:450}]);
 assert.deepEqual(rows.map(r=>r.id),['hob','oven']);
 const synced=C.readShared(C.encodeShared(rows,now),now,now+30000,now+2000);
 assert.deepEqual(synced.map(r=>[r.id,r.elapsed,r.powerWatts]),[['hob',2,950],['oven',2,450]]);
});
