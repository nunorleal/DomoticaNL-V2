const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../plan-zoom-core.js');
const base={width:700,height:800},viewport={width:800,height:1000};
test('zoom preserves the point between the fingers, follows their midpoint and caps at 4×',()=>{
 const p=C.zoom({scale:1,x:0,y:0},2,{x:100,y:100},{x:120,y:140},base,viewport);
 assert.deepEqual(p,{scale:2,x:-80,y:-60});
 assert.equal((120-p.x)/p.scale,100); // The same source point stays under the moving midpoint.
 assert.equal(C.zoom(p,12,{x:0,y:0},{x:0,y:0},base,viewport).scale,4);
 assert.deepEqual(C.zoom(p,.2,{x:100,y:100},{x:120,y:140},base,viewport),{scale:1,x:0,y:0});
});
test('pan bounds keep the enlarged plan in the viewport and center an axis that still fits',()=>{
 assert.deepEqual(C.constrain({scale:2,x:10000,y:-10000},base,viewport),{scale:2,x:300,y:-300});
 assert.deepEqual(C.constrain({scale:1.1,x:100,y:100},base,viewport),{scale:1.1,x:0,y:0});
});
function harness(offset={}){
 let blocked=false,floor=0,now=1000;const calls=[],listeners=new Map(),docEvents=new Map();
 const target={cancelled:[],closest:()=>null,dispatchEvent(e){this.cancelled.push(e.pointerId)},hasPointerCapture:()=>false};
 function scene(hidden){const events=new Map(),content={offsetWidth:700,offsetHeight:800,offsetLeft:offset.x,offsetTop:offset.y,style:{}};return {hidden,dataset:{},content,events,querySelector:()=>content,getBoundingClientRect:()=>({left:0,top:0,width:800,height:1000}),setPointerCapture:()=>{},hasPointerCapture:()=>false,releasePointerCapture:()=>{},addEventListener:(type,fn)=>events.set(type,fn)}}
 const scenes=[scene(false),scene(true)];
 const window={addEventListener:(type,fn)=>listeners.set(type,fn)},document={querySelectorAll:()=>scenes,querySelector:()=>blocked?{}:null,documentElement:{classList:{contains:()=>false}},addEventListener:(type,fn)=>docEvents.set(type,fn)};
 const ctx={CasaPlanZoomCore:C,CasaFloorsCore:require('../floors-core.js'),CasaFloors:{current:()=>floor,show(next){if(next===floor)return;floor=next;calls.push(next);scenes[0].hidden=next===-1;scenes[1].hidden=next===0;listeners.get('floorchange')()}},document,window,performance:{now:()=>now},PointerEvent:class{constructor(type,fields){this.type=type;Object.assign(this,fields)}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../plan-zoom.js'),'utf8'),ctx);
 function event(type,id,x,y,extra={}){const e={type,pointerType:'touch',pointerId:id,clientX:x,clientY:y,target,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};scenes[floor===0?0:1].events.get(type)(e);return e}
 return {event,target,scenes,calls,window,docEvents,resize:()=>listeners.get('resize')(),setBlocked:v=>blocked=v,tick:()=>now+=1000,zoom:scale=>event('wheel',0,400,500,{ctrlKey:true,deltaY:-Math.log(scale/window.CasaPlanZoom.state().scale)*100})};
}
test('pinching cancels a pending device drag, suppresses clicks, and never changes floors',()=>{
 const h=harness();h.event('pointerdown',1,300,400);h.event('pointerdown',2,400,400);
 h.event('pointermove',2,700,400);assert.equal(h.window.CasaPlanZoom.state().scale,4);assert.deepEqual(h.target.cancelled,[1,2]);
 h.event('pointerup',2,700,400);h.event('pointermove',1,300,200);h.event('pointerup',1,300,200);assert.deepEqual(h.calls,[]);
 const click={target:{closest:()=>true},preventDefault(){this.prevented=true},stopImmediatePropagation(){}};h.docEvents.get('click')(click);assert.equal(click.prevented,true);
});
test('an ordinary swipe remains available at 1×; enlarged panning switches floors only at an outward edge',()=>{
 const h=harness();assert.equal(h.event('pointerdown',1,400,500).stopped,undefined);h.event('pointerup',1,400,300);
 h.zoom(2.25);
 h.event('pointerdown',1,400,500);h.event('pointermove',1,400,0);h.event('pointerup',1,400,0);assert.deepEqual(h.calls,[]);
 h.event('pointerdown',1,400,500);h.event('pointermove',1,400,350);h.event('pointerup',1,400,350);
 assert.deepEqual(h.calls,[-1]);assert.equal(h.window.CasaPlanZoom.state().scale,1);for(const s of h.scenes)assert.equal(s.dataset.planScale,'1');
});
test('zoom gestures respect modal blocking and reset on resize without a toolbar',()=>{
 const h=harness();h.setBlocked(true);h.zoom(1.5);h.event('pointerdown',1,300,400);h.event('pointerdown',2,400,400);assert.equal(h.window.CasaPlanZoom.state().scale,1);
 h.setBlocked(false);h.zoom(1.5);assert.equal(h.window.CasaPlanZoom.state().scale,1.5);h.window.CasaPlanZoom.reset();assert.equal(h.window.CasaPlanZoom.state().scale,1);
 h.zoom(1.5);h.resize();assert.equal(h.window.CasaPlanZoom.state().scale,1);
});

test('an asymmetrically fitted canvas preserves the pointer anchor during zoom',()=>{
 const h=harness({x:10,y:110});h.zoom(2);const state=h.window.CasaPlanZoom.state();assert.equal(state.scale,2);assert.equal(state.x,-40);assert.equal(state.y,10);h.resize();assert.equal(h.window.CasaPlanZoom.state().scale,1);
});
