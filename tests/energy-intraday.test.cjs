const {test}=require('node:test'),assert=require('node:assert/strict'),H=require('../energy-history-core.js'),D=require('../daily-energy-core.js');
const SLOT=1800000,id=at=>String(Date.parse(at)/SLOT);
test('half-hour slots distinguish observed zero, gaps and future; daily and unassigned totals remain separate',()=>{
 const entry={days:{'2026-11-19':{observed:true,kWh:6,slots:{[id('2026-11-19T09:00:00Z')]:2,[id('2026-11-19T09:30:00Z')]:0,[id('2026-11-19T10:30:00Z')]:1}}}};
 const before=JSON.stringify(entry),m=H.intraday(entry,'2026-11-19',Date.parse('2026-11-19T12:00:00Z'));
 assert.equal(m.buckets.length,48);assert.equal(m.observedSlots,3);assert.equal(m.distributedTotal,3);assert.equal(m.unassigned,3);assert.equal(m.peak.value,2);assert.equal(m.buckets.find(b=>b.label==='09:30').value,0);assert.equal(m.buckets.find(b=>b.label==='10:00').value,null);assert.equal(m.buckets.find(b=>b.label==='13:00').future,true);assert.equal(JSON.stringify(entry),before);
});
test('older daily-only data is never distributed uniformly or turned into hourly zeros',()=>{
 const m=H.intraday({days:{'2026-11-18':{observed:true,kWh:12}}},'2026-11-18',Date.parse('2026-11-19T12:00Z'));assert.equal(m.observedSlots,0);assert.equal(m.unassigned,12);assert.equal(m.peak,null);assert.ok(m.buckets.every(b=>b.value===null));
});
test('local Lisbon days cover 23/25 DST hours and repeated wall-clock times remain distinguishable',()=>{
 const spring=H.intraday(null,'2026-03-29',Date.parse('2026-11-19')),fall=H.intraday(null,'2026-10-25',Date.parse('2026-11-19'));
 assert.equal(spring.buckets.length,46);assert.equal(fall.buckets.length,50);assert.equal(new Set(fall.buckets.map(b=>b.id)).size,50);assert.equal(new Set(fall.buckets.map(b=>b.label)).size,50);assert.ok(fall.buckets.some(b=>b.label.includes('GMT+1')));
 const summer=H.intraday(null,'2026-08-01',Date.parse('2026-11-19'));assert.equal(summer.buckets[0].at,Date.parse('2026-07-31T23:00Z'));assert.equal(summer.buckets[0].label,'00:00');
});
test('current future slots are not plotted even if an input contains values for them',()=>{
 const m=H.intraday({days:{'2026-11-19':{observed:true,kWh:3,slots:{[id('2026-11-19T20:00Z')]:3}}}},'2026-11-19',Date.parse('2026-11-19T12:00Z'));assert.equal(m.observedSlots,0);assert.equal(m.peak,null);
});
test('fresh unchanged meter readings record real zero slots; long gaps do not fabricate hourly zeros',()=>{
 const key=D.identity('https://shelly-1-eu.shelly.cloud',{deviceId:'deadbeef',channel:0}),c=D.create(),at=Date.parse('2026-11-19T09:29:00Z');c.record(key,100,at);c.record(key,100,at+120000);
 const row=c.history(key,undefined,undefined,true).days['2026-11-19'];assert.equal(row.slots[String(Math.floor(at/SLOT))],0);assert.equal(row.slots[String(Math.floor((at+120000)/SLOT))],0);assert.equal(row.split,false);assert.equal(c.today(key,at+120000).kWh,0);D.validate(c.snapshot());
 const other=D.create();other.record(key,100,at);other.record(key,100,at+1800000);assert.equal(other.history(key,undefined,undefined,true).days['2026-11-19'].slots,undefined);
});
