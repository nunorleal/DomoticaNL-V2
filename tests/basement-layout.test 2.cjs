const {test}=require('node:test'),assert=require('node:assert/strict'),L=require('../basement-layout-core.js');
test('cellar layout preserves independent positions and rejects malformed/imported banner IDs',()=>{
 const v={cellar:{x:50,y:32},alarm:{x:30,y:78},ev:{x:50,y:105}};assert.deepEqual(L.layout(v),v);assert.deepEqual(L.layout({}),{});
 for(const v of [{car:{x:1,y:1}},{cellar:{x:200,y:1}},{alarm:{x:1,y:101}},{ev:{x:1,y:131}},{ev:{x:NaN,y:40}},null])assert.throws(()=>L.layout(v));
});
test('dragging clamps the whole banner, including oversized labels, inside its own bounds',()=>{
 const bounds={left:4,top:4,right:200,bottom:400};assert.deepEqual(L.clamp({x:-90,y:900},{width:80,height:60},bounds),{x:44,y:370});assert.deepEqual(L.clamp({x:500,y:0},{width:250,height:60},bounds),{x:102,y:34});
});
test('backup restores cellar positions and invalid imported coordinates do not change saved data',()=>{
 const B=require('../backup-core.js'),ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-basement-layout-v1':{cellar:{x:50,y:32},alarm:{x:30,y:78},ev:{x:50,y:105}}};
 const map=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.52')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-basement-layout-v1')),data['casa-nl-basement-layout-v1']);const before=storage.getItem('casa-nl-basement-layout-v1');backup.data['casa-nl-basement-layout-v1'].ev.x=200;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-basement-layout-v1'),before);
});
