/* Read-only journal in the existing Shelly status popup. */
(function(){
 'use strict';let storage;try{storage=localStorage}catch{}
 window.CasaLightAudit=CasaLightAuditCore.create({storage,onChange:()=>window.dispatchEvent(new Event('lightaudit'))});
 const names={master:'Quarto principal',bedroom2:'Quarto do Gui',living:'Sala'},origins={individual:'Candeeiro',brightness:'Intensidade',room:'Dispositivos da divisão',consumption:'Consumo por divisão',meteo:'MeteoNL',all:'Ligar/apagar todas',unknown:'Controlo não identificado'},kinds={request:'Pedido desta app',accepted:'Aceite pela Cloud',failed:'Pedido não confirmado',initial:'Estado inicial consultado',observed:'Estado consultado alterado'};
 function mount(){const host=document.getElementById('cloud-activity-dialog');if(!host||host.querySelector('.light-audit'))return;const details=document.createElement('details');details.className='light-audit';const summary=document.createElement('summary');summary.textContent='Registo das luzes';const note=document.createElement('p');note.textContent='Pedidos deste navegador e estados recebidos. A hora do estado é a da consulta, não necessariamente a da mudança. Cloud/HTTP não identifica a aplicação que deu a ordem.';const list=document.createElement('ol');details.append(summary,note,list);host.append(details);
  function draw(){list.replaceChildren();const rows=CasaLightAudit.entries().slice(-30).reverse();if(!rows.length){const li=document.createElement('li');li.textContent='Ainda sem registos. Atualizar dados nunca envia comandos.';list.append(li)}for(const r of rows){const li=document.createElement('li');li.textContent=new Date(r.time).toLocaleString('pt-PT')+' · '+names[r.room]+' · '+kinds[r.kind]+': '+(r.on?'Ligada':'Desligada')+(r.brightness===null?'':' · '+r.brightness+'%')+(['initial','observed'].includes(r.kind)?' · Origem Shelly: '+(r.source||'não disponível'):' · '+origins[r.origin]);list.append(li)}}
  details.addEventListener('toggle',draw);window.addEventListener('lightaudit',()=>{if(details.open)draw()});draw();
 }
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();
