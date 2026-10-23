const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../door-core.js'),C=require('../shelly-core.js'),T=require('../shelly-transport.js');
const base=()=>({schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'',rememberKey:false,bindings:{}});
test('door config is optional and validated, removal preserves old configurations',()=>{
 assert.deepEqual(C.config(base()),base());
 const cfg=C.config({...base(),door:{deviceId:'AA:BB:CC:DD:EE:FF',source:'bthome',component:200}});
 assert.deepEqual(cfg.door,{deviceId:'aabbccddeeff',source:'bthome',component:200});assert.deepEqual(C.deviceIds(cfg),['aabbccddeeff']);
 assert.deepEqual(C.config({...base(),door:null}),base());
 for(const b of [{deviceId:'aabbcc',source:'switch'},{deviceId:'aabbcc',source:'blu',component:-1},{deviceId:'aabbcc',source:'blu',component:1.5}])assert.throws(()=>C.config({...base(),door:b}));
});
test('BLU reads exact window component and only explicit binary contact values',()=>{
 const b={source:'blu',component:0},get=s=>D.status({online:1,status:s},b);
 assert.equal(get({'window:0':{value:true}}).open,true);assert.equal(get({'window:0':{value:0}}).open,false);
 assert.equal(get({window:1}).open,true);
 for(const s of [{'window:1':{value:true}}, {'window:0':{value:'false'}},{'window:0':{value:null}},{'window:0':{value:false,errors:['error']}},{'window:0':{value:false},is_valid:false},{}])assert.equal(get(s).open,null);
});
test('BTHome exact selected sensor; timestamp is last radio event, not query time',()=>{
 const b={source:'bthome',component:201},s={'bthomesensor:200':{value:true},'bthomesensor:201':{value:0,last_updated_ts:100}};
 const d=D.status({online:true,status:s},b);assert.equal(d.open,false);assert.equal(d.updatedAt,100000);
 assert.equal(D.status({online:true,status:s},{...b,component:202}).open,null);
});
test('offline, failed, stale, absent and unknown cannot open or confirm closed',()=>{
 const d={online:true,open:true,fetchedAt:100};assert.equal(D.state(d,101),true);assert.equal(D.state({...d,open:false},101),false);
 for(const r of [null,{...d,online:false},{...d,error:true},{...d,open:null},{...d,fetchedAt:undefined},d])assert.equal(D.state(r,50000),null);
 assert.equal(D.state({...d,online:false},101),null);
});
test('door never sends actuator commands and status batches stay within ten',async()=>{
 const cfg=C.config({...base(),door:{deviceId:'aabbcc',source:'blu'}});assert.deepEqual(C.deviceBatches(cfg),[['aabbcc']]);
 let sends=0;const t=T.create({fetch:async()=>{sends++;throw Error('Unexpected network')},interval:0});
 await assert.rejects(t.request({server:base().server,authKey:'FAKE-TEST'},'door',{id:'aabbcc',open:true}));assert.equal(sends,0);
});
test('door association is included in a validated JSON backup; invalid import is atomic',()=>{
 const B=require('../backup-core.js'),ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base(),door:{deviceId:'aabbcc',source:'bthome',component:200},cellarDoor:{deviceId:'XB12345678901234',source:'blu',component:0}})};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.46')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).door,data['casa-nl-shelly-cloud-v1'].door);
 assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).cellarDoor,data['casa-nl-shelly-cloud-v1'].cellarDoor);
 const before=storage.getItem('casa-nl-shelly-cloud-v1');backup.data['casa-nl-shelly-cloud-v1'].door.component=-2;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-shelly-cloud-v1'),before);
});

test('BLU XB IDs retain their prefix through config, backup normalization and status requests',async()=>{
 const cfg=C.config({...base(),door:{deviceId:' xb12345678901234 ',source:'blu',component:0}});
 assert.equal(cfg.door.deviceId,'XB12345678901234');assert.deepEqual(C.deviceIds(cfg),['XB12345678901234']);assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);
 const requests=[],transport=T.create({interval:0,fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {status:200,text:async()=>JSON.stringify([{id:'XB12345678901234',online:1,status:{'window:0':{value:false}}}])}}});
 const result=await transport.request({server:base().server,authKey:'FAKE-BLU-TEST'},'status',{ids:C.deviceIds(cfg)});
 assert.deepEqual(requests,[{ids:['XB12345678901234'],select:['status']}]);assert.equal(result.devices[0].id,cfg.door.deviceId);
 const d=D.status(result.devices[0],cfg.door);assert.equal(d.open,false);
});
test('XB stays read-only and cannot be an actuator or a BTHome gateway ID',()=>{
 const id='XB12345678901234';assert.throws(()=>C.deviceId(id));assert.throws(()=>C.lightCommand({deviceId:id,type:'switch',channel:0},true));assert.throws(()=>C.command({deviceId:id,channel:0},'open'));
 assert.throws(()=>C.config({...base(),door:{deviceId:id,source:'bthome',component:200}}));
 for(const id of ['XB','XB-123','XB1234567890123456','XB281474976710656','XB12evil'])assert.throws(()=>C.statusDeviceId(id));
});

test('cellar contact is independent, accepts XB and joins read batches without altering entrance',()=>{
 const cfg=C.config({...base(),door:{deviceId:'XB12345678901234',source:'blu',component:0},cellarDoor:{deviceId:'XB12345678901235',source:'blu',component:0}});
 assert.deepEqual(C.deviceIds(cfg),['XB12345678901234','XB12345678901235']);
 const entrance={...D.status({online:1,status:{'window:0':{value:true}}},cfg.door),fetchedAt:100};
 const cellar={...D.status({online:1,status:{'window:0':{value:false}}},cfg.cellarDoor),fetchedAt:100};
 assert.equal(D.state(entrance,101),true);assert.equal(D.state(cellar,101),false);assert.equal(D.state({...cellar,error:true},101),null);assert.equal(D.state(entrance,101),true);
 assert.deepEqual(C.config({...cfg,cellarDoor:null}).door,cfg.door);
});
test('two doors cannot reuse the same contact, but may share a gateway with separate components',()=>{
 const a={deviceId:'aabbcc',source:'bthome',component:200};assert.throws(()=>C.config({...base(),door:a,cellarDoor:a}));
 const cfg=C.config({...base(),door:a,cellarDoor:{...a,component:201}});assert.equal(cfg.cellarDoor.component,201);assert.deepEqual(C.deviceIds(cfg),['aabbcc']);
 assert.throws(()=>C.config({...base(),cellarDoor:{deviceId:'aabbcc',source:'blu',component:-1}}));
});

test('gateway inspection lists only sanitized BTHome readings without guessing a contact',()=>{
 const d=D.inspectGateway({online:1,status:{'switch:0':{output:true},auth_key:'PRIVATE','bthomesensor:202':{value:84,last_update_ts:100},'bthomesensor:201':{value:false,last_updated_ts:101},'bthomesensor:200':{value:'<script>secret</script>'},'bthomesensor:9999':{value:true}}});
 assert.equal(d.online,true);assert.deepEqual(d.components.map(c=>c.id),[200,201,202]);assert.equal(d.components[0].value,null);assert.equal(d.components[1].value,false);assert.equal(d.components[2].value,84);assert.equal(d.components[1].updatedAt,101000);assert.equal(Object.hasOwn(d,'open'),false);assert.ok(!JSON.stringify(d).includes('PRIVATE'));assert.ok(!JSON.stringify(d).includes('script'));
 assert.deepEqual(D.inspectGateway(undefined),{found:false,online:false,components:[]});assert.equal(D.inspectGateway({online:0,status:{}}).online,false);assert.equal(D.inspectGateway({online:1,status:{'bthomesensor:200':{value:true,errors:['fault']}}}).components[0].valid,false);
});
test('a gateway diagnostic request is a status-only query and never changes a door binding',async()=>{
 const cfg=C.config({...base(),door:{deviceId:'XB66172384118439',source:'blu',component:0}}),before=JSON.stringify(cfg),calls=[];
 const transport=T.create({interval:0,fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {status:200,text:async()=>JSON.stringify([{id:'e465b8b9c64c',online:1,status:{'bthomesensor:201':{value:false}}}])}}});
 const result=await transport.request({server:base().server,authKey:'FAKE-GATEWAY-TEST'},'status',{ids:['e465b8b9c64c']});assert.equal(D.inspectGateway(result.devices[0]).components[0].value,false);assert.equal(calls.length,1);assert.match(calls[0].url,/api\/get\?/);assert.deepEqual(calls[0].body,{ids:['e465b8b9c64c'],select:['status']});assert.equal(JSON.stringify(cfg),before);
});

test('BLU Cloud window.open handles true and false without losing a closed false value',()=>{
 const b={source:'blu',component:0},get=c=>D.status({online:1,status:{'window:0':c}},b).open;
 assert.equal(get({open:true}),true);assert.equal(get({open:false}),false);assert.equal(get({open:1}),true);assert.equal(get({open:0}),false);
 assert.equal(get({open:false,value:false}),false);assert.equal(get({open:true,value:true}),true);
 for(const c of [{open:null},{open:'false'},{open:true,value:false},{open:false,value:true},{open:false,value:null},{open:true,is_valid:false},{open:true,errors:['fault']}])assert.equal(get(c),null);
 assert.equal(D.status({online:1,status:{'window:1':{open:true}}},b).open,null);
 assert.equal(D.state({...D.status({online:1,status:{'window:0':{open:false}}},b),fetchedAt:100},101),false);
});
test('BLU diagnostic keeps only contact-related scalars and never exposes arbitrary values',()=>{
 const result=D.inspectSensor({online:1,status:{'window:0':{id:0,open:false},'devicepower:0':{auth_key:'PRIVATE'},auth_key:'SECRET',wifi_sta:{ssid:'HIDDEN'},sensor:{state:'open'},window:{value:'<script>private</script>'}}});
 assert.equal(result.online,true);assert.deepEqual(result.fields,[{path:'window:0.open',value:false},{path:'sensor.state',value:'open'}]);for(const secret of ['PRIVATE','SECRET','HIDDEN','<script>'])assert.ok(!JSON.stringify(result).includes(secret));assert.deepEqual(D.inspectSensor(null),{found:false,online:false,fields:[],keys:[]});
});

test('cellar BLU diagnosis reads only its own saved ID; missing cellar never uses entrance',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(require.resolve('../shelly.js'),'utf8'),start=src.indexOf(' async function inspectDoorSensor('),end=src.indexOf(' async function inspectDoorGateway(',start),calls=[];
 const context={config:{door:{deviceId:'XB66172384118439',source:'blu'},cellarDoor:{deviceId:'XB12345678901234',source:'blu'},server:'https://shelly-1-eu.shelly.cloud'},busy:false,commandCount:0,groupBusy:false,lightGroupBusy:false,key:'FAKE-TEST',generation:0,dirty:()=>false,summary:()=>{},window:{CasaDoorCore:D},api:async(path,payload)=>{calls.push({path,...payload});return {devices:payload.ids.map(id=>({id,online:1,status:{'window:0':{open:id==='XB12345678901234'}}}))}}};
 vm.createContext(context);vm.runInContext(src.slice(start,end),context);
 const cellar=await context.inspectDoorSensor('cellar');assert.equal(cellar.fields[0].value,true);const entrance=await context.inspectDoorSensor();assert.equal(entrance.fields[0].value,false);assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{path:'status',ids:['XB12345678901234']},{path:'status',ids:['XB66172384118439']}]);
 delete context.config.cellarDoor;await assert.rejects(context.inspectDoorSensor('cellar'));await assert.rejects(context.inspectDoorSensor('invalid'));assert.equal(calls.length,2);assert.equal(context.busy,false);
});

test('confirmed entrance/cellar IDs stay distinct and preserve their full XB values',()=>{
 const D=require('../door-core.js'),C=require('../shelly-core.js'),expected={door:{deviceId:'XB66172384118439',source:'blu',component:0},cellarDoor:{deviceId:'XB106582486435511',source:'blu',component:0}};
 assert.deepEqual(D.suppliedBindings(),expected);assert.deepEqual(D.suppliedBindings({cellarDoor:expected.door}),expected);
 const cfg=C.config({schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{},...D.suppliedBindings()});assert.deepEqual(cfg.door,expected.door);assert.deepEqual(cfg.cellarDoor,expected.cellarDoor);assert.deepEqual(C.deviceIds(cfg),['XB66172384118439','XB106582486435511']);
 assert.equal(D.suppliedBindings({cellarDoor:{...expected.cellarDoor,component:1}}).cellarDoor.component,1);
});
