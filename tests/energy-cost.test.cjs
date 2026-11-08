const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../energy-cost-core.js');
const D = require('../daily-energy-core.js');
const B = require('../energy-bill.js');

const day = '2026-10-08';
const slot = date => Date.parse(date) / C.SLOT;
const empty = {schemaVersion:1, enabled:true, versions:[], globalTotals:[]};
const vat = {start:'2026-09-09',end:'',normal:23,reduced:6,limit:0,period:'month',days:1};
function tariff(overrides = {}) {
 return C.tariff({...C.defaultDraft(), id:'edp', taxes:[vat], iec:{enabled:false,price:0.001,vat:23}, ...overrides});
}
function consumption(offPeak, peak, date = day, partial = false) {
 return {observed:true, partial, kWh:offPeak+peak, slots:{
  [slot(date+'T02:00:00Z')]:offPeak,
  [slot(date+'T13:00:00Z')]:peak,
 }};
}
function calculate(row, overrides = {}) {
 return C.calculate({days:{[day]:row}, start:day, end:day,
  config:{...empty, versions:[tariff()]}, ...overrides});
}
const near = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-8, actual + ' != ' + expected);

test('all energy in off-peak', () => near(calculate(consumption(10,0)).energy, 0.8952));
test('all energy in peak', () => near(calculate(consumption(0,10)).energy, 1.548));
test('EDP mixed reference, no second discount', () => {
 const result = calculate(consumption(694,202));
 assert.deepEqual(result.kWh,{flat:0,offPeak:694,shoulder:0,peak:202});
 near(result.energy,93.39648);
 assert.ok(Math.abs(result.energy-93.39)<0.01);
 assert.equal(result.energy.toFixed(2),'93.40');
 near(calculate(consumption(6,4)).energy,1.15632);
});
test('Lisbon clock follows summer and winter UTC offsets and the repeated hour', () => {
 const t = tariff();
 assert.equal(C.localBand(t,slot('2026-10-24T07:00:00Z')),'peak');
 assert.equal(C.localBand(t,slot('2026-10-25T07:00:00Z')),'offPeak');
 for (const at of ['2026-10-25T00:30:00Z','2026-10-25T01:30:00Z']) assert.equal(C.localBand(t,slot(at)),'offPeak');
});
test('mid-month price change splits days and keeps the previous price', () => {
 const next = tariff({id:'next',priceStart:'2026-10-09',prices:{offPeak:0.2,peak:0.3}});
 const r = calculate(null,{days:{[day]:consumption(1,0),'2026-10-09':consumption(1,0,'2026-10-09')},
  end:'2026-10-09', config:{...empty,versions:[tariff(),next]}});
 near(r.energy,0.08952+0.2);
 assert.equal(calculate(consumption(1,0),{config:{...empty,versions:[next]}}).total,null);
});
test('20% discount on gross prices matches already-discounted prices', () => {
 const raw = tariff({discounted:false,prices:{offPeak:0.1119,peak:0.1935}});
 const r = calculate(consumption(6,4),{config:{...empty,versions:[raw]}});
 near(r.energy,1.15632);
 near(r.discount,1.4454*0.2);
});
test('normal VAT and IEC are applied once with independent rates', () => {
 const t = tariff({iec:{enabled:true,price:0.001,vat:23}});
 const r = calculate(consumption(6,4),{config:{...empty,versions:[t]}});
 near(r.iec,0.01);
 near(r.vat,(1.15632+0.01)*0.23);
 near(r.total,(1.15632+0.01)*1.23);
});
test('reduced VAT uses the confirmed global limit and normal-rate fallback', () => {
 const t = tariff({taxes:[{...vat,limit:100,period:'day'}]});
 const base = {...empty,versions:[t]};
 const r = calculate(consumption(10,0),{config:{...base,globalTotals:[{start:day,end:day,kWh:80}]}});
 near(r.vat,0.8952*0.06);
 assert.equal(r.quality,'estimated');
 const conservative = calculate(consumption(10,0),{config:base,globalDays:{[day]:{observed:true,kWh:80,partial:true}}});
 near(conservative.vat,0.8952*0.23);
 assert.equal(conservative.conservative,true);
});
test('global eligibility is shared across devices with no duplicated energy or tax', () => {
 const t = tariff({taxes:[{...vat,limit:100,period:'day'}],iec:{enabled:true,price:0.001,vat:23}});
 const cfg = {...empty,versions:[t],globalTotals:[{start:day,end:day,kWh:200}]};
 const a = calculate(consumption(80,0),{config:cfg});
 const b = calculate(consumption(0,120),{config:cfg});
 const whole = calculate(consumption(80,120),{config:cfg});
 near(a.total+b.total,whole.total);
 near(a.iec+b.iec,0.2);
 near(whole.vat,whole.energy*(0.23+0.06)/2+0.2*0.23);
});
test('bi-hourly totals with missing time data are unavailable, simple tariffs still work', () => {
 const row = {observed:true,partial:true,kWh:4};
 assert.equal(calculate(row).quality,'unavailable');
 const flat = tariff({type:'simple',prices:{flat:0.15}});
 near(calculate(row,{config:{...empty,versions:[flat]}}).energy,0.6);
});
test('missing days are shown as partial, and missing metering is unavailable', () => {
 const result = calculate(consumption(1,0),{end:'2026-10-10',today:'2026-10-10'});
 assert.equal(result.partial,true);
 assert.equal(result.quality,'estimated');
 assert.equal(calculate({observed:false,kWh:0}).total,null);
});
test('custom cycle and VAT changes use the dates entered by the user', () => {
 const next = tariff({id:'flat',type:'simple',cycle:'custom',priceStart:day,prices:{flat:0.2},
  taxes:[vat,{...vat,start:day,normal:10,reduced:6}]});
 const r = calculate(consumption(3,2),{config:{...empty,versions:[tariff(),next]}});
 near(r.energy,1);
 near(r.vat,0.1);
 assert.throws(()=>tariff({schedule:[{from:0,to:16,season:'all',day:'all',band:'offPeak'}]}),/lacunas/);
});
test('incomplete PDF preview keeps missing and ambiguous fields out of suggestions', () => {
 const r = B.parse('EDP Comercial\nPotência contratada 6,9 kVA\nCiclo diário\nEnergia em vazio 0,1119 €/kWh\nEnergia em vazio 0,1130 €/kWh\nEnergia fora de vazio 0,1935 €/kWh\nDesconto 20%\nIVA 6%\nIVA 23%');
 assert.deepEqual(r.fields,{supplier:'EDP Comercial',power:6.9,cycle:'daily',peak:0.1935,discount:20});
 assert.deepEqual(r.ambiguous,['offPeak']);
 assert.deepEqual(r.vatCandidates,[6,23]);
 assert.equal(r.fields.start,undefined);
});
test('euro visibility is reversible without changing stored tariffs', () => {
 const enabled = C.validate({...empty,versions:[tariff()]});
 const hidden = C.validate({...enabled,enabled:false});
 assert.equal(hidden.enabled,false);
 assert.deepEqual(hidden.versions,enabled.versions);
 assert.equal(C.validate({...hidden,enabled:true}).enabled,true);
});
test('existing ledger retains totals and associates short boundaries without double counting', () => {
 const key = D.identity('https://shelly-test.shelly.cloud',{deviceId:'deadbeef',channel:0});
 const ledger = D.create(null);
 ledger.record(key,10,Date.parse(day+'T06:59:00Z'));
 ledger.record(key,10.2,Date.parse(day+'T07:01:00Z'));
 const timed = ledger.history(key,day,day,true).days[day];
 near(timed.kWh,0.2);
 near(timed.slots[slot(day+'T06:30:00Z')],0.1);
 near(timed.slots[slot(day+'T07:00:00Z')],0.1);
 assert.equal(timed.split,true);
 assert.equal(ledger.history(key).days[day].slots,undefined);
 assert.deepEqual(D.validate(ledger.snapshot()),ledger.snapshot());
 // A long gap across tariffs remains in the daily total but has no price allocation.
 ledger.record(key,11,Date.parse(day+'T09:00:00Z'));
 assert.equal(calculate(ledger.history(key,day,day,true).days[day]).total,null);
});
