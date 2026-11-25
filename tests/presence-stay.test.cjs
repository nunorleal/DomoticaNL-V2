const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../presence-history-core.js');
const sample=(first='home',identity='1234abcd')=>[{state:first,identity},{state:'away',identity},{state:'unknown',identity}];
test('current stay counts seconds, survives polls and saved snapshots, and does not reset at midnight',()=>{
 let now=Date.parse('2026-11-19T23:59:00Z');let h=C.create(undefined,()=>now);const start=now;h.observe(sample(),now);now+=60000;h.observe(sample(),now);assert.equal(h.current(0).homeSince,start);assert.equal(h.current(0).elapsed,60000);assert.equal(h.rows().filter(r=>r.person===0).length,2);
 h=C.create(h.snapshot(),()=>now);now+=1500;assert.equal(h.current(0).elapsed,61500);assert.equal(h.current(1).elapsed,null);assert.equal(h.current(2).state,'unknown');
 const receiver=C.create(undefined,()=>now);receiver.merge(h.rows());assert.equal(receiver.current(0).homeSince,start);
});
test('departure ends the stay immediately and return starts a new counter without erasing history',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(sample(),now);now+=60000;h.observe(sample(),now);const total=h.rows()[0].homeMs;now+=60000;h.observe(sample('away'),now);assert.equal(h.current(0).elapsed,null);assert.equal(h.current(0).state,'away');now+=60000;h.observe(sample(),now);assert.equal(h.current(0).homeSince,now);assert.equal(h.current(0).elapsed,0);assert.equal(h.rows()[0].homeMs,total);
});
test('long unobserved gaps and a changed phone cannot silently extend a current stay',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(sample(),now);now+=C.MAX_GAP+1;assert.equal(h.current(0).state,'unknown');assert.equal(h.current(0).elapsed,null);h.observe(sample(),now);assert.equal(h.current(0).homeSince,now);now+=60000;h.observe(sample('home','87654321'),now);assert.equal(h.current(0).homeSince,now);
});
test('old backups remain valid, while future starts and starts on absent people are rejected',()=>{
 const now=Date.now(),h=C.create(undefined,()=>now);h.observe(sample(),now);const value=JSON.parse(JSON.stringify(h.snapshot()));for(const row of value.rows)delete row.observation.homeSince;const restored=C.create(value,()=>now);assert.equal(restored.current(0).homeSince,now);
 for(const [index,start]of [[0,now+1],[0,-1],[0,1.5],[1,now]]){const bad=h.snapshot();bad.rows=JSON.parse(JSON.stringify(bad.rows));bad.rows[index].observation.homeSince=start;assert.throws(()=>C.validate(bad),/permanência/)}
});
