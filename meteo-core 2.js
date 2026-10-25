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
  const booleans=['seconds','clock12','animations','dynamic'];const result={};
  for(const [k,v]of Object.entries(value)){
   const valid=k==='focusSeconds'?[0,15,30,60,120,300].includes(v):booleans.includes(k)?typeof v==='boolean':choices[k]?choices[k].includes(v):['start','end','redStart','redEnd'].includes(k)?typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v):['dim','effects','cold'].includes(k)?Number.isFinite(v)&&v>=(k==='cold'?-30:0)&&v<=(k==='cold'?40:100):false;
   if(!valid)throw Error('Preferências MeteoNL inválidas.');result[k]=v;
  }return result;
 }
 function redActive(p,minutes,night){if(p.nightPalette!=='red')return false;if(p.redSchedule!=='custom')return night;const a=(p.redStart||'23:00').split(':').map(Number),b=(p.redEnd||'07:00').split(':').map(Number),start=a[0]*60+a[1],end=b[0]*60+b[1];return start===end|| (start<end?minutes>=start&&minutes<end:minutes>=start||minutes<end)}
 function realTemperature(binding,reading,now=Date.now()){const configured=!!binding,value=reading?.temperature,temperature=configured&&typeof value==='number'&&Number.isFinite(value)&&value>=-100&&value<=150?value:null,fresh=temperature!==null&&reading.online&&!reading.error&&Number.isFinite(reading.fetchedAt)&&now>=reading.fetchedAt&&now-reading.fetchedAt<=120000;return {configured,temperature,status:!configured?'unconfigured':!reading?'pending':temperature===null?'unavailable':fresh?'current':'last'}}
 async function lampAction(s,settings){
  if(!s)return;
  const lamp=s.lampSnapshot('master');
  if(!lamp.configured){settings();return}
  if(lamp.busy)return;
  if(!lamp.ready||!lamp.state){await s.refresh({quiet:true});return}
  await s.commandLight('master',!lamp.state.on);
 }
 return {idle,preferences,lampAction,screensaver,realTemperature,redActive};
});
