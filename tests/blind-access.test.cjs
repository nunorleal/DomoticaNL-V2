const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync(require.resolve('../app.js'),'utf8'),shelly=fs.readFileSync(require.resolve('../shelly.js'),'utf8');
test('division and shutter render separate controls and retain that context on redraw',()=>{
 const card={innerHTML:''},views=[],room={id:'master',name:'Quarto',description:'Descanso',light:false,blind:37},ctx={rooms:[room],detailView:'room',current:()=>room,escapeHTML:s=>s,icon:()=>'',positionLabel:()=>37,blindText:()=> '37% aberto',document:{getElementById:id=>id==='detail-card'?card:null},window:{CasaEnvironment:{roomDescription:()=> 'Luz apagada'},CasaShelly:{decorateRoom:(r,view='room')=>views.push(view)}}};vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function drawDetail(){'),app.indexOf('function updateSummary(){')),ctx);
 ctx.drawDetail();assert.match(card.innerHTML,/id="light-toggle"/);assert.doesNotMatch(card.innerHTML,/blind-range|data-command=/);assert.equal(views.at(-1),'room');
 ctx.detailView='blind';ctx.drawDetail();assert.match(card.innerHTML,/id="blind-range"/);assert.match(card.innerHTML,/data-command="pause"/);assert.doesNotMatch(card.innerHTML,/light-toggle|Iluminação/);assert.equal(views.at(-1),'blind');ctx.drawDetail();assert.equal(views.at(-1),'blind');
});
test('opening or refreshing a division does not query its cover; shutter access reads only its own ID',()=>{
 const calls=[],b={deviceId:'aa1111'},l={deviceId:'bb2222'},s={deviceId:'cc3333'},ctx={Date:{now:()=>100000},binding:()=>b,lightBinding:()=>l,sensorBinding:()=>s,reading:()=>null,lightReading:()=>null,sensorReading:()=>null,config:{windowBindings:{master:{deviceId:'dd4444'}}},refresh:o=>{calls.push(o);return Promise.resolve()}};vm.createContext(ctx);vm.runInContext(shelly.slice(shelly.indexOf(' function ensureFresh(id){'),shelly.indexOf(' function energySnapshot(){')),ctx);
 ctx.ensureFresh('master');assert.deepEqual([...calls.pop().ids],['bb2222','cc3333']);ctx.ensureBlindFresh('master');assert.deepEqual([...calls.pop().ids],['aa1111']);ctx.refreshEquipment('blind','master');assert.deepEqual([...calls.pop().ids],['aa1111']);ctx.refreshEquipment('room','master');assert.deepEqual([...calls.pop().ids],['bb2222','cc3333','dd4444']);ctx.refreshEquipment('light','master');assert.deepEqual([...calls.pop().ids],['bb2222']);
});

test('lamp context decorates only its light without unrelated door, window, sensor or shutter controls',()=>{
 const calls=[],ctx={decorateLight:r=>calls.push(r.id),window:{},document:{}};vm.createContext(ctx);vm.runInContext(shelly.slice(shelly.indexOf(" function decorateRoom(r,view='room'){"),shelly.indexOf(' let transportStorage=')),ctx);ctx.decorateRoom({id:'living'},'light');assert.deepEqual(calls,['living']);
});
