const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../presence-history-core.js');
const sample=state=>[state,'away','unknown'].map(state=>({state,identity:'1234abcd'}));
function fixture(date='2026-11-18'){
 const {start,end}=C.bounds(date);let now=start;const h=C.create(undefined,()=>now);
 for(let at=start;at<end;at+=60000){now=at;const minute=(at-start)/60000,state=minute<=495||(minute>=750&&minute<=795)||minute>=1120?'home':'away';h.observe(sample(state),now)}
 return {h,row:h.rows().find(r=>r.person===0),now};
}
test('day timeline shows morning, lunch and evening with transitions unconfirmed; totals stay exact',()=>{
 const {h,row}=fixture(),data=C.intervals(row,row.date),home=data.segments.filter(s=>s.state==='home');
 assert.deepEqual(home.map(s=>[(s.from-data.start)/60000,(s.to-data.start)/60000]),[[0,495],[750,795],[1120,1439]]);
 assert.equal(row.homeMs,(495+45+319)*60000);assert.ok(data.segments.some(s=>s.state==='away'));assert.ok(data.segments.some(s=>s.state==='unknown'));
 const restored=C.validate(JSON.parse(JSON.stringify(h.snapshot())));assert.equal(restored.rows.find(r=>r.person===0).timeline,row.timeline);
});
test('a gap, phone change and old aggregate never invent timeline presence',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(sample('home'),now);now+=60000;h.observe(sample('home'),now);now+=600000;h.observe(sample('home'),now);
 const row=h.rows()[0],home=C.intervals(row,row.date).segments.filter(s=>s.state==='home');assert.equal(home.length,1);assert.equal(home[0].to-home[0].from,60000);
 const old={...row};delete old.timeline;assert.equal(C.intervals(C.validateRow(old),old.date).segments.length,1);assert.equal(C.intervals(old,old.date).segments[0].state,'unknown');
 now+=60000;const changed=sample('home');changed[0].identity='87654321';h.observe(changed,now);assert.equal(h.rows()[0].homeMs,60000);
});
test('Lisbon DST and midnight preserve elapsed minutes, with payload below the existing Supabase limit',()=>{
 for(const [date,minutes]of [['2026-03-29',1380],['2026-10-25',1500],['2026-11-18',1440]]){
  const {start,end}=C.bounds(date);assert.equal((end-start)/60000,minutes);const {h,row}=fixture(date);assert.equal(row.timeline.length,minutes/2);
  // PostgreSQL jsonb adds a space after every separator, bounded conservatively here.
  for(const r of h.rows())assert.ok(Buffer.byteLength(JSON.stringify(r))+Object.keys(r).length*4+50<2048);
  C.validate(h.snapshot());const receiver=C.create(undefined,()=>end);receiver.merge(h.rows());assert.equal(receiver.rows()[0].timeline,row.timeline);
 }
 let now=Date.parse('2026-08-01T22:59:00Z');const h=C.create(undefined,()=>now);h.observe(sample('home'),now);now+=120000;h.observe(sample('home'),now);
 for(const row of h.rows().filter(r=>r.person===0)){const home=C.intervals(row,row.date).segments.filter(s=>s.state==='home');assert.equal(home.reduce((n,s)=>n+s.to-s.from,0),60000)}
});
test('invalid or oversized timelines and reserved encodings are rejected before import',()=>{
 const {row}=fixture();for(const timeline of [null,[],123,'0','0'.repeat(721),'f'.repeat(720),'3'.repeat(720)])assert.throws(()=>C.validateRow({...row,timeline}),/horário/);
});
test('backup restore preserves timeline detail with the observed daily totals',()=>{
 const B=require('../backup-core.js'),{h}=fixture(),value=h.snapshot(),s=new Map(),store={get length(){return s.size},key:i=>[...s.keys()][i],getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,v),removeItem:k=>s.delete(k)};
 if(B.FORMAT){B.write(store,B.create({presenceHistory:value},{}),{});assert.deepEqual(JSON.parse(s.get(B.KEYS.presenceHistory)),value)}
 else{const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];const b={application:'Casa NL',schemaVersion:1,data:{'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:50}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{city:null,mode:'auto'},'casa-nl-presence-history-v1':value}};B.restore(store,B.parse(JSON.stringify(b)));assert.deepEqual(JSON.parse(s.get('casa-nl-presence-history-v1')),value)}
});
