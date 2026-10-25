const {test}=require('node:test'),assert=require('node:assert/strict'),B=require('../backup-core.js');
const ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
function data(){return {'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null}}}
test('popup legend visibility roundtrips independently, supports old backups and rejects invalid imports',()=>{
 const wrap=value=>JSON.stringify({application:'Casa NL',schemaVersion:1,data:value}),a='casa-nl-media-device-labels-v1',b='casa-nl-office-device-labels-v1';
 assert.equal(Object.hasOwn(B.parse(wrap(data())).data,a),false);
 const parsed=B.parse(wrap({...data(),[a]:false,[b]:true}));assert.equal(parsed.data[a],false);assert.equal(parsed.data[b],true);
 for(const key of [a,b])for(const invalid of ['false',null,0,{}])assert.throws(()=>B.parse(wrap({...data(),[key]:invalid})));
});
