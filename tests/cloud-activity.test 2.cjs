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
