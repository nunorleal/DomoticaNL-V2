/* A single-use encrypted handoff across the reload that completes a backup import. */
(function(){
 'use strict';const DB='casa-backup-login-transfer-v1',STORE='pending',TTL=120000;let connection;
 const tokenKey=house=>'casa-backup-login-resume:'+house;
 const validHouse=house=>{if(!['t2','duplex'].includes(house))throw Error('Casa inválida.');return house};
 function open(){
  if(connection)return connection;
  connection=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Não foi possível preparar a ligação automática ao Supabase.'));r.onblocked=()=>reject(Error('Feche outras páginas desta app e tente importar novamente.'))});
  return connection;
 }
 async function put(record){const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);store.put(record);const request=store.openCursor();request.onsuccess=()=>{const c=request.result;if(c){if(c.value.expiresAt<Date.now())c.delete();c.continue()}};tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(Error('Não foi possível preparar a ligação automática ao Supabase.'))})}
 async function take(id){const db=await open();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let record;const r=store.get(id);r.onsuccess=()=>{record=r.result;store.delete(id)};tx.oncomplete=()=>resolve(record);tx.onabort=tx.onerror=()=>reject(Error('Não foi possível recuperar o acesso importado.'))})}
 async function prepare(house,value){
  validHouse(house);const plain=window.CasaBackupCrypto.supabaseConfig(value),c=window.crypto;
  const id=Array.from(c.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
  const probe=tokenKey(house)+':'+id;sessionStorage.setItem(probe,'1');sessionStorage.removeItem(probe);
  const key=await c.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),iv=c.getRandomValues(new Uint8Array(12)),bytes=new TextEncoder().encode(JSON.stringify(plain));
  try{const path=location.pathname,aad=new TextEncoder().encode(house+'\n'+path),ciphertext=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,bytes);await put({id,house,path,key,iv,ciphertext,expiresAt:Date.now()+TTL});return {id,house}}finally{bytes.fill(0)}
 }
 function arm(ticket){if(!ticket)return;validHouse(ticket.house);sessionStorage.setItem(tokenKey(ticket.house),ticket.id)}
 async function cancel(ticket){if(!ticket)return;try{if(sessionStorage.getItem(tokenKey(ticket.house))===ticket.id)sessionStorage.removeItem(tokenKey(ticket.house));await take(ticket.id)}catch{}}
 async function consume(house){
  validHouse(house);const key=tokenKey(house),id=sessionStorage.getItem(key);if(!id)return null;sessionStorage.removeItem(key);
  if(!/^[a-f0-9]{48}$/.test(id))return null;const record=await take(id);
  if(!record||record.house!==house||record.path!==location.pathname||record.expiresAt<Date.now()||record.expiresAt-Date.now()>TTL)return null;
  let bytes;try{bytes=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:new TextEncoder().encode(house+'\n'+record.path)},record.key,record.ciphertext));return window.CasaBackupCrypto.supabaseConfig(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)))}finally{bytes?.fill(0)}
 }
 window.CasaBackupLoginResume={prepare,arm,cancel,consume};
})();
