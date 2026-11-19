/* Lossless local history storage. Backups and callers continue to use ordinary JSON. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./vendor/lz-string-1.5.0.js'));else{root.CasaHistoryStorage=factory(root.LZString);root.CasaHistoryStorage.install(root)}})(typeof window==='undefined'?globalThis:window,function(LZ){
 'use strict';
 const keys=new Set(['casa-nl-presence-history-v1','casa-leal-presence-history-v1','casa-nl-daily-energy-v1','casa-leal-daily-energy-v1','casa-nl-sensor-history-v1','casa-leal-sensor-history-v1','casa-nl-consumption-history-v1','casa-nl-light-audit-v1']);
 const prefix='@casa-lz1:';
 function hash(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16)}
 function encode(text){
  if(typeof text!=='string'||text.length<1024)return text;
  const value=prefix+text.length+':'+hash(text)+':'+LZ.compressToUTF16(text);
  return value.length<text.length?value:text;
 }
 function decode(value){
  if(typeof value!=='string'||!value.startsWith(prefix))return value;
  const first=value.indexOf(':',prefix.length),second=value.indexOf(':',first+1),length=Number(value.slice(prefix.length,first));
  if(first<0||second<0||!Number.isSafeInteger(length)||length<0||length>64*1024*1024)throw Error('Histórico local compactado inválido.');
  const text=LZ.decompressFromUTF16(value.slice(second+1));
  if(typeof text!=='string'||text.length!==length||hash(text)!==value.slice(first+1,second))throw Error('Não foi possível ler o histórico local compactado. Preserve o backup JSON.');
  return text;
 }
 function install(win){
  if(!LZ||win.__casaHistoryStorageInstalled)return false;
  let area;try{area=win.localStorage}catch{return false}
  const prototype=win.Storage?.prototype;if(!prototype)return false;
  const get=prototype.getItem,set=prototype.setItem;
  prototype.getItem=function(key){const value=get.call(this,key);return this===area&&keys.has(String(key))?decode(value):value};
  prototype.setItem=function(key,value){return set.call(this,key,this===area&&keys.has(String(key))?encode(String(value)):value)};
  win.__casaHistoryStorageInstalled=true;
  // Replacing a value is atomic. If saving is blocked the original remains intact.
  for(const key of keys)try{
   const raw=get.call(area,key);if(raw===null||raw.startsWith(prefix))continue;
   const packed=encode(raw);if(packed.length<raw.length)set.call(area,key,packed);
  }catch{}
  return true;
 }
 return {encode,decode,install};
});
