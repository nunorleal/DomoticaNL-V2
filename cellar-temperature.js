/* Shared Cloud sensor readings, independent from the cellar door contact. */
(function(){
 'use strict';
 function draw(){const api=window.CasaShelly,b=api?.sensorBinding('cellar'),d=api?.sensorReading('cellar'),el=document.querySelector('#open-cellar .cellar-temperature');if(!el)return;const has=Number.isFinite(d?.temperature),old=has&&(!d.online||d.error||!d.fetchedAt||Date.now()-d.fetchedAt>120000),value=has?d.temperature.toLocaleString('pt-PT',{maximumFractionDigits:1})+' °C':'— °C';el.replaceChildren();if(b){el.append(document.createTextNode(value));const status=!d?'Por consultar':old?'Última leitura':!has?'Indisponível':'';if(status){const small=document.createElement('small');small.textContent=status;el.append(small)}el.title=api.sensorCaption('cellar')}
  const refresh=document.querySelector('.cellar-data-refresh');if(refresh)refresh.disabled=!(b||api?.doorSnapshot('cellar').configured)||!!api?.isBusy();
  const detail=document.getElementById('cellar-temperature-detail');if(detail)detail.innerHTML=b?'<h3>Temperatura da cave</h3>'+api.sensorMarkup('cellar'):'<p>Sensor de temperatura por associar.</p>';window.CasaBasementLayout?.reflow();
 }
 function openSettings(){document.getElementById('open-shelly').click();const input=document.getElementById('shelly-sensor-id-cellar');input.closest('.shelly-equipment-group').open=true;input.scrollIntoView({block:'center'});input.focus()}
 window.CasaCellarTemperature={draw,openSettings};window.addEventListener('sensorchange',draw);setInterval(()=>{if(!document.hidden)draw()},10000);draw();
})();
