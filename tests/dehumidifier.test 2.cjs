const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../shelly-core.js'),L=require('../dehumidifier-core.js'),G=require('../banner-core.js');
const base={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}};
test('dehumidifier association is optional, normalizes the confirmed ID, supports removal and leaves the heater independent',()=>{
 assert.deepEqual(C.config(base),base);
 const cfg=C.config({...base,heater:{deviceId:'ea9d29',channel:0},dehumidifier:{deviceId:'88D798',channel:0}});
 assert.deepEqual(cfg.dehumidifier,{deviceId:'88d798',channel:0});assert.deepEqual(cfg.heater,{deviceId:'ea9d29',channel:0});assert.deepEqual(new Set(C.deviceIds(cfg)),new Set(['ea9d29','88d798']));
 assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);assert.equal(C.config({...cfg,dehumidifier:null}).dehumidifier,null);
 assert.throws(()=>C.config({...base,dehumidifier:{deviceId:'86/P88',channel:0}}));
});
test('dehumidifier rejects invalid channels and conflicting actuator bindings including the heater',()=>{
 const dehumidifier={deviceId:'88d798',channel:0};
 for(const channel of [-1,16,.5])assert.throws(()=>C.config({...base,dehumidifier:{...dehumidifier,channel}}));
 for(const role of [{heater:dehumidifier},{fan:dehumidifier},{lightBindings:{master:{...dehumidifier,type:'switch'}}},{bindings:{master:dehumidifier}},{ev:{relay:dehumidifier}},{alarm:{arm:{...dehumidifier,activeWhenOn:true}}},{mediaBindings:{tv:dehumidifier}},{officeBindings:{monitor:dehumidifier}}])assert.throws(()=>C.config({...base,...role,dehumidifier}));
});
test('default position fits the main bedroom bathroom and portable positions reject malformed imports',()=>{
 assert.equal(L.DEFAULT.room,'bath1');assert.equal(G.rectFits(G.polygons('M119 175H333V348H119Z'),L.DEFAULT,60,60),true);
 assert.deepEqual(L.layout({room:'living',x:540,y:920}),{room:'living',x:540,y:920});
 for(const v of [{room:'cellar',x:500,y:900},{room:'bath1',x:NaN,y:266},{room:'bath1',x:165,y:0}])assert.throws(()=>L.layout(v));
});
