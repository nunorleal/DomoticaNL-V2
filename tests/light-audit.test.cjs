const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../light-audit-core.js');
test('journal stores only bounded, safe light metadata and never secrets or destinations',()=>{
 const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},a=A.create({storage,now:()=>100});
 for(let i=0;i<100;i++)a.add({room:'master',kind:'request',on:true,origin:'meteo',deviceId:'SECRET-ID',authKey:'SECRET-KEY',url:'SECRET-HOST'});
 assert.equal(a.entries().length,80);assert.equal(JSON.stringify(a.entries()).includes('SECRET'),false);assert.equal(store.get(A.KEY).includes('SECRET'),false);
 const copy=a.entries();copy[0].on=false;assert.equal(a.entries()[0].on,true);
 a.add({room:'unknown',kind:'request',on:true});assert.equal(a.entries().length,80);
 const b=A.create({storage,now:()=>200});assert.equal(b.entries().length,80);
});
test('cached observations distinguish initial, changed and unchanged readings without inventing app commands',()=>{
 const a=A.create({now:()=>100});a.observe('master',{on:false,source:'HTTP'});a.observe('master',{on:false,source:'http'});assert.equal(a.entries().length,1);assert.equal(a.entries()[0].kind,'initial');
 a.observe('master',{on:true,source:'timer'});assert.equal(a.entries().at(-1).kind,'observed');assert.equal(a.entries().at(-1).source,'timer');assert.equal(a.entries().some(e=>e.kind==='request'),false);
 a.observe('master',{on:null,source:'SECRET'});assert.equal(a.entries().length,2);assert.equal(A.nativeSource('SECRET'),null);a.reset();a.observe('master',{on:false});assert.equal(a.entries().at(-1).kind,'initial');
});
test('exact light channel preserves only a known native source from the existing status',()=>{
 const C=require('../shelly-core.js'),b={deviceId:'deadbeef0011',channel:0,type:'light'};
 assert.equal(C.lightStatus({online:1,status:{'light:0':{output:false,source:'TIMER'}}},b).source,'timer');
 assert.equal(C.lightStatus({online:1,status:{'light:0':{output:false,source:'SECRET'},'light:1':{source:'http'}}},b).source,undefined);
});
test('status requests never create light command records; command records preserve guarded result and origin',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync(require.resolve('../shelly.js'),'utf8'),start=source.indexOf(' function api('),end=source.indexOf('\n function schedulePoll',start),journal=A.create({now:()=>100}),binding={deviceId:'deadbeef0011',channel:0};let sends=0;
 const context={generation:1,readEpoch:0,config:{server:'FAKE-SERVER',lightBindings:{master:binding}},key:'FAKE-KEY',lightBinding:()=>binding,dirty:()=>false,commandFresh:()=>true,window:{CasaLightAudit:journal},transport:{cancelStatus(){},async request(c,path,payload,current){if(!current())throw Error('cancelled');sends++;return path==='status'?{devices:[]}:{accepted:true};}}};
 const api=vm.runInNewContext('('+source.slice(start,end).trim()+')',context);
 await api('status',{ids:[binding.deviceId]});assert.equal(journal.entries().length,0);
 await api('light',{id:binding.deviceId,channel:0,type:'light',on:true},()=>true,'meteo');assert.deepEqual(journal.entries().map(e=>e.kind),['request','accepted']);assert.equal(journal.entries()[0].origin,'meteo');assert.equal(sends,2);
 await assert.rejects(api('light',{id:binding.deviceId,channel:0,type:'light',on:false},()=>false,'individual'));assert.equal(journal.entries().at(-1).kind,'failed');assert.equal(sends,2);
});
