const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../shelly-core.js'),W=require('../windows-core.js'),D=require('../door-core.js');
const base={schemaVersion:1,server:'',authKey:'',rememberKey:false,bindings:{}};
test('four window sensors preserve complete XB IDs, channel zero, configuration and status batches',()=>{
 const bindings=W.defaults(),cfg=C.config({...base,windowBindings:bindings});assert.deepEqual(cfg.windowBindings,bindings);assert.deepEqual(C.deviceIds(cfg),Object.values(W.DEFAULT_IDS));assert.deepEqual(C.config(JSON.parse(JSON.stringify(cfg))),cfg);assert.deepEqual(C.config(base),base);assert.deepEqual(C.config({...base,windowBindings:{}}).windowBindings,{});for(const b of Object.values(bindings))assert.equal(b.component,0);
 const changed={deviceId:'XB123456',source:'blu',component:1};assert.deepEqual(W.defaults({master:changed}).master,changed);
});
test('window bindings reject invalid roles, contacts, duplicates and aliases of either door',()=>{
 const b=W.defaults();for(const v of [null,[],{other:b.master},{master:{...b.master,component:-1}},{master:{...b.master,source:'relay'}},{master:{...b.master,deviceId:'bad id'}}])assert.throws(()=>C.config({...base,windowBindings:v}));assert.throws(()=>C.config({...base,windowBindings:{...b,living:b.master}}));assert.throws(()=>C.config({...base,door:b.master,windowBindings:b}));assert.throws(()=>C.config({...base,cellarDoor:b.master,windowBindings:b}));
});
test('window snapshots accept explicit open/closed, expire, and never infer from angle, lux or unknown',()=>{
 const b=W.defaults().master;
 for(const open of [true,false]){const r={...D.status({online:1,status:{'window:0':{open}}},b),fetchedAt:100};assert.equal(W.snapshot(b,r,101).open,open);assert.equal(W.snapshot(b,r,45101).open,null);assert.equal(W.snapshot(b,{...r,online:false},101).open,null);assert.equal(W.snapshot(b,{...r,error:true},101).open,null);assert.equal(W.snapshot(null,r,101).open,null)}
 for(const status of [{'window:0':{open:null}},{'window:1':{open:true}},{'illuminance:0':{lux:100},'tilt:0':{angle:0}},{'window:0':{open:false,value:true}}])assert.equal(W.snapshot(b,{...D.status({online:1,status},b),fetchedAt:100},101).open,null);
 assert.equal(Object.keys(W).some(k=>/command/i.test(k)),false);
});

test('backup roundtrips four window contacts and validates the migration marker',()=>{
 const B=require('../backup-core.js'),ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'],data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-shelly-cloud-v1':C.config({...base,windowBindings:W.defaults()}),'casa-nl-window-ids-associated-v1':true},map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.68')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-shelly-cloud-v1')).windowBindings,W.defaults());assert.equal(storage.getItem('casa-nl-window-ids-associated-v1'),'true');
 const bad=JSON.parse(JSON.stringify(backup));bad.data['casa-nl-window-ids-associated-v1']='yes';assert.throws(()=>B.parse(JSON.stringify(bad)));
});
