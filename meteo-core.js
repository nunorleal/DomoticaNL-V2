/* The screensaver never sends a device command. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaMeteoCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function idle({now=Date.now,delay=30000,onIdle,blocked=()=>false}){
  let last=now(),active=true;
  return {activity(){last=now()},setActive(value){active=value;last=now()},setDelay(value){delay=value;last=now()},tick(){if(active&&delay>0&&now()-last>=delay&&!blocked()){active=false;onIdle()}},get active(){return active}};
 }
 const SCREENSAVER_SECONDS=[0,15,30,60,120,300,600,900,1800];
 function screensaver(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!SCREENSAVER_SECONDS.includes(value.seconds))throw Error('Tempo do protetor de ecrã inválido.');
  return {seconds:value.seconds};
 }
 function preferences(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Preferências MeteoNL inválidas.');
  const choices={redSchedule:['night','custom'],nightPalette:['color','red'],night:['auto','on','off'],temp:['C','F'],wind:['kmh','ms','mph'],demo:['auto','sunny','cold','night','rain','storm','fog','sunset']};
  const booleans=['seconds','clock12','animations','dynamic','nightUntilBlindOpen','activityEnabled'];const result={};
  for(const [k,v]of Object.entries(value)){
   const valid=k==='activityDevices'?Array.isArray(v)&&new Set(v).size===v.length&&v.every(id=>['heater','dehumidifier','washer','dishwasher','tv','ev','playstation','soundbar','vodafone','unifi','monitor','apollo','terramaster','blackdrive','boiler','hob','oven'].includes(id)):k==='indoorSensor'?typeof v==='string'&&/^[a-z][a-z0-9:-]{0,63}$/.test(v):k==='focusSeconds'?[0,15,30,60,120,300].includes(v):booleans.includes(k)?typeof v==='boolean':choices[k]?choices[k].includes(v):['start','end','redStart','redEnd'].includes(k)?typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v):['dim','effects','cold'].includes(k)?Number.isFinite(v)&&v>=(k==='cold'?-30:0)&&v<=(k==='cold'?40:100):false;
   if(!valid)throw Error('Preferências MeteoNL inválidas.');result[k]=v;
  }return result;
 }
 function redActive(p,minutes,night){if(p.nightPalette!=='red')return false;if(p.redSchedule!=='custom')return night;const a=(p.redStart||'23:00').split(':').map(Number),b=(p.redEnd||'07:00').split(':').map(Number),start=a[0]*60+a[1],end=b[0]*60+b[1];return start===end|| (start<end?minutes>=start&&minutes<end:minutes>=start||minutes<end)}
 function bedroomBlind(binding,reading,health,now=Date.now()){
  const configured=!!binding,ready=!!(configured&&health==='ready'&&reading?.online&&!reading.error&&!reading.missing&&!reading.errors?.length&&reading.hasCover&&reading.calibrated===true&&Number.isFinite(reading.position)&&reading.position>=0&&reading.position<=100&&Number.isFinite(reading.fetchedAt)&&now>=reading.fetchedAt&&now-reading.fetchedAt<=45000);
  return {configured,ready,open:ready&&reading.position===100,position:ready?reading.position:null};
 }
 function morningBlindVisible({red=false,now,sunrise,sunset},blind){
  return red===true&&Number.isFinite(now)&&Number.isFinite(sunrise)&&Number.isFinite(sunset)&&sunrise<sunset&&sunset-sunrise<86400000&&now>=sunrise&&now<sunset&&blind?.ready===true&&blind.position===0;
 }
 async function morningBlindAction(api,snapshot,context){
  if(!api||api.isBusy()||api.hasUnsavedChanges()||!morningBlindVisible(context(),snapshot()))return false;
  return await api.command('master','open')===true;
 }
 function bedsideMode(previous,{enabled=false,night=false,red=false,blindOpen=false,morningRequested=false,now,sunrise,sunset}){
  let holdNight=enabled&&!!(previous?.holdNight||night&&!previous?.baseNight),holdRed=enabled&&!!(previous?.holdRed||red&&!previous?.baseRed);
  const validNow=Number.isFinite(now),day=validNow&&Number.isFinite(sunrise)&&Number.isFinite(sunset)&&sunrise<sunset&&sunset-sunrise<86400000&&now>=sunrise&&now<sunset;
  let morningUntil=validNow&&Number.isFinite(previous?.morningUntil)&&previous.morningUntil>now&&previous.morningUntil-now<86400000?previous.morningUntil:0;
  let morningReleased=morningUntil>0&&previous?.morningReleased===true;
  if(morningRequested===true&&day){morningUntil=sunset;morningReleased=false}
  if(blindOpen===true){holdNight=false;holdRed=false;if(morningUntil>0)morningReleased=true}
  const daylight=morningUntil>0&&morningReleased;
  return {baseNight:night,baseRed:red,holdNight,holdRed,morningUntil,morningReleased,night:!daylight&&(night||red||holdNight||holdRed),red:!daylight&&(red||holdRed)};
 }

 function indoorClimate(id,sensors,read,now=Date.now()){
  const sensor=sensors.find(sensor=>sensor.id===id);
  return {...bedroomClimate(sensor?.configured,sensor?.configured?read(id):null,now),name:sensor?.name||'Divisão'};
 }
 function realTemperature(binding,reading,now=Date.now()){const configured=!!binding,value=reading?.temperature,temperature=configured&&typeof value==='number'&&Number.isFinite(value)&&value>=-100&&value<=150?value:null,fresh=temperature!==null&&reading.online&&!reading.error&&Number.isFinite(reading.fetchedAt)&&now>=reading.fetchedAt&&now-reading.fetchedAt<=120000;return {configured,temperature,status:!configured?'unconfigured':!reading?'pending':temperature===null?'unavailable':fresh?'current':'last'}}
 function bedroomClimate(binding,reading,now=Date.now()){
  const configured=!!binding,valid=(v,min,max)=>configured&&typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const temperature=valid(reading?.temperature,-100,150)?reading.temperature:null,humidity=valid(reading?.humidity,0,100)?reading.humidity:null;
  const fetchedAt=configured&&Number.isFinite(reading?.fetchedAt)&&reading.fetchedAt>0&&reading.fetchedAt<=now?reading.fetchedAt:null;
  const online=reading?.online===true||reading?.online===1,offline=configured&&!!reading&&(reading.online===false||reading.online===0),error=configured&&!!reading?.error,has=temperature!==null||humidity!==null,fresh=has&&online&&!error&&fetchedAt!==null&&now-fetchedAt<=120000;
  return {configured,temperature,humidity,fetchedAt,offline,error,status:!configured?'unconfigured':!reading?'pending':!has?'unavailable':!fresh?'last':temperature===null||humidity===null?'partial':'current'};
 }
 async function lampAction(s,settings){
  if(!s)return;
  const lamp=s.lampSnapshot('master');
  if(!lamp.configured){settings();return}
  if(lamp.busy)return;
  if(!lamp.ready||!lamp.state){await s.refresh({quiet:true});return}
  await s.commandLight('master',!lamp.state.on,undefined,'meteo');
 }
 return {indoorClimate,idle,preferences,lampAction,screensaver,realTemperature,bedroomClimate,redActive,bedroomBlind,bedsideMode,morningBlindVisible,morningBlindAction};
});
