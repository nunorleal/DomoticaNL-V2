/* Local light diagnostics; no identifiers, credentials, raw responses or network. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaLightAuditCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const KEY='casa-nl-light-audit-v1',ROOMS=['master','bedroom2','living'],KINDS=['request','accepted','failed','initial','observed'],ORIGINS=['individual','brightness','room','consumption','meteo','all','unknown'],SOURCES=['init','http','mqtt','cloud','shc','ws_in','button','switch','input','timer','schedule','script','loopback','ui','rpc'];
 function nativeSource(value){return typeof value==='string'&&SOURCES.includes(value.toLowerCase())?value.toLowerCase():null}
 function clean(v){if(!v||!ROOMS.includes(v.room)||!KINDS.includes(v.kind)||!Number.isFinite(v.time)||v.time<0||typeof v.on!=='boolean')return null;return {time:v.time,room:v.room,kind:v.kind,on:v.on,origin:ORIGINS.includes(v.origin)?v.origin:'unknown',brightness:Number.isInteger(v.brightness)&&v.brightness>=0&&v.brightness<=100?v.brightness:null,source:nativeSource(v.source)}}
 function create({storage=null,now=Date.now,onChange=()=>{}}={}){let records=[];const seen=new Map();try{const saved=JSON.parse(storage?.getItem(KEY)||'[]');if(Array.isArray(saved))records=saved.map(clean).filter(Boolean).slice(-80)}catch{}
  function add(v){const e=clean({...v,time:now()});if(!e)return;records.push(e);records=records.slice(-80);try{storage?.setItem(KEY,JSON.stringify(records))}catch{}try{onChange()}catch{}}
  function observe(room,value){if(!ROOMS.includes(room)||typeof value?.on!=='boolean')return;const source=nativeSource(value.source),before=seen.get(room);if(!before||before.on!==value.on||before.source!==source)add({room,kind:before?'observed':'initial',on:value.on,source});seen.set(room,{on:value.on,source})}
  return {add,observe,reset:()=>seen.clear(),entries:()=>records.map(e=>({...e}))};
 }
 return {KEY,nativeSource,create};
});
