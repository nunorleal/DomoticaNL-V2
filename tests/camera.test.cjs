const test=require('node:test'),assert=require('node:assert/strict'),C=require('../camera-core.js');
test('camera accepts an exact HTTPS UniFi shared link or removal, never console credentials',()=>{
 assert.deepEqual(C.config({url:' https://monitor.ui.com/00000000-1111-2222-3333-444444444444 '}),{url:'https://monitor.ui.com/00000000-1111-2222-3333-444444444444'});
 assert.deepEqual(C.config({url:''}),{url:''});
 for(const url of ['http://monitor.ui.com/00000000-1111-2222-3333-444444444444','https://monitor.ui.com.evil.test/00000000-1111-2222-3333-444444444444','https://user:secret@monitor.ui.com/00000000-1111-2222-3333-444444444444','javascript:alert(1)','https://monitor.ui.com/00000000-1111-2222-3333-444444444444?secret=1','https://192.168.10.1/protect'])assert.throws(()=>C.config({url}));
 for(const value of [null,[],{url:5}])assert.throws(()=>C.config(value));
});
