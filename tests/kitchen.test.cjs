const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../shelly-core.js'),M=require('../media-core.js'),B=require('../backup-core.js'),T=require('../shelly-transport.js');
const base={schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'',rememberKey:false,bindings:{}},bindings={dishwasher:{deviceId:'e465b8b1526c',channel:0},washer:{deviceId:'485519eb7022',channel:0},boiler:{deviceId:'bc1c2a',channel:0}};
test('kitchen defaults associate the three exact supplied IDs, preserving existing custom channels and mappings',()=>{
 assert.deepEqual(M.associateKitchen(),bindings);assert.deepEqual(C.config(base),base);const custom={washer:{deviceId:'aabbcc',channel:2}};assert.deepEqual(M.associateKitchen(custom).washer,custom.washer);const cfg=C.config({...base,kitchenBindings:bindings});assert.deepEqual(cfg.kitchenBindings,bindings);assert.deepEqual(C.deviceIds(cfg),Object.values(bindings).map(b=>b.deviceId));assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);assert.deepEqual(C.config({...base,kitchenBindings:{}}).kitchenBindings,{});
});
test('kitchen rejects invalid roles, channels, IDs and aliases of any existing actuator',()=>{
 for(const kitchenBindings of [null,[],{tv:bindings.boiler},{washer:{deviceId:'invalid',channel:0}},{washer:{deviceId:'aabbcc',channel:16}},{washer:{deviceId:'aabbcc',channel:.5}}])assert.throws(()=>C.config({...base,kitchenBindings}));
 for(const extra of [{fan:bindings.boiler},{mediaBindings:{tv:bindings.boiler}},{officeBindings:{monitor:bindings.boiler}},{lightBindings:{master:{...bindings.boiler,type:'switch'}}},{ev:{relay:bindings.boiler}}])assert.throws(()=>C.config({...base,...extra,kitchenBindings:bindings}));assert.throws(()=>C.config({...base,kitchenBindings:{washer:bindings.boiler,boiler:bindings.boiler}}));
});
test('kitchen commands explicitly control just the selected relay; no living-room, office or implicit toggle commands',async()=>{
 for(const id of M.KITCHEN_IDS)for(const on of [true,false])assert.deepEqual(M.kitchenCommand(bindings,id,on),{id:bindings[id].deviceId,channel:0,type:'switch',on});
 for(const id of ['tv','monitor','fan'])assert.throws(()=>M.kitchenCommand(bindings,id,true));assert.throws(()=>M.kitchenCommand(bindings,'washer','toggle'));assert.throws(()=>M.command(bindings,'washer',true));assert.throws(()=>M.officeCommand(bindings,'boiler',false));
 let sends=0;const t=T.create({interval:0,fetch:async()=>{sends++;return {status:400,text:async()=>JSON.stringify({error:'DEVICE_FAILED_COMMAND'})}}});await assert.rejects(t.request({server:base.server,authKey:'FAKE'},'light',M.kitchenCommand(bindings,'boiler',false)),/recusou/);assert.equal(sends,1);
});
test('kitchen backup exports all IDs, preserves them when importing older files and allows intentional exact replacement',()=>{
 const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-kitchen-ids-associated-v1':true,'casa-nl-shelly-cloud-v1':C.config({...base,kitchenBindings:bindings})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const backup=B.parse(JSON.stringify(B.create(storage,'1.85')));assert.deepEqual(backup.data['casa-nl-shelly-cloud-v1'].kitchenBindings,bindings);assert.equal(backup.data['casa-nl-kitchen-ids-associated-v1'],true);assert.match(B.describe(backup),/3 cozinha/);
 const old=structuredClone(backup);delete old.data['casa-nl-shelly-cloud-v1'].kitchenBindings;const prepared=B.prepareImport(storage,old,true);assert.equal(prepared.preserved,3);assert.deepEqual(prepared.backup.data['casa-nl-shelly-cloud-v1'].kitchenBindings,bindings);assert.equal(B.prepareImport(storage,old,false).backup.data['casa-nl-shelly-cloud-v1'].kitchenBindings,undefined);B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).kitchenBindings,bindings);
});
test('all three kitchen appliances work strictly above 10 W, independent of relay power and never from stale or missing consumption',()=>{
 const reading={online:true,hasOutput:true,on:true,errors:[],fetchedAt:100000,meter:{online:true,hasMeter:true,power:10,energyKWh:1,errors:[]}};
 for(const id of M.KITCHEN_IDS){
  const threshold=M.activityThreshold(id);assert.equal(threshold,10);
  for(const watts of [0,4,9.999,10])assert.equal(M.state(bindings[id],{...reading,meter:{...reading.meter,power:watts}},100001,threshold).activity,false);
  for(const watts of [10.001,42.5,2000])assert.equal(M.state(bindings[id],{...reading,meter:{...reading.meter,power:watts}},100001,threshold).activity,true);
  for(const bad of [{...reading,online:false},{...reading,error:true},{...reading,meter:{...reading.meter,power:null}},{...reading,meter:{...reading.meter,hasMeter:false}},{...reading,fetchedAt:50000}])assert.equal(M.state(bindings[id],bad,100001,threshold).activity,null);
  assert.equal(M.state(bindings[id],reading,100001,threshold).on,true);
 }
 assert.equal(M.activityThreshold('tv'),4);assert.equal(M.activityThreshold('boiler'),10);
});
