const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../room-devices-core.js');
const keys=(id,options)=>C.entries(id,options).map(e=>e.kind+':'+e.id);
test('living inventory includes its lamp, five media devices, cover and three sensors without duplicating the shared lamp',()=>{
 assert.deepEqual(keys('living'),['light:living','sensor:living','cover:living','window:living','media:tv','media:soundbar','media:playstation','media:vodafone','media:unifi','door:entrance']);
});
test('room membership follows portable placement while fixed devices remain in their own rooms',()=>{
 const moved={heaterRoom:'living',dehumidifierRoom:'bedroom2'};
 assert.ok(keys('master').includes('heater:'));assert.ok(keys('bath1').includes('dehumidifier:'));assert.ok(!keys('master',moved).includes('heater:'));assert.ok(keys('living',moved).includes('heater:'));assert.ok(keys('bedroom2',moved).includes('dehumidifier:'));
 assert.deepEqual(keys('kitchen'),['light:kitchen','cover:kitchen','window:kitchen','kitchen:dishwasher','kitchen:washer','kitchen:boiler']);
 assert.ok(keys('bedroom2').includes('office:monitor'));assert.ok(!keys('living').includes('office:monitor'));assert.deepEqual(C.entries('unknown'),[]);
 for(const id of ['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'])assert.equal(new Set(keys(id,moved)).size,keys(id,moved).length);
});

test('cellar inventory includes its fan, separate alarm roles, room sensor and door, without parking devices',()=>{
 assert.deepEqual(keys('cellar'),['fan:','alarm:arm','alarm:trigger','sensor:cellar','door:cellar']);assert.ok(!keys('cellar').some(k=>k.startsWith('ev:')));
});
