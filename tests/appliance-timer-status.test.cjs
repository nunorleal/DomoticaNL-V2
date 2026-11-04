const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../ev-core.js');
const read=(status,online=1)=>C.relayStatus({online,status},{channel:0});
test('native timer status uses only reported fields in the exact relay channel',()=>{
 for(const c of [{ison:true,has_timer:true,timer_remaining:300},{output:true,timer_started_at:1000,timer_duration:600}]){const s=c.ison!==undefined?{relays:[c]}:{'switch:0':c,sys:{unixtime:1100}};const r=read(s);assert.equal(r.timerActive,true);assert.equal(r.timerSeconds,c.ison?300:500)}
 assert.equal(read({relays:[{ison:true}]}).timerActive,undefined);
 for(const c of [{ison:true,has_timer:false,timer_remaining:300},{ison:true,has_timer:true,timer_remaining:0},{ison:true,has_timer:true,timer_remaining:'300'},{output:true,timer_started_at:1000,timer_duration:60}])assert.equal(read({relays:[c],sys:{unixtime:1100}}).timerActive,false);
 assert.equal(read({'switch:1':{output:true,timer_remaining:300}}).timerActive,undefined);
});

test('each appliance snapshot expires the timer without treating old/offline state as active',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),A=require('../alarm-core.js'),source=fs.readFileSync(require.resolve('../shelly.js'),'utf8');
 for(const role of ['heater','dehumidifier']){let clock=100000;const reading={online:true,hasOutput:true,on:true,timerActive:true,timerSeconds:30,fetchedAt:clock};const line=source.split('\n').find(l=>l.includes('function '+role+'Snapshot()'));
 const selected=new Map();const context={generation:0,applianceTimers:selected,Date:{now:()=>clock},AL:{fresh:r=>A.fresh(r,clock)},blockingRead:()=>false,commandCount:0,groupBusy:false,lightGroupBusy:false,config:{[role]:{}},[role+'Reading']:reading,[role+'Target']:null,[role+'Message']:'',lastRelay:()=>null,dirty:()=>false,key:'FAKE'};
 const snapshot=vm.runInNewContext('('+line.trim()+')',context);assert.equal(snapshot().timerActive,false);selected.set(role,{generation:0,until:clock+600000});assert.equal(snapshot().timerActive,true);assert.equal(snapshot().timerRemainingSeconds,30);clock+=1000;assert.equal(snapshot().timerRemainingSeconds,29);clock+=31000;assert.equal(snapshot().on,true);assert.equal(snapshot().timerActive,false);assert.equal(snapshot().timerRemainingSeconds,null);clock=100000;reading.online=false;assert.equal(snapshot().timerActive,false);reading.online=true;reading.on=false;assert.equal(snapshot().timerActive,false);reading.on=true;clock+=46000;assert.equal(snapshot().timerActive,false);
 }
});

test('already ON does not settle a timed request before a native timer is reported',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),source=fs.readFileSync(require.resolve('../shelly.js'),'utf8');
 for(const role of ['heater','dehumidifier']){const cap=role[0].toUpperCase()+role.slice(1),line=source.split('\n').find(l=>l.includes('function settle'+cap+'()')),reading={on:true,timerActive:false,timerSeconds:0,fetchedAt:100000},selection=new Map([[role,{generation:0,until:700000,acceptedAt:100000,awaiting:true}]]),context={generation:0,Date:{now:()=>100000},applianceTimers:selection,[role+'Target']:true,[role+'Reading']:reading,[role+'Message']:'',confirmationCurrent:()=>true,AL:{fresh:()=>true}};
 const settle=vm.runInNewContext('('+line.trim()+')',context);settle();assert.equal(context[role+'Target'],true);reading.timerActive=true;reading.timerSeconds=590;settle();assert.equal(context[role+'Target'],null);
 }
});
