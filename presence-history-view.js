(function(){
 'use strict';const H=window.CasaPresenceHistory,C=window.CasaPresenceHistoryCore,K=window.CasaEnergyHistoryCore;
 const dialog=document.createElement('dialog');dialog.id='presence-history-dialog';dialog.setAttribute('aria-labelledby','presence-history-title');
 dialog.innerHTML='<header class="history-header"><div><span class="history-eyebrow">HORAS EM CASA</span><h2 id="presence-history-title"></h2></div><button type="button" class="presence-history-close" aria-label="Fechar histórico de presenças">×</button></header>'+
  '<label class="presence-history-person">Pessoa<select aria-label="Pessoa do histórico"></select></label>'+
  '<section class="presence-stay" aria-label="Permanência atual"><span data-stay-label>Em casa há</span><strong role="timer" aria-label="Tempo da permanência atual" data-stay-time>—</strong><small data-stay-since></small></section>'+
  '<div class="history-periods" role="group" aria-label="Período">'+[['day','Dia'],['week','Semana'],['month','Mês'],['year','Ano']].map(([p,n])=>'<button type="button" data-presence-period="'+p+'" aria-pressed="false">'+n+'</button>').join('')+'</div>'+
  '<div class="history-navigation"><button type="button" data-previous aria-label="Período anterior">‹</button><strong data-range></strong><button type="button" data-next aria-label="Período seguinte">›</button></div><label class="history-date">Ir para a data<input type="date"></label>'+
  '<div class="presence-history-totals"><div><span>Em casa</span><strong data-total></strong></div><div><span>Média por dia observado</span><strong data-average></strong></div><div><span>Tempo com estado conhecido</span><strong data-covered></strong></div></div>'+
  '<div class="history-chart-scroll"><div class="history-chart"></div></div><p class="history-selection" role="status"></p>'+
  '<details class="history-values"><summary>Ver horas do período</summary><table><thead><tr><th>Data</th><th>Em casa</th><th>Estado conhecido</th></tr></thead><tbody></tbody></table></details>'+
  '<p class="history-footnote">Estimativa de presença pelo telefone no Wi-Fi, não da localização da pessoa. Contam apenas intervalos de até 3 minutos entre consultas consecutivas com o mesmo estado. Mudanças de estado e falhas não contam como tempo em casa nem como ausência. Registo parcial, até 400 dias; o histórico começa nesta versão e exige o emissor ativo.</p><p class="presence-history-sync" role="status"></p><button type="button" class="presence-history-settings">Definições de presença</button>';
 document.body.append(dialog);
 let person=0,period='day',anchor=C.day(Date.now()),trigger,ticker=null;
 const $=s=>dialog.querySelector(s),people=()=>window.CasaPresence?.people?.()||[0,1,2].map(id=>({id,name:['Eu','Esposa','Filho'][id]}));
 function stay(){
  const current=H.current(person),home=current.state==='home',seconds=home?Math.floor(current.elapsed/1000):0;
  const duration=home?String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'—';
  const label=home?'Em casa há':current.state==='away'?'Fora do Wi-Fi':'Presença por confirmar';
  const since=home?'Desde '+new Date(current.homeSince).toLocaleString('pt-PT',{timeZone:'Europe/Lisbon',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+' · desde a primeira confirmação desta permanência.':current.state==='away'?'O contador reinicia quando regressar.':'Sem consultas recentes para confirmar a continuidade.';
  for(const [selector,text]of [['[data-stay-label]',label],['[data-stay-time]',duration],['[data-stay-since]',since]]){const node=$(selector);if(node.textContent!==text)node.textContent=text}
  $('.presence-stay').dataset.state=current.state;
 }
 function startTicker(){clearInterval(ticker);ticker=setInterval(()=>{if(dialog.open&&!document.hidden)stay()},1000)}
 function hours(ms){if(ms===null)return '—';const minutes=Math.floor(ms/60000);return Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0')+' min'}
 function sum(rows){return rows.reduce((s,r)=>({home:s.home+r.homeMs,known:s.known+r.homeMs+r.awayMs}),{home:0,known:0})}
 function model(){
  const range=K.range(period,anchor),rows=H.rows().filter(r=>r.person===person&&r.date>=range.start&&r.date<=range.end),bins=[];
  if(period==='year')for(let m=1;m<=12;m++){const date=range.start.slice(0,4)+'-'+String(m).padStart(2,'0')+'-01';bins.push({label:K.label(date,{month:'short'}),rows:rows.filter(r=>r.date.startsWith(date.slice(0,7)))})}
  else for(let date=range.start;date<=range.end;date=K.add(date,1))bins.push({label:K.label(date,{day:'2-digit',month:'2-digit'}),rows:rows.filter(r=>r.date===date)});
  return {range,rows,bins};
 }
 function render(){
  stay();
  const all=people(),current=all.find(p=>p.id===person),data=model(),totals=sum(data.rows),observed=data.rows.filter(r=>r.homeMs+r.awayMs>0).length;
  $('#presence-history-title').textContent=current?.name||'Pessoa';
  const select=$('select');select.replaceChildren();for(const p of all){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option)}select.value=String(person);
  $('[data-range]').textContent=data.range.label;$('[data-next]').disabled=data.range.end>=C.day(Date.now());$('input').value=anchor;$('input').max=C.day(Date.now());
  dialog.querySelectorAll('[data-presence-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.presencePeriod===period)));
  $('[data-total]').textContent=hours(totals.known?totals.home:null);$('[data-average]').textContent=hours(observed?totals.home/observed:null);$('[data-covered]').textContent=hours(totals.known||null);
  const chart=$('.history-chart'),tbody=$('tbody');chart.replaceChildren();tbody.replaceChildren();chart.style.setProperty('--history-columns',data.bins.length);
  const max=Math.max(3600000,...data.bins.map(b=>sum(b.rows).home));
  for(const bin of data.bins){
   const s=sum(bin.rows),known=s.known>0,button=document.createElement('button');button.type='button';button.className='history-bar'+(!known?' is-missing':s.home===0?' is-zero':'');
   button.setAttribute('aria-label',bin.label+' · '+(known?hours(s.home)+' em casa':'Sem tempo observado'));
   const track=document.createElement('span');track.className='history-bar-track';if(known){const fill=document.createElement('i');fill.style.height=(s.home/max*100)+'%';track.append(fill)}
   const label=document.createElement('span');label.className='history-bar-label';label.textContent=bin.label;button.append(track,label);chart.append(button);
   button.addEventListener('click',()=>{$('.history-selection').textContent=bin.label+' · Em casa: '+hours(known?s.home:null)+' · Estado conhecido: '+hours(known?s.known:null)});
   const tr=document.createElement('tr');for(const text of [bin.label,hours(known?s.home:null),hours(known?s.known:null)]){const td=document.createElement('td');td.textContent=text;tr.append(td)}tbody.append(tr);
  }
  $('.history-selection').textContent=totals.known?'Registo parcial. Toque numa barra para consultar as horas.':'Ainda sem intervalos observados neste período.';
  $('.presence-history-sync').textContent=H.message();
 }
 function open(id,options={}){if(!Number.isInteger(id)||id<0||id>2)return;person=id;period='day';anchor=C.day(Date.now());trigger=options.trigger||document.activeElement;dialog.classList.toggle('presence-history-red',!!options.red);render();if(!dialog.open)dialog.showModal();startTicker();void H.sync(true)}
 $('.presence-history-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{clearInterval(ticker);ticker=null;if(trigger?.isConnected)trigger.focus({preventScroll:true})});
 let outside=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();outside=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)});dialog.addEventListener('click',event=>{if(outside&&event.target===dialog)dialog.close();outside=false});
 $('select').addEventListener('change',e=>{person=Number(e.target.value);render()});
 for(const [selector,step]of [['[data-previous]',-1],['[data-next]',1]])$(selector).addEventListener('click',()=>{anchor=K.shift(period,anchor,step);render()});
 $('input').addEventListener('change',e=>{try{K.range(period,e.target.value);anchor=e.target.value;render()}catch{render()}});
 dialog.querySelectorAll('[data-presence-period]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.presencePeriod;render()}));
 $('.presence-history-settings').addEventListener('click',()=>{dialog.close();if(window.CasaMeteoBridge?.visible())window.CasaMeteoBridge.openPresenceSettings();else window.CasaPresence?.openSettings()});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-presence-history]');if(b){e.preventDefault();open(Number(b.dataset.presenceHistory),{trigger:b})}});
 document.addEventListener('visibilitychange',()=>{if(dialog.open&&!document.hidden)stay()});
 window.addEventListener('presencehistorychange',()=>{if(dialog.open)render()});window.CasaPresenceHistoryView={open};
})();
