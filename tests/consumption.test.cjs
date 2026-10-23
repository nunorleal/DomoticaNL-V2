const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../consumption-core.js');
const binding={deviceId:'aabbcc',channel:0},key=C.identity('https://shelly-1-eu.shelly.cloud',binding),at=new Date(2026,9,22,12).getTime(),reading=(t,total)=>({online:true,hasMeter:true,energyKWh:total,fetchedAt:t,errors:[]});
test('common metering respects Gen1 units, Gen2 outputs, cover/light fields and missing capabilities',()=>{
 assert.equal(C.normalize({online:1,status:{meters:[{power:12,total:60000}]}},binding).energyKWh,1);
 assert.equal(C.normalize({online:1,status:{'switch:0':{apower:1250,aenergy:{total:2500}}}},binding).energyKWh,2.5);
 for(const kind of ['cover','light']){const d=C.normalize({online:1,status:{[kind+':0']:{apower:15,aenergy:{total:1000}}}},{...binding,kind});assert.equal(d.power,15);assert.equal(d.energyKWh,1)}
 assert.equal(C.normalize(null,binding).energyKWh,null);assert.equal(C.normalize({online:1,status:{relays:[{ison:true}]}},binding).hasMeter,false);
 const ambiguous=C.normalize({online:1,status:{meters:[{total:60000}],emeters:[{total:1000}]}},binding);assert.equal(ambiguous.hasMeter,false);
 const error=C.normalize({online:1,status:{'cover:0':{apower:9,aenergy:{total:1000},errors:['overpower']}}},{...binding,kind:'cover'});assert.equal(error.power,null);assert.equal(error.energyKWh,null);
});
test('history registers actual cumulative deltas only, never initial totals, power estimates, duplicates or errors',()=>{
 const h=C.create();assert.equal(h.series(key,'day',at).total,null);h.record(key,reading(at,123));assert.equal(h.series(key,'day',at).total,null);
 h.record(key,reading(at+30000,123.01));assert.ok(Math.abs(h.series(key,'day',at).total-.01)<1e-9);
 assert.equal(h.record(key,reading(at+30000,124)),false);assert.equal(h.record(key,{...reading(at+60000,125),error:true}),false);assert.equal(h.record(key,{...reading(at+60000,125),online:false}),false);
 h.record(key,reading(at+60000,123.01));assert.equal(h.series(key,'day',at).rows.filter(r=>r.value!==null).length,1);assert.equal(h.series(key,'day',at).rows.find(r=>r.value!==null).seconds,60);
});
test('long gaps and counter resets establish new baselines without inventing usage; later readings resume',()=>{
 const h=C.create();h.record(key,reading(at,100));h.record(key,reading(at+C.MAX_GAP+1,500));assert.equal(h.series(key,'day',at).total,null);h.record(key,reading(at+C.MAX_GAP+30001,1));assert.equal(h.series(key,'day',at).total,null);h.record(key,reading(at+C.MAX_GAP+60001,1.02));assert.ok(Math.abs(h.series(key,'day',at).total-.02)<1e-9);
});
test('zero measured delta differs from missing buckets; week/month/year aggregate without filling gaps',()=>{
 const h=C.create();h.record(key,reading(at,10));h.record(key,reading(at+30000,10));for(const period of ['day','week','month','year']){const s=h.series(key,period,at);assert.equal(s.total,0);assert.equal(s.rows.filter(r=>r.value===0).length,1);assert.ok(s.rows.some(r=>r.value===null))}
 assert.equal(h.series(key,'month',new Date(2024,1,15).getTime()).rows.length,29);assert.equal(h.series(key,'year',at).rows.length,12);assert.equal(h.series(key,'week',at).rows.length,7);
});
test('device/channel/component/server identities stay separate, history is bounded and persists safely',()=>{
 const h=C.create();for(const b of [binding,{...binding,channel:1},{...binding,component:'emeter'}])h.record(C.identity('https://shelly-1-eu.shelly.cloud',b),reading(at,1));h.record(C.identity('https://shelly-2-eu.shelly.cloud',binding),reading(at,2));assert.equal(Object.keys(h.export().entries).length,4);
 for(let i=1;i<=420;i++){const t=at+i*86400000;h.record(key,reading(t,i));h.record(key,reading(t+30000,i+.001))}const data=h.export();assert.ok(data.entries[key].days.length<=400);assert.ok(data.entries[key].hours.length<=50);assert.doesNotThrow(()=>C.validate(data));assert.deepEqual(C.create(data).export(),data);
 data.entries[key].hours.push([0,-1,0]);assert.throws(()=>C.validate(data));assert.deepEqual(C.create(data).export(),{schemaVersion:1,entries:{}});
});

test('only the latest 64 devices are retained, without summing or mixing channels',()=>{const h=C.create();for(let i=0;i<70;i++)h.record(C.identity('https://shelly-1-eu.shelly.cloud',{deviceId:(0xaabb00+i).toString(16),channel:0}),reading(at+i,1));assert.equal(Object.keys(h.export().entries).length,64);assert.doesNotThrow(()=>C.validate(h.export()))});
