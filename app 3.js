'use strict';
// Retired camera integration: discard the former temporary share link.
try{localStorage.removeItem('casa-nl-camera-hall-v1')}catch{}
const paths={home:'M3 10.5 12 3l9 7.5M5 9v12h5v-7h4v7h5V9',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z|M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',blind:'M5 4h14M5 8h14M5 12h14M5 16h14M12 16v5',light:'M9 18h6M9 21h6M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4',settings:'M9.206 5.256 L10.576 4.840 L10.186 2.879 L13.814 2.879 L13.424 4.840 L14.794 5.256 L14.794 5.256 L16.056 5.930 L17.167 4.267 L19.733 6.833 L18.070 7.944 L18.744 9.206 L18.744 9.206 L19.160 10.576 L21.121 10.186 L21.121 13.814 L19.160 13.424 L18.744 14.794 L18.744 14.794 L18.070 16.056 L19.733 17.167 L17.167 19.733 L16.056 18.070 L14.794 18.744 L14.794 18.744 L13.424 19.160 L13.814 21.121 L10.186 21.121 L10.576 19.160 L9.206 18.744 L9.206 18.744 L7.944 18.070 L6.833 19.733 L4.267 17.167 L5.930 16.056 L5.256 14.794 L5.256 14.794 L4.840 13.424 L2.879 13.814 L2.879 10.186 L4.840 10.576 L5.256 9.206 L5.256 9.206 L5.930 7.944 L4.267 6.833 L6.833 4.267 L7.944 5.930 L9.206 5.256Z|M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0',refresh:'M3 12a9 9 0 0 1 15.36-6.36L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-15.36 6.36L3 16|M8 16H3v5',layers:'m12 3 10 6-10 6L2 9Zm-9 10 9 5 9-5M3 17l9 5 9-5',scan:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5',open:'M5 3h14M5 7h14M5 11h14M8 21l4-5 4 5',close:'M5 3h14M5 7h14M5 11h14M8 17l4 5 4-5',up:'m6 14 6-6 6 6M12 8v12',down:'m6 10 6 6 6-6M12 16V4',pause:'M9 5v14M15 5v14',moon:'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z','arrow-right':'M4 12h16m-6-6 6 6-6 6',shield:'M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6ZM8 12l3 3 5-6',x:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',room:'M3 21V3h18v18ZM9 3v8h12M3 15h6v6'};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"${['settings','refresh'].includes(name)?` class="ui-icon" data-ui-icon="${name}" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"`:''}>${(paths[name]||paths.home).split('|').map(d=>`<path d="${d}"/>`).join('')}</svg>`}
Object.assign(paths,{shutter:'M5 5h14M5 9h14M5 13h14M5 17h14',chevron:'m9 5 7 7-7 7',touch:'M9 12V5a2 2 0 0 1 4 0v6l4 1c2 0 3 2 2 4l-2 5H9l-5-7a2 2 0 0 1 3-2l2 2',sliders:'M3 6h18M3 18h18M7 3v6M17 15v6M3 12h18M13 9v6'});
function fillIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon))}fillIcons();
const defaults=[
{id:'master',name:'Quarto principal',short:'Quarto',description:'Zona de descanso · piso 0',light:false,blind:0,bx:84,by:18,lx:63,ly:17,wash:[41,3,42,25]},
{id:'bedroom2',name:'Quarto 2',short:'Quarto 2',description:'Segunda divisão · piso 0',light:false,blind:0,bx:84,by:39,lx:64,ly:43,wash:[46,31,37,25]},
{id:'living',name:'Sala',short:'Sala',description:'Zona de estar · piso 0',light:true,blind:60,bx:84,by:67,lx:40,ly:66,wash:[20,57,48,31]},
{id:'kitchen',name:'Cozinha',short:'Cozinha',description:'Zona de refeições · piso 0',light:true,blind:30,bx:86,by:87,lx:56,ly:86,wash:[25,76,58,18]},
{id:'bath1',name:'Casa de banho 1',short:'I.S. 01',description:'Instalação sanitária · piso 0',light:false,lx:23,ly:13,wash:[10,3,23,16]},
{id:'bath2',name:'Casa de banho 2',short:'I.S. 02',description:'Instalação sanitária · piso 0',light:false,lx:31,ly:46,wash:[22,39,17,17]},
{id:'hall',name:'Corredor',short:'Corredor',description:'Entrada e circulação · piso 0',light:true,lx:15,ly:47,wash:[10,25,12,47]},
{id:'balcony',name:'Varanda',short:'Varanda',description:'Espaço exterior · piso 0',light:false,lx:89,ly:83,wash:[83,77,11,16]}
];
let rooms=structuredClone(defaults), mode='blinds', selected='living', detailView='room', labels=true, showSensorReadings=true, showBlindBanners=true, toastTimer;
const motions=new Map();
try{showSensorReadings=localStorage.getItem('casa-nl-show-sensor-readings')!=='false';labels=localStorage.getItem('casa-nl-show-banners')!=='false';showBlindBanners=localStorage.getItem('casa-nl-show-blind-banners')!=='false'}catch{}
try{const saved=JSON.parse(localStorage.getItem('casa-nl-realistic-v2'));if(Array.isArray(saved))rooms=defaults.map(r=>{const s=saved.find(s=>s.id===r.id);if(!s)return r;return{...r,light:typeof s.light==='boolean'?s.light:r.light,...('blind'in r&&Number.isFinite(s.blind)?{blind:Math.max(0,Math.min(100,s.blind))}:{})}})}catch{}
function persist(){try{localStorage.setItem('casa-nl-realistic-v2',JSON.stringify(rooms))}catch{}}
function notify(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3400)}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function bannerName(r){return r.customName?r.name:(r.id==='bath1'||r.id==='bath2'?'WC':r.name)}
function persistRoomLayout(){try{localStorage.setItem('casa-nl-room-layout-v1',JSON.stringify(Object.fromEntries(rooms.map(r=>[r.id,{name:r.customName?r.name:null,lx:r.lx,ly:r.ly}]))))}catch{}}
function restoreRoomLayout(){try{const saved=JSON.parse(localStorage.getItem('casa-nl-room-layout-v1'))||{};for(const r of rooms){const v=saved[r.id];if(!v)continue;if(typeof v.name==='string'&&v.name.trim()&&v.name.length<=40){r.name=v.name.trim();r.customName=true}if(Number.isFinite(v.lx)&&Number.isFinite(v.ly)&&v.lx>=0&&v.lx<=100&&v.ly>=0&&v.ly<=100){const p={x:v.lx*10.24,y:140+v.ly*11.8};if(BannerGeometry.rectFits(roomPolygons(r.id),p,1,1)){r.lx=v.lx;r.ly=v.ly}}}}catch{}}
function current(){return rooms.find(r=>r.id===selected)}
function isCloudLight(id){return !!window.CasaShelly?.lightBinding(id)}
function lightValue(r){return isCloudLight(r.id)?window.CasaShelly.lightValue(r.id):r.light?'Ligada':'Desligada'}
function lightCaption(r){return isCloudLight(r.id)?window.CasaShelly.lightCaption(r.id):r.light?'Iluminação ligada · simulação':'Iluminação desligada · simulação'}
function isCloudRoom(id){return !!window.CasaShelly?.binding(id)}
function positionLabel(r){if(isCloudRoom(r.id)){const d=window.CasaShelly.reading(r.id);if(!Number.isFinite(d?.position))return '—';return Math.round(d.position)}return Math.round(r.blind)}
function blindAria(r){const p=positionLabel(r);return `Estore de ${r.name}, ${p==='—'?'posição por consultar':p+'% aberto'}. Abrir controlos`}
function blindText(r){if(isCloudRoom(r.id))return window.CasaShelly.roomCaption(r.id);return motions.has(r.id)?'Em movimento':r.blind===0?'Totalmente fechado':r.blind===100?'Totalmente aberto':'Parcialmente aberto'}

// Coordinates use the original image space; the SVG viewBox matches its CSS crop.
// Shared geometry for lighting and touch targets. The upper passage belongs to the
// main bedroom; the corridor starts between the doors, at image y=470.
// Sala/cozinha meet at y=1080, with a 2px floor-only overlap from kitchen y=1078
// to prevent day-render seams behind the sofa at fractional display scales.
// Cover the floor/trim right up to the shared wall: master ends at y=470,
// bedroom 2 starts at y=497. The white wall cap (y=470..490) stays separate.
const lightingZones={
master:'M354 169H837V470H119V367H354Z',
bedroom2:'M239 497H837V782H480V593H239Z M418 613H475V782H418Z',
bath1:'M119 175H333V348H119Z',
bath2:'M238 613H399V782H238Z',
hall:'M119 470H219V783H119Z',
living:'M119 805H837V1080H239V1034H119Z',
kitchen:'M239 1078H854V1220H239Z',
balcony:'M854 1072L955 1032V1220H854Z'
};
// Only floor/opening extensions: never include structural walls or their white caps.
// Doorway-only 2px overlaps prevent subpixel gaps between independently clipped renders.
// The two left-hand door thresholds in the user's reference are y=783..805 and 1034..1063.
const doorThresholdZones={
 master:'',
 bedroom2:'M217 502H241V593H217Z',
 bath1:'M119 348H210V369H119Z',
 bath2:'M219 706H238V783H219Z',
 hall:'M119 783H193V807H119Z',
 living:'M119 1034H193V1063H119Z',
 kitchen:'',
 balcony:''
};
// Restore the original day-render wall surfaces AFTER every night layer.
// Door openings and their floor thresholds are intentionally absent from this mask.
const whiteWallZones=[
 'M91 150H874V169H91Z',
 'M91 169H108V1063H91Z',
 'M861 169H874V1029H861Z',
 'M193 1034H218V1056H235V1245H216V1063H193Z',
 'M234 1223H974V1245H234Z',
 'M956 987H974V1245H956Z',
 'M794 1049L974 986V1008L854 1077H794Z',
 'M335 169H353V348H418V367H210V348H335Z',
 'M410 169H418V348H410Z',
 'M108 175H119V286H108Z',
 'M190 470H848V490H239V510H219V490H190Z',
 'M848 470H873V501H848Z',
 'M219 593H480V613H238V706H219Z',
 'M399 613H418V784H399Z',
 'M475 613H480V784H475Z',
 'M193 784H848V806H193Z',
 'M848 783H873V811H848Z'
];
// Snap orthogonal floor clips to screen pixels: adjacent anti-aliased clip edges
// otherwise expose a fine strip of the day render at doorways and room boundaries.
// Keep diagonal balcony edges and the independent white-wall mask smooth.
function drawRoomLighting(){
 const host=document.getElementById('light-washes');
 if(!host.querySelector('.room-lighting')){
  host.innerHTML=`<svg class="room-lighting" viewBox="0 140 1024 1180" preserveAspectRatio="none" aria-hidden="true"><defs>${Object.entries(lightingZones).map(([id,d])=>`<clipPath id="night-clip-${id}" clipPathUnits="userSpaceOnUse"><path d="${d} ${doorThresholdZones[id]||''}" fill="white" shape-rendering="${id==='balcony'?'auto':'crispEdges'}"/></clipPath>`).join('')}<clipPath id="white-wall-clip" clipPathUnits="userSpaceOnUse">${whiteWallZones.map(d=>`<path d="${d}" fill="white"/>`).join('')}</clipPath></defs>${Object.entries(lightingZones).map(([id,d])=>`<g data-light-zone="${id}">${window.CasaLamps.patch(id,'day')}${window.CasaDoor.patch(id,'day')}${window.CasaWindows.patch(id,'day')}<g class="room-night-render"><image href="assets/planta-noturna-sofa-v2.png" x="0" y="0" width="1024" height="1536" preserveAspectRatio="none" clip-path="url(#night-clip-${id})"/>${window.CasaLamps.patch(id,'night')}${window.CasaDoor.patch(id,'night')}${window.CasaWindows.patch(id,'night')}</g><g class="room-electric-render"><image href="assets/planta-noturna-iluminada.png" x="0" y="0" width="1024" height="1536" preserveAspectRatio="none" clip-path="url(#night-clip-${id})"/>${window.CasaLamps.patch(id,'electric')}${window.CasaDoor.patch(id,'electric')}${window.CasaWindows.patch(id,'electric')}</g></g>`).join('')}<image class="white-wall-overlay" href="assets/planta-realista-sofa-v2.png" x="0" y="0" width="1024" height="1536" preserveAspectRatio="none" clip-path="url(#white-wall-clip)"/></svg>`;
 }
 Object.keys(lightingZones).forEach(id=>{const r=rooms.find(r=>r.id===id),zone=host.querySelector(`[data-light-zone="${id}"]`);const opacity=window.CasaEnvironment.darkness(r,rooms);zone.classList.toggle('is-off',opacity>.5);zone.style.setProperty('--night-opacity',opacity);zone.style.setProperty('--electric-opacity',window.CasaEnvironment.electricOpacity(r,rooms));});
 window.CasaOffice?.syncPlan();window.CasaHeater?.drawLighting();window.CasaDehumidifier?.drawLighting();
}

const roomPolygonCache=new Map();
function roomPolygons(id){if(!roomPolygonCache.has(id))roomPolygonCache.set(id,BannerGeometry.polygons(lightingZones[id]+' '+(doorThresholdZones[id]||'')));return roomPolygonCache.get(id)}
function pinMaxWidth(r){const b=BannerGeometry.bounds(roomPolygons(r.id)),stage=document.getElementById('plan-stage').getBoundingClientRect();return Math.max(28,Math.min(220,(b.maxX-b.minX-12)*stage.width/1024))}
function blindLastReading(r){if(!isCloudRoom(r.id))return '';const d=window.CasaShelly.reading(r.id);return Number.isFinite(d?.position)&&(!d.online||d.error||!Number.isFinite(d.fetchedAt)||Date.now()-d.fetchedAt>120000)?'<small class="blind-last-reading">Última leitura</small>':''}
function blindBanner(r){return `<button class="blind-pin ${r.blind===0?'is-closed':''}" data-room="${r.id}" style="--x:${r.bx}%;--y:${r.by}%" aria-label="${escapeHTML(blindAria(r))}"><span class="blind-pin-icon">${icon('shutter')}</span><span class="blind-pin-copy"><span class="blind-pin-name">${escapeHTML(r.name)}</span><strong><span data-position="${r.id}">${positionLabel(r)}</span>%</strong>${blindLastReading(r)}</span></button>`}
function updateBlindBannerVisibility(){document.getElementById('hotspots').classList.toggle('blind-banners-hidden',!showBlindBanners);document.getElementById('toggle-blind-labels').setAttribute('aria-checked',String(showBlindBanners))}
function sensorBannerInfo(r){
 if(!window.CasaShelly?.sensorBinding(r.id))return null;
 const d=window.CasaShelly.sensorReading(r.id),format=v=>Number.isFinite(v)?v.toLocaleString('pt-PT',{maximumFractionDigits:1}):'—';
 const hasValues=Number.isFinite(d?.temperature)||Number.isFinite(d?.humidity),cached=hasValues&&(!d.online||d.error||Date.now()-d.fetchedAt>120000);
 const status=!d?'Por consultar':cached?'Última leitura':!hasValues?'Indisponível':'';
 return {text:format(d?.temperature)+' °C · '+format(d?.humidity)+' %',status,aria:`temperatura ${Number.isFinite(d?.temperature)?format(d.temperature)+' graus Celsius':'indisponível'}, humidade ${Number.isFinite(d?.humidity)?format(d.humidity)+' por cento':'indisponível'}${status?', '+status:''}`};
}
function roomBanner(r){
 const sensor=showSensorReadings?sensorBannerInfo(r):null;
 return `<button class="room-pin ${r.light?'':'is-off'}${sensor?' has-sensor':''}" data-room="${r.id}" style="--x:${r.lx}%;--y:${r.ly}%;--pin-max-width:${pinMaxWidth(r)}px" title="Duplo clique para mudar o nome; arraste para mover" aria-label="Abrir controlos de ${escapeHTML(r.name)}, luz ${lightValue(r)}${sensor?', '+escapeHTML(sensor.aria):''}"><span class="room-pin-name">${escapeHTML(bannerName(r))}</span>${sensor?`<small class="room-pin-sensor-values">${sensor.text.split(' · ').map(value=>`<span class="sensor-measure">${escapeHTML(value)}</span>`).join('<span class="sensor-separator" aria-hidden="true"> · </span>')}</small>${sensor.status?`<small class="room-pin-sensor-status">${sensor.status}</small>`:''}`:''}</button>`;
}
const blindWindowZones={master:[835,183,24,285],bedroom2:[835,500,24,297],living:[835,815,24,205],kitchen:[835,1085,24,173]};
function blindWindowTrigger(r){const [x,y,w,h]=blindWindowZones[r.id];return `<button type="button" class="blind-window-trigger" data-room="${r.id}" style="left:${(x+w/2)/10.24}%;top:${(y-140)/11.8}%;width:${w/10.24}%;height:${h/11.8}%" title="Estore de ${escapeHTML(r.name)} · abrir controlos" aria-label="Abrir controlos do estore de ${escapeHTML(r.name)} pela janela"></button>`}
function drawPlan(){
 const hits=Object.entries(lightingZones).map(([id,d])=>`<path class="room-hit" d="${d} ${doorThresholdZones[id]||''}" data-room="${id}" role="button" tabindex="0" aria-label="Abrir controlos de ${escapeHTML(rooms.find(r=>r.id===id).name)}"/>`).join('');
 document.getElementById('hotspots').innerHTML=`<svg class="room-hit-zones" viewBox="0 140 1024 1180" preserveAspectRatio="none">${hits}</svg>`+rooms.map(roomBanner).join('')+rooms.filter(r=>'blind'in r).map(blindWindowTrigger).join('')+rooms.filter(r=>'blind'in r).map(blindBanner).join('')+rooms.map(r=>window.CasaLamps?.trigger(r.id,escapeHTML(r.name))||'').join('');
 document.getElementById('hotspots').classList.toggle('labels-hidden',!labels);document.getElementById('toggle-labels').setAttribute('aria-checked',String(labels));document.getElementById('toggle-sensor-readings').setAttribute('aria-checked',String(showSensorReadings));updateBlindBannerVisibility();drawRoomLighting();
 requestAnimationFrame(()=>{if(bannerDrag)return;let changed=false;for(const r of rooms){if(!window.CasaShelly?.sensorBinding(r.id))continue;const x=r.lx,y=r.ly;fitBanner(r);changed=changed||x!==r.lx||y!==r.ly}if(changed)persistRoomLayout()});
}

function drawList(){document.getElementById('device-list').innerHTML=rooms.filter(r=>mode==='lights'||'blind'in r).map(r=>`<button class="device-item" data-room="${r.id}" aria-label="Selecionar ${escapeHTML(r.name)}" aria-pressed="${selected===r.id}"><span class="device-icon">${icon(mode==='blinds'?'blind':'light')}</span><span class="device-copy">${escapeHTML(r.name)}<small>${escapeHTML(mode==='blinds'?blindText(r):lightCaption(r))}</small></span>${mode==='blinds'?`<b class="device-percent"><span data-position="${r.id}">${positionLabel(r)}</span>%</b>`:`<span class="light-state-value ${r.light?'on':''}">${escapeHTML(lightValue(r))}</span>`}</button>`).join('')}
function drawDetail(){
 const r=current();if(detailView==='blind')return drawBlindDetail(r);
 document.getElementById('detail-card').innerHTML=`<div class="detail-eyebrow">${detailView==='light'?'CONTROLOS DO CANDEEIRO':'CONTROLOS DA DIVISÃO'}</div><h2 id="room-title">${detailView==='light'?'Candeeiro · ':''}${escapeHTML(r.name)}</h2><p class="detail-subtitle">${r.description}</p><div class="detail-divider light-control"><div class="detail-row"><div><h3>Iluminação</h3><p class="room-light-caption">${escapeHTML(window.CasaEnvironment.roomDescription(r,rooms))}</p></div><button class="switch shelly-light-power" role="switch" aria-checked="${r.light}" aria-label="Iluminação de ${escapeHTML(r.name)}" id="light-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9m-5-7a9 9 0 1 0 10 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div></div><p class="selected-device-note">${icon('shield')}Demonstração · sem ligação à Shelly</p>`;
 window.CasaShelly?.decorateRoom(r,detailView);
 if(detailView==='light'){const b=document.createElement('button');b.className='secondary-action lamp-settings';b.type='button';b.setAttribute('aria-label','Definições Shelly do candeeiro');b.title='Definições Shelly do candeeiro';b.innerHTML=icon('settings');b.addEventListener('click',()=>{document.getElementById('open-shelly').click();const input=document.getElementById('shelly-light-id-'+r.id);if(input)input.closest('details').open=true;input?.scrollIntoView({block:'center'});input?.focus()});document.getElementById('detail-card').append(b)}
 window.CasaDeviceEnergy?.room(r);

}

function drawBlindDetail(r){
 document.getElementById('detail-card').innerHTML=`<div class="detail-eyebrow">CONTROLOS DO ESTORE</div><h2 id="room-title">Estore · ${escapeHTML(r.name)}</h2><div class="detail-divider"><div class="detail-row"><div><h3>Estore</h3><p id="detail-status">${blindText(r)}</p></div><span>${icon('blind')}</span></div><div class="window-scene" aria-hidden="true"><div class="window-outside"></div><div class="window-blind" style="height:${100-r.blind}%"></div></div><div class="position-value"><span>Abertura</span><strong><span id="detail-percent">${positionLabel(r)}</span><em>%</em></strong></div><div class="range-wrap"><input type="range" id="blind-range" min="0" max="100" value="${Math.round(r.blind)}" aria-label="Abertura do estore de ${escapeHTML(r.name)}" style="--value:${r.blind}%"><div class="range-labels"><span>Fechado</span><span>Aberto</span></div></div><div class="blind-controls"><button data-command="open">${icon('up')}Abrir</button><button data-command="pause">${icon('pause')}Parar</button><button data-command="close">${icon('down')}Fechar</button></div></div><p class="selected-device-note">${icon('shield')}Estore em demonstração · sem ligação à Shelly</p>`;
 window.CasaShelly?.decorateRoom(r,'blind');window.CasaDeviceEnergy?.room(r);
 const range=document.getElementById('blind-range');if(range){range.addEventListener('input',()=>{if(isCloudRoom(r.id)){document.getElementById('detail-percent').textContent=Math.round(Number(range.value));return}stopMotion(r.id);r.blind=Number(range.value);updatePositions();persist()});range.addEventListener('change',()=>{if(isCloudRoom(r.id)){window.CasaShelly.command(r.id,Number(range.value));return}drawList();notify(`${escapeHTML(r.name)} · estore a ${Math.round(r.blind)}% (simulação)`)})}
}

function updateSummary(){const count=rooms.filter(r=>r.light).length;document.getElementById('summary-number').textContent=count;document.getElementById('summary-label').textContent=count===1?'luz ligada':'luzes ligadas';document.getElementById('plan-status').textContent=rooms.filter(r=>r.blind>0).length+' estores abertos';}

function updatePositions(){rooms.filter(r=>'blind'in r).forEach(r=>{document.querySelectorAll(`[data-position="${r.id}"]`).forEach(el=>el.textContent=positionLabel(r));const badge=document.querySelector(`.blind-pin[data-room="${r.id}"]`);if(badge){badge.classList.toggle('is-closed',r.blind===0);badge.setAttribute('aria-label',blindAria(r))}const item=document.querySelector(`.device-item[data-room="${r.id}"] .device-copy small`);if(item&&mode==='blinds')item.textContent=blindText(r)});if(document.getElementById('blind-range')){const r=current();document.getElementById('detail-percent').textContent=positionLabel(r);document.getElementById('detail-status').textContent=blindText(r);document.querySelector('.window-blind').style.height=(100-r.blind)+'%';const input=document.getElementById('blind-range');input.value=Math.round(r.blind);input.style.setProperty('--value',r.blind+'%')}drawRoomLighting();const caption=document.querySelector('.room-light-caption');if(caption)caption.textContent=isCloudLight(current().id)?window.CasaShelly.lightCaption(current().id):window.CasaEnvironment.roomDescription(current(),rooms);updateSummary()}
function render(){drawPlan();drawList();drawDetail();updateSummary();persist()}
function stopMotion(id){if(motions.has(id)){clearInterval(motions.get(id));motions.delete(id)}}
function move(r,target){if(isCloudRoom(r.id)){notify('Use os controlos da divisão para mover este estore real.');return}stopMotion(r.id);if(r.blind===target)return;const start=r.blind,begin=performance.now(),duration=Math.max(600,Math.abs(target-start)*27);const timer=setInterval(()=>{const progress=Math.min(1,(performance.now()-begin)/duration);r.blind=Math.round((start+(target-start)*progress)*10)/10;if(progress===1){stopMotion(r.id);r.blind=target;persist()}updatePositions()},40);motions.set(r.id,timer);updatePositions()}
function showPopup(id){document.querySelectorAll('dialog[open]').forEach(d=>{if(d.id!==id)d.close()});const d=document.getElementById(id);if(!d.open)d.showModal();queueMicrotask(()=>window.CasaShelly?.focusPopup());}
function selectLamp(id){if(!['master','bedroom2','living'].includes(id))return;detailView='light';selected=id;render();document.querySelector('#room-dialog .popup-close').setAttribute('aria-label','Fechar candeeiro');showPopup('room-dialog');const d=window.CasaShelly?.lightReading(id);if(window.CasaShelly?.lightBinding(id)&&(!d?.fetchedAt||Date.now()-d.fetchedAt>30000||d.error))window.CasaShelly.refreshEquipment('light',id)}
function selectRoom(id){document.querySelector('#room-dialog .popup-close').setAttribute('aria-label','Fechar divisão');detailView='room';selected=id;render();showPopup('room-dialog');window.CasaShelly?.ensureFresh(id);window.CasaShelly?.windowEnsureFresh(id)}
function selectBlind(id){const r=rooms.find(r=>r.id===id);if(!r||!('blind'in r))return;document.querySelector('#room-dialog .popup-close').setAttribute('aria-label','Fechar estore');detailView='blind';selected=id;render();showPopup('room-dialog');window.CasaShelly?.ensureBlindFresh(id)}
function setMode(next){mode=next;document.getElementById('all-status').hidden=mode!=='blinds'||!document.getElementById('all-status').textContent;document.getElementById('all-light-status').hidden=mode!=='lights'||!document.getElementById('all-light-status').textContent;document.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode?0:-1});document.getElementById('global-panel').setAttribute('aria-labelledby',mode==='blinds'?'tab-blinds':'tab-lights');document.getElementById('list-heading').textContent=mode==='blinds'?'Os seus estores':'A sua iluminação';document.getElementById('device-total').textContent=mode==='blinds'?'4 dispositivos':'8 dispositivos';document.getElementById('all-open').innerHTML=icon(mode==='blinds'?'open':'light')+`<span>${mode==='blinds'?'Abrir todos':'Ligar todas'}</span>`;document.getElementById('all-close').innerHTML=icon(mode==='blinds'?'close':'moon')+`<span>${mode==='blinds'?'Fechar todos':'Apagar todas'}</span>`;render()}

document.addEventListener('click',e=>{const room=e.target.closest('[data-room]');if(room){if(room.matches('.lamp-trigger'))selectLamp(room.dataset.room);else if(room.matches('.blind-pin,.blind-window-trigger')||room.matches('.device-item')&&mode==='blinds')selectBlind(room.dataset.room);else selectRoom(room.dataset.room);return}const tab=e.target.closest('[data-mode]');if(tab){setMode(tab.dataset.mode);return}const command=e.target.closest('[data-command]');if(command){const r=current();if(isCloudRoom(r.id)){window.CasaShelly.command(r.id,command.dataset.command==='pause'?'stop':command.dataset.command);return}if(command.dataset.command==='pause'){stopMotion(r.id);updatePositions();persist();notify(`Estore de ${escapeHTML(r.name)} parado a ${Math.round(r.blind)}% · simulação`)}else{move(r,command.dataset.command==='open'?100:0);notify(`${command.dataset.command==='open'?'A abrir':'A fechar'} o estore de ${escapeHTML(r.name)} · simulação`)}return}if(e.target.closest('#light-toggle')){if(isCloudLight(current().id)){window.CasaShelly.commandLight(current().id,!current().light);return}current().light=!current().light;render();document.getElementById('light-toggle').focus({preventScroll:true});notify(`${current().name} · luz ${current().light?'ligada':'desligada'} (simulação)`)}});
document.querySelectorAll('[data-mode]').forEach(tab=>tab.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setMode(mode==='blinds'?'lights':'blinds');document.querySelector(`[data-mode="${mode}"]`).focus()}}));
function all(target){if(mode==='blinds'){
 const demo=rooms.filter(r=>'blind'in r&&!isCloudRoom(r.id));demo.forEach(r=>move(r,target?100:0));
 if(rooms.some(r=>isCloudRoom(r.id)))window.CasaShelly.commandAll(target?'open':'close',demo.length);
 else notify(`${target?'A abrir':'A fechar'} todos os estores · simulação`);
 }else{const demo=rooms.filter(r=>!isCloudLight(r.id));demo.forEach(r=>r.light=target);render();if(rooms.some(r=>isCloudLight(r.id)))window.CasaShelly.commandAllLights(target,demo.length);else notify(`${target?'Todas as luzes ligadas':'Todas as luzes apagadas'} · simulação`)}}
document.getElementById('all-open').addEventListener('click',()=>all(true));
document.getElementById('all-close').addEventListener('click',()=>all(false));
document.getElementById('toggle-labels').addEventListener('click',()=>{labels=!labels;drawPlan();try{localStorage.setItem('casa-nl-show-banners',String(labels))}catch{}});
document.getElementById('toggle-sensor-readings').addEventListener('click',()=>{showSensorReadings=!showSensorReadings;drawPlan();try{localStorage.setItem('casa-nl-show-sensor-readings',JSON.stringify(showSensorReadings))}catch{}});
document.getElementById('toggle-blind-labels').addEventListener('click',()=>{showBlindBanners=!showBlindBanners;updateBlindBannerVisibility();try{localStorage.setItem('casa-nl-show-blind-banners',JSON.stringify(showBlindBanners))}catch{}});
function scene(mode){rooms.forEach(r=>{if(!isCloudLight(r.id))r.light=mode==='morning'?r.id==='kitchen':mode==='night'?r.id==='hall':false;if('blind'in r)move(r,mode==='morning'?100:0)});render();notify(({night:'Boa noite',morning:'Bom dia',away:'Sair de casa'})[mode]+' ativado · simulação; equipamentos Cloud preservados')}
document.getElementById('night-scene').addEventListener('click',()=>scene('night'));
document.querySelectorAll('[data-scene]').forEach(b=>b.addEventListener('click',()=>scene(b.dataset.scene)));
document.getElementById('settings').addEventListener('click',()=>showPopup('settings-dialog'));
document.getElementById('close-settings').addEventListener('click',()=>document.getElementById('settings-dialog').close());
document.getElementById('reset').addEventListener('click',()=>{for(const id of [...motions.keys()])stopMotion(id);rooms=structuredClone(defaults);restoreRoomLayout();window.CasaShelly?.reapply();selected='living';setMode('lights');document.getElementById('settings-dialog').close();notify('Demonstração reposta')});
document.getElementById('open-controls').addEventListener('click',()=>showPopup('controls-dialog'));
document.getElementById('open-overview').addEventListener('click',()=>showPopup('controls-dialog'));
document.getElementById('open-scenes').addEventListener('click',()=>showPopup('scenes-dialog'));
document.getElementById('home-button').addEventListener('click',()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
window.CasaDialogDismiss.install(document);
document.getElementById('hotspots').addEventListener('keydown',e=>{if(e.target.matches('.room-hit')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectRoom(e.target.dataset.room)}});
window.addEventListener('environmentchange',()=>{drawRoomLighting();const caption=document.querySelector('.room-light-caption');if(caption)caption.textContent=isCloudLight(current().id)?window.CasaShelly.lightCaption(current().id):window.CasaEnvironment.roomDescription(current(),rooms)});
window.addEventListener('pagehide',persist);restoreRoomLayout();setMode('lights');

// Device-local clock; Intl respects the iPad's configured timezone.
function updateHeaderClock(){
 const now=new Date();
 const time=document.getElementById('header-clock');
 time.textContent=new Intl.DateTimeFormat('pt-PT',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 time.dateTime=now.toISOString();
 document.getElementById('header-clock-date').textContent=new Intl.DateTimeFormat('pt-PT',{day:'numeric',month:'short'}).format(now);
}
updateHeaderClock();
setInterval(updateHeaderClock,1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateHeaderClock()});

// Badge clicks are delayed briefly to distinguish them from rename double-clicks.
let bannerClickTimer,renameRoomId=null,bannerDrag=null,suppressBannerClickUntil=0;
const bannerHost=document.getElementById('hotspots');
function setBannerCenter(r,p,el){r.lx=p.x/10.24;r.ly=(p.y-140)/11.8;el.style.setProperty('--x',r.lx+'%');el.style.setProperty('--y',r.ly+'%')}
function fitBanner(r){const el=bannerHost.querySelector(`.room-pin[data-room="${r.id}"]`);if(!el||!el.getBoundingClientRect().width)return;const stage=document.getElementById('plan-stage').getBoundingClientRect(),box=el.getBoundingClientRect();let p=BannerGeometry.nearestFit(roomPolygons(r.id),{x:r.lx*10.24,y:140+r.ly*11.8},box.width/stage.width*1024+2,box.height/stage.height*1180+2);if(p&&r.id==='balcony'&&el.classList.contains('has-sensor')){const blind=bannerHost.querySelector('.blind-pin[data-room="kitchen"]'),obstacle=blind?.getBoundingClientRect();if(obstacle?.width&&box.right>obstacle.left&&box.left<obstacle.right&&box.bottom>obstacle.top-4&&box.top<obstacle.bottom){const target={x:p.x,y:(obstacle.top-4-box.height/2-stage.top)*1180/stage.height+140},candidate=BannerGeometry.nearestFit(roomPolygons(r.id),target,box.width/stage.width*1024+2,box.height/stage.height*1180+2);if(candidate&&(candidate.y-140)*stage.height/1180+stage.top+box.height/2<=obstacle.top-2)p=candidate}}if(p)setBannerCenter(r,p,el)}
function openRename(id){clearTimeout(bannerClickTimer);renameRoomId=id;const r=rooms.find(r=>r.id===id),input=document.getElementById('room-name-input');input.value=bannerName(r);input.setCustomValidity('');showPopup('rename-room-dialog');input.focus({preventScroll:true});input.select()}
bannerHost.addEventListener('click',e=>{const pin=e.target.closest('.room-pin');if(!pin)return;e.preventDefault();e.stopPropagation();clearTimeout(bannerClickTimer);if(performance.now()<suppressBannerClickUntil||e.detail>1)return;if(e.detail===0){selectRoom(pin.dataset.room);return}bannerClickTimer=setTimeout(()=>selectRoom(pin.dataset.room),450)});
bannerHost.addEventListener('dblclick',e=>{const pin=e.target.closest('.room-pin');if(!pin)return;e.preventDefault();e.stopPropagation();if(performance.now()<suppressBannerClickUntil)return;openRename(pin.dataset.room)});
bannerHost.addEventListener('keydown',e=>{if(e.key==='F2'&&e.target.matches('.room-pin')){e.preventDefault();openRename(e.target.dataset.room)}});
bannerHost.addEventListener('pointerdown',e=>{const el=e.target.closest('.room-pin');if(!el||e.button!==0||!e.isPrimary)return;clearTimeout(bannerClickTimer);const r=rooms.find(r=>r.id===el.dataset.room);bannerDrag={el,r,id:e.pointerId,startX:e.clientX,startY:e.clientY,origin:{lx:r.lx,ly:r.ly},active:false};el.setPointerCapture(e.pointerId)});
bannerHost.addEventListener('pointermove',e=>{const d=bannerDrag;if(!d||d.id!==e.pointerId)return;if(!d.active){if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<6)return;d.active=true;clearTimeout(bannerClickTimer);d.el.classList.add('dragging');const stage=document.getElementById('plan-stage').getBoundingClientRect(),box=d.el.getBoundingClientRect();d.stage=stage;d.w=box.width/stage.width*1024+2;d.h=box.height/stage.height*1180+2;d.start={x:d.origin.lx*10.24,y:140+d.origin.ly*11.8};d.last=d.start}
 e.preventDefault();const target={x:d.start.x+(e.clientX-d.startX)/d.stage.width*1024,y:d.start.y+(e.clientY-d.startY)/d.stage.height*1180};d.last=BannerGeometry.move(roomPolygons(d.r.id),d.last,target,d.w,d.h);setBannerCenter(d.r,d.last,d.el)});
function endBannerDrag(e,cancel){const d=bannerDrag;if(!d||d.id!==e.pointerId)return;bannerDrag=null;d.el.classList.remove('dragging');if(d.active){suppressBannerClickUntil=performance.now()+500;if(cancel){d.r.lx=d.origin.lx;d.r.ly=d.origin.ly;d.el.style.setProperty('--x',d.r.lx+'%');d.el.style.setProperty('--y',d.r.ly+'%')}else{persistRoomLayout();persist()}}}
bannerHost.addEventListener('pointerup',e=>endBannerDrag(e,false));bannerHost.addEventListener('pointercancel',e=>endBannerDrag(e,true));
document.getElementById('room-name-input').addEventListener('input',e=>e.target.setCustomValidity(''));
document.getElementById('rename-room-form').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('room-name-input'),name=input.value.trim().replace(/\s+/g,' ');if(!name){input.setCustomValidity('Indique um nome para a divisão.');input.reportValidity();return}const r=rooms.find(r=>r.id===renameRoomId);if(!r)return;r.name=name.slice(0,40);r.customName=true;document.getElementById('rename-room-dialog').close();render();fitBanner(r);persistRoomLayout();persist();bannerHost.querySelector(`.room-pin[data-room="${r.id}"]`)?.focus({preventScroll:true});notify('Nome da divisão atualizado')});
let bannerResizeTimer;window.addEventListener('resize',()=>{clearTimeout(bannerResizeTimer);bannerResizeTimer=setTimeout(()=>{if(bannerDrag)return;for(const r of rooms){bannerHost.querySelector(`.room-pin[data-room="${r.id}"]`)?.style.setProperty('--pin-max-width',pinMaxWidth(r)+'px');fitBanner(r)}persistRoomLayout()},200)});
