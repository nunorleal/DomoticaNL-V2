const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../media-core.js'),C=require('../shelly-core.js');
const base={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}};
const bindings={tv:{deviceId:'437c82',channel:0},soundbar:{deviceId:'4359bb',channel:0},playstation:{deviceId:'435aa1',channel:0},vodafone:{deviceId:'e465b8b9c64c',channel:0},unifi:{deviceId:'e465b84553bc',channel:0}};
test('media IDs and channel zero roundtrip without altering optional older configurations',()=>{assert.deepEqual(C.config(base),base);const cfg=C.config({...base,mediaBindings:bindings});assert.deepEqual(cfg.mediaBindings,bindings);assert.deepEqual(C.deviceIds(cfg),Object.values(bindings).map(b=>b.deviceId));assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);assert.deepEqual(C.config({...base,mediaBindings:{}}).mediaBindings,{})});
test('media never aliases other actuators and rejects malformed IDs, roles and channels',()=>{for(const mediaBindings of [null,[],{other:bindings.tv},{tv:{deviceId:'XB123456',channel:0}},{tv:{deviceId:'441db8',channel:16}},{tv:{deviceId:'441db8',channel:0.5}}])assert.throws(()=>C.config({...base,mediaBindings}));for(const extra of [{lightBindings:{living:{...bindings.tv,type:'switch'}}},{fan:bindings.tv},{alarm:{arm:{...bindings.tv,activeWhenOn:true}}},{ev:{relay:bindings.tv}}])assert.throws(()=>C.config({...base,...extra,mediaBindings:bindings}));assert.throws(()=>C.config({...base,mediaBindings:{tv:bindings.tv,soundbar:bindings.tv}}))});
test('media states are relay power only, with strict freshness and no inferred appliance activity',()=>{const d={online:true,hasOutput:true,on:true,fetchedAt:100,errors:[]};assert.equal(M.state(bindings.tv,d,101).label,'Com energia');assert.equal(M.state(bindings.tv,{...d,on:false},101).label,'Sem energia');for(const r of [null,{...d,online:false},{...d,error:true},{...d,on:null},{...d,errors:['overpower']},{...d,hasOutput:false},{...d,fetchedAt:-50000}]){assert.equal(M.state(bindings.tv,r,101).on,null);assert.equal(M.state(bindings.tv,r,101).canControl,false)}assert.equal(M.state(null,d,101).label,'Por associar');assert.equal(Object.hasOwn(M.state(bindings.tv,d,101),'applianceOn'),false)});
test('media commands target only the explicitly chosen device and never use toggle',()=>{for(const id of M.IDS)for(const on of [true,false])assert.deepEqual(M.command(bindings,id,on),{id:bindings[id].deviceId,channel:0,type:'switch',on});assert.throws(()=>M.command(bindings,'other',true));assert.throws(()=>M.command(bindings,'tv','toggle'))});

test('office associations are saved separately, backed up, queried, and excluded from living-room commands',()=>{
 const officeBindings={monitor:{deviceId:'441db8',channel:0},apollo:{deviceId:'e43ad8',channel:0},terramaster:{deviceId:'e9df12',channel:0},blackdrive:{deviceId:'bb8ac4',channel:0}},cfg=C.config({...base,mediaBindings:bindings,officeBindings});assert.deepEqual(cfg.officeBindings,officeBindings);assert.deepEqual(C.deviceIds(cfg),[...Object.values(bindings),...Object.values(officeBindings)].map(b=>b.deviceId));assert.throws(()=>M.command(officeBindings,'monitor',false));assert.throws(()=>C.config({...base,mediaBindings:bindings,officeBindings:{monitor:bindings.tv}}));
 const B=require('../backup-core.js'),ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':cfg};const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},backup=B.parse(JSON.stringify(B.create(storage,'1.60')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).officeBindings,officeBindings);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).mediaBindings,bindings);
});

test('media power and accumulated energy use actual meter values, preserve zero and expire independently of relay state',()=>{
 const E=require('../ev-core.js'),b=bindings.tv,device={online:1,status:{relays:[{ison:false}],meters:[{power:0,total:60000,is_valid:true}]}},r={...E.relayStatus(device,b),meter:E.meterStatus(device,{...b,component:'auto'}),fetchedAt:100};
 assert.equal(M.state(b,r,101).powerWatts,0);assert.equal(M.state(b,r,101).energyKWh,1);assert.equal(M.state(b,r,101).on,false);
 for(const bad of [{...r,error:true},{...r,online:false},{...r,fetchedAt:-50000},{...r,meter:{...r.meter,errors:['fault']}},{...r,meter:{...r.meter,power:null,energyKWh:null}}])assert.equal(M.state(b,bad,101).powerWatts,null);
 const gen2={online:1,status:{'switch:0':{output:true,apower:42.8,aenergy:{total:1234}}}},g={...E.relayStatus(gen2,b),meter:E.meterStatus(gen2,{...b,component:'auto'}),fetchedAt:100};assert.equal(M.state(b,g,101).powerWatts,42.8);assert.equal(M.state(b,g,101).energyKWh,1.234);
 const noMeter={...r,meter:E.meterStatus({online:1,status:{relays:[{ison:true}]}},{...b,component:'auto'})};assert.equal(M.state(b,noMeter,101).powerWatts,null);assert.equal(M.state(b,noMeter,101).energyKWh,null);assert.equal(M.state(null,r,101).powerWatts,null);
});

test('TV and PS5 activity follows measured zero/positive watts, independently of relay output',()=>{
 for(const value of [null,undefined,NaN,Infinity,'0',-1])assert.equal(M.activityFromPower(value),null);
 assert.equal(M.activityFromPower(0),false);assert.equal(M.activityFromPower(-0),false);for(const value of [.0001,.01,.5,20])assert.equal(M.activityFromPower(value),true);
 const r={online:true,hasOutput:true,on:true,errors:[],fetchedAt:100,meter:{online:true,hasMeter:true,power:0,energyKWh:1,errors:[]}};
 assert.equal(M.state(bindings.tv,r,101).on,true);assert.equal(M.state(bindings.tv,r,101).activity,false);
 assert.equal(M.state(bindings.tv,{...r,meter:{...r.meter,power:8}},101).activity,true);
 assert.equal(M.state(bindings.tv,r,50000).activity,null);assert.equal(M.state(bindings.tv,{...r,error:true},101).activity,null);assert.equal(M.state(bindings.tv,{...r,meter:{...r.meter,power:null}},101).activity,null);
});

test('TV usage starts above thirty-five watts, excluding standby and regeneration; PS5 retains its zero-watt rule',()=>{
 const tv=M.activityThreshold('tv');assert.equal(tv,35);assert.equal(M.activityThreshold('playstation'),0);
 for(const power of [0,.1,.5,4.99,5,25,35])assert.equal(M.activityFromPower(power,tv),false);
 for(const power of [35.001,40,45,50,60,120])assert.equal(M.activityFromPower(power,tv),true);
 assert.equal(M.activityFromPower(.1,M.activityThreshold('playstation')),true);assert.equal(M.activityFromPower(null,tv),null);
 const r={online:true,hasOutput:true,on:true,errors:[],fetchedAt:100,meter:{online:true,hasMeter:true,power:35,energyKWh:1,errors:[]}};
 assert.equal(M.state(bindings.tv,r,101,tv).activity,false);assert.equal(M.state(bindings.tv,{...r,meter:{...r.meter,power:35.01}},101,tv).activity,true);assert.equal(M.state(bindings.tv,r,50000,tv).activity,null);
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(require.resolve('../shelly.js'),'utf8'),start=src.indexOf(' function mediaBinding('),end=src.indexOf(' function mediaEnsureFresh(',start),context={MC:M,config:{mediaBindings:bindings,server:'test'},mediaReadings:{tv:{...r,fetchedAt:Date.now()}},blockingRead:()=>false,busy:false,commandCount:0,groupBusy:false,lightGroupBusy:false,mediaTargets:new Map(),dirty:()=>false,key:'FAKE',mediaMessages:new Map()};vm.createContext(context);vm.runInContext(src.slice(start,end),context);assert.equal(context.mediaSnapshot('tv').activity,false);
});


test('popup room lighting follows the living-room relay, never device consumption or stale states',()=>{
 const r={online:true,hasOutput:true,on:true,fetchedAt:100,errors:[]};
 assert.equal(M.roomLighting(true,r,false,101),true);
 assert.equal(M.roomLighting(true,{...r,on:false},true,101),false);
 for(const bad of [null,{...r,online:false},{...r,hasOutput:false},{...r,error:true},{...r,errors:['fault']},{...r,on:null},{...r,fetchedAt:102},{...r,fetchedAt:-50000}])assert.equal(M.roomLighting(true,bad,true,101),null);
 assert.equal(M.roomLighting(false,null,true,101),true);assert.equal(M.roomLighting(false,r,false,101),false);
});


test('office commands preserve explicit ID, exact channel and Boolean state, never accepting living-room roles',()=>{
 const b={monitor:{deviceId:'441db8',channel:0},apollo:{deviceId:'e43ad8',channel:2},terramaster:{deviceId:'e9df12',channel:0},blackdrive:{deviceId:'bb8ac4',channel:0}};
 for(const id of M.OFFICE_IDS)for(const on of [true,false])assert.deepEqual(M.officeCommand(b,id,on),{id:b[id].deviceId,channel:b[id].channel,type:'switch',on});
 for(const id of ['tv','soundbar','other'])assert.throws(()=>M.officeCommand(b,id,true));assert.throws(()=>M.officeCommand(b,'monitor','toggle'));assert.throws(()=>M.officeCommand({},'monitor',false));
 const cfg=C.config({...base,officeBindings:b,mediaBindings:bindings});assert.equal(new Set(C.deviceIds(cfg)).size,9);
});


test('Gui association fills all four supplied IDs, channel zero, and preserves existing edited associations',()=>{const expected={monitor:{deviceId:'441db8',channel:0},apollo:{deviceId:'e43ad8',channel:0},terramaster:{deviceId:'e9df12',channel:0},blackdrive:{deviceId:'bb8ac4',channel:0}};assert.deepEqual(M.associateOffice({}),expected);assert.deepEqual(M.associateOffice(undefined),expected);const edited={deviceId:'abcdef',channel:3};assert.deepEqual(M.associateOffice({monitor:edited}),{...expected,monitor:edited});assert.deepEqual(C.config({...base,officeBindings:M.associateOffice({})}).officeBindings,expected)});


test('TV regeneration is only an estimate between 5 and 35 W inclusive with live, powered readings',()=>{
 const r={online:true,hasOutput:true,on:true,errors:[],fetchedAt:100,meter:{online:true,hasMeter:true,power:6,energyKWh:1,errors:[]}},binding={deviceId:'deadbeef0011',channel:0};
 for(const power of [5,6,25,35])assert.equal(M.tvRegenerating(M.state(binding,{...r,meter:{...r.meter,power}},101,4)),true);
 for(const power of [0,2,4.999,35.001,40,45,50,80,null,NaN])assert.equal(M.tvRegenerating(M.state(binding,{...r,meter:{...r.meter,power}},101,4)),false);
 for(const bad of [{...r,on:false},{...r,online:false},{...r,error:true},{...r,missing:true},{...r,fetchedAt:-50000},{...r,meter:{...r.meter,error:true}}])assert.equal(M.tvRegenerating(M.state(binding,bad,101,4)),false);
 assert.equal(M.tvRegenerating(M.state(null,r,101,4)),false);
});

test('screen usage excludes regeneration, standby and unconfirmed measurements',()=>{
 const ready={configured:true,on:true,stale:false,powerWatts:85};
 for(const id of ['tv','monitor']){assert.equal(M.screenWorking(id,ready),true);for(const patch of [{configured:false},{on:false},{on:null},{stale:true},{powerWatts:null},{powerWatts:NaN},{powerWatts:Infinity},{powerWatts:0}])assert.equal(M.screenWorking(id,{...ready,...patch}),false)}
 for(const powerWatts of [0,2,4.999,5,25,35])assert.equal(M.screenWorking('tv',{...ready,powerWatts}),false);
 assert.equal(M.screenWorking('tv',{...ready,powerWatts:35.1}),true);assert.equal(M.screenWorking('monitor',{...ready,powerWatts:2}),false);assert.equal(M.screenWorking('monitor',{...ready,powerWatts:2.1}),true);assert.equal(M.screenWorking('soundbar',ready),false);
});

test('screen reflections stay visible in daylight, darkness and electric-light renders',()=>{
 assert.equal(M.reflectionStrength(0,0),.6);assert.equal(M.reflectionStrength(1,0),.85);assert.equal(M.reflectionStrength(0,1),1);assert.ok(M.reflectionStrength(0,.45)>.9);assert.equal(M.reflectionStrength(1,1),1);
 for(const args of [[NaN,Infinity],[-1,-1],[2,2]]){const value=M.reflectionStrength(...args);assert.ok(Number.isFinite(value)&&value>=.6&&value<=1)}
});
