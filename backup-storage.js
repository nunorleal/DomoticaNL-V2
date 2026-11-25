/* Transactional backup writes. Only regenerable weather caches may be reclaimed. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBackupStorage=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const isQuota=e=>e?.name==='QuotaExceededError'||e?.name==='NS_ERROR_DOM_QUOTA_REACHED'||e?.code===22||e?.code===1014;
 const isWeather=k=>k==='casa-nl-weather-v1'||/^wc-weather--?\d+(?:\.\d+)?--?\d+(?:\.\d+)?$/.test(k);
 function reclaim(storage){
  const keys=[];
  for(let i=0;i<storage.length;i++){const k=storage.key(i);if(isWeather(k))keys.push(k)}
  for(const k of keys)storage.removeItem(k);
  return keys.length;
 }
 function write(storage,entries,remove=[]){
  const keys=[...new Set([...remove,...entries.map(([key])=>key)])],previous=new Map(keys.map(k=>[k,storage.getItem(k)]));
  const apply=()=>{for(const k of keys)storage.removeItem(k);for(const [k,v]of entries)storage.setItem(k,v)};
  try{apply();return}
  catch(initial){
   let cause=initial;
   if(isQuota(initial)){
    try{if(reclaim(storage)){apply();return}}catch(e){cause=e}
   }
   let restored=true;
   // Remove partial new values before replacing old ones, avoiding temporary quota spikes.
   for(const k of keys)try{storage.removeItem(k)}catch{restored=false}
   for(const [k,v]of previous)if(v!==null)try{storage.setItem(k,v)}catch{restored=false}
   try{restored=keys.every(k=>storage.getItem(k)===previous.get(k))}catch{restored=false}
   const reason=isQuota(cause)?'O armazenamento desta app no navegador está cheio. O limite não é o tamanho do ficheiro JSON.':
    cause?.name==='SecurityError'?'O navegador bloqueou o armazenamento desta página. Verifique as permissões do navegador ou importe na app publicada.':
    'Não foi possível guardar a importação neste navegador.';
   const result=restored?' Os dados anteriores foram repostos.':' Não foi possível repor todos os dados anteriores. Guarde o backup antes de tentar novamente.';
   const error=new Error(reason+result);error.name='BackupStorageError';error.code=isQuota(cause)?'quota':cause?.name==='SecurityError'?'blocked':'write';error.restored=restored;throw error;
  }
 }
 return {write,isQuota};
});
