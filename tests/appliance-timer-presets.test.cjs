const {test}=require('node:test'),assert=require('node:assert/strict'),S=require('../appliance-timer-store.js');
test('custom presets replace nearest extreme or middle, stay ordered and never duplicate',()=>{
 assert.deepEqual(S.learnPreset([5,10,15],30),[5,10,30]);assert.deepEqual(S.learnPreset([5,10,30],1),[1,10,30]);assert.deepEqual(S.learnPreset([5,10,15],11),[5,11,15]);assert.deepEqual(S.learnPreset([5,10,15],10),[5,10,15]);assert.deepEqual(S.learnPreset([1,5,15],10),[1,5,10]);
 for(const n of [0,-1,1441,1.5,NaN,'30'])assert.throws(()=>S.learnPreset([5,10,15],n));
});
test('presets persist per appliance, tolerate missing/broken storage and validate backup values',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},open=role=>S.presets({storage,role});
 assert.deepEqual(open('heater-dialog').get(),[5,10,15]);open('heater-dialog').remember(30);assert.deepEqual(open('heater-dialog').get(),[5,10,30]);assert.deepEqual(open('dehumidifier-dialog').get(),[5,10,15]);open('dehumidifier-dialog').remember(1);assert.deepEqual(open('dehumidifier-dialog').get(),[1,10,15]);
 assert.deepEqual(S.presetSettings(JSON.parse(map.get(S.PRESET_KEY))),{'heater-dialog':[5,10,30],'dehumidifier-dialog':[1,10,15]});
 for(const v of [null,[],{'other':[5,10,15]},{'heater-dialog':[5,5,10]},{'heater-dialog':[1,2,1441]}])assert.throws(()=>S.presetSettings(v));
 map.set(S.PRESET_KEY,'broken');assert.deepEqual(open('heater-dialog').get(),[5,10,15]);assert.doesNotThrow(()=>S.presets({storage:{getItem(){throw Error()},setItem(){throw Error()}},role:'heater-dialog'}).remember(30));
});
