const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../offline-core.js'),H=require('../house-summary-core.js');
const fresh={online:true,fetchedAt:100000},goodRelay={...fresh,on:true,hasOutput:true};
function make(kind,key,status,extra={}){return {kind,key,status,deviceId:'deadbeef'+String(key||'01'),name:kind+' · '+key,configured:true,...extra}}
test('only confirmed, current reported offline rows display Offline; demo, old, unknown, failures and missing do not',()=>{
 const statuses=['ready','pending','stale','error','unavailable'];
 for(const status of statuses){const d=C.state([make('heater','heater',status)]);assert.equal(d.offline,false);assert.equal(d.count,0);assert.equal(d.text,'');assert.equal(d.partial,false)}
 for(const value of [false,0]){const r={...fresh,online:value},status=H.condition(r,false,100001);assert.equal(status,'offline');assert.equal(C.state([make('heater','heater',status)]).offline,true)}
 const d=C.state([make('heater','heater','offline')]);assert.deepEqual(d,{offline:true,count:1,total:1,grouped:false,partial:false,text:'Offline',names:['heater · heater'],title:'Offline reportado pela Shelly Cloud · heater · heater'});
 for(const config of [false,null,undefined]){const row=make('light','living','offline',{configured:config});assert.equal(C.state([row]).offline,config!==false)}
 assert.equal(C.state([{kind:'heater',key:'heater',configured:false,status:'offline',deviceId:'fake'}]).offline,false);
});
test('read quality keeps old offline separate from offline, and rejects invented offline from failed/invalid readings',()=>{
 const valid=true;
 for(const reading of [null,undefined,{}, {online:false},{online:0},{online:true},{...fresh,online:false,fetchedAt:1},{...fresh,online:false,error:true},{...fresh,online:false,missing:true},{...fresh,online:true,errors:['fault']},{...fresh,online:true,on:null}]){
  const status=H.condition(reading,false,100000);assert.notEqual(status,'offline');assert.equal(C.state([make('light','living',status)]).offline,false)
 }
 const before=H.condition({...fresh,online:0},false,100001),stale=H.condition({...fresh,online:0},false,145001),future=H.condition({...fresh,online:0},false,99999),failure=H.condition(null,false,100000,45000,100000);
 assert.equal(before,'offline');assert.equal(stale,'stale');assert.equal(future,'stale');assert.equal(failure,'error');assert.equal(H.condition({...fresh,online:0,error:true},false,100000),'error');assert.equal(H.condition({...fresh,online:0,missing:true},false,100000),'unavailable');assert.equal(H.condition({...fresh,error:true},false,145001),'stale');
});
test('multi-function physical IDs deduplicate, while each row keeps its own route and output state',()=>{
 const rows=[
  make('ev','meter','offline',{deviceId:'DEADBEEF0001',name:'Carregamento · medidor'}),
  make('ev','relay','offline',{deviceId:'deadbeef0001',name:'Carregamento · alimentação'}),
  make('ev','totalMeter','offline',{deviceId:'deadbeef0002',name:'Carregamento · total'}),
  make('energy','house','offline',{deviceId:'deadbeef0001',name:'Contador geral'})
 ];
 const ev=C.state(C.pick(rows,'ev'));assert.equal(ev.count,2);assert.equal(ev.total,2);assert.equal(ev.text,'2 Offline');assert.equal(ev.grouped,true);assert.equal(ev.partial,false);assert.equal(ev.names.length,3);assert.equal(C.state(C.pick(rows,'energy')).count,1);assert.equal(C.state(rows).count,2);
 assert.equal(C.state(C.pick(rows,'ev','relay')).text,'Offline');assert.equal(C.state(C.pick(rows,'ev','relay')).total,1);
 assert.deepEqual(rows.map(r=>r.status),['offline','offline','offline','offline']);
});
test('partial media and studio failures never label healthy parts offline and keep group counts explicit',()=>{
 const media=[make('media','tv','ready',{deviceId:'deadbeef0001'}),make('media','soundbar','pending',{deviceId:'deadbeef0002'}),make('media','vodafone','offline',{deviceId:'deadbeef0003'}),make('media','unifi','ready',{deviceId:'deadbeef0004'})];
 const d=C.state(C.pick(media,'media'));assert.equal(d.offline,true);assert.equal(d.count,1);assert.equal(d.total,4);assert.equal(d.text,'1 Offline');assert.equal(d.partial,true);assert.deepEqual(d.names,['media · vodafone']);
 assert.equal(C.state(C.pick(media,'media','tv')).offline,false);assert.equal(C.state(C.pick(media,'media','soundbar')).offline,false);assert.equal(C.state(C.pick(media,'media','vodafone')).offline,true);
 const studio=[make('office','monitor','ready'),make('office','apollo','offline')];const s=C.state(C.pick(studio,'office'));assert.equal(s.count,1);assert.equal(s.total,2);assert.equal(s.partial,true);assert.equal(C.state(C.pick(studio,'office','monitor')).offline,false);
});
test('scope selection separates lamps, sensors, contacts, blinds and other device types, normalizing singletons',()=>{
 const rows=[make('light','living','ready'),make('sensor','living','offline'),make('cover','living','offline'),make('window','living','ready'),make('heater','heater','offline'),make('fan','fan','offline'),make('dehumidifier','dehumidifier','offline'),make('media','living','offline')];
 const light=C.pick(rows,'light','living'),sensor=C.pick(rows,'sensor','living'),cover=C.pick(rows,'cover','living'),contact=C.pick(rows,'window','living');
 assert.equal(C.state(light).offline,false);assert.equal(C.state(sensor).offline,true);assert.equal(C.state(cover).offline,true);assert.equal(C.state(contact).offline,false);
 for(const kind of ['fan','heater','dehumidifier']){const selected=C.pick(rows,kind,'');assert.equal(selected.length,1);assert.equal(selected[0].key,kind);assert.equal(C.roleKey(kind,''),kind);assert.equal(C.roleKey(kind,kind),kind)}
 assert.equal(C.pick(rows,'light','missing').length,0);assert.equal(C.pick(rows,'sensor','living').length,1);
 for(const room of ['master','bedroom2','living','kitchen'])for(const kind of ['cover','window']){const row=make(kind,room,'offline');assert.equal(C.pick([row],kind,room).length,1);assert.equal(C.pick([row],kind,room+'-different').length,0)}
});
test('visual snapshots are immutable and offline flags clear after current online readings without changing power',()=>{
 const rows=[Object.freeze(make('heater','heater','offline',{on:true,brightness:70,position:75}))];Object.freeze(rows);
 const previous=JSON.stringify(rows),d=C.state(rows);assert.equal(d.offline,true);assert.equal(d.count,1);assert.equal(rows[0].on,true);assert.equal(rows[0].position,75);assert.equal(rows[0].brightness,70);assert.equal(JSON.stringify(rows),previous);
 const recovered=rows.map(r=>({...r,status:'ready'}));assert.equal(C.state(recovered).offline,false);assert.equal(C.state(recovered).text,'');assert.equal(C.state(recovered).count,0);assert.equal(recovered[0].on,true);assert.equal(recovered[0].brightness,70);assert.equal(recovered[0].position,75);
});
test('unbound simulation, online standby and load values cannot create an Offline badge',()=>{
 for(const watts of [0,.3,2,5,10,50,100,500])for(const online of [true,1]){
  const r={...goodRelay,online,power:watts},health=H.condition(r,typeof r.on==='boolean',100001),row=make('media','tv',health,{powerWatts:watts});assert.equal(health,'ready');assert.equal(C.state([row]).offline,false)
 }
 const simulated=make('heater','heater','offline',{configured:false,on:true,powerWatts:1250});assert.equal(C.state([simulated]).offline,false);assert.equal(C.state([simulated]).count,0);assert.equal(C.state([simulated]).total,0);
});
test('status labels use safe strings and do not expose physical IDs, server or credentials',()=>{
 const r=make('media','tv','offline',{deviceId:'deadbeef1234',authKey:'FAKE-SECRET',server:'https://private-server.invalid',name:'TV <example> & router'}),d=C.state([r]);
 assert.equal(d.title,'Offline reportado pela Shelly Cloud · TV <example> & router');assert.equal(d.text,'Offline');assert.ok(!JSON.stringify(d).includes('deadbeef1234'));assert.ok(!JSON.stringify(d).includes('FAKE-SECRET'));assert.ok(!JSON.stringify(d).includes('private-server.invalid'));
 const keys=Object.keys(d).sort();assert.deepEqual(keys,['count','grouped','names','offline','partial','text','title','total'].sort());
});

/* Minimal DOM double for the actual marker renderer: the app's markup and owner controls are preserved. */
class FakeElement{
 constructor(tag='button'){this.tagName=tag.toUpperCase();this.attrs=new Map();this.dataset={};this.children=[];this.parentElement=null;this.className='';this.style={};this.position='absolute';this.disabled=false;this.checked=false;this.value='';this._text='';this._html='';this.id='';this.events=new Map();
  const self=this;
  this.classList={contains(name){return self.className.split(/\s+/).includes(name)},add(...names){const set=new Set(self.className.split(/\s+/).filter(Boolean));for(const name of names)set.add(name);self.className=[...set].join(' ')},remove(...names){const gone=new Set(names);self.className=self.className.split(/\s+/).filter(n=>n&&!gone.has(n)).join(' ')},toggle(name,on){if(on===undefined)on=!this.contains(name);on?this.add(name):this.remove(name);return on}};
 }
 get classListValues(){return this.className.split(/\s+/).filter(Boolean)}
 set innerHTML(value){this._html=String(value);this._text='';this.children=[];if(value.includes('offline-symbol')){const glyph=new FakeElement('svg');glyph.className='offline-symbol';this.append(glyph)}if(value.includes('class="offline-text"')){const label=new FakeElement('span');label.className='offline-text';label.textContent='Offline';this.append(label)}}
 get innerHTML(){return this._html}
 set textContent(value){this._text=String(value??'');this._html='';this.children=[]}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('')}
 setAttribute(name,value){this.attrs.set(name,String(value));if(name==='class')this.className=String(value);if(name==='id')this.id=String(value);if(name.startsWith('data-')){const key=name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase());this.dataset[key]=String(value)}}
 getAttribute(name){if(name==='id')return this.id||null;if(name==='class')return this.className||null;return this.attrs.get(name)??null}
 hasAttribute(name){return this.getAttribute(name)!==null}
 removeAttribute(name){this.attrs.delete(name)}
 append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n)}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null}
 querySelector(selector){const list=this.querySelectorAll(selector);return list[0]||null}
 querySelectorAll(selector){const out=[];function visit(e){for(const child of e.children){if(selector.startsWith('.')&&child.classList.contains(selector.slice(1)))out.push(child);if(child.tagName.toLowerCase()===selector)out.push(child);if(selector.startsWith('#')&&child.id===selector.slice(1))out.push(child);if(selector.startsWith('[')&&selector.endsWith(']')&&child.hasAttribute(selector.slice(1,-1)))out.push(child);visit(child)}}visit(this);return out}
 addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,[]);this.events.get(name).push(fn)}
 click(){if(!this.disabled)for(const callback of this.events.get('click')||[])callback({target:this})}
 getBoundingClientRect(){return {x:0,y:0,width:60,height:50,left:0,top:0,right:60,bottom:50}}
 getBBox(){return {x:0,y:0,width:60,height:50}}
 getScreenCTM(){return {a:1,b:0,c:0,d:1,e:0,f:0}}
}
function rendererFixture(){
 const source=fs.readFileSync(require.resolve('../offline.js'),'utf8'),cut=source.indexOf(' function header('),callbacks=[],events=[],network=[],commands=[],storage=[];
 const document={hidden:false,createElement:tag=>new FakeElement(tag),getElementById:()=>null,createElementNS:(_,tag)=>new FakeElement(tag),documentElement:{classList:{contains:()=>false}},body:{dataset:{},classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(...args)=>events.push(args)};
 const window={addEventListener:(...args)=>events.push(args),CasaShelly:{houseSnapshot:()=>({deviceRows:[]}),refresh:()=>{network.push('refresh');throw Error('Unexpected read')},command:()=>{commands.push('command');throw Error('Unexpected command')}}};
 const context={window,document,CasaOfflineCore:C,CasaMediaCore:{KITCHEN_IDS:['dishwasher','washer','boiler']},Map,WeakMap,Set,Math,Number,Object,Array,String,Boolean,Date,getComputedStyle:e=>({position:e.position}),requestAnimationFrame:callback=>{callbacks.push(callback)},fetch:()=>{network.push('fetch');throw Error('Unexpected network')},localStorage:{setItem:()=>{storage.push('write');throw Error('Unexpected storage write')},getItem:()=>{storage.push('read');throw Error('Unexpected storage read')}},sessionStorage:{setItem:()=>{storage.push('write');throw Error('Unexpected session write')}}};
 vm.runInNewContext(source.slice(0,cut)+'\nwindow.__offlineRender={mark,badgeContent};\n})();',context);
 return {...context,mark:context.window.__offlineRender.mark,network,commands,storage,callbacks,events};
}
function badgeChildren(node){return node.children.filter(c=>c.classList.contains('shelly-offline-mark'))}
function offlineRows(name='Termoventilador',kind='heater',key='heater'){return [{deviceId:'deadbeef0001',kind,key,status:'offline',name,configured:true}]}
function readyRows(name='Termoventilador',kind='heater',key='heater'){return [{deviceId:'deadbeef0001',kind,key,status:'ready',name,configured:true}]}

test('marker is accessible, stable across updates and clears on recovery',()=>{
 const h=rendererFixture(),node=new FakeElement();node.setAttribute('aria-label','Abrir termoventilador');
 h.mark(node,offlineRows(),{plan:true});const badge=badgeChildren(node)[0];
 assert.equal(badge.getAttribute('role'),'img');assert.equal(badge.textContent,'Offline');
 h.mark(node,offlineRows(),{plan:true});assert.equal(badgeChildren(node).length,1);assert.equal(badgeChildren(node)[0],badge);
 assert.equal(node.getAttribute('aria-label'),'Abrir termoventilador · Offline');
 h.mark(node,readyRows(),{plan:true});assert.equal(badgeChildren(node).length,0);assert.equal(node.getAttribute('aria-label'),'Abrir termoventilador');
 assert.deepEqual([h.commands,h.network,h.storage],[[],[],[]]);
});
test('renderer preserves existing controls, last values and click navigation',()=>{
 const h=rendererFixture(),node=new FakeElement();node.disabled=true;node.checked=true;node.value='last reading';
 let opened=0;node.addEventListener('click',()=>opened++);
 for(const status of ['offline','pending','stale','error','unavailable','ready']){
  h.mark(node,[make('heater','heater',status)]);assert.equal(badgeChildren(node).length,status==='offline'?1:0);
  assert.equal(node.disabled,true);assert.equal(node.checked,true);assert.equal(node.value,'last reading');
 }
 node.disabled=false;node.click();assert.equal(opened,1);
});
test('owner label changes while offline survive recovery',()=>{
 const h=rendererFixture(),node=new FakeElement();node.setAttribute('aria-label','Original');h.mark(node,offlineRows());
 node.setAttribute('aria-label','Updated');h.mark(node,offlineRows());h.mark(node,readyRows());assert.equal(node.getAttribute('aria-label'),'Updated');
});
test('group badge identifies only failing members and updates in place',()=>{
 const h=rendererFixture(),node=new FakeElement(),rows=[make('media','tv','ready'),make('media','router','offline')];
 h.mark(node,rows);const badge=badgeChildren(node)[0];assert.equal(badge.textContent,'1 Offline');assert.ok(badge.title.includes('router'));assert.ok(!badge.title.includes('tv'));
 h.mark(node,rows.map(r=>({...r,status:'offline'})));assert.equal(badgeChildren(node)[0],badge);assert.equal(badge.textContent,'2 Offline');
});
test('contour-only targets do not get extra badges; contact overlays disappear on recovery',()=>{
 const h=rendererFixture(),halo=new FakeElement('circle'),contact=new FakeElement('span');
 h.mark(halo,offlineRows(),{contourOnly:true});assert.equal(halo.dataset.shellyOffline,'true');assert.equal(halo.children.length,0);
 h.mark(contact,offlineRows(),{plan:true,hiddenUnlessOffline:true});assert.equal(contact.hidden,false);
 h.mark(contact,readyRows(),{plan:true,hiddenUnlessOffline:true});assert.equal(contact.hidden,true);assert.equal(contact.children.length,0);
});
