/* Preserve the entered associations while using only enabled ones at runtime. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaShellyDisabled=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function normalize(value,fields){
  if(value===undefined)return undefined;
  if(!Array.isArray(value)||value.length>Object.keys(fields).length||value.some(id=>typeof id!=='string'||!Object.hasOwn(fields,id)))throw Error('Lista de equipamentos Shelly desativados inválida.');
  return [...new Set(value)].sort();
 }
 function active(config,fields){
  if(!config.disabledShellys?.length)return config;
  const enabled={...config};
  for(const id of config.disabledShellys){
   const [group,role]=fields[id];
   if(role===undefined)delete enabled[group];
   else if(Object.hasOwn(enabled[group]||{},role)){
    if(enabled[group]===config[group])enabled[group]={...enabled[group]};
    delete enabled[group][role];
   }
  }
  return enabled;
 }
 function mount(input,checked,anchor=input){
  const id=input.id+'-disabled';
  let checkbox=document.getElementById(id);
  if(!checkbox){
   const label=document.createElement('label');label.className='shelly-disable-option';
   checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id=id;
   label.append(checkbox,document.createTextNode('Desativar este Shelly'));
   anchor.after(label);
  }
  checkbox.checked=checked;
  return checkbox;
 }
 return {normalize,active,mount};
});
