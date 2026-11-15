(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const group=document.createElement('details');
 group.id='shelly-christmas-tree-group';
 group.className='shelly-equipment-group';
 group.innerHTML='<summary><span>Árvore de Natal<small>Interruptor Shelly · luzes</small></span></summary>'+
  '<div class="shelly-equipment-content"><label for="christmas-tree-id">Device ID</label>'+
  '<input id="christmas-tree-id" autocomplete="off" spellcheck="false" maxlength="48">'+
  '<label for="christmas-tree-channel">Canal do relé</label>'+
  '<input id="christmas-tree-channel" type="number" min="0" max="15" step="1" value="0">'+
  '<button type="submit" class="primary-action">Guardar árvore de Natal</button></div>';
 $('shelly-heater-group').after(group);
 window.CasaChristmasTreeForm={
  fill(binding){
   $('christmas-tree-id').value=binding?.deviceId||'';
   $('christmas-tree-channel').value=binding?.channel??0;
  },
  read(){
   const deviceId=$('christmas-tree-id').value.trim();
   return deviceId?{deviceId,channel:Number($('christmas-tree-channel').value)}:null;
  },
  dirty(binding){
   const value=this.read();
   return (value?.deviceId.toLowerCase()||'')!==(binding?.deviceId||'')||
    (!!binding&&value?.channel!==binding.channel);
  }
 };
})();
