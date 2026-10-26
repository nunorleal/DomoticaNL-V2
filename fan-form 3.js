(function(){
 'use strict';const $=id=>document.getElementById(id),g=document.createElement('details');g.id='shelly-fan-group';g.className='shelly-equipment-group';g.innerHTML='<summary><span>Ventoinha da cave<small>Interruptor Shelly · ligar/desligar</small></span></summary><div class="shelly-equipment-content"><label for="fan-id">Device ID</label><input id="fan-id" autocomplete="off" spellcheck="false" maxlength="48" placeholder="8819dc"><label for="fan-channel">Canal do relé</label><input id="fan-channel" type="number" min="0" max="15" step="1" value="0"><p class="settings-explanation">ON = ligada; OFF = desligada. Sem controlo de velocidade. Deixe o ID vazio para retirar a associação.</p><button type="submit" class="primary-action">Guardar ventoinha</button></div>';$('shelly-alarm-group').after(g);
 function fill(b){$('fan-id').value=b?.deviceId||'';$('fan-channel').value=b?.channel??0}
 function read(){const deviceId=$('fan-id').value.trim();return deviceId?{deviceId,channel:Number($('fan-channel').value)}:null}
 function dirty(b){return $('fan-id').value.trim().toLowerCase()!==(b?.deviceId||'')||!!b&&Number($('fan-channel').value)!==b.channel}
 window.CasaFanForm={fill,read,dirty};
})();
