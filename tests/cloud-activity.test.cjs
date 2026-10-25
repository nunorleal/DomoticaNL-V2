const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../cloud-activity-core.js');
function input(extra={}){return {configured:true,dirty:false,count:23,activity:{totalRequests:3,doneRequests:3,totalDevices:23,doneDevices:23,running:false,error:false},session:{queued:0,active:0,sent:3,completed:3,failed:0,cancelled:0,lastFailure:null},sending:false,confirming:0,busy:false,lastFetched:100000,unavailable:0,...extra}}
test('only a completed fresh, idle and healthy update is ready',()=>{const d=C.state(input(),100001);assert.equal(d.ready,true);assert.equal(d.doneDevices,23);assert.equal(d.totalRequests,3);assert.equal(d.phase,'ready')});
test('batch progress is visible before all devices finish and never declares readiness',()=>{const v=input();v.activity={...v.activity,running:true,doneRequests:1,doneDevices:10};const d=C.state(v,100001);assert.equal(d.ready,false);assert.equal(d.label,'A atualizar 10/23');assert.equal(d.doneRequests,1)});
test('sending, pending physical confirmation, network queue, unavailable devices and stale states are not ready',()=>{
 for(const [extra,phase]of [[{sending:true},'sending'],[{confirming:2},'confirming'],[{session:{queued:1,active:0}},'queued'],[{busy:true},'queued'],[{unavailable:2},'unavailable'],[{dirty:true},'dirty'],[{configured:false},'unconfigured'],[{lastFetched:0},'pending']]){const d=C.state(input(extra),100001);assert.equal(d.ready,false);assert.equal(d.phase,phase)}
 assert.equal(C.state(input(),146000).phase,'stale');assert.equal(C.state(input(),99999).phase,'stale');
});
test('a failed or rate-limited refresh remains incomplete until a later complete successful cycle',()=>{const v=input();v.activity={...v.activity,error:true,doneDevices:10,doneRequests:1};v.session.lastFailure='limit';const d=C.state(v,100001);assert.equal(d.ready,false);assert.equal(d.label,'Limite de pedidos');assert.equal(d.doneDevices,10);v.activity.error=false;v.activity.doneDevices=23;v.activity.doneRequests=3;v.session.lastFailure=null;assert.equal(C.state(v,100001).ready,true)});
test('background reads keep healthy cached controls available, but never hide confirmations or stale readings',()=>{
 const v=input({background:true});v.activity.running=true;v.session.active=1;
 assert.equal(C.state(v,100001).phase,'background');assert.equal(C.state(v,100001).ready,true);
 v.confirming=1;assert.equal(C.state(v,100001).phase,'confirming');v.confirming=0;
 assert.equal(C.state(v,146000).ready,false);v.unavailable=1;assert.equal(C.state(v,100001).ready,false);
});
test('rate-limit pause exposes remaining seconds and cannot report ready',()=>{const v=input();v.session.retryAt=131000;const d=C.state(v,100001);assert.equal(d.phase,'cooldown');assert.equal(d.ready,false);assert.match(d.label,/31 s/)});

test('ageing and never-read devices are not classified as offline or unavailable',()=>{
 const r={online:true,fetchedAt:100000};assert.equal(C.readingCondition(r,false,146000),'stale');assert.equal(C.readingCondition(null,false,146000),'pending');assert.equal(C.readingCondition(r,true,100001),'ready');
 for(const extra of [{online:false},{error:true},{missing:true},{errors:['fault']}])assert.equal(C.readingCondition({...r,...extra},false,146000),'unavailable');
 assert.equal(C.readingCondition(r,false,100001),'unavailable');assert.equal(C.readingCondition(r,true,146000,120000),'ready');
});
test('focused popup explains paused fleet updates instead of reporting stale devices as unavailable',()=>{
 const d=C.state(input({focused:true,focusProblems:false,staleDevices:20,pendingDevices:2,pausedDevices:22}),100001);
 assert.equal(d.phase,'focused');assert.equal(d.label,'Prioridade ao dispositivo');assert.equal(d.unavailable,0);assert.equal(d.staleDevices,20);assert.equal(d.pendingDevices,2);assert.equal(d.pausedDevices,22);assert.equal(d.availableDevices,1);assert.equal(d.ready,false);
 for(const [extra,phase]of [[{sending:true},'sending'],[{confirming:1},'confirming'],[{session:{retryAt:110000}},'cooldown']])assert.equal(C.state(input({focused:true,...extra}),100001).phase,phase);
});
test('without a popup, data awaiting refresh remains distinct from unavailable devices',()=>{
 assert.equal(C.state(input({staleDevices:5}),100001).label,'5 com dados antigos');assert.equal(C.state(input({pendingDevices:5}),100001).label,'5 por consultar');assert.equal(C.state(input({unavailable:5}),100001).label,'5 indisponíveis');
});
