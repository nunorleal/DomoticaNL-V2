const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../presence-history-core.js');
function row(person,date,fn){const minutes=(C.bounds(date).end-C.bounds(date).start)/60000,chars=[];for(let i=0;i<minutes;i++){const at=Math.floor(i/2);chars[at]=(chars[at]||0)|(fn(i)<<((i%2)*2))}return {person,date,timeline:chars.map(n=>n.toString(16)).join('')}}
test('joint time uses the intersection of all three residents and lists separate shared stays',()=>{
 const date='2026-11-19',rows=[row(0,date,i=>i<180||(i>=720&&i<810)?1:2),row(1,date,i=>i>=60&&i<240||(i>=735&&i<825)?1:2),row(2,date,i=>i>=120&&i<300||(i>=750&&i<795)?1:2)],before=JSON.stringify(rows),joint=C.together(rows,date),data=C.intervals(joint,date);
 assert.equal(joint.homeMs,105*60000);assert.deepEqual(data.segments.filter(s=>s.state==='home').map(s=>[(s.from-data.start)/60000,(s.to-data.start)/60000]),[[120,180],[750,795]]);assert.equal(JSON.stringify(rows),before);
});
test('equal individual daily totals do not imply any time together',()=>{
 const date='2026-11-19',rows=[0,1,2].map(id=>row(id,date,i=>i>=id*180&&i<(id+1)*180?1:2));assert.equal(C.together(rows,date).homeMs,0);assert.equal(C.together(rows,date).awayMs,C.DAY);
});
test('unknown or legacy timelines cannot confirm joint time; one confirmed absence excludes all-home',()=>{
 const date='2026-11-19',homes=[0,1].map(id=>row(id,date,()=>1)),third={person:2,date,homeMs:C.DAY};let result=C.together([...homes,third],date);assert.equal(result.homeMs,0);assert.equal(result.unknownMs,C.DAY);assert.equal(result.awayMs,0);
 result=C.together([row(0,date,()=>2)],date);assert.equal(result.awayMs,C.DAY);assert.equal(result.unknownMs,0);
 result=C.together([],date);assert.equal(result.unknownMs,C.DAY);
});
test('Lisbon daylight-saving days count real 23 or 25 hours and never mix dates',()=>{
 for(const [date,hours]of [['2026-03-29',23],['2026-10-25',25]]){const rows=[0,1,2].map(id=>row(id,date,()=>1));const joint=C.together(rows,date);assert.equal(joint.homeMs,hours*3600000);assert.equal(joint.awayMs,0);assert.equal(joint.unknownMs,0)}
 const date='2026-11-19';assert.equal(C.together([row(0,date,()=>1),row(1,date,()=>1),row(2,'2026-11-18',()=>1)],date).homeMs,0);
});
