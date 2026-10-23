const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../energy-core.js'),C=require('../shelly-core.js'),B=require('../backup-core.js');
const base=()=>({schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'',rememberKey:false,bindings:{},ev:{thresholdWatts:50,meter:{deviceId:'aabbcc112233',channel:1,component:'emeter'},relay:{deviceId:'aabbcc112233',channel:0}}});
const em=(p,q,total=450000)=>({id:'aabbcc112233',online:1,status:{emeters:[{power:p,reactive:q,total,voltage:230,is_valid:true},{power:3600,reactive:0,total:128450,is_valid:true}]}});
test('main meter reuses EV ID but explicitly chooses channel zero without modifying EV channel one',()=>{
 const cfg=C.config(base());assert.deepEqual(E.binding(cfg),{deviceId:'aabbcc112233',channel:0});assert.deepEqual(C.deviceIds(cfg),['aabbcc112233']);assert.equal(cfg.ev.meter.channel,1);assert.equal(cfg.homeEnergy,undefined);
 const custom=C.config({...base(),homeEnergy:{source:'custom',deviceId:'ddeeff112233',channel:0,contractKVA:6.9}});assert.deepEqual(C.deviceIds(custom),['ddeeff112233','aabbcc112233']);
});
test('contract kVA uses apparent power sqrt(P²+Q²), distinct from active kW',()=>{
 const cfg=base(),r={...E.status(em(3000,4000),E.binding(cfg)),fetchedAt:100};const d=E.state(cfg,r,101);
 assert.equal(d.powerKW,3);assert.equal(d.apparentKVA,5);assert.equal(d.energyKWh,450);assert.equal(d.contractKVA,6.9);assert.ok(Math.abs(d.percent-500/6.9)<1e-9);assert.ok(Math.abs(d.remainingKVA-1.9)<1e-9);assert.equal(d.level,'yellow');
 assert.equal(E.status(em(-3000,4000),E.binding(cfg)).powerKW,-3);
});
test('zero reactive power is valid; missing reactive data cannot fabricate unity power factor',()=>{
 const cfg=base(),b=E.binding(cfg);assert.equal(E.status(em(1000,0),b).apparentKVA,1);
 assert.equal(E.status(em(1000,undefined),b).apparentKVA,null);const d=E.state(cfg,{...E.status(em(1000,undefined),b),fetchedAt:100},101);assert.equal(d.powerKW,1);assert.equal(d.percent,null);assert.equal(d.level,'unknown');
 assert.equal(E.status(em(0,0),b).apparentKVA,0);
});
test('colours progress through thresholds and retain actual overload percentage',()=>{
 const cfg=base();for(const [ratio,level]of [[0,'green'],[.59,'green'],[.6,'yellow'],[.8,'orange'],[.95,'red'],[1,'over'],[1.2,'over']]){
 const r={...E.status(em(6900*ratio,0),E.binding(cfg)),fetchedAt:100},d=E.state(cfg,r,101);assert.equal(d.level,level);assert.ok(Math.abs(d.percent-ratio*100)<1e-8);
 }
});
test('missing, invalid, offline, errored and stale readings never show a reassuring live gauge',()=>{
 const cfg=base(),b=E.binding(cfg),valid={...E.status(em(7000,0),b),fetchedAt:100};
 for(const r of [null,{...valid,error:true},{...valid,online:false},{...valid,valid:false},valid]){const d=E.state(cfg,r,50000);assert.equal(d.percent,null);assert.equal(d.powerKW,null);assert.equal(d.level,'unknown')}
 assert.equal(E.status(em(1000,0),{...b,channel:2}).powerKW,null);const dev=em(1000,0);dev.status.emeters[0].is_valid=false;assert.equal(E.status(dev,b).powerKW,null);
 const stale=E.state(cfg,valid,50000);assert.equal(stale.energyKWh,450);assert.equal(stale.energyStale,true);
});
test('settings reject invalid contracts, source, actuator IDs and channels',()=>{
 for(const x of [{source:'car',channel:2,contractKVA:6.9},{source:'car',channel:0,contractKVA:0},{source:'car',channel:0,contractKVA:Infinity},{source:'relay',channel:0,contractKVA:6.9},{source:'custom',deviceId:'XB123456',channel:0,contractKVA:6.9}])assert.throws(()=>C.config({...base(),homeEnergy:x}));
 assert.equal(E.binding({}),null);
});
test('backup roundtrips main meter settings and visibility, rejects malformed toggle before writes',()=>{
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-show-energy-banner':false,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base(),homeEnergy:{source:'car',channel:0,contractKVA:6.9}})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.49')));B.restore(storage,backup);assert.equal(storage.getItem('casa-nl-show-energy-banner'),'false');assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).homeEnergy,data['casa-nl-shelly-cloud-v1'].homeEnergy);
 const before=storage.getItem('casa-nl-shelly-cloud-v1');backup.data['casa-nl-show-energy-banner']='true';assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-shelly-cloud-v1'),before);
});
