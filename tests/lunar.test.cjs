const {test}=require('node:test'),assert=require('node:assert/strict');
const {lunarState,lunarPath}=require('../meteo-src/lunar.cjs');
// Independent primary-phase dates: USNO, November 2026 (UTC).
test('lunar illumination agrees with USNO new/full/quarter reference dates',()=>{
 const nextNew=lunarState(Date.parse('2026-11-09T07:02Z')),full=lunarState(Date.parse('2026-11-24T14:53Z'));
 assert.ok(nextNew.fraction<.015);assert.ok(full.fraction>.985);
 const first=lunarState(Date.parse('2026-11-17T11:48Z')),last=lunarState(Date.parse('2026-12-01T06:08Z'));
 assert.ok(Math.abs(first.fraction-.5)<.04);assert.equal(first.waxing,true);
 assert.ok(Math.abs(last.fraction-.5)<.04);assert.equal(last.waxing,false);
});
test('projected illuminated shape has the correct area and side through a cycle',()=>{
 for(const fraction of [0,.05,.25,.5,.75,.95,1])for(const waxing of [true,false]){
  const points=[...lunarPath(fraction,waxing).matchAll(/[ML]([-.\d]+) ([-.\d]+)/g)].map(m=>[+m[1],+m[2]]);
  let area=0;for(let i=0;i<points.length;i++){const [x,y]=points[i],[a,b]=points[(i+1)%points.length];area+=x*b-y*a;}
  assert.ok(Math.abs(Math.abs(area)/2/(Math.PI*21*21)-fraction)<.003);
  if(fraction===.5)assert.ok(points.every(([x])=>waxing?x>=37:x<=37));
 }
});
test('dates and hemispheres do not require a network service',()=>{
 const a=lunarState(Date.parse('2026-11-01T21:52Z')),b=lunarState(Date.parse('2026-11-02T21:52Z'));
 assert.equal(a.waxing,false);assert.ok(a.fraction>b.fraction);assert.throws(()=>lunarState(NaN));
});
