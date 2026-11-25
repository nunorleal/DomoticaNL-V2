(function(){
 'use strict';
 const C=window.CasaSensorHistoryCore,H=window.CasaSensorHistory,K=window.CasaEnergyHistoryCore;
 const svgNS='http://www.w3.org/2000/svg';
 const dialog=document.createElement('dialog');
 dialog.id='sensor-history-dialog';dialog.className='sensor-history-dialog';
 dialog.setAttribute('aria-labelledby','sensor-history-title');
 dialog.innerHTML='<header class="history-header"><div><span class="history-eyebrow">TEMPERATURA E HUMIDADE</span><h2 id="sensor-history-title"></h2></div><button type="button" class="sensor-history-close" aria-label="Fechar histórico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>'+
  '<div class="history-periods" role="group" aria-label="Período">'+[['day','Dia'],['week','Semana'],['month','Mês'],['year','Ano']].map(([id,name])=>'<button type="button" data-sensor-period="'+id+'" aria-pressed="false">'+name+'</button>').join('')+'</div>'+
  '<div class="history-navigation"><button type="button" data-previous aria-label="Período anterior">‹</button><strong data-range aria-live="polite"></strong><button type="button" data-next aria-label="Período seguinte">›</button></div>'+
  '<label class="history-date">Ir para a data<input type="date"></label><div class="sensor-history-charts"></div>'+
  '<p class="history-selection" role="status"></p><details class="history-values"><summary>Ver valores do período</summary><table><thead><tr><th>Data</th><th>Temperatura</th><th>Humidade</th></tr></thead><tbody></tbody></table></details>'+
  '<p class="history-footnote">Médias, mínimos e máximos das leituras observadas pela app. Detalhe horário nos últimos 30 dias e diário até 400 dias. Os intervalos sem leituras ficam vazios. A hora corresponde à consulta, não necessariamente à medição do sensor.</p><p class="sensor-history-sync" role="status"></p>';
 document.body.append(dialog);
 let role='',name='',period='day',anchor=C.day(Date.now()),trigger;
 const $=selector=>dialog.querySelector(selector);
 const fmt=(value,unit)=>value===null||value===undefined?'—':value.toLocaleString('pt-PT',{maximumFractionDigits:1})+unit;
 function buckets(rows){
  const range=K.range(period,anchor),daily=rows.filter(r=>r.period==='day'&&r.date>=range.start&&r.date<=range.end);
  if(period==='day'){
   const hourly=rows.filter(r=>r.period==='hour'&&r.date===anchor);
   if(!hourly.length)return {range,bins:[{label:K.label(anchor,{day:'numeric',month:'short'}),rows:daily}]};
   const start=Date.parse(anchor+'T00:00:00Z')-2*C.HOUR,bins=[];
   for(let i=0;i<29;i++){
    const time=start+i*C.HOUR;if(C.day(time)!==anchor)continue;
    const label=new Date(time).toLocaleTimeString('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit'});
    bins.push({label,rows:hourly.filter(row=>row.time===time)});
   }
   return {range,bins};
  }
  const bins=[];
  if(period==='year'){
   for(let month=1;month<=12;month++){
    const prefix=range.start.slice(0,4)+'-'+String(month).padStart(2,'0');
    bins.push({label:K.label(prefix+'-01',{month:'short'}),rows:daily.filter(r=>r.date.startsWith(prefix))});
   }
  }else for(let date=range.start;date<=range.end;date=K.add(date,1)){
   bins.push({label:K.label(date,{day:'2-digit',month:'2-digit'}),rows:daily.filter(r=>r.date===date)});
  }
  return {range,bins};
 }
 function element(tag,attributes){
  const node=document.createElementNS(svgNS,tag);
  for(const [key,value]of Object.entries(attributes))node.setAttribute(key,String(value));
  return node;
 }
 function chart(field,title,unit,bins){
  const card=document.createElement('section');card.className='sensor-history-chart';card.dataset.metric=field;
  const heading=document.createElement('h3');heading.textContent=title;card.append(heading);
  const summary=C.combine(bins.flatMap(bin=>bin.rows),field),stats=document.createElement('p');
  stats.textContent=summary?'Média '+fmt(summary.average,unit)+' · Mín. '+fmt(summary.min,unit)+' · Máx. '+fmt(summary.max,unit):'Sem leituras neste período.';
  card.append(stats);
  const svg=element('svg',{viewBox:'0 0 600 180',role:'img','aria-label':title+' · evolução no período'});
  const values=bins.map(bin=>C.combine(bin.rows,field));
  const available=values.filter(Boolean);
  if(!available.length){card.append(svg);return card}
  let min=Math.min(...available.map(v=>v.min)),max=Math.max(...available.map(v=>v.max));
  const padding=Math.max(.5,(max-min)*.12);min-=padding;max+=padding;
  const y=value=>142-(value-min)/(max-min)*120;
  for(const value of [min,(min+max)/2,max]){
   svg.append(element('line',{x1:48,x2:586,y1:y(value),y2:y(value),class:'sensor-history-grid'}));
   const text=element('text',{x:42,y:y(value)+4,'text-anchor':'end'});text.textContent=fmt(value,'');svg.append(text);
  }
  let segment=[];
  const line=()=>{if(segment.length>1)svg.append(element('polyline',{points:segment.join(' '),class:'sensor-history-line'}));segment=[]};
  values.forEach((value,index)=>{
   if(!value){line();return}
   const x=48+(bins.length===1?.5:index/(bins.length-1))*538,cy=y(value.average);
   segment.push(x+','+cy);
   const circle=element('circle',{cx:x,cy,r:4,tabindex:0,role:'button','aria-label':bins[index].label+' · '+fmt(value.average,unit)});
   const describe=()=>{$('.history-selection').textContent=bins[index].label+' · '+title+' · Média '+fmt(value.average,unit)+' · Mín. '+fmt(value.min,unit)+' · Máx. '+fmt(value.max,unit)};
   circle.addEventListener('click',describe);
   circle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();describe()}});
   svg.append(circle);
  });line();
  for(const index of [...new Set([0,Math.floor((bins.length-1)/2),bins.length-1])]){
   const x=48+(bins.length===1?.5:index/(bins.length-1))*538,text=element('text',{x,y:170,'text-anchor':'middle'});
   text.textContent=bins[index].label;svg.append(text);
  }
  card.append(svg);return card;
 }
 function render(){
  const source=H.sources().find(s=>s.role===role),rows=H.rows().filter(row=>source?row.sensor===source.sensor:row.name===name);
  const model=buckets(rows);
  $('#sensor-history-title').textContent=source?.name||name;
  $('[data-range]').textContent=model.range.label;
  $('[data-next]').disabled=model.range.end>=C.day(Date.now());
  $('input[type=date]').max=C.day(Date.now());$('input[type=date]').value=anchor;
  dialog.querySelectorAll('[data-sensor-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sensorPeriod===period)));
  $('.sensor-history-charts').replaceChildren(chart('temperature','Temperatura',' °C',model.bins),chart('humidity','Humidade',' %',model.bins));
  const tbody=$('tbody');tbody.replaceChildren();
  for(const bin of model.bins){
   const tr=document.createElement('tr');
   for(const text of [bin.label,fmt(C.combine(bin.rows,'temperature')?.average,' °C'),fmt(C.combine(bin.rows,'humidity')?.average,' %')]){
    const td=document.createElement('td');td.textContent=text;tr.append(td);
   }tbody.append(tr);
  }
  $('.history-selection').textContent=rows.length?'Toque num ponto para consultar os valores.':'O histórico começa com as leituras recolhidas por esta versão.';
  $('.sensor-history-sync').textContent=H.message();
 }
 function open(id,title,button,options={}){
  dialog.classList.toggle('sensor-history-red',Boolean(options.red));
  role=id;name=title||H.sources().find(s=>s.role===id)?.name||'Sensor';trigger=button||document.activeElement;
  period='day';anchor=C.day(Date.now());render();if(!dialog.open){if(window.CasaSettingsShell)window.CasaSettingsShell.open(dialog,{trigger});else dialog.showModal()}
 }
 $('.sensor-history-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true})});
 let outside=false;
 dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outside=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)});
 dialog.addEventListener('click',event=>{if(outside&&event.target===dialog)dialog.close();outside=false});
 dialog.querySelectorAll('[data-sensor-period]').forEach(button=>button.addEventListener('click',()=>{period=button.dataset.sensorPeriod;render()}));
 function shift(direction){if(direction>0&&$('[data-next]').disabled)return;anchor=K.shift(period,anchor,direction);render()}
 for(const [selector,direction]of [['[data-previous]',-1],['[data-next]',1]])$(selector).addEventListener('click',()=>shift(direction));
 // Horizontal touch gestures change the date window; vertical scroll and pinch zoom remain native.
 let swipe=null,swipeClickUntil=0;
 const releaseSwipe=id=>{if(dialog.hasPointerCapture?.(id))dialog.releasePointerCapture(id)};
 dialog.addEventListener('pointerdown',event=>{
  swipeClickUntil=0;
  if(swipe){releaseSwipe(swipe.id);swipe=null}
  if(!dialog.open||!event.isPrimary||!['touch','pen'].includes(event.pointerType)||event.target.closest('button,input,select,textarea,summary,a,[contenteditable]'))return;
  const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return;
  swipe={id:event.pointerId,x:event.clientX,y:event.clientY,at:performance.now(),horizontal:false};
 },{passive:true});
 dialog.addEventListener('pointermove',event=>{
  if(!swipe||event.pointerId!==swipe.id)return;
  const x=Math.abs(event.clientX-swipe.x),y=Math.abs(event.clientY-swipe.y);
  if(!swipe.horizontal&&y>12&&y>x){const id=swipe.id;swipe=null;releaseSwipe(id);return}
  if(x>12&&x>y*1.4){swipe.horizontal=true;try{dialog.setPointerCapture(event.pointerId)}catch{}}
  if(swipe.horizontal&&event.cancelable)event.preventDefault();
 },{passive:false});
 dialog.addEventListener('pointerup',event=>{
  if(!swipe||event.pointerId!==swipe.id)return;
  const start=swipe;swipe=null;releaseSwipe(start.id);
  const x=event.clientX-start.x,y=event.clientY-start.y;
  if(Math.abs(x)<48||Math.abs(x)<Math.abs(y)*1.4||performance.now()-start.at>1500)return;
  swipeClickUntil=performance.now()+500;shift(x<0?1:-1);
 });
 const cancelSwipe=()=>{const id=swipe?.id;swipe=null;if(id!==undefined)releaseSwipe(id)};
 dialog.addEventListener('pointercancel',cancelSwipe);dialog.addEventListener('lostpointercapture',cancelSwipe);dialog.addEventListener('close',cancelSwipe);
 dialog.addEventListener('click',event=>{if(event.detail>0&&performance.now()<swipeClickUntil){event.preventDefault();event.stopImmediatePropagation()}},true);

 $('input[type=date]').addEventListener('change',event=>{try{K.range(period,event.target.value);anchor=event.target.value;render()}catch{render()}});
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-sensor-history]');
  if(button){event.preventDefault();event.stopPropagation();open(button.dataset.sensorHistory,button.dataset.sensorName,button)}
 });
 window.addEventListener('sensorhistorychange',()=>{if(dialog.open)render()});
 window.CasaSensorHistoryView={open};
})();
