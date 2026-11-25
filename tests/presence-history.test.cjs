const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../presence-history-core.js');
const people=(states=['home','away','unknown'],identity='1234abcd')=>states.map(state=>({state,identity}));
test('only matching observed states count; transitions and unknown states remain uncertain',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(people(),now);now+=60000;h.observe(people(),now);
 const rows=h.rows();assert.equal(rows[0].homeMs,60000);assert.equal(rows[1].awayMs,60000);assert.equal(rows[2].unknownMs,60000);
 now+=60000;h.observe(people(['away','away','home']),now);assert.equal(h.rows()[0].homeMs,60000);assert.equal(h.rows()[0].unknownMs,60000);assert.equal(h.rows()[2].homeMs,0);
});
test('repeated polls, stale readings, long offline gaps and changed phone identities never invent hours',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(people(),now);assert.equal(h.observe(people(),now).length,0);
 now+=C.MAX_GAP+1;h.observe(people(),now);assert.equal(h.rows()[0].homeMs,0);now+=60000;h.observe(people(['home','home','home'],'87654321'),now);assert.equal(h.rows()[0].homeMs,0);
 now+=60000;h.observe(people(['home','home','home'],'87654321'),now);assert.equal(h.rows()[0].homeMs,60000);
 assert.equal(h.observe(people(),now-1000000).length,0);assert.equal(h.observe(people(),now+1).length,0);
});
test('Lisbon summer midnight splits duration between local dates without duplication',()=>{
 let now=Date.parse('2026-08-01T22:59:00Z');const h=C.create(undefined,()=>now);h.observe(people(),now);now+=120000;h.observe(people(),now);const rows=h.rows().filter(r=>r.person===0);
 assert.equal(rows.length,2);assert.equal(rows[0].date,'2026-08-01');assert.equal(rows[1].date,'2026-08-02');assert.equal(rows[0].homeMs,60000);assert.equal(rows[1].homeMs,60000);C.validate(h.snapshot());
});
test('DST clock changes use elapsed time, and saved baseline resumes without counting a gap twice',()=>{
 let now=Date.parse('2026-10-25T00:59:00Z');let h=C.create(undefined,()=>now);h.observe(people(),now);now+=120000;h.observe(people(),now);assert.equal(h.rows()[0].homeMs,120000);h=C.create(h.snapshot(),()=>now);assert.equal(h.observe(people(),now).length,0);now+=60000;h.observe(people(),now);assert.equal(h.rows()[0].homeMs,180000);
});
test('older remote aggregates do not replace newer ones, and retention is bounded to four hundred days',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(people(),now);const old=h.snapshot();now+=60000;h.observe(people(),now);h.merge(old.rows);assert.equal(h.rows()[0].homeMs,60000);now+=401*C.DAY;assert.equal(h.rows().length,0);
});
test('invalid durations, IDs, dates and repeated days are rejected; no network identities are stored',()=>{
 let now=Date.parse('2026-11-19T12:00:00Z');const h=C.create(undefined,()=>now);h.observe(people(),now);const good=h.snapshot();for(const extra of [{person:3},{homeMs:-1},{homeMs:100},{date:'2026-02-31'},{observation:{at:now,state:'home',identity:'192.168.1.1'}}])assert.throws(()=>C.validate({version:1,rows:[{...good.rows[0],...extra}]}));assert.throws(()=>C.validate({version:1,rows:[good.rows[0],good.rows[0]]}));assert.equal(C.fingerprint('phone-config'),C.fingerprint('phone-config'));assert.ok(!JSON.stringify(good).includes('phone-config'));
});
test('only the emitter publishes; receivers cannot add time, accounts are isolated and imports stop old persistence',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),events=new EventTarget(),storage=new Map(),writes=[],records=new Map();let clock=Date.now();
 class Clock extends Date{static now(){return clock}}
 const core={...C,create:value=>C.create(value,()=>clock)};
 const client={from(){let owner;const q={select(){return q},eq(k,v){if(k==='owner_id')owner=v;return q},lte(){return q},order(){return q},limit(){return q},gte(){return q},gt(){return q},delete(){return q},lt(){return q},then(resolve){resolve({data:owner==='first'?[...records.values()].map((value,i)=>({id:String(i),value})):[],error:null})}};return q},async rpc(name,args){assert.equal(name,'casa_write_presence_history');writes.push(args.p_rows);for(const r of args.p_rows)records.set(C.key(r),r);return {error:null}}};
 const context={CasaPresenceHistoryCore:core,Date:Clock,Event,setTimeout,clearTimeout,setInterval(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{currentScript:{dataset:{house:'t2'}},hidden:false,addEventListener(){}},addEventListener:events.addEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};context.window=context;
 vm.runInNewContext(fs.readFileSync(require.resolve('../presence-history.js'),'utf8'),context);const H=context.CasaPresenceHistory;
 H.connect(client,'first',()=>true);await H.sync(true);await new Promise(r=>setTimeout(r,10));H.observe(people(),clock);await H.sync(true);await new Promise(r=>setTimeout(r,10));
 clock+=60000;H.observe(people(),clock);await H.sync(true);await new Promise(r=>setTimeout(r,10));assert.equal(records.size,3);assert.equal(records.values().next().value.homeMs,60000);
 const count=writes.length;H.connect(client,'first',()=>false);clock+=60000;H.observe(people(),clock);await H.sync(true);assert.equal(writes.length,count);assert.equal(H.rows()[0].homeMs,60000);
 H.suspend();storage.set('casa-nl-presence-history-v1','imported-marker');events.dispatchEvent(new Event('pagehide'));assert.equal(storage.get('casa-nl-presence-history-v1'),'imported-marker');
 H.connect(client,'second',()=>false);assert.equal(H.rows().length,0);H.resume();await H.sync(true);assert.equal(H.rows().length,0);
});
test('presence history is portable in both backups and absent fields in older backups preserve existing records',()=>{
 const B=require('../backup-core.js'),s=new Map(),store={get length(){return s.size},key:i=>[...s.keys()][i],getItem:k=>s.get(k)??null,setItem:(k,v)=>s.set(k,v),removeItem:k=>s.delete(k)};
 const now=Date.now(),h=C.create();h.observe(people(),now);const value=h.snapshot();
 if(B.FORMAT){const backup=B.create({presenceHistory:value},{});B.write(store,backup,{});assert.deepEqual(JSON.parse(s.get(B.KEYS.presenceHistory)),value);B.write(store,B.create({showRoomLabels:true},{}),{});assert.deepEqual(JSON.parse(s.get(B.KEYS.presenceHistory)),value)}
 else{const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];const b={application:'Casa NL',schemaVersion:1,data:{'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:50}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{city:null,mode:'auto'},'casa-nl-presence-history-v1':value}};B.restore(store,B.parse(JSON.stringify(b)));assert.deepEqual(JSON.parse(s.get('casa-nl-presence-history-v1')),value);delete b.data['casa-nl-presence-history-v1'];B.restore(store,b);assert.deepEqual(JSON.parse(s.get('casa-nl-presence-history-v1')),value)}
});
