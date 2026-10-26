(function(){
 'use strict';const $=id=>document.getElementById(id),g=document.createElement('details');g.id='shelly-dehumidifier-group';g.className='shelly-equipment-group';g.innerHTML='<summary><span>Desumidificador<small>Interruptor Shelly · ligar/desligar</small></span></summary><div class="shelly-equipment-content"><label for="dehumidifier-id">Device ID</label><input id="dehumidifier-id" autocomplete="off" spellcheck="false" maxlength="48" placeholder="88d798"><label for="dehumidifier-channel">Canal do relé</label><input id="dehumidifier-channel" type="number" min="0" max="15" step="1" value="0"><p class="settings-explanation">ON = alimentação ligada; OFF = desligada. A humidade pretendida e o modo são definidos no próprio aparelho. Deixe o ID vazio para retirar a associação.</p><button type="submit" class="primary-action">Guardar desumidificador</button></div>';$('shelly-heater-group').after(g);
 function fill(b){$('dehumidifier-id').value=b?.deviceId||'';$('dehumidifier-channel').value=b?.channel??0}
 function read(){const deviceId=$('dehumidifier-id').value.trim();return deviceId?{deviceId,channel:Number($('dehumidifier-channel').value)}:null}
 function dirty(b){return $('dehumidifier-id').value.trim().toLowerCase()!==(b?.deviceId||'')||!!b&&Number($('dehumidifier-channel').value)!==b.channel}
 window.CasaDehumidifierForm={fill,read,dirty};
})();
