const {test}=require('node:test'),assert=require('node:assert/strict'),H=require('../history-storage.js'),B=require('../backup-storage.js');
const KEY='casa-nl-daily-energy-v1';
function environment(limit=300000){class Storage{constructor(){this.map=new Map()}get length(){return this.map.size}key(i){return [...this.map.keys()][i]}getItem(k){return this.map.get(k)??null}removeItem(k){this.map.delete(k)}setItem(k,v){v=String(v);const next=new Map(this.map);next.set(String(k),v);if([...next.values()].reduce((n,v)=>n+v.length,0)>limit)throw Object.assign(Error('full'),{name:'QuotaExceededError'});this.map.set(String(k),v)}}const win={Storage,localStorage:new Storage()};return win}
const history=JSON.stringify({entries:Array.from({length:800},(_,i)=>({id:i,temperature:20.3,humidity:75.5,name:'Quarto · João 🏠',date:'2026-11-18'}))});
test('history compression is lossless for Unicode, numbers, zeros and large JSON; normal JSON remains readable',()=>{
 const packed=H.encode(history);assert.ok(packed.length<history.length/2);assert.equal(H.decode(packed),history);assert.equal(H.decode(history),history);assert.equal(H.decode(null),null);assert.equal(H.encode('0'),'0');
});
test('installation migrates only eligible history keys and exposes ordinary JSON to callers and backups',()=>{
 const win=environment(),s=win.localStorage;s.setItem(KEY,history);s.setItem('foreign-app',history);s.setItem('credentials','unchanged');const original=s.map.get('foreign-app');H.install(win);
 assert.ok(s.map.get(KEY).startsWith('@casa-lz1:'));assert.equal(s.getItem(KEY),history);assert.equal(s.getItem('foreign-app'),original);assert.equal(s.map.get('credentials'),'unchanged');assert.equal(H.install(win),false);
 const session=new win.Storage();session.setItem(KEY,history);assert.equal(session.map.get(KEY),history);
});
test('a backup fits alongside unrelated app data once its history is compacted; JSON export is portable',()=>{
 const win=environment(7000),s=win.localStorage;s.setItem('other-app','x'.repeat(2000));H.install(win);B.write(s,[[KEY,history],['settings','{"ok":true}']]);assert.equal(s.getItem(KEY),history);assert.equal(s.getItem('other-app'),'x'.repeat(2000));assert.deepEqual(JSON.parse(s.getItem(KEY)),JSON.parse(history));
});
test('failed migration retains the original history and damaged compressed values are detected',()=>{
 const win=environment(),s=win.localStorage;s.setItem(KEY,history);const set=win.Storage.prototype.setItem;win.Storage.prototype.setItem=function(k,v){if(String(v).startsWith('@casa-lz1:'))throw Error('blocked');return set.call(this,k,v)};H.install(win);assert.equal(s.map.get(KEY),history);assert.equal(s.getItem(KEY),history);
 const packed=H.encode(history);assert.throws(()=>H.decode(packed.replace(/^@casa-lz1:\d+:/,'@casa-lz1:1:')),/histórico/i);
});
