const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../sensor-history-core.js');

const source='["https://fixture.shelly.cloud","FAKE-SENSOR",0,0]';
const reading=(at,t=20,h=50)=>({online:true,temperature:t,humidity:h,fetchedAt:at});
test('hourly and daily rows deduplicate polls, preserve zero, and retain averages and extremes',()=>{
 let now=Date.UTC(2026,10,18,12);
 const ledger=C.create(undefined,()=>now);
 ledger.record(source,'Sala',reading(now,0,0));
 ledger.record(source,'Sala',reading(now,30,80));
 assert.equal(ledger.rows().length,2);
 now+=60000;ledger.record(source,'Sala',reading(now,20,60));
 const hour=ledger.rows().find(r=>r.period==='hour');
 assert.deepEqual(hour.temperature,{sum:20,count:2,min:0,max:20});
 assert.equal(C.combine([hour],'humidity').average,30);
 const reloaded=C.create(ledger.snapshot(),()=>now);
 assert.deepEqual(reloaded.record(source,'Sala',reading(now)),[]);
});
test('invalid, stale, offline, retained, future and missing sensor readings never fabricate history',()=>{
 const now=Date.now(),ledger=C.create(undefined,()=>now);
 for(const extra of [{online:false},{error:true},{missing:true},{retained:true},{errors:['error']},{fetchedAt:now-120001},{fetchedAt:now+1}]){
  assert.deepEqual(ledger.record(source,'Sala',{...reading(now),...extra}),[]);
 }
 assert.deepEqual(ledger.record(source,'Sala',reading(now,null,null)),[]);
 ledger.record(source,'Sala',reading(now,-101,40));
 assert.equal(ledger.rows()[0].temperature,null);
 assert.equal(ledger.rows()[0].humidity.min,40);
});
test('replacement sensors remain separate and older shared aggregates cannot replace newer values',()=>{
 let now=Date.now(),ledger=C.create(undefined,()=>now);
 ledger.record(source,'Sala',reading(now));
 const original=ledger.snapshot();
 now+=60000;ledger.record(source,'Sala',reading(now,22,60));
 ledger.merge(original.rows);
 assert.equal(ledger.rows()[0].temperature.count,2);
 ledger.record(source+'-replacement','Sala',reading(now,30,70));
 assert.equal(new Set(ledger.rows().map(r=>r.sensor)).size,2);
});
test('hourly rows expire after thirty days while daily summaries last four hundred days',()=>{
 let now=Date.UTC(2026,10,18,12),ledger=C.create(undefined,()=>now);
 ledger.record(source,'Sala',reading(now));
 now+=31*C.DAY;
 assert.deepEqual(ledger.rows().map(r=>r.period),['day']);
 now+=400*C.DAY;
 assert.deepEqual(ledger.rows(),[]);
});
test('Lisbon midnight and repeated DST hours use distinct real hourly buckets',()=>{
 let now=Date.parse('2026-07-02T23:30:00Z');
 const ledger=C.create(undefined,()=>now);
 ledger.record(source,'Sala',reading(now));
 assert.equal(ledger.rows()[0].date,'2026-07-03');
 assert.doesNotThrow(()=>C.validate(ledger.snapshot()));
 now=Date.parse('2026-10-25T00:30:00Z');
 ledger.record(source,'Sala',reading(now));
 now+=C.HOUR;ledger.record(source,'Sala',reading(now,21,60));
 assert.equal(ledger.rows().filter(r=>r.period==='hour'&&r.date==='2026-10-25').length,2);
 assert.doesNotThrow(()=>C.validate(ledger.snapshot()));
});
test('malformed backups and repeated buckets are rejected without accepting invalid dates or metric bounds',()=>{
 const now=Date.now(),ledger=C.create(undefined,()=>now);
 ledger.record(source,'Sala',reading(now));
 const saved=ledger.snapshot();
 assert.throws(()=>C.validate({...saved,rows:[...saved.rows,saved.rows[0]]}));
 assert.throws(()=>C.validate({...saved,rows:[{...saved.rows[0],date:'2026-02-31'}]}));
 assert.throws(()=>C.validate({...saved,rows:[{...saved.rows[0],humidity:{sum:101,count:1,min:101,max:101}}]}));
});
test('sensor history participates in backups without affecting unrelated stored data',()=>{
 const B=require('../backup-core.js'),duplex=!!B.FORMAT;
 const now=Date.now(),ledger=C.create();ledger.record(source,'Sala',reading(now));
 if(duplex){
  const backup=B.create({sensorHistory:ledger.snapshot()},{}),disk=new Map([['unrelated','keep']]);
  const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
  B.write(storage,backup,{});
  assert.deepEqual(JSON.parse(disk.get(B.KEYS.sensorHistory)),ledger.snapshot());
  assert.equal(disk.get('unrelated'),'keep');
  B.write(storage,B.create({showRoomLabels:false},{}),{});
  assert.deepEqual(JSON.parse(disk.get(B.KEYS.sensorHistory)),ledger.snapshot());
 }else{
  const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
  const value={application:'Casa NL',schemaVersion:1,appVersion:'2.223',data:{
   'casa-nl-sensor-history-v1':ledger.snapshot(),
   'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:50}:{})})),
   'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),
   'casa-nl-show-banners':true,'casa-nl-environment-v1':{city:null,mode:'auto'}
  }};
  const disk=new Map(),storage={get length(){return disk.size},key:i=>[...disk.keys()][i],getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
  B.restore(storage,B.parse(JSON.stringify(value)));
  assert.deepEqual(JSON.parse(disk.get('casa-nl-sensor-history-v1')),ledger.snapshot());
  delete value.data['casa-nl-sensor-history-v1'];B.restore(storage,B.parse(JSON.stringify(value)));
  assert.deepEqual(JSON.parse(disk.get('casa-nl-sensor-history-v1')),ledger.snapshot());
 }
});

test('only the emitter publishes sensor aggregates; receiver, account switch and import suspension stay isolated',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');
 const storage=new Map(),events=new EventTarget(),writes=[];
 const now=Date.now();
 const api={sensorEntries:()=>[{id:'master',name:'Quarto'}],sensorBinding:()=>({deviceId:'sensor'}),sensorReading:()=>reading(now)};
 storage.set('casa-nl-shelly-cloud-v1',JSON.stringify({server:'fixture'}));
 const context={CasaSensorHistoryCore:C,CasaShelly:api,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{currentScript:{dataset:{house:'t2'}},addEventListener(){},hidden:false},Event,Date,setInterval(){},setTimeout,clearTimeout,addEventListener:events.addEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 context.window=context;vm.runInNewContext(fs.readFileSync(require.resolve('../sensor-history.js'),'utf8'),context);
 let shared=[];
 const client={from(){const q={select(){return q},eq(){return q},lte(){return q},order(){return q},limit(){return q},gte(){return q},gt(){return q},delete(){return q},lt(){return q},then(resolve){resolve({data:shared,error:null})}};return q},async rpc(name,args){writes.push(args);shared=args.p_rows.map((value,i)=>({id:String(i),value}));return {error:null}}};
 const H=context.CasaSensorHistory;
 H.connect(client,'first',()=>true);await H.sync(true);await new Promise(r=>setTimeout(r,10));
 assert.equal(writes.flatMap(w=>w.p_rows).length,2);
 await H.sync(true);assert.equal(writes.length,1,'Identical polls do not repeat writes');
 H.connect(client,'first',()=>false);api.sensorReading=()=>reading(now+1,99,99);events.dispatchEvent(new Event('sensorchange'));
 await H.sync(true);assert.equal(writes.length,1,'Receiver cannot publish');
 assert.equal(H.rows()[0].temperature.max,20,'Receiver does not replace emitter aggregates locally');
 H.suspend();storage.set(H.key,'import-marker');events.dispatchEvent(new Event('pagehide'));assert.equal(storage.get(H.key),'import-marker');
 shared=[];H.connect(client,'second',()=>false);assert.equal(H.rows().length,0,'Previous account is isolated');
 H.resume();await H.sync(true);assert.equal(H.rows().length,0);
});
