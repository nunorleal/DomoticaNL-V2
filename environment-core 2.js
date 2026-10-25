/* Pure environment rules, shared by the app and its checks. */
(function(root){
 'use strict';
 function solarDay(now,lat,lon){
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
  const d=new Date(now),start=Date.UTC(d.getUTCFullYear(),0,1),day=Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-start)/86400000)+1;
  const hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
  const gamma=2*Math.PI/365*(day-1+(hour-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
  const dec=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
  const angle=((hour*60+eq+4*lon)%1440/4-180)*Math.PI/180,p=lat*Math.PI/180;
  const altitude=Math.asin(Math.max(-1,Math.min(1,Math.sin(p)*Math.sin(dec)+Math.cos(p)*Math.cos(dec)*Math.cos(angle))))*180/Math.PI;
  return altitude>-.833;
 }
 function resolveDay(mode,city,data,now=Date.now()){
  if(mode==='day')return true;if(mode==='night')return false;
  const t=now/1000,d=data?.daily;
  if(d&&Array.isArray(d.time)&&Array.isArray(d.sunrise)&&Array.isArray(d.sunset)){
   const i=d.time.findIndex((start,i)=>t>=start&&t<(d.time[i+1]||start+86400));
   if(i>=0&&Number.isFinite(d.sunrise[i])&&d.sunrise[i]>0&&Number.isFinite(d.sunset[i])&&d.sunset[i]>d.sunrise[i])return t>=d.sunrise[i]&&t<d.sunset[i];
  }
  return city?solarDay(now,city.latitude,city.longitude):null;
 }
 // Natural light is proportional to shutter opening, only during daytime.
 const daylightLinks={hall:'bedroom2',bath2:'bedroom2',bath1:'master'};
 function daylightSource(room,rooms=[]){return daylightLinks[room.id]?rooms.find(r=>r.id===daylightLinks[room.id]):room}
 function naturalLight(room,isDay,rooms=[]){
  if(isDay!==true)return 0;
  if(room.id==='balcony')return 1;
  const source=daylightSource(room,rooms);
  return Number.isFinite(source?.blind)?Math.max(0,Math.min(100,source.blind))/100:0;
 }
 function darkness(room,isDay,rooms=[]){
  if(room.light)return 0;
  return 1-naturalLight(room,isDay,rooms);
 }
 // A separate photographic render supplies artificial light when daylight is absent.
 function electricOpacity(room,isDay,rooms=[]){
  if(!room.light)return 0;
  if(isDay!==true)return 1;
  // Even in full daylight, a switched-on light must have a visible electric layer.
  const daylight=naturalLight(room,isDay,rooms);
  return Math.round((1-.55*daylight)*1000)/1000;
 }
 function weather(code,isDay){
  if(code===0)return {icon:isDay===false?'moon':'sun',text:isDay===false?'Céu limpo':'Sol'};
  if(code===1||code===2)return {icon:isDay===false?'cloud':'partly',text:'Parcialmente nublado'};
  if(code===3)return {icon:'cloud',text:'Nublado'};
  if(code===45||code===48)return {icon:'fog',text:'Nevoeiro'};
  if([51,53,55,56,57].includes(code))return {icon:'rain',text:'Chuvisco'};
  if([61,63,65,66,67,80,81,82].includes(code))return {icon:'rain',text:'Chuva'};
  if([71,73,75,77,85,86].includes(code))return {icon:'snow',text:'Neve'};
  if([95,96,99].includes(code))return {icon:'storm',text:'Trovoada'};
  return {icon:'cloud',text:'Estado do tempo indisponível'};
 }
 const core={solarDay,resolveDay,daylightSource,naturalLight,darkness,electricOpacity,weather};
 if(typeof module==='object'&&module.exports)module.exports=core;else root.WeatherCore=core;
})(typeof window==='object'?window:globalThis);
