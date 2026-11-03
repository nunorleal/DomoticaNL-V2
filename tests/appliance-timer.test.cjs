const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../shelly-transport.js');
const credentials={server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE-KEY'},base={id:'deadbeef0011',channel:2,type:'switch',on:true};
test('native timer shares the ON command and preserves normal ON/OFF and channel',()=>{
 for(const seconds of [60,300,600,900,1200,3600,86400]){const r=T.build(credentials,'light',{...base,toggle_after:seconds});assert.equal(new URL(r.url).pathname,'/v2/devices/api/set/switch');assert.deepEqual(r.body,{id:base.id,channel:2,on:true,toggle_after:seconds})}
 for(const on of [true,false])assert.deepEqual(T.build(credentials,'light',{...base,on}).body,{id:base.id,channel:2,on});
 for(const toggle_after of [null,0,-1,1,59,61,600.5,'600',NaN,Infinity,86460])assert.throws(()=>T.build(credentials,'light',{...base,toggle_after}));
 for(const change of [{on:false},{type:'light'}])assert.throws(()=>T.build(credentials,'light',{...base,...change,toggle_after:600}));
});
test('fake native timer switches off after the browser transport is discarded, with no second command',async()=>{
 let clock=100000,on=false,deadline=0,calls=0;
 let t=T.create({locks:null,now:()=>clock,sleep:async ms=>clock+=ms,fetch:async(url,opts)=>{calls++;const b=JSON.parse(opts.body);on=b.on;deadline=clock+b.toggle_after*1000;return {status:200,text:async()=>''}}});
 await t.request(credentials,'light',{...base,toggle_after:600});assert.equal(on,true);t=null;clock+=599999;if(clock>=deadline)on=false;assert.equal(on,true);clock++;if(clock>=deadline)on=false;assert.equal(on,false);assert.equal(calls,1);
});
test('timed command obeys queued state guard and is never retried on failure',async()=>{
 let calls=0,clock=100000;const t=T.create({locks:null,now:()=>clock,sleep:async ms=>clock+=ms,fetch:async()=>{calls++;return {status:400,text:async()=>JSON.stringify({error:'DEVICE_OFFLINE'})}}});
 await assert.rejects(t.request(credentials,'light',{...base,toggle_after:600},()=>false));assert.equal(calls,0);
 await assert.rejects(t.request(credentials,'light',{...base,toggle_after:900}),/offline/);assert.equal(calls,1);
});
