const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require.resolve('../shelly.js'),'utf8');
function harness(send){
 let clock=100000;const ids=Array.from({length:22},(_,i)=>(0xdead0000+i).toString(16));
 const config={bindings:{},lightBindings:{master:{deviceId:ids[0],channel:0},living:{deviceId:ids[1],channel:0}},fan:{deviceId:ids[2],channel:0},sensorBindings:{living:{deviceId:ids[3]}},server:'fixture'};
 const old={online:true,on:false,hasOutput:true,fetchedAt:99999};
 const ctx={CasaConsumptionCore:require('../consumption-core.js'),transport:{cancelStatus:()=>{},stats:()=>({})},config,generation:0,readEpoch:0,readTask:null,nextRefreshAt:0,urgentReads:0,activeReadPriority:false,deferredReads:new Set(),busy:false,refreshing:false,commandCount:0,key:'FAKE',Date:{now:()=>clock},checkedDevices:new Map(),activity:{},lastFetched:99999,lastError:false,alarmTarget:null,alarmMessage:'',evTarget:null,evMessage:'',windowReadings:{},mediaReadings:{},fanReading:{...old},heaterReading:null,dehumidifierReading:null,alarmReadings:{},evReadings:{},readings:new Map(),lightReadings:new Map([['master',{...old}],['living',{...old}]]),sensorReadings:new Map([['living',{temperature:20,fetchedAt:99999}]]),CORE:{deviceIds:()=>ids,lightStatus:d=>d?{online:true,on:d.on,hasOutput:true}:null,sensorStatus:()=>({temperature:22})},AL:{ROLES:[]},EV:{ROLES:[],relayStatus:d=>({online:true,on:d.on,hasOutput:true})},setTimeout:()=>0,clearTimeout:()=>{},window:{addEventListener:()=>{},CasaEnergyCore:{binding:()=>null}},document:{querySelector:()=>null,querySelectorAll:()=>ctx.openDialogs},dirty:()=>false,blockingRead:()=>ctx.busy&&!ctx.refreshing,feedback:()=>{},summary:()=>{},activityChanged:()=>{},render:()=>{},reapply:()=>{},lightReading:id=>ctx.lightReadings.get(id),sensorReading:id=>ctx.sensorReadings.get(id),reading:id=>ctx.readings.get(id),api:async(path,payload,guard)=>{calls.push([...payload.ids]);return send?send(payload,guard):{devices:payload.ids.map(id=>({id,on:true}))}}};
 for(const name of ['settleCovers','settleLights','settleEV','settleAlarm','settleFan','settleHeater','settleDehumidifier','settleMedia'])ctx[name]=()=>{};
 Object.assign(ctx,{openDialogs:[],detailView:'light',selected:'master',focusKey:'null',nextFocusRefreshAt:0,activeReadConfirmation:false,lightBinding:id=>config.lightBindings?.[id],sensorBinding:id=>config.sensorBindings?.[id],binding:id=>config.bindings?.[id],mediaBinding:id=>config.mediaBindings?.[id]});
 const calls=[];vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf(' // A popup owns'),source.indexOf(" $('open-shelly')")),ctx);
 return {ctx,calls,ids,tick:ms=>clock+=ms};
}
test('targeted confirmation updates only its physical ID, preserving other confirmed values and timestamps',async()=>{
 const h=harness(),other=h.ctx.lightReadings.get('living'),fan=h.ctx.fanReading,sensor=h.ctx.sensorReadings.get('living');
 await h.ctx.refresh({quiet:true,ids:[h.ids[0]],force:true});
 assert.deepEqual(h.calls,[[h.ids[0]]]);assert.equal(h.ctx.lightReadings.get('master').on,true);assert.equal(h.ctx.lightReadings.get('living'),other);assert.equal(h.ctx.fanReading,fan);assert.equal(h.ctx.sensorReadings.get('living'),sensor);
});
test('a command preempts the remaining fleet batches; a pre-command response cannot overwrite confirmed cache',async()=>{
 let release;const h=harness(payload=>new Promise(r=>release=()=>r({devices:payload.ids.map(id=>({id,on:true}))}))),old=h.ctx.lightReadings.get('master');
 const task=h.ctx.refresh({quiet:true});assert.equal(h.ctx.refreshing,true);assert.equal(h.ctx.blockingRead(),false);
 h.ctx.readEpoch++;release();await task;
 assert.equal(h.calls.length,1);assert.equal(h.ctx.lightReadings.get('master'),old);assert.equal(h.ctx.activity.error,false);assert.equal(h.ctx.busy,false);assert.equal(h.ctx.nextRefreshAt,102000);
});
test('simultaneous popup reads coalesce; failure of a partial query affects only the requested device',async()=>{
 let release;const h=harness(payload=>new Promise(r=>release=()=>r({devices:payload.ids.map(id=>({id,on:true}))})));
 const a=h.ctx.refresh({ids:[h.ids[0]],quiet:true}),b=h.ctx.refresh({ids:[h.ids[0]],quiet:true});h.tick(100);release();await Promise.all([a,b]);assert.equal(h.calls.length,1);
 const failing=harness(async()=>{throw Error('Fixture offline')}),other=failing.ctx.lightReadings.get('living');await failing.ctx.refresh({ids:[failing.ids[0]],force:true});assert.equal(failing.ctx.lightReadings.get('master').error,true);assert.equal(failing.ctx.lightReadings.get('living'),other);
});
test('changing configuration while a read is in flight discards the old response',async()=>{
 let release;const h=harness(payload=>new Promise(r=>release=()=>r({devices:payload.ids.map(id=>({id,on:true}))}))),old=h.ctx.lightReadings.get('master');const task=h.ctx.refresh({ids:[h.ids[0]]});h.ctx.generation++;h.ctx.key='';release();await task;assert.equal(h.ctx.lightReadings.get('master'),old);
});
test('a queued actuator command revalidates freshness at dispatch and is never retried',async()=>{
 const T=require('../shelly-transport.js'),AL=require('../alarm-core.js');let clock=100000,release,started;const begun=new Promise(r=>started=r),hold=new Promise(r=>release=r),calls=[];
 const transport=T.create({now:()=>clock,sleep:async ms=>clock+=ms,fetch:async(url)=>{calls.push(new URL(url).pathname);started();await hold;return {status:200,text:async()=> '[]'}}});
 const ctx={transport,generation:0,readEpoch:0,Date:{now:()=>clock},config:{server:'https://shelly-1-eu.shelly.cloud',bindings:{},lightBindings:{},fan:{deviceId:'deadbeef0001',channel:0}},key:'FAKE',CORE:{},MC:{IDS:[],OFFICE_IDS:[],KITCHEN_IDS:[]},AL:{fresh:r=>AL.fresh(r,clock)},fanReading:{online:true,on:false,hasOutput:true,fetchedAt:100000},heaterReading:null,dehumidifierReading:null,alarmReadings:{},evReadings:{},dirty:()=>false};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf(' function commandFresh('),source.indexOf(' function schedulePoll(')),ctx);
 const read=transport.request({server:ctx.config.server,authKey:ctx.key},'status',{ids:['deadbeef0001']});await begun;const command=ctx.api('light',{id:'deadbeef0001',channel:0,type:'switch',on:true});clock+=46000;release();await read;await assert.rejects(command,/cancelado/);assert.equal(calls.length,1);assert.equal(transport.stats().sent,1);
});
test('a later batch error preserves successful earlier readings and their actual query timestamp',async()=>{
 let batch=0;const h=harness(async payload=>{if(++batch===2)throw Error('Fixture limit');return {devices:payload.ids.map(id=>({id,on:true}))}});
 await h.ctx.refresh({quiet:true});assert.equal(h.calls.length,2);assert.equal(h.ctx.lightReadings.get('master').on,true);assert.equal(h.ctx.lightReadings.get('master').error,undefined);assert.equal(h.ctx.fanReading.error,undefined);assert.equal(h.ctx.activity.doneDevices,10);assert.equal(h.ctx.activity.error,true);
});
test('a priority confirmation cancels remaining background batches and runs before queued popup reads',async()=>{
 let release,calls=0;const h=harness(payload=>{calls++;if(calls===1)return new Promise(r=>release=()=>r({devices:payload.ids.map(id=>({id,on:false}))}));return Promise.resolve({devices:payload.ids.map(id=>({id,on:true}))})});
 const background=h.ctx.refresh({quiet:true}),popup=h.ctx.refresh({quiet:true,ids:[h.ids[1]]}),urgent=h.ctx.refresh({quiet:true,ids:[h.ids[2]],priority:true,force:true});release();await Promise.all([background,popup,urgent]);assert.equal(h.calls.length,2);assert.deepEqual(h.calls[1],[h.ids[2]]);assert.equal(h.ctx.fanReading.on,true);assert.equal(h.ctx.urgentReads,0);
});
test('opening a device during a Cloud pause queues only its read for automatic recovery, never an actuator',async()=>{
 const h=harness();h.ctx.blockingRead=()=>true;await h.ctx.refresh({quiet:true,ids:[h.ids[2]]});assert.equal(h.calls.length,0);assert.deepEqual([...h.ctx.deferredReads],[h.ids[2]]);
});
test('after the pause, automatic recovery queries the requested heater before the general fleet',()=>{
 const src=source.slice(source.indexOf(' function automaticRefresh()'),source.indexOf(" document.addEventListener('close'"));let clock=100000;const calls=[],ctx={popupIds:()=>null,document:{visibilityState:'visible'},Date:{now:()=>clock},key:'FAKE',config:{server:'fixture'},busy:false,commandCount:0,lightGroupBusy:false,groupBusy:false,dirty:()=>false,transport:{stats:()=>({retryAt:102500})},deferredReads:new Set(['deadbeefab01']),CORE:{deviceIds:()=>['deadbeefab01','deadbeefbb01']},refresh:args=>calls.push(args),nextRefreshAt:0};vm.createContext(ctx);vm.runInContext(src,ctx);ctx.automaticRefresh();assert.equal(calls.length,0);clock=102501;ctx.automaticRefresh();assert.equal(calls.length,1);assert.deepEqual(Array.from(calls[0].ids),['deadbeefab01']);assert.equal(calls[0].priority,true);assert.equal(calls[0].force,true);assert.equal(ctx.deferredReads.size,0);
});
test('another 429 on the focused device preserves its automatic recovery request',async()=>{
 const h=harness(async()=>{throw Error('Fixture rate limit')});h.ctx.transport.stats=()=>({lastFailure:'limit',retryAt:102500});await h.ctx.refresh({quiet:true,ids:[h.ids[2]],force:true});assert.deepEqual([...h.ctx.deferredReads],[h.ids[2]]);assert.equal(h.ctx.fanReading.error,true);
});

test('an open lamp popup limits fleet and queued reads to its own device; accepted command verification bypasses that scope',async()=>{
 const h=harness();h.ctx.openDialogs=[{id:'room-dialog'}];
 await h.ctx.refresh({quiet:true});assert.deepEqual(h.calls,[[h.ids[0]]]);
 await h.ctx.refresh({ids:[h.ids[1]],force:true,priority:true});assert.equal(h.calls.length,1);
 await h.ctx.refresh({ids:[h.ids[2]],force:true,priority:true,confirmation:true});assert.deepEqual(h.calls[1],[h.ids[2]]);
 h.ctx.openDialogs=[];await h.ctx.refresh({quiet:true});assert.equal(h.calls.length,5);
});
test('opening a popup interrupts the remaining fleet batches without erasing cached values',async()=>{
 let release,n=0;const h=harness(payload=>{if(n++===0)return new Promise(r=>release=()=>r({devices:payload.ids.map(id=>({id,on:false}))}));return Promise.resolve({devices:payload.ids.map(id=>({id,on:true}))})});
 const other=h.ctx.lightReadings.get('living'),background=h.ctx.refresh({quiet:true});h.ctx.openDialogs=[{id:'room-dialog'}];h.ctx.focusPopup();release();await background;for(let i=0;i<10;i++)await Promise.resolve();if(h.ctx.readTask)await h.ctx.readTask;
 assert.deepEqual(h.calls.map(x=>x.length),[10,1]);assert.equal(h.ctx.lightReadings.get('living'),other);assert.deepEqual(h.calls[1],[h.ids[0]]);
});
test('routine polling and deferred recovery stay within popup until it closes',()=>{
 const src=source.slice(source.indexOf(' function automaticRefresh()'),source.indexOf(" document.addEventListener('close'"));let time=100000,scope=['deadbeefab01'];const calls=[],ctx={popupIds:()=>scope,document:{visibilityState:'visible'},Date:{now:()=>time},key:'FAKE',config:{server:'fixture'},busy:false,commandCount:0,lightGroupBusy:false,groupBusy:false,dirty:()=>false,transport:{stats:()=>({})},deferredReads:new Set(['deadbeefbb01']),CORE:{deviceIds:()=>['deadbeefab01','deadbeefbb01']},refresh:args=>calls.push(args),nextRefreshAt:0,nextFocusRefreshAt:0};vm.createContext(ctx);vm.runInContext(src,ctx);
 ctx.automaticRefresh();assert.deepEqual(Array.from(calls[0].ids),scope);ctx.automaticRefresh();assert.equal(calls.length,1);assert.equal(ctx.deferredReads.size,1);time+=15000;ctx.automaticRefresh();assert.equal(calls.length,2);scope=null;ctx.automaticRefresh();assert.deepEqual(Array.from(calls[2].ids),['deadbeefbb01']);assert.equal(ctx.deferredReads.size,0);
});

test('the multimedia lamp shares the living-room light ID and priority scope, never a new media association',async()=>{
 const h=harness();h.ctx.openDialogs=[{id:'media-dialog',querySelector:()=>({dataset:{mediaDevice:'living-lamp'}})}];
 assert.deepEqual(Array.from(h.ctx.popupIds()),[h.ids[1]]);
 await h.ctx.refresh({quiet:true});assert.deepEqual(h.calls,[[h.ids[1]]]);assert.equal(h.ctx.config.mediaBindings,undefined);
});
