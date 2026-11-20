(function(){
 'use strict';const H=window.CasaPresenceHistory,C=window.CasaPresenceHistoryCore,K=window.CasaEnergyHistoryCore;
 const dialog=document.createElement('dialog');dialog.id='presence-history-dialog';dialog.setAttribute('aria-labelledby','presence-history-title');
 dialog.innerHTML='<header class="history-header"><div><span class="history-eyebrow">HORAS EM CASA</span><h2 id="presence-history-title"></h2></div><button type="button" class="presence-history-close" aria-label="Fechar histórico de presenças"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>'+
  '<div class="presence-history-chooser"><div class="presence-history-people" role="group" aria-label="Escolher morador"></div><button type="button" class="presence-history-together" data-presence-together aria-pressed="false">Os três juntos</button></div>'+
  '<section class="presence-stay" aria-label="Permanência atual"><span data-stay-label>Em casa há</span><strong role="timer" aria-label="Tempo da permanência atual" data-stay-time>—</strong><small data-stay-since></small></section>'+
  '<div class="history-periods" role="group" aria-label="Período">'+[['day','Dia'],['week','Semana'],['month','Mês'],['year','Ano']].map(([p,n])=>'<button type="button" data-presence-period="'+p+'" aria-pressed="false">'+n+'</button>').join('')+'</div>'+
  '<div class="history-navigation"><button type="button" data-previous aria-label="Período anterior">‹</button><strong data-range></strong><button type="button" data-next aria-label="Período seguinte">›</button></div><label class="history-date">Ir para a data<input type="date"></label>'+
  '<div class="presence-history-totals"><div><span>Em casa</span><strong data-total></strong></div><div><span>Média por dia observado</span><strong data-average></strong></div><div><span>Tempo com estado conhecido</span><strong data-covered></strong></div></div>'+
  '<section class="presence-day" aria-label="Presença ao longo do dia"><h3>Ao longo do dia</h3><div class="presence-compare-lanes" hidden></div><p class="presence-shared-label" hidden>Os três juntos</p><div class="presence-timeline" role="group" aria-label="Linha do tempo de presença"></div><div class="presence-timeline-axis"></div><p class="presence-timeline-legend"><span data-state="resident" hidden>Em casa</span><span data-state="home">Em casa</span><span data-state="away">Ausente</span><span data-state="unknown">Sem confirmação</span></p><p class="presence-timeline-selection" role="status">Toque num segmento para consultar as horas.</p><h3>Períodos em casa</h3><div class="presence-day-list"></div><p class="presence-day-note">Horas aproximadas ao minuto · hora de Lisboa. O tracejado inclui falhas de consulta e períodos ainda por observar. O detalhe começa com as novas observações; os totais antigos são preservados.</p></section>'+
  '<div class="history-chart-scroll"><div class="history-chart"></div></div><p class="history-selection" role="status"></p>'+
  '<details class="history-values"><summary>Ver horas do período</summary><table><thead><tr><th>Data</th><th>Em casa</th><th>Estado conhecido</th></tr></thead><tbody></tbody></table></details>'+
  '<p class="history-footnote">Estimativa de presença pelo telefone no Wi-Fi, não da localização da pessoa. Contam apenas intervalos de até 3 minutos entre consultas consecutivas com o mesmo estado. Mudanças de estado e falhas não contam como tempo em casa nem como ausência. Registo parcial, até 400 dias; o histórico começa nesta versão e exige o emissor ativo.</p><p class="presence-history-sync" role="status"></p><button type="button" class="presence-history-settings">Definições de presença</button>';
 document.body.append(dialog);
 let person=0,period='day',anchor=C.day(Date.now()),trigger,ticker=null;
 const $=s=>dialog.querySelector(s),people=()=>window.CasaPresence?.people?.()||[0,1,2].map(id=>({id,name:['Eu','Esposa','Filho'][id]}));
 function stay(){
  const together=person==='all',states=together?[0,1,2].map(id=>H.current(id)):[];
  const sharedHome=together&&states.every(s=>s.state==='home'),sharedSince=sharedHome?Math.max(...states.map(s=>s.homeSince)):null;
  const current=together?{state:sharedHome?'home':states.some(s=>s.state==='away')?'away':'unknown',homeSince:sharedSince,elapsed:sharedHome?Date.now()-sharedSince:null}:H.current(person),home=current.state==='home',seconds=home?Math.floor(current.elapsed/1000):0;
  const duration=home?String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'—';
  const label=together?(home?'Os três em casa há':current.state==='away'?'Não estão os três em casa':'Presença conjunta por confirmar'):(home?'Em casa há':current.state==='away'?'Fora do Wi-Fi':'Presença por confirmar');
  const since=home?'Desde '+new Date(current.homeSince).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' · desde a primeira confirmação desta permanência.':current.state==='away'?(together?'O contador reinicia quando os três estiverem em casa.':'O contador reinicia quando regressar.'):'Sem consultas recentes para confirmar a continuidade.';
  for(const [selector,text]of [['[data-stay-label]',label],['[data-stay-time]',duration],['[data-stay-since]',since]]){const node=$(selector);if(node.textContent!==text)node.textContent=text}
  $('.presence-stay').dataset.state=current.state;
 }
 function startTicker(){clearInterval(ticker);ticker=setInterval(()=>{if(dialog.open&&!document.hidden)stay()},1000)}
 function renderChooser(){
  const group=$('.presence-history-people'),all=people();
  if(!group.children.length)for(const p of all){
   const b=document.createElement('button');b.type='button';b.className='presence-history-avatar';b.dataset.person=p.id;b.setAttribute('aria-controls','presence-history-title');
   const circle=document.createElement('span');circle.className='presence-history-photo';circle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/></svg><img alt="" hidden>';
   const dot=document.createElement('span');dot.className='presence-history-dot';dot.setAttribute('aria-hidden','true');const name=document.createElement('span');name.className='presence-history-name';b.append(circle,dot,name);b.addEventListener('click',()=>{person=p.id;render()});group.append(b);
  }
  for(const b of group.children){const p=all.find(p=>p.id===Number(b.dataset.person));b.setAttribute('aria-pressed',String(person===p.id));b.setAttribute('aria-label','Ver histórico de '+p.name);b.querySelector('.presence-history-name').textContent=p.name;
   const img=b.querySelector('img'),fallback=b.querySelector('svg');if(p.photo){if(img.getAttribute('src')!==p.photo)img.src=p.photo;img.hidden=false;fallback.hidden=true}else{img.removeAttribute('src');img.hidden=true;fallback.hidden=false}
  }
  $('[data-presence-together]').setAttribute('aria-pressed',String(person==='all'));
 }
 function hours(ms){if(ms===null)return '—';const minutes=Math.floor(ms/60000);return Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0')+' min'}
 function sum(rows){return rows.reduce((s,r)=>({home:s.home+r.homeMs,known:s.known+r.homeMs+r.awayMs}),{home:0,known:0})}
 function model(){
  const range=K.range(period,anchor),source=H.rows().filter(r=>r.date>=range.start&&r.date<=range.end),rows=person==='all'?[...new Set(source.map(r=>r.date))].map(date=>C.together(source,date)):source.filter(r=>r.person===person),bins=[];
  if(period==='year')for(let m=1;m<=12;m++){const date=range.start.slice(0,4)+'-'+String(m).padStart(2,'0')+'-01';bins.push({label:K.label(date,{month:'short'}),rows:rows.filter(r=>r.date.startsWith(date.slice(0,7)))})}
  else for(let date=range.start;date<=range.end;date=K.add(date,1))bins.push({label:K.label(date,{day:'2-digit',month:'2-digit'}),rows:rows.filter(r=>r.date===date)});
  return {range,rows,bins};
 }
 function clock(at,end){return at===end?'24:00':new Date(at).toLocaleTimeString('pt-PT',{timeZone:'Europe/Lisbon',hour:'2-digit',minute:'2-digit'})}
 function drawTrack(track,row,name){
  const data=C.intervals(row,anchor),names={home:person==='all'&&name==='Os três juntos'?'Os três juntos':'Em casa',away:person==='all'&&name==='Os três juntos'?'Não estavam os três juntos':'Ausente',unknown:'Sem confirmação / por observar'};track.replaceChildren();
  for(const segment of data.segments){
   const b=document.createElement('button');b.type='button';b.dataset.state=segment.state;b.style.width=((segment.to-segment.from)/(data.end-data.start)*100)+'%';
   const label=name+' · '+clock(segment.from,data.end)+'–'+clock(segment.to,data.end)+' · '+names[segment.state]+' · '+hours(segment.to-segment.from);
   b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',()=>{dialog.querySelectorAll('.presence-timeline button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));$('.presence-timeline-selection').textContent=label});track.append(b);
  }
  return data;
 }
 function renderDay(row){
  const section=$('.presence-day'),together=person==='all';section.hidden=period!=='day';section.dataset.group=String(together);$('.history-chart-scroll').hidden=period==='day';$('.history-selection').hidden=period==='day';if(period!=='day')return;
  const lanes=$('.presence-compare-lanes');lanes.hidden=!together;lanes.replaceChildren();$('.presence-shared-label').hidden=!together;
  if(together)for(const p of people()){
   const lane=document.createElement('div'),name=document.createElement('p'),track=document.createElement('div');name.textContent=p.name;track.className='presence-timeline';track.setAttribute('role','group');track.setAttribute('aria-label','Presença de '+p.name);lane.append(name,track);lanes.append(lane);drawTrack(track,H.rows().find(r=>r.person===p.id&&r.date===anchor),p.name);
  }
  const data=drawTrack($('.presence-day > .presence-timeline'),row,together?'Os três juntos':people().find(p=>p.id===person)?.name||'Pessoa'),axis=$('.presence-timeline-axis'),list=$('.presence-day-list');axis.replaceChildren();list.replaceChildren();
  for(const segment of data.segments)if(segment.state==='home'){
   const item=document.createElement('div'),time=document.createElement('span'),duration=document.createElement('span');time.textContent=clock(segment.from,data.end)+'–'+clock(segment.to,data.end);duration.textContent=hours(segment.to-segment.from);item.append(time,duration);list.append(item);
  }
  for(const hour of [0,6,12,18,24]){
   const label=document.createElement('span');label.textContent=String(hour).padStart(2,'0')+':00';let at=hour===24?data.end:data.start;
   if(hour>0&&hour<24){for(let t=data.start;t<data.end;t+=3600000)if(clock(t,data.end)===String(hour).padStart(2,'0')+':00'){at=t;break}}
   label.style.left=((at-data.start)/(data.end-data.start)*100)+'%';axis.append(label);
  }
  section.querySelector('h3').textContent=together?'Presença dos moradores':'Ao longo do dia';section.querySelectorAll('h3')[1].textContent=together?'Períodos dos três juntos':'Períodos em casa';
  const legend=$('.presence-timeline-legend');legend.querySelector('[data-state=resident]').hidden=!together;legend.querySelector('[data-state=home]').textContent=together?'Os três juntos':'Em casa';legend.querySelector('[data-state=away]').textContent=together?'Não estavam todos':'Ausente';
  if(!list.children.length){const empty=document.createElement('p');empty.textContent=together?'Ainda sem períodos dos três juntos confirmados neste dia.':row?.timeline?'Ainda sem períodos em casa confirmados neste dia.':'Ainda sem detalhe horário neste dia. O total disponível continua acima.';list.append(empty)}
  $('.presence-day-note').textContent=together?'Horas aproximadas ao minuto · hora de Lisboa. O tempo juntos exige confirmação dos três no mesmo minuto. Sem detalhe horário, os totais antigos não permitem calcular o tempo em conjunto. O tracejado indica períodos sem confirmação ou por observar.':'Horas aproximadas ao minuto · hora de Lisboa. O tracejado inclui falhas de consulta e períodos ainda por observar. O detalhe começa com as novas observações; os totais antigos são preservados.';
  $('.presence-timeline-selection').textContent='Toque num segmento para consultar as horas.';
 }
 function render(){
  stay();
  const all=people(),current=all.find(p=>p.id===person),data=model(),totals=sum(data.rows),observed=data.rows.filter(r=>r.homeMs+r.awayMs>0).length;
  const together=person==='all';$('#presence-history-title').textContent=together?'Os três juntos':current?.name||'Pessoa';
  renderChooser();
  $('.presence-history-totals>div:first-child>span').textContent=together?'Tempo dos três juntos':'Em casa';
  $('.history-values th:nth-child(2)').textContent=together?'Os três juntos':'Em casa';
  $('.history-values summary').textContent=together?'Ver tempo juntos do período':'Ver horas do período';
  $('[data-range]').textContent=data.range.label;$('[data-next]').disabled=data.range.end>=C.day(Date.now());$('input').value=anchor;$('input').max=C.day(Date.now());
  dialog.querySelectorAll('[data-presence-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.presencePeriod===period)));
  $('[data-total]').textContent=hours(totals.known?totals.home:null);$('[data-average]').textContent=hours(observed?totals.home/observed:null);$('[data-covered]').textContent=hours(totals.known||null);
  const chart=$('.history-chart'),tbody=$('tbody');chart.replaceChildren();tbody.replaceChildren();chart.style.setProperty('--history-columns',data.bins.length);
  const max=Math.max(3600000,...data.bins.map(b=>sum(b.rows).home));
  for(const bin of data.bins){
   const s=sum(bin.rows),known=s.known>0,button=document.createElement('button');button.type='button';button.className='history-bar'+(!known?' is-missing':s.home===0?' is-zero':'');
   button.setAttribute('aria-label',bin.label+' · '+(known?hours(s.home)+(together?' juntos':' em casa'):'Sem tempo observado'));
   const track=document.createElement('span');track.className='history-bar-track';if(known){const fill=document.createElement('i');fill.style.height=(s.home/max*100)+'%';track.append(fill)}
   const label=document.createElement('span');label.className='history-bar-label';label.textContent=bin.label;button.append(track,label);chart.append(button);
   button.addEventListener('click',()=>{$('.history-selection').textContent=bin.label+(together?' · Juntos: ':' · Em casa: ')+hours(known?s.home:null)+' · Estado conhecido: '+hours(known?s.known:null)});
   const tr=document.createElement('tr');for(const text of [bin.label,hours(known?s.home:null),hours(known?s.known:null)]){const td=document.createElement('td');td.textContent=text;tr.append(td)}tbody.append(tr);
  }
  $('.history-selection').textContent=totals.known?'Registo parcial. Toque numa barra para consultar as horas.':'Ainda sem intervalos observados neste período.';
  renderDay(data.rows.find(r=>r.date===anchor));
  $('.presence-history-sync').textContent=H.message();
 }
 function open(id,options={}){if(!Number.isInteger(id)||id<0||id>2)return;person=id;period='day';anchor=C.day(Date.now());trigger=options.trigger||document.activeElement;dialog.classList.toggle('presence-history-red',!!options.red);render();if(!dialog.open){if(window.CasaSettingsShell)window.CasaSettingsShell.open(dialog,{trigger});else dialog.showModal()}startTicker();void H.sync(true)}
 $('.presence-history-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{clearInterval(ticker);ticker=null;if(trigger?.isConnected)trigger.focus({preventScroll:true})});
 let outside=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outside=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)});dialog.addEventListener('click',event=>{if(outside&&event.target===dialog)dialog.close();outside=false});
 $('[data-presence-together]').addEventListener('click',()=>{person='all';render()});
 for(const [selector,step]of [['[data-previous]',-1],['[data-next]',1]])$(selector).addEventListener('click',()=>{anchor=K.shift(period,anchor,step);render()});
 $('input').addEventListener('change',e=>{try{K.range(period,e.target.value);anchor=e.target.value;render()}catch{render()}});
 dialog.querySelectorAll('[data-presence-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.presencePeriod;render()}));
 $('.presence-history-settings').addEventListener('click',()=>{dialog.close();if(window.CasaMeteoBridge?.visible())window.CasaMeteoBridge.openPresenceSettings();else window.CasaPresence?.openSettings()});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-presence-history]');if(b){e.preventDefault();open(Number(b.dataset.presenceHistory),{trigger:b})}});
 document.addEventListener('visibilitychange',()=>{if(dialog.open&&!document.hidden)stay()});
 window.addEventListener('presencehistorychange',()=>{if(dialog.open)render()});window.CasaPresenceHistoryView={open};
})();
