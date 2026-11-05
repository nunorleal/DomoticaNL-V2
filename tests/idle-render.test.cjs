const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('offline rendering skips identical cached rows but updates expiry and new popup targets',()=>{
 const source=fs.readFileSync(require.resolve('../offline.js'),'utf8'),start=source.indexOf(' function sync(){'),end=source.indexOf('\n const observed=',start);let rows=[{kind:'heater',status:'ready'}],paints=0,queued=[];
 const context={painting:false,forcePaint:true,lastRowsSignature:'',scheduled:false,document:{hidden:false,documentElement:{classList:{contains:()=>false}}},window:{CasaShelly:{houseSnapshot:()=>({deviceRows:rows})}},ensureContacts:()=>{},uiFor:()=>paints++,requestAnimationFrame:fn=>queued.push(fn)};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.sync=sync;this.schedule=schedule',context);
 context.sync();context.sync();assert.equal(paints,1);rows=[{kind:'heater',status:'stale'}];context.sync();assert.equal(paints,2,'expiry must update even without a Cloud event');context.schedule();context.schedule();assert.equal(queued.length,1);queued.shift()();assert.equal(paints,3,'new popup/UI targets must be marked even when rows match');context.document.hidden=true;context.schedule();queued.shift()();assert.equal(paints,3);context.document.hidden=false;context.sync();assert.equal(paints,4);
});
test('closed appliance popups do no popup DOM writes while plan countdown and power still update',()=>{
 for(const role of ['heater','dehumidifier']){const source=fs.readFileSync(require.resolve('../'+role+'.js'),'utf8'),start=source.indexOf(' function draw(){'),end=source.indexOf('\n object.addEventListener',start);let updates=0,light=0,d={configured:true,on:true,timerActive:true,timerRemainingSeconds:10},attrs=0;
 const context={CasaShelly:{[role+'Snapshot']:()=>d},rooms:[{id:'test',name:'Quarto'}],position:{room:'test'},object:{dataset:{},setAttribute:()=>attrs++},dialog:{open:false},planSignature:'',popupSignature:'',updatePlanTimer:()=>updates++,drawLighting:()=>light++,$:()=>{throw Error('closed popup was rewritten')}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.draw=draw',context);context.draw();context.draw();assert.equal(updates,1);assert.equal(attrs,1);d={...d,timerRemainingSeconds:9};context.draw();assert.equal(updates,2);d={...d,on:false,timerActive:false,timerRemainingSeconds:null};context.draw();assert.equal(updates,3,'manual off must clear the visible counter');assert.equal(light,4,'initial and changed lighting must remain applied');
 }
});
