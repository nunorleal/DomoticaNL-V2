const {test}=require('node:test'),assert=require('node:assert/strict');const E=require('../energy-core.js'),M=require('../media-core.js'),EV=require('../ev-core.js');
test('main meter retains exact previous readings during errors, offline or age expiry without a live gauge',()=>{
 const c={ev:{meter:{deviceId:'aabbcc',channel:1}}},r={online:true,hasMeter:true,valid:true,powerKW:1.234,apparentKVA:1.25,energyKWh:123.45,voltage:230,fetchedAt:100000};
 for(const reading of [{...r,error:true},{...r,online:false},r]){const d=E.state(c,reading,150000);assert.equal(d.powerKW,null);assert.equal(d.percent,null);assert.equal(d.level,'unknown');assert.equal(d.lastReading.powerKW,1.234);assert.equal(d.lastReading.energyKWh,123.45);assert.equal(d.lastReading.fetchedAt,100000)}
 assert.equal(E.state(c,null,150000).lastReading,null);assert.equal(E.state(c,{...r,powerKW:0},150000).lastReading.powerKW,0);assert.equal(E.state(c,{...r,valid:false},150000).lastReading,null);
});
test('media and kitchen keep last W/kWh/relay display data but never use them for commands or working indicators',()=>{
 const b={deviceId:'aabbcc',channel:0},r={online:true,hasOutput:true,on:true,errors:[],fetchedAt:100000,meter:{online:true,hasMeter:true,power:42.5,energyKWh:12.34,errors:[]}};
 for(const reading of [{...r,error:true},{...r,online:false},r]){const d=M.state(b,reading,150000,10);assert.equal(d.on,null);assert.equal(d.powerWatts,null);assert.equal(d.activity,null);assert.equal(d.canControl,false);assert.equal(d.stale,true);assert.deepEqual(d.lastReading,{on:true,powerWatts:42.5,energyKWh:12.34,fetchedAt:100000})}
 assert.equal(M.state(b,null,150000).lastReading,null);assert.equal(M.state(b,{...r,meter:{...r.meter,power:0,energyKWh:0},error:true},100001).lastReading.powerWatts,0);
});
test('EV preserves cached power separately and never leaves the charging cable animated on stale data',()=>{
 const ev={meter:{deviceId:'aabbcc',channel:1},relay:{deviceId:'aabbcc',channel:0}},readings={meter:{online:true,hasMeter:true,power:3600,energyKWh:15,fetchedAt:100000,error:true},relay:{online:true,hasOutput:true,on:true,fetchedAt:100000,error:true}};const d=EV.state(ev,readings,100001);assert.equal(d.powerKW,null);assert.equal(d.charging,null);assert.equal(d.feed,null);assert.equal(d.canControl,false);assert.equal(d.lastReading.powerKW,3.6);assert.equal(d.lastReading.fetchedAt,100000);assert.equal(EV.state(ev,{},100001).lastReading,null);
});
test('blind percentage stays visible as history even when offline; no percentage is invented before a first read',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('../app.js'),'utf8'),part=source.slice(source.indexOf('function positionLabel('),source.indexOf('function blindText('));let reading={online:false,error:true,position:73,fetchedAt:100000};const ctx={isCloudRoom:()=>true,window:{CasaShelly:{reading:()=>reading}}};vm.createContext(ctx);vm.runInContext(part,ctx);assert.equal(ctx.positionLabel({id:'master',blind:0}),73);reading=null;assert.equal(ctx.positionLabel({id:'master',blind:0}),'—');
});
