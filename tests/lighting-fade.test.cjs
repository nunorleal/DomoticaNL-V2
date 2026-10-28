const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8'),draw=source.slice(source.indexOf('function drawRoomLighting(){'),source.indexOf('\nconst roomPolygonCache='));
function setup(){
 let markup='',writes=0;const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{style:{setProperty(k,v){this[k]=v}},classList:{toggle(){}}});return nodes.get(key)};
 const host={get innerHTML(){return markup},set innerHTML(v){markup=v;writes++},querySelector:s=>s==='.room-lighting'?(markup?node('svg'):null):node(s),querySelectorAll:()=>[]};
 const rooms=[{id:'living',blind:100,light:false},{id:'hall',light:false}],ctx={rooms,lightingZones:{living:'M0 0H100V100H0Z',hall:'M100 0H150V100H100Z'},doorThresholdZones:{living:'M95 40H105V60H95Z'},whiteWallZones:['M0 0H150V5H0Z'],document:{getElementById:()=>host},window:{CasaLamps:{patch:()=>'',halo:()=>''},CasaDoor:{patch:()=>''},CasaWindows:{patch:()=>''},CasaEnvironment:{darkness:r=>r.id==='hall'?1:1-r.blind/100,electricOpacity:r=>r.light?1:0}}};
 vm.runInNewContext(draw,ctx);return {ctx,host,rooms,node,writes:()=>writes};
}
test('blind lighting retains its SVG nodes across updates so opacity can fade, with exact reported endpoints',()=>{
 const h=setup();h.ctx.drawRoomLighting();const zone=h.node('[data-light-mask="night"][data-mask-room="living"]');assert.equal(zone.style.opacity,0);
 h.rooms[0].blind=50;h.ctx.drawRoomLighting();assert.equal(zone.style.opacity,.5);
 h.rooms[0].blind=0;h.ctx.drawRoomLighting();assert.equal(zone.style.opacity,1);assert.equal(h.writes(),1);
 h.rooms[0].light=true;h.ctx.drawRoomLighting();assert.equal(h.node('[data-light-mask="electric"][data-mask-room="living"]').style.opacity,1);
});
test('soft fields share a floor clip and preserve the permanent white-wall overlay above the lighting',()=>{
 const h=setup();h.ctx.drawRoomLighting();const html=h.host.innerHTML;
 assert.match(html,/mask-type:alpha/);assert.match(html,/feGaussianBlur stdDeviation="4"/);assert.match(html,/clip-path="url\(#room-floor-clip\)"/);
 for(const kind of ['night','electric'])assert.match(html,new RegExp('mask="url\\(#room-'+kind+'-soft-mask\\)"'));
 assert.ok(html.lastIndexOf('class="white-wall-overlay"')>html.lastIndexOf('data-light-zone="hall"'));
 assert.match(html,/id="night-clip-living"/);assert.match(html,/M95 40H105V60H95Z/);
});
