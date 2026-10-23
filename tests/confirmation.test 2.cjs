const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../confirmation-core.js');
test('relay confirmation makes at most three spaced status attempts, then expires without endless polling',()=>{
 let time=100000;const m=C.create({now:()=>time}),p={key:'fan',id:'deadbeef',target:true};m.sync([p]);assert.equal(m.due().length,0);
 const actual=[];for(const pause of [1500,4000,10000]){time+=pause;const due=m.due();assert.equal(due.length,1);actual.push(time);m.attempted(due.map(e=>e.key));assert.equal(m.due().length,0);assert.equal(m.expired().length,0);m.finished(due.map(e=>e.key))}
 assert.deepEqual(actual,[101500,105500,115500]);assert.equal(m.expired().length,1);m.sync([]);assert.equal(m.size,0);assert.equal(m.delay(),null);
});
test('new commands do not extend an older command deadline; replacing a cover command creates a new ticket',()=>{
 let time=100000;const m=C.create({now:()=>time}),a={key:'cover:master',kind:'cover',id:'deadbeef',target:100,before:20,revision:1};m.sync([a]);const first=m.get(a.key);time+=20000;m.sync([a,{key:'heater',id:'aabbcc',target:true}]);assert.equal(m.get(a.key),first);assert.equal(first.deadline,160000);time+=40000;assert.ok(m.expired().includes(first));m.sync([{...a,target:0,revision:2}]);assert.notEqual(m.get(a.key),first);assert.equal(m.get(a.key).attempts,0);assert.equal(m.get(a.key).deadline,220000);
});
test('cover acknowledgement is reported motion in the commanded direction or reached position, never an old or invalid state',()=>{
 const ticket={acceptedAt:100000,target:100,before:20},r={online:true,hasCover:true,position:35,state:'opening',fetchedAt:101500};assert.equal(C.coverConfirmed(ticket,r),true);assert.equal(C.coverConfirmed(ticket,{...r,state:'closing'}),false);
 assert.equal(C.coverConfirmed({...ticket,target:0},{...r,state:'closing'}),true);assert.equal(C.coverConfirmed({...ticket,target:35},{...r,state:'stopped'}),true);
 assert.equal(C.coverConfirmed({...ticket,target:'stop'},{...r,state:'stopped'}),true);assert.equal(C.coverConfirmed({...ticket,target:'stop'},{...r,state:null}),false);
 for(const bad of [{...r,fetchedAt:99999},{...r,online:false},{...r,error:true},{...r,missing:true},{...r,hasCover:false},{...r,errors:['fault']}])assert.equal(C.coverConfirmed(ticket,bad),false);
});
test('expiry actually clears cover and relay pending flags and does not claim that the requested state was reached',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),src=fs.readFileSync(require.resolve('../shelly.js'),'utf8');let time=100000;const m=C.create({now:()=>time});
 m.sync([{key:'cover:master',kind:'cover',id:'deadbeef',target:100},{key:'fan',id:'aabbcc',target:true}]);time=161000;
 const ctx={confirmations:m,targets:new Map([['master',100]]),lightTargets:new Map(),mediaTargets:new Map(),lightMessages:new Map(),mediaMessages:new Map(),fanTarget:true,fanMessage:'',feedback:message=>{ctx.message=message},pendingEntries:()=>[]};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf(' function expireConfirmations()'),src.indexOf('\n\n const MC=')),ctx);ctx.expireConfirmations();assert.equal(ctx.targets.size,0);assert.equal(ctx.fanTarget,null);assert.match(ctx.fanMessage,/sem confirmação/);assert.match(ctx.message,/automaticamente/);assert.equal(m.size,0);
});
