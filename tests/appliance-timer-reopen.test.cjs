const {test}=require('node:test'),assert=require('node:assert/strict'),Store=require('../appliance-timer-store.js');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}};
test('reopen restores only explicit unexpired timer for the same association, without secrets',()=>{
 let clock=100000,generation=0,binding={deviceId:'deadbeef0011',channel:0},server='https://example.test';const disk=storage(),open=()=>Store.create({storage:disk,key:'test',now:()=>clock,context:()=>({binding,server,generation})});
 let m=open();assert.equal(m.get('heater'),undefined);m.set('heater',{generation,until:700000,acceptedAt:clock,awaiting:true});clock+=60000;generation++;m=open();assert.equal(m.get('heater').until,700000);assert.equal(m.get('heater').generation,generation);assert.equal(m.get('heater').awaiting,false);assert.equal(JSON.stringify(disk.getItem('test')).includes('authKey'),false);
 binding={...binding,channel:1};assert.equal(open().get('heater'),undefined);binding.channel=0;server='https://other.test';assert.equal(open().get('heater'),undefined);server='https://example.test';assert.equal(open().get('heater').until,700000);m.delete('heater');assert.equal(open().get('heater'),undefined);
 m.set('heater',{generation,until:700000,acceptedAt:clock,awaiting:false});clock=700001;assert.equal(open().get('heater'),undefined);
});
test('blocked or malformed local storage never prevents normal memory timers',()=>{
 const ctx=()=>({binding:{deviceId:'deadbeef0011',channel:0},server:'https://example.test',generation:0});
 const m=Store.create({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},key:'test',now:()=>100000,context:ctx});m.set('heater',{until:700000,acceptedAt:100000,awaiting:true});assert.equal(m.get('heater').until,700000);m.delete('heater');assert.equal(m.get('heater'),undefined);
 for(const value of ['null','[]','broken','{"heater":{"until":9999999999,"acceptedAt":1}}'])assert.equal(Store.create({storage:{getItem:()=>value},key:'test',now:()=>100000,context:ctx}).get('heater'),undefined);
});

test('T2 snapshots recover countdown only with fresh native proof after reopening',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),A=require('../alarm-core.js'),source=fs.readFileSync(require.resolve('../shelly.js'),'utf8');
 for(const role of ['heater','dehumidifier']){let clock=100000;const disk=storage(),ctx=()=>({binding:{deviceId:'deadbeef0011',channel:0},server:'https://example.test',generation:0}),open=()=>Store.create({storage:disk,key:'test',now:()=>clock,context:ctx});open().set(role,{generation:0,until:700000,acceptedAt:clock,awaiting:true});clock+=60000;
 const reading={online:true,hasOutput:true,on:true,timerActive:true,timerSeconds:540,fetchedAt:clock},line=source.split('\n').find(l=>l.includes('function '+role+'Snapshot()')),context={generation:0,applianceTimers:open(),Date:{now:()=>clock},AL:{fresh:r=>A.fresh(r,clock)},blockingRead:()=>false,commandCount:0,groupBusy:false,lightGroupBusy:false,config:{[role]:{}},[role+'Reading']:null,[role+'Target']:null,[role+'Message']:'',lastRelay:()=>null,dirty:()=>false,key:'FAKE'};
 const snapshot=vm.runInNewContext('('+line.trim()+')',context);assert.equal(snapshot().timerActive,false);context[role+'Reading']=reading;assert.equal(snapshot().timerRemainingSeconds,540);clock+=1000;assert.equal(snapshot().timerRemainingSeconds,539);reading.online=false;assert.equal(snapshot().timerActive,false);reading.online=true;delete reading.timerActive;delete reading.timerSeconds;assert.equal(snapshot().timerActive,false);assert.equal(snapshot().timerEstimated,true);assert.equal(snapshot().timerRemainingSeconds,539);reading.timerActive=false;assert.equal(snapshot().timerEstimated,false);assert.equal(snapshot().timerRemainingSeconds,null);
 }
});
