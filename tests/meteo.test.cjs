const {test}=require('node:test');const assert=require('node:assert/strict');
const {idle,preferences}=require('../meteo-core.js');
test('screensaver opens once after 30 seconds; returning resets deadline',()=>{
 let now=0,opens=0;const timer=idle({now:()=>now,onIdle:()=>opens++});
 now=29999;timer.tick();assert.equal(opens,0);now=30000;timer.tick();assert.equal(opens,1);timer.tick();assert.equal(opens,1);
 timer.setActive(true);now=59999;timer.tick();assert.equal(opens,1);now=60000;timer.tick();assert.equal(opens,2);
});
test('interaction resets idle deadline; hidden Meteo interactions cannot reopen it',()=>{
 let now=0,opens=0;const timer=idle({now:()=>now,onIdle:()=>opens++});now=20000;timer.activity();now=40000;timer.tick();assert.equal(opens,0);now=50000;timer.tick();assert.equal(opens,1);
 timer.activity();now=100000;timer.tick();assert.equal(opens,1);
});
test('commands and hidden documents defer screensaver',()=>{
 let now=0,blocked=true,opens=0;const timer=idle({now:()=>now,blocked:()=>blocked,onIdle:()=>opens++});now=31000;timer.tick();assert.equal(opens,0);blocked=false;timer.tick();assert.equal(opens,1);
});
test('Meteo preferences contain presentation fields only',()=>{
 const p={seconds:true,clock12:false,animations:true,dynamic:true,night:'auto',start:'23:00',end:'07:00',dim:55,effects:50,cold:10,temp:'C',wind:'kmh',demo:'auto'};
 assert.deepEqual(preferences(p),p);assert.deepEqual(preferences({}),{});
 for(const p of [{authKey:'secret'},{city:{}},{lampReady:true},{dim:101},{start:'25:00'},{seconds:'yes'},{night:'invalid'},null,[]])assert.throws(()=>preferences(p));
});
test('Meteo lamp uses only the configured master, explicit inverse state, no retries',async()=>{
 const {lampAction}=require('../meteo-core.js');const calls=[];let lamp={configured:true,busy:false,ready:true,state:{on:false}};
 const api={lampSnapshot:id=>(assert.equal(id,'master'),lamp),commandLight:async(id,on)=>calls.push([id,on]),refresh:async()=>calls.push('read')};
 await lampAction(api,()=>calls.push('settings'));assert.deepEqual(calls,[['master',true]]);
 lamp.state.on=true;await lampAction(api,()=>{});assert.deepEqual(calls.at(-1),['master',false]);
 api.commandLight=async()=>{calls.push('failed');throw Error('rejected')};await assert.rejects(lampAction(api,()=>{}));assert.equal(calls.filter(c=>c==='failed').length,1);
});
test('unknown, stale or busy lamps never actuate; missing binding opens central settings',async()=>{
 const {lampAction}=require('../meteo-core.js');let reads=0,commands=0,settings=0;
 const api={lampSnapshot:()=>({configured:true,busy:false,ready:false,state:null}),refresh:async()=>reads++,commandLight:async()=>commands++};
 await lampAction(api,()=>settings++);assert.equal(reads,1);assert.equal(commands,0);
 api.lampSnapshot=()=>({configured:true,busy:true,ready:false,state:null});await lampAction(api,()=>settings++);assert.equal(reads,1);
 api.lampSnapshot=()=>({configured:false});await lampAction(api,()=>settings++);assert.equal(settings,1);assert.equal(commands,0);
});
test('Meteo preferences roundtrip with Casa backup; invalid imports preserve prior data',()=>{
 const B=require('../backup-core.js'),ids=['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'];
 const data={'casa-nl-realistic-v2':ids.map((id,i)=>({id,light:false,...(i<4?{blind:0}:{})})),'casa-nl-room-layout-v1':Object.fromEntries(ids.map(id=>[id,{name:null,lx:50,ly:50}])),'casa-nl-show-banners':true,'casa-nl-environment-v1':{mode:'auto',city:null},'casa-nl-meteo-v1':{seconds:true,temp:'F',night:'auto',focusSeconds:60,nightUntilBlindOpen:true,nightPalette:'red',redSchedule:'custom',redStart:'22:30',redEnd:'07:15'},'casa-nl-screensaver-v1':{seconds:300}};
 const m=new Map(Object.entries(data).map(([k,v])=>[k,JSON.stringify(v)])),storage={get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 const backup=B.parse(JSON.stringify(B.create(storage,'1.33')));B.restore(storage,backup);assert.deepEqual(JSON.parse(storage.getItem('casa-nl-meteo-v1')),data['casa-nl-meteo-v1']);
 assert.deepEqual(JSON.parse(storage.getItem('casa-nl-screensaver-v1')),{seconds:300});
 const previous=storage.getItem('casa-nl-screensaver-v1');backup.data['casa-nl-screensaver-v1'].seconds=-1;assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-screensaver-v1'),previous);backup.data['casa-nl-screensaver-v1'].seconds=300;
 const before=storage.getItem('casa-nl-meteo-v1');backup.data['casa-nl-meteo-v1'].seconds='invalid';assert.throws(()=>B.restore(storage,backup));assert.equal(storage.getItem('casa-nl-meteo-v1'),before);
});
test('changing the screensaver duration starts a fresh full countdown',()=>{
 let now=0,opens=0;const timer=idle({now:()=>now,onIdle:()=>opens++});now=29000;timer.setDelay(120000);now=148999;timer.tick();assert.equal(opens,0);now=149000;timer.tick();assert.equal(opens,1);
 timer.setDelay(15000);now=200000;timer.tick();assert.equal(opens,1);timer.setActive(true);now=214999;timer.tick();assert.equal(opens,1);now=215000;timer.tick();assert.equal(opens,2);
});
test('disabled screensaver stays inactive until a duration is selected again',()=>{
 let now=0,opens=0;const timer=idle({now:()=>now,delay:0,onIdle:()=>opens++});now=86400000;timer.tick();assert.equal(opens,0);timer.setDelay(60000);now+=59999;timer.tick();assert.equal(opens,0);now++;timer.tick();assert.equal(opens,1);
});
test('screensaver backup settings accept supported durations and reject malformed values',()=>{
 const C=require('../meteo-core.js');for(const seconds of [0,15,30,60,120,300,600,900,1800])assert.deepEqual(C.screensaver({seconds}),{seconds});
 for(const value of [null,[],{},30,{seconds:'30'},{seconds:-1},{seconds:NaN},{seconds:31},{seconds:30,extra:true}])assert.throws(()=>C.screensaver(value));
});

test('Real temperature bridge exposes only sensor reading and quality; missing, offline and stale never masquerade as current',()=>{
 const C=require('../meteo-core.js'),binding={deviceId:'10521c0752cc',temperatureChannel:0},r={online:true,temperature:18.4,fetchedAt:100,authKey:'NEVER-EXPOSE',deviceId:'private'};
 assert.deepEqual(C.realTemperature(binding,r,101),{configured:true,temperature:18.4,status:'current'});assert.equal(C.realTemperature(binding,{...r,temperature:-3.5},101).temperature,-3.5);
 for(const bad of [{...r,online:false},{...r,error:true},{...r,fetchedAt:-200000},{...r,fetchedAt:102}])assert.equal(C.realTemperature(binding,bad,101).status,'last');
 for(const value of [null,undefined,NaN,Infinity,'18',151]){const d=C.realTemperature(binding,{...r,temperature:value},101);assert.equal(d.temperature,null);assert.equal(d.status,'unavailable')}
 assert.equal(C.realTemperature(binding,null,101).status,'pending');assert.deepEqual(C.realTemperature(null,r,101),{configured:false,temperature:null,status:'unconfigured'});
});

test('night palette accepts red or existing color and rejects malformed preferences',()=>{for(const nightPalette of ['red','color'])assert.deepEqual(preferences({nightPalette}),{nightPalette});for(const nightPalette of ['blue',true,0,null])assert.throws(()=>preferences({nightPalette}));assert.deepEqual(preferences({}),{})});

test('red hours handle midnight, daytime, boundaries and legacy night activation',()=>{const {redActive}=require('../meteo-core.js'),p={nightPalette:'red',redSchedule:'custom',redStart:'22:30',redEnd:'07:15'};for(const n of [0,434,1350,1439])assert.equal(redActive(p,n,false),true);for(const n of [435,900,1349])assert.equal(redActive(p,n,true),false);assert.equal(redActive({...p,redStart:'09:00',redEnd:'11:00'},600,false),true);assert.equal(redActive({...p,redStart:'09:00',redEnd:'11:00'},660,true),false);assert.equal(redActive({...p,redStart:'09:00',redEnd:'09:00'},800,false),true);assert.equal(redActive({nightPalette:'red'},800,true),true);assert.equal(redActive({nightPalette:'red'},800,false),false);assert.equal(redActive({...p,nightPalette:'color'},0,true),false)});
test('red schedule preferences validate before storage or import',()=>{const p={redSchedule:'custom',redStart:'22:30',redEnd:'07:15'};assert.deepEqual(preferences(p),p);for(const bad of [{redSchedule:'on'},{redStart:'24:00'},{redEnd:'07:60'},{redStart:12}])assert.throws(()=>preferences(bad))});


test('bedside blind option is optional, boolean and survives validated preferences',()=>{
 for(const nightUntilBlindOpen of [true,false])assert.deepEqual(preferences({nightUntilBlindOpen}),{nightUntilBlindOpen});
 for(const v of [1,'true',null,{},[]])assert.throws(()=>preferences({nightUntilBlindOpen:v}));assert.deepEqual(preferences({}),{});
});
test('only a current, confirmed calibrated bedroom blind at exactly 100% releases bedside',()=>{
 const {bedroomBlind}=require('../meteo-core.js'),b={deviceId:'deadbeef0001'},r={online:true,hasCover:true,calibrated:true,position:100,fetchedAt:1000,errors:[]};
 assert.equal(bedroomBlind(b,r,'ready',1001).open,true);
 for(const position of [0,50,99,99.9,null,NaN,101])assert.equal(bedroomBlind(b,{...r,position},'ready',1001).open,false);
 for(const patch of [{online:false},{calibrated:false},{hasCover:false},{error:true},{missing:true},{errors:['fault']},{fetchedAt:1002},{fetchedAt:-50000}])assert.equal(bedroomBlind(b,{...r,...patch},'ready',1001).open,false);
 for(const health of ['pending','stale','error','offline','unavailable',undefined])assert.equal(bedroomBlind(b,r,health,1001).open,false);
 assert.equal(bedroomBlind(null,r,'ready',1001).open,false);
});
test('red/night survive the scheduled end, reload and unknown readings until full opening',()=>{
 const {bedsideMode}=require('../meteo-core.js'),tick=(p,night,red,blindOpen=false)=>bedsideMode(p,{enabled:true,night,red,blindOpen});
 let s=tick(null,true,true);assert.equal(s.night,true);assert.equal(s.red,true);
 s=tick(JSON.parse(JSON.stringify(s)),false,false);assert.equal(s.night,true);assert.equal(s.red,true);
 s=tick(s,false,false);assert.equal(s.red,true);
 s=tick(s,false,false,true);assert.equal(s.night,false);assert.equal(s.red,false);
 s=tick(s,false,false);assert.equal(s.night,false);
 s=tick(s,true,true);assert.equal(s.red,true); // next scheduled period arms again
});
test('independent red and night schedules retain their own presentation without inventing red',()=>{
 const {bedsideMode}=require('../meteo-core.js');
 let color=bedsideMode(null,{enabled:true,night:true,red:false});color=bedsideMode(color,{enabled:true});assert.equal(color.night,true);assert.equal(color.red,false);
 let red=bedsideMode(null,{enabled:true,night:false,red:true});red=bedsideMode(red,{enabled:true});assert.equal(red.night,true);assert.equal(red.red,true);
 assert.equal(bedsideMode(red,{enabled:false}).night,false);
});
test('opening during the schedule releases its hold; later closing does not rearm that period',()=>{
 const {bedsideMode}=require('../meteo-core.js');let s=bedsideMode(null,{enabled:true,night:true});
 s=bedsideMode(s,{enabled:true,night:true,blindOpen:true});assert.equal(s.night,true);assert.equal(s.holdNight,false);
 s=bedsideMode(s,{enabled:true,night:true,blindOpen:false});assert.equal(s.holdNight,false);
 s=bedsideMode(s,{enabled:true,night:false});assert.equal(s.night,false);
 assert.equal(bedsideMode(null,{enabled:true,night:false}).night,false); // enabling in daylight does not create a night period
});

test('morning blind button requires red, daylight and a confirmed fully closed blind',()=>{
 const {morningBlindVisible:v}=require('../meteo-core.js'),c={red:true,now:100,sunrise:100,sunset:200},b={ready:true,position:0};
 assert.equal(v(c,b),true);assert.equal(v({...c,now:199},b),true);
 for(const patch of [{red:false},{now:99},{now:200},{now:201},{sunrise:NaN},{sunset:NaN},{sunrise:201},{sunset:100},{sunset:86400101}])assert.equal(v({...c,...patch},b),false);
 for(const blind of [null,{ready:false,position:0},{ready:true,position:null},{ready:true,position:1},{ready:true,position:100}])assert.equal(v(c,blind),false);
});
test('morning action revalidates state at click, commands only master open, never retries',async()=>{
 const {morningBlindAction:a}=require('../meteo-core.js');let calls=[],b={ready:true,position:0},c={red:true,now:150,sunrise:100,sunset:200};
 const api={isBusy:()=>false,hasUnsavedChanges:()=>false,command:async(...args)=>{calls.push(args);return true}};
 assert.equal(await a(api,()=>b,()=>c),true);assert.deepEqual(calls,[['master','open']]);
 calls=[];b={ready:false,position:0};assert.equal(await a(api,()=>b,()=>c),false);assert.deepEqual(calls,[]);
 b={ready:true,position:0};c.red=false;assert.equal(await a(api,()=>b,()=>c),false);c.red=true;
 api.isBusy=()=>true;assert.equal(await a(api,()=>b,()=>c),false);api.isBusy=()=>false;api.hasUnsavedChanges=()=>true;assert.equal(await a(api,()=>b,()=>c),false);assert.deepEqual(calls,[]);
 api.hasUnsavedChanges=()=>false;api.command=async()=>{calls.push('rejected');return undefined};assert.equal(await a(api,()=>b,()=>c),false);assert.deepEqual(calls,['rejected']);
 api.command=async()=>{calls.push('error');throw Error('network')};await assert.rejects(a(api,()=>b,()=>c));assert.deepEqual(calls,['rejected','error']);
});

test('accepted morning opening releases manual/scheduled night only after confirmed 100%, until sunset',()=>{
 const {bedsideMode:m}=require('../meteo-core.js'),day={enabled:true,night:true,red:true,now:150,sunrise:100,sunset:300};
 let state=m(null,day);assert.equal(state.red,true);
 state=m(state,{...day,morningRequested:true});assert.equal(state.red,true);assert.equal(state.night,true);
 state=m(JSON.parse(JSON.stringify(state)),{...day,now:160,blindOpen:false});assert.equal(state.red,true);
 state=m(state,{...day,now:170,blindOpen:true});assert.equal(state.red,false);assert.equal(state.night,false);
 state=m(JSON.parse(JSON.stringify(state)),{...day,now:180,blindOpen:false});assert.equal(state.red,false);assert.equal(state.night,false);
 state=m(state,{...day,now:300,blindOpen:false});assert.equal(state.red,true);assert.equal(state.night,true);assert.equal(state.morningUntil,0);
 for(const patch of [{now:99},{now:300},{sunrise:NaN},{sunset:NaN}]){const r=m(null,{...day,...patch,morningRequested:true,blindOpen:true});assert.equal(r.red,true)}
 assert.equal(m(null,{...day,enabled:false,morningRequested:true,blindOpen:true}).night,false);
 assert.equal(m(null,{...day,blindOpen:true}).night,true); // opening without explicit morning action preserves schedule
});
