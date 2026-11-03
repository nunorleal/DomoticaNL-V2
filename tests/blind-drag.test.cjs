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
 let replacement=node;let time=0,snapshot={configured:true,position:40,allowed:true,token:'one'},blocked=false;
 const document={hidden:false,documentElement:{classList:{contains:()=>false}},body:{append(){}},createElement:()=>bubble,querySelectorAll:()=>[replacement],querySelector:()=>blocked?{}:null,getElementById:()=>null,addEventListener:(k,f)=>listeners[k]=f};
 const A={selector:'.blind',id:()=> 'demo',snapshot:()=>snapshot,commit:async(id,target)=>{calls.push([id,target]);return true}},window={CasaBlindDragAdapter:A,CasaBlindDragCore:C,addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../blind-drag.js'),'utf8'),{window,document,performance:{now:()=>time},innerWidth:400,innerHeight:700,setTimeout:()=>1,clearTimeout(){}});
 const event=(y=300)=>({target:node,isPrimary:true,button:0,pointerId:1,clientX:100,clientY:y,stopImmediatePropagation(){this.stopped=true},preventDefault(){this.prevented=true}});
 return {listeners,calls,bubble,event,node,root:document.documentElement,setTime:t=>time=t,setSnapshot:s=>snapshot=s,setBlocked:b=>blocked=b,redraw:()=>{node.isConnected=false;replacement={...node,isConnected:true}}};
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

 test('repeated drags keep working after polling replaces the window button',async()=>{
 const h=harness();for(let i=0;i<4;i++){h.setTime(i*1000);h.listeners.pointerdown(h.event());h.redraw();h.setTime(i*1000+500);h.listeners.pointermove(h.event(258));await h.listeners.pointerup(h.event(258));}assert.equal(h.calls.length,4);assert.ok(h.calls.every(([id,target])=>target===60));
 });
 test('queue wait starts only after release and sends once after a background read ends',async()=>{
 let now=0,calls=0,waits=0;const snapshot=()=>({position:40,previewAllowed:true,allowed:now>=300,token:'same',configured:true});
 const result=await C.sendWhenReady({snapshot,token:'same',target:60,alive:()=>true,now:()=>now,sleep:async ms=>{assert.equal(calls,0);waits++;now+=ms},commit:async p=>{assert.equal(p,60);calls++;return true}});
 assert.equal(waits,3);assert.equal(calls,1);assert.equal(result.sent,true);
 });
 test('waiting never retries a failed command and stops when cancelled, stale, reconfigured or timed out',async()=>{
 for(const mode of ['cancel','stale','config','timeout','failed']){let now=0,calls=0;const snapshot=()=>({position:40,previewAllowed:mode!=='stale'||now<100,allowed:mode==='failed',token:mode==='config'&&now>=100?'new':'same',configured:true});
 const result=await C.sendWhenReady({snapshot,token:'same',target:60,alive:()=>mode!=='cancel'||now<100,now:()=>now,sleep:async ms=>{now+=ms},timeout:300,commit:async()=>{calls++;return false}});
 assert.equal(result.sent,false);assert.equal(calls,mode==='failed'?1:0,mode);
 }
 });

 test('transferring capture from the original window to the stable root does not cancel a hold',async()=>{
 const h=harness();h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));
 // Browsers emit this when setPointerCapture transfers from the original touch/button target.
 h.listeners.lostpointercapture({...h.event(),target:h.node});assert.equal(h.bubble.hidden,false);
 await h.listeners.pointerup({...h.event(258),target:h.root});assert.deepEqual(h.calls,[['demo',60]]);
 const click={...h.event(),target:h.root};h.listeners.click(click);assert.equal(click.prevented,true);
 });
 test('a real loss of root capture cancels without a command, then a fresh hold still works',async()=>{
 const h=harness();h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));h.listeners.lostpointercapture({...h.event(),target:h.root});
 await h.listeners.pointerup(h.event(258));assert.equal(h.calls.length,0);
 h.setTime(1000);h.listeners.pointerdown(h.event());h.setTime(1500);h.listeners.pointermove(h.event(258));await h.listeners.pointerup(h.event(258));assert.equal(h.calls.length,1);
 });

 test('held-pointer residual clicks are swallowed even when the browser retargets them to another ancestor',async()=>{
 const h=harness();h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));await h.listeners.pointerup(h.event(258));const outside={...h.event(),detail:1,target:{closest:()=>null}};h.listeners.click(outside);assert.equal(outside.prevented,true);
 // A fresh user press must never be swallowed by suppression from a prior gesture.
 h.setTime(600);h.listeners.pointerdown(h.event());h.setTime(650);await h.listeners.pointerup(h.event());const fresh={...h.event(),detail:1};h.listeners.click(fresh);assert.equal(fresh.prevented,undefined);
 });
 test('native context menu is suppressed while the pointer is captured on the root',()=>{
 const h=harness();h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));const menu={...h.event(),target:h.root};h.listeners.contextmenu(menu);assert.equal(menu.prevented,true);
 });

 test('holding an unavailable shutter never opens its normal popup or sends a command',async()=>{
 const h=harness();h.setSnapshot({configured:true,allowed:false,previewAllowed:false,position:null,token:'one'});h.listeners.pointerdown(h.event());h.setTime(500);h.listeners.pointermove(h.event(258));assert.equal(h.bubble.textContent,'Estore sem dados válidos · clique curto para consultar');await h.listeners.pointerup(h.event(258));assert.equal(h.calls.length,0);const click={...h.event(),detail:1};h.listeners.click(click);assert.equal(click.prevented,true);
 });
