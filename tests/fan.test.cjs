const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../shelly-core.js'),E=require('../ev-core.js'),A=require('../alarm-core.js'),L=require('../basement-layout-core.js');
const base={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}};
test('fan association preserves optional old schema, exact ID/channel and explicit removal',()=>{
 assert.deepEqual(C.config(base),base);const cfg=C.config({...base,fan:{deviceId:'8819DC',channel:0}});assert.deepEqual(cfg.fan,{deviceId:'8819dc',channel:0});assert.deepEqual(C.deviceIds(cfg),['8819dc']);assert.equal(C.config({...cfg,fan:null}).fan,null);assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);
});
test('fan rejects invalid channels and duplicate actuators across roles',()=>{
 for(const fan of [{deviceId:'XB123456',channel:0},{deviceId:'8819dc',channel:16},{deviceId:'8819dc',channel:0.5}])assert.throws(()=>C.config({...base,fan}));
 const fan={deviceId:'8819dc',channel:0};for(const role of [{lightBindings:{living:{...fan,type:'switch'}}},{bindings:{master:fan}},{ev:{relay:fan}},{alarm:{arm:{...fan,activeWhenOn:true}}}])assert.throws(()=>C.config({...base,...role,fan}));
});
test('fan reads both generations and never infers running from power, offline or stale data',()=>{
 for(const status of [{relays:[{ison:true}]},{'switch:0':{output:true}}]){const d={...E.relayStatus({online:1,status},{channel:0}),fetchedAt:100};assert.equal(A.fresh(d,101),true);assert.equal(d.on,true);assert.equal(A.fresh({...d,online:false},101),false);assert.equal(A.fresh(d,50000),false)}
 const d=E.relayStatus({online:1,status:{emeters:[{power:50}]}},{channel:0});assert.equal(d.hasOutput,false);
});
test('fan banner participates in validated portable layout',()=>assert.deepEqual(L.layout({fan:{x:50,y:20}}),{fan:{x:50,y:20}}));

const B=require("../backup-core.js");
test('backup preserves fan association and rejects an invalid import atomically',()=>{
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base,fan:{deviceId:"8819dc",channel:0}})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.53')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).fan,{deviceId:"8819dc",channel:0});const before=storage.getItem('casa-nl-shelly-cloud-v1');backup.data['casa-nl-shelly-cloud-v1'].fan.channel=-1;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-shelly-cloud-v1'),before);
});
