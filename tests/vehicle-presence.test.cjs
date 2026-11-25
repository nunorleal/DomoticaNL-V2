const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../vehicle-presence-core.js');
const people=state=>[{name:'Eu',state:'home'},{name:'Joana',state},{name:'Gui',state:'home'}];

test('the vehicle follows Joana independently of the other people',()=>{
 assert.deepEqual(C.state(people('home'),false),{present:true,chargeOverride:false});
 assert.deepEqual(C.state(people('away'),false),{present:false,chargeOverride:false});
 assert.equal(C.state([{name:'Joana Leal',state:'away'},...people('home')],false).present,false);
 assert.equal(C.state([{name:'Eu',state:'home'},{name:'Esposa',state:'away'}],false).present,false);
});
test('confirmed charging overrides absence and keeps the parked car after charging stops',()=>{
 let car=C.state(people('away'),false);
 car=C.state(people('away'),true,car);
 assert.deepEqual(car,{present:true,chargeOverride:true});
 assert.deepEqual(C.state(people('away'),false,car),car);
 assert.deepEqual(C.state(people('unknown'),null,car),car);
});
test('returning home clears the charging override and the next departure removes the car',()=>{
 const seenCharging={present:true,chargeOverride:true};
 const home=C.state(people('home'),false,seenCharging);
 assert.deepEqual(home,{present:true,chargeOverride:false});
 assert.equal(C.state(people('away'),false,home).present,false);
 assert.equal(C.state(people('away'),true,home).present,true);
});
test('unknown presence preserves the current estimate while absent remains hidden',()=>{
 assert.equal(C.state(undefined,null).present,true);
 const absent=C.state(people('away'),false);
 assert.equal(C.state(people('unknown'),null,absent).present,false);
 assert.equal(C.state(people('unknown'),true,absent).present,true);
 assert.equal(C.state(people('away'),null,absent).present,false);
});
test('the compact shared vehicle estimate survives JSON transport',()=>{
 const car=C.state(people('away'),true);
 const transported=JSON.parse(JSON.stringify(car));
 assert.equal(C.state(people('away'),false,transported).present,true);
 assert.equal(C.state(people('home'),false,transported).chargeOverride,false);
});
