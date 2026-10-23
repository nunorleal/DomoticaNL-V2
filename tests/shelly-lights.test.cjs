const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../shelly-core.js'),B=require('../backup-core.js');
const config=()=>({schemaVersion:1,server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE-SESSION-KEY',rememberKey:false,bindings:{master:{deviceId:'deadbeef0011',channel:0}},lightBindings:{living:{deviceId:'AA:BB:CC:11:22:33',channel:0,type:'switch'},bedroom2:{deviceId:'aabbcc112244',channel:1,type:'light'}}});
const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
function storage(data={}){const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)]));return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}}
function data(cloud){return {'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:50}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':cloud}}
test('existing backups without lamp associations retain their exact format',()=>{const old=config();delete old.lightBindings;old.authKey='';assert.deepEqual(C.config(old),old)});
test('lamp IDs normalize, channel zero survives and blind bindings remain independent',()=>{const v=C.config(config());assert.equal(v.lightBindings.living.deviceId,'aabbcc112233');assert.equal(v.lightBindings.living.channel,0);assert.equal(v.lightBindings.bedroom2.type,'light');assert.deepEqual(v.bindings,config().bindings);assert.equal(v.authKey,'')});
test('reject malformed lamp collections, unsupported rooms/types and invalid channels',()=>{for(const lightBindings of [null,[],{kitchen:{deviceId:'aabbcc',channel:0,type:'switch'}},{living:{deviceId:'192.168.1.2',channel:0,type:'switch'}},{living:{deviceId:'aabbcc',channel:-1,type:'light'}},{living:{deviceId:'aabbcc',channel:16,type:'light'}},{living:{deviceId:'aabbcc',channel:0,type:'cover'}},{living:{deviceId:'aabbcc',channel:0.5,type:'switch'}}])assert.throws(()=>C.config({...config(),lightBindings}))});
test('same ID/channel cannot address two lamps or a lamp and a blind',()=>{const a={deviceId:'aabbcc112233',channel:0,type:'switch'};assert.throws(()=>C.config({...config(),lightBindings:{master:a,living:{...a,type:'light'}}}));assert.throws(()=>C.config({...config(),lightBindings:{living:{...a,deviceId:'deadbeef0011'}}}));assert.doesNotThrow(()=>C.config({...config(),lightBindings:{master:a,living:{...a,channel:1}}}))});
test('lamp associations roundtrip in JSON with no session secret and restore independently',()=>{const source=storage(data(C.config(config()))),backup=B.parse(JSON.stringify(B.create(source,'1.26'))),target=storage();B.restore(target,backup);const restored=JSON.parse(target.getItem('casa-nl-shelly-cloud-v1'));assert.deepEqual(restored.lightBindings,C.config(config()).lightBindings);assert.deepEqual(restored.bindings,config().bindings);assert.equal(restored.authKey,'');assert.ok(!JSON.stringify(backup).includes('FAKE-SESSION-KEY'))});
test('malformed imported lamp association is rejected before touching saved settings',()=>{const target=storage(data(C.config(config()))),before=target.getItem('casa-nl-shelly-cloud-v1'),bad=data(config());bad['casa-nl-shelly-cloud-v1'].lightBindings.living.type='cover';assert.throws(()=>B.restore(target,{data:bad}));assert.equal(target.getItem('casa-nl-shelly-cloud-v1'),before)});
const T=require('../shelly-transport.js');
test('light commands select only switch/light endpoints with an explicit boolean and exact channel',()=>{
 const credentials={server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE'};
 for(const type of ['switch','light'])for(const on of [true,false]){const payload=C.lightCommand({deviceId:'AA:BB:CC:11:22:33',channel:0,type},on),r=T.build(credentials,'light',payload);assert.ok(r.url.includes('/set/'+type+'?'));assert.deepEqual(r.body,{id:'aabbcc112233',channel:0,on});assert.deepEqual(T.decode(r,200,''),{accepted:true})}
 for(const type of ['cover','switch/else','toggle'])assert.throws(()=>C.lightCommand({deviceId:'aabbcc',channel:0,type},true));
 for(const on of [1,'true',null,undefined])assert.throws(()=>C.lightCommand({deviceId:'aabbcc',channel:0,type:'light'},on));
});
test('Gen2 switch/light and Gen1 relay/light report actual booleans without inferring state from power',()=>{
 for(const [type,status]of [['switch',{'switch:0':{output:true,apower:5}}],['switch',{relays:[{ison:true,power:5}]}],['light',{'light:0':{output:true,brightness:30}}],['light',{lights:[{ison:true,brightness:30}]}]]){const d=C.lightStatus({online:1,status},{type,channel:0});assert.equal(d.on,true);assert.equal(d.hasOutput,true);assert.equal(d.online,true)}
 for(const output of [null,1,'true',undefined])assert.equal(C.lightStatus({online:1,status:{'switch:0':{output,apower:20}}},{type:'switch',channel:0}).on,null);
 assert.equal(C.lightStatus({online:1,status:{'switch:0':{output:true}}},{type:'light',channel:0}).resolvedType,'switch');
 assert.equal(C.lightStatus({online:0,status:{'switch:0':{output:true}}},{type:'switch',channel:0}).online,false);
});
test('physical light commands need online, known, recent and error-free readings',()=>{
 const now=Date.now(),d={online:true,hasOutput:true,on:false,fetchedAt:now,errors:[]};assert.equal(C.canLightControl(d,now),true);
 for(const patch of [{online:false},{on:null},{hasOutput:false},{error:true},{missing:true},{fetchedAt:now-120001},{errors:['overtemp']}])assert.equal(C.canLightControl({...d,...patch},now),false);
});
test('rejected physical light command is sent once, with no toggle and no retries',async()=>{
 let calls=0;const t=T.create({sleep:async()=>{},fetch:async(_,options)=>{calls++;assert.deepEqual(JSON.parse(options.body),{id:'aabbcc112233',channel:1,on:false});return {status:400,text:async()=>'{"error":"DEVICE_OFFLINE"}'}}});
 await assert.rejects(t.request({server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE'},'light',C.lightCommand({deviceId:'aabbcc112233',channel:1,type:'light'},false)),/offline/);assert.equal(calls,1);
});

test('a Gen1 dimmer is detected as light even with the default switch preference',()=>{
 const binding={deviceId:'aabbcc112233',type:'switch',channel:0},d=C.lightStatus({online:1,status:{lights:[{ison:false,brightness:70}]}},binding);
 assert.equal(d.hasOutput,true);assert.equal(d.resolvedType,'light');assert.equal(d.detected,true);assert.equal(d.on,false);
 const command=C.resolvedLightCommand(binding,d,true);assert.equal(command.type,'light');assert.equal(command.channel,0);
 assert.ok(T.build({server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE'},'light',command).url.includes('/set/light?'));
});
test('a Gen2 light and a Gen1 relay resolve the actual endpoint without changing saved preference',()=>{
 for(const [type,status,expected]of [['switch',{'light:0':{output:true}},'light'],['light',{relays:[{ison:false}]},'switch']]){
  const b={deviceId:'aabbcc112233',channel:0,type},d=C.lightStatus({online:1,status},b);assert.equal(d.resolvedType,expected);assert.equal(C.resolvedLightCommand(b,d,false).type,expected);assert.equal(b.type,type);
 }
});
test('wrong channels stay blocked and enumerate available outputs instead of redirecting commands',()=>{
 const b={deviceId:'aabbcc112233',type:'switch',channel:0},d=C.lightStatus({online:1,status:{'light:1':{output:true},'switch:2':{output:false}}},b);
 assert.equal(d.hasOutput,false);assert.equal(d.on,null);assert.deepEqual(d.availableOutputs,['switch:2','light:1']);assert.throws(()=>C.resolvedLightCommand(b,d,true));
 const correct=C.lightStatus({online:1,status:{'light:1':{output:false}}},{...b,channel:1});assert.equal(C.resolvedLightCommand({...b,channel:1},correct,true).channel,1);assert.throws(()=>C.resolvedLightCommand(b,correct,true));
});
test('when both output families exist at the selected channel, the configured type wins',()=>{
 const status={'light:0':{output:true},'switch:0':{output:false}};
 for(const type of ['switch','light']){const d=C.lightStatus({online:1,status},{type,channel:0});assert.equal(d.resolvedType,type);assert.equal(d.on,type==='light');assert.equal(d.detected,false)}
 const d=C.lightStatus({online:1,status:{'light:0':true,lights:[null]}},{type:'switch',channel:0});assert.equal(d.hasOutput,false);
});

test('supplied room lamp IDs restore the exact three roles without overwriting channel/type of the same device',()=>{
 const C=require('../shelly-core.js'),expected={master:{deviceId:'98cdac1df7e9',channel:0,type:'switch'},bedroom2:{deviceId:'98cdac1f18fa',channel:0,type:'switch'},living:{deviceId:'98cdac2d2eb6',channel:0,type:'switch'}};
 assert.deepEqual(C.suppliedLightBindings(),expected);assert.deepEqual(C.suppliedLightBindings({bedroom2:{deviceId:'abcdef',channel:1,type:'light'}}),expected);
 assert.deepEqual(C.suppliedLightBindings({master:{deviceId:'98CDAC1DF7E9',channel:2,type:'light'}}),{...expected,master:{...expected.master,channel:2,type:'light'}});
 const c=C.config({schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{kitchen:{deviceId:'abcdef',channel:0}},lightBindings:C.suppliedLightBindings()});assert.deepEqual(c.lightBindings,expected);assert.equal(c.bindings.kitchen.deviceId,'abcdef');
});
