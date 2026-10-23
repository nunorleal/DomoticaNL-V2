/* Shares the Casa NL account and save transaction; no own credentials or commands. */
(function(){
 'use strict';const $=id=>document.getElementById(id),roles=['meter','totalMeter','relay'];
 const names={meter:'Consumo do carro',totalMeter:'Contador acumulado separado (opcional)',relay:'Interruptor do ponto de carregamento'};
 const types={auto:'Detetar pelo estado',emeter:'Shelly EM / 3EM · Gen1',meter:'Plug / 1PM · Gen1',switch:'Switch com medição · Gen2+',pm1:'PM Mini · Gen2+',em1:'Pro EM · Gen2+',em:'Pro 3EM · total das fases'};
 function fill(ev){$('shelly-ev-mappings').innerHTML=roles.map(role=>{const b=ev?.[role];return `<fieldset class="shelly-mapping"><legend>${names[role]}</legend><label for="ev-${role}-id">Device ID</label><input id="ev-${role}-id" type="text" autocomplete="off" spellcheck="false" maxlength="48" placeholder="Ex.: aabbcc112233" value="${escapeHTML(b?.deviceId||'')}"><label for="ev-${role}-channel">${role==='relay'?'Canal do relé':'Canal de medição'}</label><input id="ev-${role}-channel" type="number" min="0" max="${role==='relay'?15:255}" step="1" value="${b?.channel??0}">${role==='relay'?'':`<label for="ev-${role}-component">Tipo de medidor</label><select id="ev-${role}-component">${Object.entries(types).map(([v,label])=>`<option value="${v}"${v===(b?.component||(role==='meter'?'emeter':'auto'))?' selected':''}>${label}</option>`).join('')}</select>`}</fieldset>`}).join('');$('ev-threshold').value=ev?.thresholdWatts??50}
 function read(previous){const ev={thresholdWatts:Number($('ev-threshold').value)};for(const role of roles){const id=$('ev-'+role+'-id').value.trim();if(id)ev[role]={deviceId:id,channel:Number($('ev-'+role+'-channel').value),...(role==='relay'?{}:{component:$('ev-'+role+'-component').value})}}
  return !previous&&roles.every(r=>!ev[r])&&ev.thresholdWatts===50?undefined:ev;
 }
 function dirty(ev){if(Number($('ev-threshold').value)!==(ev?.thresholdWatts??50))return true;return roles.some(role=>{const b=ev?.[role];return $('ev-'+role+'-id').value.trim().toLowerCase()!==(b?.deviceId||'')||Number($('ev-'+role+'-channel').value)!==(b?.channel??0)||(role!=='relay'&&b&&$('ev-'+role+'-component').value!==b.component)})}
 window.CasaEVForm={fill,read,dirty};
})();
