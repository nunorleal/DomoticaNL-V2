/* A portable treetop. Placement, visibility and twinkling are entirely local. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const stage=$('plan-stage'),core=window.CasaChristmasTreeCore,plans=window.CasaPlans;
 const condados=!!plans;
 const key=(condados?'casa-leal':'casa-nl')+'-christmas-tree-v1';
 const geometry=window.BannerGeometry;
 const defaultPosition=condados?{floor:'3',room:'living',x:247,y:1110}:{room:'living',x:760,y:975};
 const check=$('show-christmas-tree');
 const localFile=window.location.protocol==='file:';
 const api=condados?{
  snapshot:()=>window.CasaCloudRead.appliancePowerSnapshot('christmasTree'),
  command:on=>window.CasaCloudRead.commandAppliance('christmasTree',on),
  refresh:()=>window.CasaCloudRead.refresh(true),
  meter:()=>window.CasaCloudRead.christmasTreeConsumption(),
  dirty:()=>window.CasaShellySetup.isDirty(),
  settings:()=>window.CasaShellySetup.openDevice('tree','christmasTree')
 }:{
  snapshot:()=>window.CasaShelly.christmasTreeSnapshot(),
  command:on=>window.CasaShelly.commandChristmasTree(on),
  refresh:()=>window.CasaShelly.refreshEquipment('christmasTree'),
  meter:()=>{
   const data=window.CasaShelly.consumptionSnapshot('christmasTree');
   return {power:data.reading?.power??null,fresh:data.fresh};
  },
  dirty:()=>window.CasaShelly.hasUnsavedChanges(),
  settings:()=>{
   $('open-shelly').click();
   $('shelly-christmas-tree-group').open=true;
   $('christmas-tree-id').focus();
  }
 };

 function polygons(p){
  if(!condados)return roomPolygons(p.room);
  const room=plans[p.floor]?.rooms.find(r=>r.id===p.room);
  return room?geometry.polygons(room.area):[];
 }
 function fits(p){
  if(!condados&&!window.CasaHeaterCore.ROOMS.includes(p.room))return false;
  return geometry.rectFits(polygons(p),p,core.SIZE,core.SIZE);
 }
 function locate(point,snap=false){
  const rooms=condados?plans[floor]?.rooms.map(r=>r.id).reverse():window.CasaHeaterCore.ROOMS;
  let roomUnderPointer=null;
  for(const room of rooms||[]){
   const candidate={...point,room,...(condados?{floor}:{})};
   if(fits(candidate))return candidate;
   if(snap&&!roomUnderPointer&&geometry.rectFits(polygons(candidate),candidate,1,1))roomUnderPointer=candidate;
  }
  return roomUnderPointer?nearestPosition(roomUnderPointer):null;
 }
 function nearestPosition(position){
  const area=polygons(position);
  if(!area.length)return null;
  const point=geometry.nearestFit(area,position,core.SIZE,core.SIZE);
  return point?{...position,x:point.x,y:point.y}:null;
 }
 function readPreferences(){
  if(localFile){
   try{
    const fallback=window.history.state?.[key];
    if(fallback)return core.preferences(fallback);
   }catch{}
  }
  try{return core.preferences(JSON.parse(localStorage.getItem(key)))}catch{return null}
 }
 const loaded=readPreferences();
 let saved={shown:loaded?.shown??true,position:loaded?.position||defaultPosition};
 if(!fits(saved.position))saved.position=nearestPosition(saved.position)||nearestPosition(defaultPosition)||defaultPosition;
 let active=null,svg=null,floor=null,suppress=0,commanding=false,localMessage='',storageMessage='';
 const instruction='Clique e arraste com o rato. No ecrã tátil, mantenha premido e arraste.'+(condados?' Largue nas escadas para mudar de piso.':'');

 const object=document.createElement('button');
 object.id='christmas-tree-object';
 object.type='button';
 object.className='christmas-tree-object';
 object.title=instruction;
 stage.append(object);

 function artwork(){
  const tree=document.createElement('span');
  tree.className='christmas-tree-art';
  tree.setAttribute('aria-hidden','true');
  for(let tier=0;tier<3;tier++){
   const foliage=document.createElement('span');
   foliage.className='christmas-foliage';
   foliage.style.setProperty('--tier',tier);
   const edges=Array.from({length:48},(_,i)=>{
    const angle=i*Math.PI/24+tier*.15;
    const radius=i%4===0?49:i%2===0?39:43+(i%3)*.9;
    return (50+Math.cos(angle)*radius).toFixed(1)+'% '+(50+Math.sin(angle)*radius).toFixed(1)+'%';
   });
   foliage.style.clipPath='polygon('+edges.join(',')+')';
   tree.append(foliage);
  }
  const bulbs=[[22,29],[40,19],[64,20],[77,35],[79,59],[64,78],[35,78],[19,62],[32,48],[49,31],[63,43],[60,60],[44,67],[38,38],[53,51],[73,48],[27,67]];
  for(const [i,[x,y]] of bulbs.entries()){
   const bulb=document.createElement('i');
   bulb.className='christmas-bulb';
   bulb.style.cssText='left:'+x+'%;top:'+y+'%;--bulb:'+['#ffd580','#ff7278','#8ce4ff','#b1ffae'][i%4]+';--delay:'+(-i*.31)+'s;--period:'+(2.2+(i%5)*.39)+'s';
   tree.append(bulb);
  }
  const star=document.createElement('i');
  star.className='christmas-star';
  tree.append(star);
  return tree;
 }
 object.append(artwork());

 const dialog=document.createElement('dialog');
 dialog.id='christmas-tree-dialog';
 dialog.className=(condados?'heater-popup':'popup')+' christmas-tree-popup';
 dialog.setAttribute('aria-labelledby','christmas-tree-title');
 const glyphs={
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  power:'<path d="M12 3v9M6.3 5.6a9 9 0 1 0 11.4 0"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15.7-6.3L21 8m0-5v5h-5m5 4a9 9 0 0 1-15.7 6.3L3 16m0 5v-5h5"/>',
  settings:'<path d="M10 2h4l.7 2.7 2 .9 2.4-1.4 2.8 2.8-1.4 2.4.9 2L24 12v3l-2.6.7-.9 2 1.4 2.4-2.8 2.8-2.4-1.4-2 .9L14 25h-4l-.7-2.6-2-.9-2.4 1.4-2.8-2.8 1.4-2.4-.9-2L0 15v-3l2.6-.6.9-2-1.4-2.4 2.8-2.8 2.4 1.4 2-.9L10 2Z" transform="translate(2 .5) scale(.83)"/><circle cx="12" cy="11.7" r="3.2"/>',
  timer:'<circle cx="12" cy="13" r="7.5"/><path d="M9 2h6m-3 0v3m0 4v4l3 2"/>'
 };
 function glyph(name){
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+glyphs[name]+'</svg>';
 }
 function action(id,label,icon){
  return '<button type="button" id="christmas-tree-'+id+'" class="tree-circle" aria-label="'+label+'" title="'+label+'">'+glyph(icon)+'</button>';
 }
 dialog.innerHTML='<button type="button" class="'+(condados?'close':'popup-close')+'" aria-label="Fechar árvore de Natal">'+glyph('close')+'</button>'+
  '<span class="eyebrow">DECORAÇÃO · EQUIPAMENTO MÓVEL</span>'+
  '<h2 id="christmas-tree-title">Árvore de Natal</h2><p id="christmas-tree-location"></p>'+
  '<div class="christmas-tree-preview"></div>'+
  '<div class="tree-power-row"><div><h3>Alimentação elétrica</h3><p id="christmas-tree-state" role="status"></p></div>'+
  '<div class="christmas-tree-actions"><div class="tree-power-action">'+
  action('power','Ligar luzes','power')+'<span id="christmas-tree-timer" class="tree-timer" role="img" aria-label="Temporizador ativo no Shelly" title="Temporizador ativo no Shelly" hidden>'+glyph('timer')+'</span></div>'+
  action('refresh','Atualizar leitura','refresh')+action('settings','Definições Shelly','settings')+'</div></div>'+
  '<p id="christmas-tree-message" role="status" hidden></p>'+
  '<section class="tree-consumption" aria-label="Consumo"><div class="consumption-heading"><h3>Consumo</h3><span id="christmas-tree-reading-kind"></span></div>'+
  '<div class="tree-meters"><div><span>Potência instantânea</span><strong id="christmas-tree-watts">—</strong></div>'+
  '<div><span>Consumo registado hoje</span><strong id="christmas-tree-today"></strong></div></div></section>';
 document.body.append(dialog);
 dialog.querySelector('.christmas-tree-preview').append(artwork());
 dialog.querySelector('button').addEventListener('click',()=>dialog.close());

 function displayPosition(p){
  if(condados){
   const matrix=svg?.getScreenCTM();
   if(!matrix)return;
   const q=new DOMPoint(p.x,p.y).matrixTransform(matrix);
   const rect=stage.getBoundingClientRect();
   object.style.left=(q.x-rect.left)+'px';
   object.style.top=(q.y-rect.top)+'px';
   const size=core.SIZE*Math.hypot(matrix.a,matrix.b);
   object.style.setProperty('--tree-width',size+'px');
  }else{
   object.style.left=p.x/10.24+'%';
   object.style.top=(p.y-140)/11.8+'%';
  }
 }
 function drawLighting(state,night,balconyDay){
  const p=saved.position;
  let darkness;
  if(condados){
   const light=window.CasaHome.lightingAt(p.floor,p.room,state,night,balconyDay);
   darkness=Math.min(1,light.opacity/.86)*(1-light.electricOpacity);
  }else{
   const room=rooms.find(r=>r.id===p.room);
   if(!room)return;
   darkness=window.CasaEnvironment.darkness(room,rooms);
  }
  const brightness=String(1-.62*Math.max(0,Math.min(1,darkness)));
  if(object.style.getPropertyValue('--tree-room-brightness')!==brightness){
   object.style.setProperty('--tree-room-brightness',brightness);
  }
 }
 function position(){
  object.hidden=!saved.shown||(condados&&saved.position.floor!==floor);
  if(!object.hidden&&!active?.moving)displayPosition(saved.position);
 }
 function syncVisibility(){
  check.setAttribute('aria-checked',String(saved.shown));
 }
 function storePreferences(){
  try{
   localStorage.setItem(key,JSON.stringify(saved));
  }catch{
   if(!localFile)return false;
   try{
    window.history.replaceState({...window.history.state,[key]:saved},'');
    return true;
   }catch{return false}
  }
  if(localFile){
   try{
    const state=window.history.state;
    if(state?.[key]){
     const clean={...state};
     delete clean[key];
     window.history.replaceState(clean,'');
    }
   }catch{}
  }
  return true;
 }
 function persist(next,publish=true){
  const previous=saved.position;
  saved=core.preferences(next);
  storageMessage=storePreferences()?'':'A posição e a visibilidade mantêm-se até recarregar a página.';
  syncVisibility();
  drawLighting();
  draw();
  position();
  if(publish&&['floor','room','x','y'].some(k=>previous[k]!==saved.position[k])){
   window.dispatchEvent(new CustomEvent('plantpositionchange',{detail:{setting:'christmas-tree',position:saved.position}}));
  }
  return true;
 }
 function applySharedPosition(next){
  if(active||['floor','room','x','y'].every(k=>saved.position[k]===next[k]))return;
  try{
   const clean=core.preferences({shown:saved.shown,position:next});
   if(fits(clean.position))persist(clean,false);
  }catch{}
 }
 function roomLabel(p){
  return condados?window.CasaRoomNames.get(p.floor,p.room):rooms.find(r=>r.id===p.room)?.name||p.room;
 }
 function draw(){
  const state=api.snapshot(),p=saved.position,on=state.on===true;
  const label=on?'Ligada':state.on===false?'Desligada':!state.configured?'Sem associação ativa':state.offline?'Shelly offline':'Estado por confirmar';
  object.dataset.power=dialog.dataset.power=on?'on':state.on===false?'off':'unknown';
  object.setAttribute('aria-label','Árvore de Natal · '+roomLabel(p)+' · '+label);
  if(!dialog.open)return;
  $('christmas-tree-location').textContent=(condados?plans[p.floor].name+' · ':'')+roomLabel(p);
  $('christmas-tree-state').textContent=label;
  const power=$('christmas-tree-power');
  power.title=on?'Desligar luzes':'Ligar luzes';
  power.setAttribute('aria-label',power.title);
  power.classList.toggle('is-on',on);
  $('christmas-tree-timer').hidden=!(on&&state.timerActive);
  power.disabled=commanding||!state.canControl||api.dirty();
  power.setAttribute('aria-pressed',state.on===null?'mixed':String(on));
  $('christmas-tree-refresh').disabled=!state.configured||api.dirty();
  const feedback=state.message==='Alimentação confirmada pelo Shelly'?'':state.message||'';
  const message=storageMessage||localMessage||(state.pending?'A aguardar confirmação do Shelly.':feedback);
  $('christmas-tree-message').hidden=!message;
  $('christmas-tree-message').textContent=message;
  const meter=api.meter();
  const hasPower=Number.isFinite(meter.power);
  $('christmas-tree-watts').textContent=hasPower?meter.power.toLocaleString('pt-PT',{maximumFractionDigits:1})+' W':'—';
  $('christmas-tree-reading-kind').textContent=hasPower?(meter.fresh?'Leitura atual':'Última leitura'):'Sem leitura atual';
  window.CasaDailyEnergy?.show($('christmas-tree-today'),'christmasTree');
 }
 function open(){
  localMessage='';
  if(condados){
   document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close()});
   if(!dialog.open)dialog.showModal();
  }else showPopup(dialog.id);
  draw();
  if(!condados)api.refresh();
 }
 object.addEventListener('click',event=>{
  event.stopPropagation();
  if(performance.now()<suppress)return;
  open();
 });
 $('christmas-tree-settings').addEventListener('click',()=>{dialog.close();api.settings()});
 $('christmas-tree-refresh').addEventListener('click',()=>{localMessage='';api.refresh();draw()});
 $('christmas-tree-power').addEventListener('click',async()=>{
  const state=api.snapshot();
  if(commanding||!state.canControl||api.dirty())return;
  localMessage='';
  commanding=true;
  draw();
  try{await api.command(!state.on)}catch(error){localMessage=error.message}
  finally{commanding=false;draw()}
 });
 syncVisibility();
 check.addEventListener('click',()=>persist({...saved,shown:!saved.shown}));
 function startDrag(event,mouse=false){
  if((!mouse&&!event.isPrimary)||event.button!==0||active||document.querySelector('dialog[open]'))return;
  const matrix=condados?svg?.getScreenCTM():null;
  if(condados&&!matrix)return;
  const rect=stage.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  suppress=0;
  active={mouse,id:mouse?null:event.pointerId,x:event.clientX,y:event.clientY,original:saved.position,
   inverse:matrix?.inverse(),rect,moving:false,target:null,stair:null};
  event.stopPropagation();
  if(mouse){
   // Prevent WebKit from starting a native drag or a selection over the artwork.
   event.preventDefault();
   object.focus({preventScroll:true});
  }else object.setPointerCapture(event.pointerId);
  window.dispatchEvent(new Event('portabledragchange'));
 }
 window.CasaPlanMove.bindItem(object,event=>{
  if(event.pointerType!=='mouse')startDrag(event);
 },{immediateMouse:true,description:instruction+' Use Alt+Enter para desbloquear e as setas para mover.'});
 let lastPointerType='';
 object.addEventListener('pointerdown',event=>{lastPointerType=event.pointerType});
 object.addEventListener('mousedown',event=>{if(lastPointerType!=='touch'&&lastPointerType!=='pen')startDrag(event,true)});
 object.addEventListener('dragstart',event=>event.preventDefault());
 function owns(event){
  if(!active)return false;
  return active.mouse?
   event.type==='mousemove'||event.type==='mouseup':
   event.pointerId===active.id;
 }
 function drag(event){
  if(!owns(event))return;
  const dx=event.clientX-active.x,dy=event.clientY-active.y;
  if(!active.moving&&Math.hypot(dx,dy)<7)return;
  event.preventDefault();
  event.stopPropagation();
  active.moving=true;
  const shift=active.inverse?new DOMPoint(dx,dy,0,0).matrixTransform(active.inverse):{x:dx/active.rect.width*1024,y:dy/active.rect.height*1180};
  const target={x:active.original.x+shift.x,y:active.original.y+shift.y};
  // The drawing stays at the last place where it fits, even when the pointer crosses a wall.
  active.pointerTarget=target;
  active.target=locate(target)||active.target;
  active.stair=condados?window.CasaHeaterCore.stairDestination(floor,target,plans,{width:core.SIZE,height:core.SIZE}):null;
  object.title=active.stair?'Largar para mover para '+plans[active.stair.floor].name:instruction;
  object.classList.add('dragging');
  object.classList.toggle('stairs-transfer',!!active.stair);
  displayPosition(active.stair?target:active.target||active.original);
 }
 function finish(event,mode='drop'){
  if(!active)return;
  const dragState=active;
  active=null;
  object.classList.remove('dragging','stairs-transfer');
  object.title=instruction;
  if(dragState.moving){
   event.preventDefault?.();
   event.stopPropagation?.();
   suppress=performance.now()+700;
   const shortcut=mode==='drop'?dragState.stair:null;
   const atPointer=mode==='drop'&&!shortcut&&dragState.pointerTarget?locate(dragState.pointerTarget,true):null;
   const next=mode==='cancel'?null:shortcut||atPointer||dragState.target;
   if(next&&persist({...saved,position:next})&&shortcut)window.CasaFloors.show(next.floor);
  }
  if(!dragState.mouse&&object.hasPointerCapture(dragState.id))object.releasePointerCapture(dragState.id);
  position();
  window.dispatchEvent(new Event('portabledragchange'));
 }
 const cancel=()=>finish({},'cancel');
 const settle=()=>finish({},'settle');
 function drop(event){
  if(!owns(event))return;
  drag(event);
  finish(event);
 }
 // Mouse release belongs to the window, including over a different element in the plan.
 window.addEventListener('mousemove',drag,true);
 window.addEventListener('mouseup',event=>{if(event.button===0)drop(event)},true);
 object.addEventListener('pointermove',drag);
 object.addEventListener('pointerup',drop);
 object.addEventListener('pointercancel',event=>{if(owns(event))finish(event,event.isTrusted?'settle':'cancel')});
 object.addEventListener('lostpointercapture',event=>{if(owns(event))finish(event,'settle')});
 // A second finger means a zoom gesture, not a placement.
 document.addEventListener('pointerdown',event=>{
  if(active&&event.pointerType==='touch'&&!event.isPrimary)cancel();
 },true);
 object.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&active){cancel();return}
  const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];
  if(!delta||!window.CasaPlanMove.isUnlocked(object))return;
  event.preventDefault();
  event.stopPropagation();
  const p=saved.position;
  const next=locate({x:p.x+delta[0],y:p.y+delta[1]});
  if(next)persist({...saved,position:next});
 });
 window.addEventListener('blur',settle);
 window.addEventListener('resize',()=>{settle();position()});
 window.addEventListener(condados?'energychange':'shellyactivitychange',draw);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();else draw()});
 setInterval(()=>{if(!document.hidden)draw()},1000);
 window.CasaChristmasTree={
  applySharedPosition,
  mount(next,id){cancel();svg=next;floor=id;position();drawLighting();draw()},
  position,open,drawLighting,roomId:()=>saved.position.room,
  snapshot:()=>core.preferences(saved),
  isDragging:()=>!!active
 };
 if(condados)window.CasaChristmasTree.mount($('plan-canvas').querySelector('svg'),window.CasaFloors?.current());
 position();
 if(!condados)drawLighting();
 draw();
})();
