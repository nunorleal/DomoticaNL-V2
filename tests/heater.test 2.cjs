const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../shelly-core.js'),E=require('../ev-core.js'),A=require('../alarm-core.js'),L=require('../heater-core.js');
const base={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}};
test('heater association preserves optional old schema, exact ID/channel and explicit removal',()=>{
 assert.deepEqual(C.config(base),base);const cfg=C.config({...base,heater:{deviceId:'EA9D29',channel:0}});assert.deepEqual(cfg.heater,{deviceId:'ea9d29',channel:0});assert.deepEqual(C.deviceIds(cfg),['ea9d29']);assert.equal(C.config({...cfg,heater:null}).heater,null);assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);
});
test('heater rejects invalid channels and duplicate actuators across roles',()=>{
 for(const heater of [{deviceId:'XB123456',channel:0},{deviceId:'ea9d29',channel:16},{deviceId:'ea9d29',channel:0.5}])assert.throws(()=>C.config({...base,heater}));
 const heater={deviceId:'ea9d29',channel:0};for(const role of [{lightBindings:{living:{...heater,type:'switch'}}},{bindings:{master:heater}},{ev:{relay:heater}},{alarm:{arm:{...heater,activeWhenOn:true}}}])assert.throws(()=>C.config({...base,...role,heater}));
});
test('heater reads both generations and never infers running from power, offline or stale data',()=>{
 for(const status of [{relays:[{ison:true}]},{'switch:0':{output:true}}]){const d={...E.relayStatus({online:1,status},{channel:0}),fetchedAt:100};assert.equal(A.fresh(d,101),true);assert.equal(d.on,true);assert.equal(A.fresh({...d,online:false},101),false);assert.equal(A.fresh(d,50000),false)}
 const d=E.relayStatus({online:1,status:{emeters:[{power:50}]}},{channel:0});assert.equal(d.hasOutput,false);
});
test('heater positions preserve assigned room and source coordinates; reject invalid imports',()=>{assert.deepEqual(L.layout({room:'living',x:540,y:920}),{room:'living',x:540,y:920});for(const v of [{room:'cellar',x:500,y:900},{room:'master',x:NaN,y:420},{room:'master',x:779,y:0}])assert.throws(()=>L.layout(v))});

const B=require("../backup-core.js");
test('backup preserves heater association and rejects an invalid import atomically',()=>{
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base,heater:{deviceId:"ea9d29",channel:0}})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.53')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).heater,{deviceId:"ea9d29",channel:0});const before=storage.getItem('casa-nl-shelly-cloud-v1');assert.equal(B.associationCount(backup.data['casa-nl-shelly-cloud-v1']),1);assert.match(B.describe(backup),/1 termoventilador/);backup.data['casa-nl-shelly-cloud-v1'].heater.channel=-1;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-shelly-cloud-v1'),before);
});
