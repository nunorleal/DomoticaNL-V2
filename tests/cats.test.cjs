const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../cats-core.js');
test('every room transition follows connected interior passages and arrives before the 30s cycle',()=>{for(const [room,targets]of Object.entries(C.neighbours))for(const target of targets){const j=C.journey(C.anchors[room],C.anchors[target]);assert(j.duration<C.CYCLE);assert.deepEqual([C.sample(j,0).x,C.sample(j,0).y],[j.path[0].x,j.path[0].y]);const end=C.sample(j,C.CYCLE);assert.equal(end.walking,false);assert.equal(end.room,target);assert.equal(end.x,C.nodes[C.anchors[target]].x);for(let i=1;i<j.path.length;i++)assert(C.edges.some(([a,b])=>[a,b].includes(j.path[i-1].id)&&[a,b].includes(j.path[i].id)))}});
test('routes and cat footprint avoid furniture and solid interior walls',()=>{const blocked=[// Expanded furniture outlines / wall strips; open doorways excluded.
[522,170,724,408],[325,169,418,367],[190,470,848,490],[219,593,480,613],[399,613,418,784],[475,613,480,784],[193,784,848,806],[250,965,484,1088],[554,894,738,1058],[249,1155,748,1220],[555,510,735,565]];for(const [a,b]of C.edges){const j=C.journey(a,b);for(let t=0;t<=j.duration;t+=40){const s=C.sample(j,t);for(const [x1,y1,x2,y2]of blocked)assert(!(s.x>x1-12&&s.x<x2+12&&s.y>y1-12&&s.y<y2+12),`${a}→${b} at ${s.x},${s.y}`);assert(s.x>=130&&s.x<=800&&s.y>=400&&s.y<=1130)}}});
test('random choices stay in connected rooms; invalid waypoints fail closed',()=>{for(const room of Object.keys(C.anchors))for(const n of [0,.5,.999,1])assert(C.neighbours[room].includes(C.next(room,()=>n)));assert.throws(()=>C.route('balcony','master'));assert.throws(()=>C.route('basement','hall'))});
test('journey sampling clamps negative and late times without overshooting',()=>{const j=C.journey('hall','master');assert.equal(C.sample(j,-500).x,C.nodes.hall.x);assert.equal(C.sample(j,999999).x,C.nodes.master.x);assert.equal(C.sample(j,999999).walking,false)});

test('cat brightness follows room darkness and electric light, including closed blinds by day',()=>{
 assert.equal(C.shade(0,0),1);assert.ok(Math.abs(C.shade(.86,0)-.22)<1e-8);assert.equal(C.shade(.86,1),1);
 assert.ok(C.shade(.4,0)<C.shade(.2,0));assert.ok(C.shade(.86,.6)>C.shade(.86,0));assert.equal(C.shade(-1,0),1);assert.ok(C.shade(2,0)>=.21);assert.ok(Number.isFinite(C.shade(undefined,undefined)));
});

 test('dark coats use direct colors and eye blinking is isolated to dark rooms',()=>{
 const fs=require('node:fs'),path=require('node:path'),css=fs.readFileSync(path.join(__dirname,'../cats.css'),'utf8'),js=fs.readFileSync(path.join(__dirname,'../cats.js'),'utf8');
 assert.ok(!css.includes('filter:brightness(var(--shade))'));
 assert.match(css,/\.house-cat\.cat-dark \.cat-eyes\{fill:#d4ff8c/);
 assert.match(css,/@keyframes cat-eye-blink/);assert.ok(css.includes('scaleY(.06)'));assert.ok(css.includes('animation-delay:-1.7s'));assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(js.includes('CORE.palette(cat.id,shade)'));
 for(const id of ['vasco','zeca']){const dark=C.palette(id,.22),lit=C.palette(id,1);assert.notEqual(dark.fur,lit.fur);assert.notEqual(dark.eye,lit.eye)}
 });

 test('lighting detection rejects the wrong room instead of accepting an undersized probe within area tolerance',()=>{
 const G=require('../banner-core.js'),fs=require('node:fs'),path=require('node:path'),polygons=G.polygons('M0 0H100V100H0Z');
 assert.equal(G.rectFits(polygons,{x:50,y:50},1,1),true);
 assert.equal(G.rectFits(polygons,{x:250,y:250},1,1),false);
 const js=fs.readFileSync(path.join(__dirname,'../cats.js'),'utf8');assert.ok(js.includes('cat.point,1,1'));assert.ok(!js.includes('cat.point,.1,.1'));
 });

 test('T2 detects the room under each cat and follows the same lighting rules as the floor',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),G=require('../banner-core.js'),E=require('../environment-core.js');
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),text=source.match(/const lightingZones=(\{[\s\S]*?\n\});/)[1],zones=vm.runInNewContext('('+text+')');
 for(const room of ['master','hall','bedroom2','living','kitchen']){
 const point=C.nodes[C.anchors[room]],found=Object.entries(zones).find(([id,d])=>G.rectFits(G.polygons(d),point,1,1));assert.equal(found?.[0],room);
 const off={id:room,light:false,blind:0},on={...off,light:true};
 const dark=C.shade(E.darkness(off,false,[off]),E.electricOpacity(off,false,[off])),lit=C.shade(E.darkness(on,false,[on]),E.electricOpacity(on,false,[on]));assert.ok(dark<.25);assert.equal(lit,1);
 }
 });
