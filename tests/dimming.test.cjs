const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../shelly-core.js'),T=require('../shelly-transport.js');
const b={deviceId:'deadbeef0011',channel:1,type:'switch'};
function reading(brightness=50,gen=2){return {...C.lightStatus({online:1,status:gen===2?{'light:1':{output:true,brightness}}:{lights:[null,{ison:true,brightness}]}},b),fetchedAt:Date.now()}}
test('dimming detects actual brightness on the exact light channel for both generations, never on relays',()=>{
 for(const gen of [1,2]){const r=reading(45,gen);assert.equal(C.canDim(r),true);assert.deepEqual(C.dimmerCommand(b,r,73),{id:b.deviceId,channel:1,type:'light',on:true,brightness:73});}
 for(const r of [reading(null),reading(-1),reading(101),{...reading(),resolvedType:'switch'},{...reading(),error:true},{...reading(),online:false},{...reading(),fetchedAt:Date.now()-121000},{...reading(),fetchedAt:Date.now()+10000}])assert.equal(C.canDim(r),false);
 assert.throws(()=>C.dimmerCommand({...b,channel:0},reading(),20));
});
test('Cloud dimming validates integer percentage and never sends brightness to switch endpoints',()=>{
 for(const value of [0,1,100]){const p=C.dimmerCommand(b,reading(),value),r=T.build({server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE'},'light',p);assert.equal(r.body.brightness,value);assert.equal(r.body.on,value>0);assert.ok(r.url.includes('/set/light?'));}
 for(const value of [-1,101,2.5,'20',NaN,null])assert.throws(()=>C.dimmerCommand(b,reading(),value));
 assert.throws(()=>T.build({server:'https://shelly-1-eu.shelly.cloud',authKey:'FAKE'},'light',{id:b.deviceId,channel:1,type:'switch',on:true,brightness:50}));
});
test('brightness is confirmed only by a new matching percentage, never by an unchanged ON bit or HTTP acceptance',()=>{
 const source=fs.readFileSync(require.resolve('../shelly.js'),'utf8'),ctx={lightTargets:new Map([['living',true]]),brightnessTargets:new Map([['living',75]]),lightMessages:new Map(),confirmationCurrent:()=>true,lightReading:()=>({on:true,brightness:40})};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf(' function settleLights()'),source.indexOf(' function lightGroupFeedback(')),ctx);ctx.settleLights();assert.equal(ctx.lightTargets.size,1);ctx.lightReading=()=>({on:true,brightness:75});ctx.confirmationCurrent=()=>false;ctx.settleLights();assert.equal(ctx.lightTargets.size,1);ctx.confirmationCurrent=()=>true;ctx.settleLights();assert.equal(ctx.lightTargets.size,0);assert.equal(ctx.brightnessTargets.size,0);
});

test('an expired dimming confirmation clears the target without retrying a command or changing observed brightness',()=>{
 const source=fs.readFileSync(require.resolve('../shelly.js'),'utf8'),ctx={confirmations:{expired:()=>[{key:'light:living'}],sync:()=>{}},pendingEntries:()=>[],lightTargets:new Map([['living',true]]),brightnessTargets:new Map([['living',80]]),lightMessages:new Map(),reading:{brightness:30}};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf(' function expireConfirmations()'),source.indexOf('\n\n const MC=')),ctx);ctx.expireConfirmations();assert.equal(ctx.lightTargets.size,0);assert.equal(ctx.brightnessTargets.size,0);assert.equal(ctx.reading.brightness,30);assert.match(ctx.lightMessages.get('living'),/sem confirmação/);
});
