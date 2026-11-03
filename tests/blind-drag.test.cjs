const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../blind-drag-core.js'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('short clicks, unchanged holds and cancelled gestures never yield commands',()=>{
 let g=C.create(40,100,300,0);assert.equal(g.finish(100),null);
 g=C.create(40,100,300,0);assert.equal(g.activate(449),false);assert.equal(g.activate(451),true);assert.equal(g.finish(600),null);
 g=C.create(40,100,300,0);g.move(100,270,100);assert.equal(g.cancelled,true);assert.equal(g.finish(700),null);
 g=C.create(40,100,300,0);g.move(100,260,500);g.cancel();assert.equal(g.finish(600),null);
});
test('vertical drag increases opening upwards, decreases downwards and clamps to endpoints',()=>{
 let g=C.create(40,100,300,0,200);assert.equal(g.move(100,260,500),60);assert.equal(g.finish(600),60);assert.equal(g.finish(700),null);
 g=C.create(40,100,300,0,200);assert.equal(g.move(100,340,500),20);assert.equal(g.finish(600),20);
 g=C.create(40,100,300,0,200);assert.equal(g.move(100,-500,500),100);assert.equal(g.move(100,900,600),0);assert.equal(g.finish(700),0);
 assert.throws(()=>C.create(null,0,0,0));assert.throws(()=>C.create(101,0,0,0));
});
function harness(){const listeners={},calls=[],bubble={hidden:true,style:{},setAttribute(){}},node={isConnected:true,dataset:{blind:'demo'},classList:{add(){},remove(){}},setPointerCapture(){},releasePointerCapture(){},contains:e=>e===node};node.closest=()=>node;
 let time=0,snapshot={configured:true,position:40,allowed:true,token:'one'},blocked=false;
 const document={hidden:false,documentElement:{classList:{contains:()=>false}},body:{append(){}},createElement:()=>bubble,querySelector:()=>blocked?{}:null,getElementById:()=>null,addEventListener:(k,f)=>listeners[k]=f};
 const A={selector:'.blind',id:()=> 'demo',snapshot:()=>snapshot,commit:async(id,target)=>{calls.push([id,target]);return true}},window={CasaBlindDragAdapter:A,CasaBlindDragCore:C,addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../blind-drag.js'),'utf8'),{window,document,performance:{now:()=>time},innerWidth:400,innerHeight:700,setTimeout:()=>1,clearTimeout(){}});
 const event=(y=300)=>({target:node,isPrimary:true,button:0,pointerId:1,clientX:100,clientY:y,stopImmediatePropagation(){this.stopped=true},preventDefault(){this.prevented=true}});
 return {listeners,calls,bubble,event,setTime:t=>time=t,setSnapshot:s=>snapshot=s,setBlocked:b=>blocked=b};
}
test('pointer controller sends exactly once on release, never during preview, and suppresses the trailing click',async()=>{
 const h=harness();h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));assert.equal(h.calls.length,0);assert.equal(h.bubble.hidden,false);assert.equal(h.bubble.textContent,'60%');
 await h.listeners.pointerup(h.event(258));assert.deepEqual(h.calls,[['demo',60]]);await h.listeners.pointerup(h.event(258));assert.equal(h.calls.length,1);const e=h.event();h.listeners.click(e);assert.equal(e.prevented,true);
});
test('cancel, stale state, configuration change, dialog opening and short click leave devices untouched',async()=>{
 for(const scenario of ['cancel','stale','config','dialog','short']){const h=harness();h.listeners.pointerdown(h.event());h.setTime(scenario==='short'?100:500);if(scenario!=='short')h.listeners.pointermove(h.event(258));
 if(scenario==='cancel')h.listeners.pointercancel();if(scenario==='stale')h.setSnapshot({allowed:false,token:'one'});if(scenario==='config')h.setSnapshot({allowed:true,token:'two'});if(scenario==='dialog')h.setBlocked(true);
 await h.listeners.pointerup(h.event(scenario==='short'?300:258));assert.equal(h.calls.length,0,scenario);
 if(scenario==='short'){const e=h.event();h.listeners.click(e);assert.equal(e.prevented,undefined)}
 }
});
