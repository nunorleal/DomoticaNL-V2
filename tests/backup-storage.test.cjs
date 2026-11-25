const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../backup-storage.js');
function storage(data={},limit=1000){const map=new Map(Object.entries(data));return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,removeItem:k=>map.delete(k),setItem(k,v){const next=new Map(map);next.set(k,v);if([...next.values()].reduce((n,v)=>n+v.length,0)>limit)throw Object.assign(new Error('quota'),{name:'QuotaExceededError'});map.set(k,v)}}}
test('quota recovery evicts only weather data, preserving photos, histories, auth and unrelated keys',()=>{
 const s=storage({'wc-weather-40.15--8.86':'x'.repeat(60),'casa-nl-weather-v1':'x'.repeat(5),photo:'portrait',history:'old',auth:'secret',unrelated:'keep'},100);
 B.write(s,[['history','n'.repeat(40)]]);assert.equal(s.getItem('history').length,40);assert.equal(s.getItem('photo'),'portrait');assert.equal(s.getItem('auth'),'secret');assert.equal(s.getItem('unrelated'),'keep');assert.equal(s.getItem('wc-weather-40.15--8.86'),null);
});
test('replacement releases all replaced entries first, avoiding transient quota failures',()=>{
 const s=storage({a:'a'.repeat(40),b:'b'.repeat(40)},100);B.write(s,[['a','a'.repeat(60)],['b','b'.repeat(20)]]);assert.equal(s.getItem('a').length,60);assert.equal(s.getItem('b').length,20);
});
test('insufficient space restores previous data and distinguishes quota from JSON size',()=>{
 const s=storage({a:'original',b:'keep'},20),before=new Map(s.map);
 assert.throws(()=>B.write(s,[['a','n'.repeat(40)],['new','new']]),e=>e.code==='quota'&&e.restored&&/não é o tamanho/.test(e.message));assert.deepEqual(s.map,before);
});
test('a mid-write failure restores keys removed for T2 and keeps unrelated state',()=>{
 const s=storage({old:'old',a:'before',other:'keep'}),set=s.setItem;s.setItem=(k,v)=>{if(k==='fail')throw Error('fake');set(k,v)};
 assert.throws(()=>B.write(s,[['a','after'],['fail','new']],['old']),e=>e.code==='write'&&e.restored);assert.equal(s.getItem('old'),'old');assert.equal(s.getItem('a'),'before');assert.equal(s.getItem('other'),'keep');assert.equal(s.getItem('fail'),null);
});
test('a browser policy block is reported separately without claiming the JSON is large',()=>{
 const s=storage({old:'original'});s.removeItem=()=>{throw Object.assign(Error('policy'),{name:'SecurityError'})};
 assert.throws(()=>B.write(s,[['old','replacement']]),e=>e.code==='blocked'&&e.restored&&/bloqueou/.test(e.message));assert.equal(s.getItem('old'),'original');
});
