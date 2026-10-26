(function(){
 'use strict';const $=id=>document.getElementById(id),g=document.createElement('details');g.id='shelly-heater-group';g.className='shelly-equipment-group';g.innerHTML='<summary><span>Termoventilador<small>Interruptor Shelly · ligar/desligar</small></span></summary><div class="shelly-equipment-content"><label for="heater-id">Device ID</label><input id="heater-id" autocomplete="off" spellcheck="false" maxlength="48" placeholder="ea9d29"><label for="heater-channel">Canal do relé</label><input id="heater-channel" type="number" min="0" max="15" step="1" value="0"><p class="settings-explanation">ON = alimentação ligada; OFF = desligada. A temperatura e o modo são definidos no próprio aparelho. Deixe o ID vazio para retirar a associação.</p><button type="submit" class="primary-action">Guardar termoventilador</button></div>';$('shelly-fan-group').after(g);
 function fill(b){$('heater-id').value=b?.deviceId||'';$('heater-channel').value=b?.channel??0}
 function read(){const deviceId=$('heater-id').value.trim();return deviceId?{deviceId,channel:Number($('heater-channel').value)}:null}
 function dirty(b){return $('heater-id').value.trim().toLowerCase()!==(b?.deviceId||'')||!!b&&Number($('heater-channel').value)!==b.channel}
 window.CasaHeaterForm={fill,read,dirty};
})();
