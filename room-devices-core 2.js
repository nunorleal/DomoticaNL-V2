/* One inventory for room lists and their read-only Shelly priority scope. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaRoomDevicesCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function entries(room,{heaterRoom='master',dehumidifierRoom='bath1'}={}){
  if(room==='cellar')return [{kind:'fan',id:''},{kind:'alarm',id:'arm'},{kind:'alarm',id:'trigger'},{kind:'sensor',id:'cellar'},{kind:'door',id:'cellar'}];
  if(!['master','bedroom2','living','kitchen','bath1','bath2','hall','balcony'].includes(room))return [];
  const out=[{kind:'light',id:room}],add=(kind,id)=>out.push({kind,id});
  if(['master','living','balcony'].includes(room))add('sensor',room);
  if(['master','bedroom2','living','kitchen'].includes(room)){add('cover',room);add('window',room)}
  if(room==='living'){for(const id of ['tv','soundbar','playstation','vodafone','unifi'])add('media',id);add('door','entrance')}
  if(room==='bedroom2')for(const id of ['monitor','apollo','terramaster','blackdrive'])add('office',id);
  if(room==='kitchen')for(const id of ['dishwasher','washer','boiler'])add('kitchen',id);
  if(heaterRoom===room)add('heater','');if(dehumidifierRoom===room)add('dehumidifier','');
  return out;
 }
 return {entries};
});
