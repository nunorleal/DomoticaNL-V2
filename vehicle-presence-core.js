/* Presence estimate for the parked vehicle, independent of display preferences. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.CasaVehiclePresenceCore=factory();
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function state(people,charging,previous={}){
  const list=Array.isArray(people)?people:[];
  const joana=list.find(person=>typeof person?.name==='string'&&
   /\bjoana\b/i.test(person.name))||list[1];
  const atHome=joana?.state==='home',away=joana?.state==='away';
  const chargeOverride=atHome?false:charging===true||previous.chargeOverride===true;
  const present=charging===true||atHome||chargeOverride||(!away&&previous.present!==false);
  return {present,chargeOverride};
 }
 return {state};
});
