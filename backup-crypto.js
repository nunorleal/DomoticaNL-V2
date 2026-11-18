/* Password-protected Cloud key backups. Native Web Crypto; no network or stored password. */
(function(root){
 'use strict';const FORMAT='casa-leal-cloud-key-aes-gcm-v1',ITERATIONS=600000;
 const fail=()=>Error('Chave cifrada invalida ou formato nao suportado.');
 function object(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||Object.keys(v).some(k=>!keys.includes(k)))throw fail()}
 function encode(bytes){return btoa(String.fromCharCode(...bytes))}
 function decode(s,min,max){if(typeof s!=='string'||s.length>32768||!s.length||s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))throw fail();let out;try{out=Uint8Array.from(atob(s),c=>c.charCodeAt(0))}catch{throw fail()}if(out.length<min||out.length>max||encode(out)!==s)throw fail();return out}
 function validate(v){object(v,['server','encrypted']);if(typeof v.server!=='string'||!v.server||v.server.length>200)throw fail();const e=v.encrypted;object(e,['format','kdf','hash','iterations','salt','iv','ciphertext']);if(e.format!==FORMAT||e.kdf!=='PBKDF2'||e.hash!=='SHA-256'||e.iterations!==ITERATIONS)throw fail();decode(e.salt,16,16);decode(e.iv,12,12);decode(e.ciphertext,17,20000);return {server:v.server,encrypted:{...e}}}
 function provider(){const c=globalThis.crypto;if(!c?.subtle||!c.getRandomValues)throw Error('Este navegador nao disponibiliza encriptacao segura. Nao foi exportada nenhuma chave.');return c}
 function password(v){if(typeof v!=='string'||v.length<4||v.length>1024)throw Error('Use uma palavra-passe do backup com pelo menos 4 caracteres.');return v}
 async function key(c,pass,salt,usage){const raw=new TextEncoder().encode(password(pass));try{const base=await c.subtle.importKey('raw',raw,'PBKDF2',false,['deriveKey']);return await c.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt},base,{name:'AES-GCM',length:256},false,[usage])}finally{raw.fill(0)}}
 const aad=server=>new TextEncoder().encode(FORMAT+'\n'+server);
 async function encrypt(plain,pass){
  if(!plain||typeof plain.server!=='string'||!plain.server||plain.server.length>200||typeof plain.authKey!=='string'||!plain.authKey.trim()||plain.authKey.length>4096||/[\r\n]/.test(plain.authKey))throw Error('Chave Shelly Cloud ausente ou invalida.');
  const c=provider(),salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12)),derived=await key(c,pass,salt,'encrypt'),bytes=new TextEncoder().encode(JSON.stringify({authKey:plain.authKey}));
  try{const ciphertext=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(plain.server),tagLength:128},derived,bytes);return validate({server:plain.server,encrypted:{format:FORMAT,kdf:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))}})}finally{bytes.fill(0)}
 }
 async function decrypt(value,pass){
  const clean=validate(value),e=clean.encrypted,c=provider(),derived=await key(c,pass,decode(e.salt,16,16),'decrypt');let bytes;
  try{bytes=new Uint8Array(await c.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv,12,12),additionalData:aad(clean.server),tagLength:128},derived,decode(e.ciphertext,17,20000)));const plain=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));object(plain,['authKey']);if(typeof plain.authKey!=='string'||!plain.authKey.trim()||plain.authKey.length>4096||/[\r\n]/.test(plain.authKey))throw fail();return {server:clean.server,authKey:plain.authKey}}catch{throw Error('Palavra-passe incorreta ou chave cifrada alterada. Nenhum dado foi importado.')}finally{bytes?.fill(0)}
 }

 const UNIFI_FORMAT='casa-leal-unifi-aes-gcm-v1',UNIFI_SERVER='https://api.ui.com';
 function unifiConfig(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Configuração UniFi inválida.');
  const text=(key,max,required=true)=>{
   const v=value[key];
   if(typeof v!=='string'||v.length>max||(required&&!v.trim())||/[\r\n]/.test(v))throw Error('Configuração UniFi inválida.');
   return v;
  };
  const clean={key:text('key',4096),host:text('host',256),site:text('site',256),
   hostName:text('hostName',256,false),siteName:text('siteName',256,false)};
  if(!Array.isArray(value.people)||value.people.length!==3)throw Error('Configuração UniFi inválida.');
  const validMac=v=>typeof v==='string'&&/^(?:[a-f\d]{2}:){5}[a-f\d]{2}$/i.test(v);
  const validIp=v=>/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v)&&v.split('.').every(part=>+part<=255);
  clean.people=value.people.map(person=>{
   if(!person||typeof person!=='object'||typeof person.name!=='string'||!person.name.trim()||person.name.length>32||
      typeof person.address!=='string'||(person.address&&!validMac(person.address.replaceAll('-',':'))&&!validIp(person.address))||
      (person.mac&&!validMac(person.mac)))throw Error('Telefone UniFi inválido na cópia.');
   return {name:person.name,address:person.address,mac:person.mac||''};
  });
  if(value.revision!==undefined&&(!Number.isFinite(value.revision)||value.revision<0))throw Error('Configuração UniFi inválida.');
  clean.revision=value.revision??0;
  return clean;
 }
 function validateUnifi(value){
  if(value?.server!==UNIFI_SERVER||value.encrypted?.format!==UNIFI_FORMAT)throw Error('Chave UniFi cifrada inválida.');
  const old=validate({...value,encrypted:{...value.encrypted,format:FORMAT}});
  return {...old,encrypted:{...old.encrypted,format:UNIFI_FORMAT}};
 }
 async function encryptUnifi(value,pass){
  const plain=unifiConfig(value),c=provider(),salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12));
  const derived=await key(c,pass,salt,'encrypt'),bytes=new TextEncoder().encode(JSON.stringify(plain));
  try{
   const ciphertext=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(UNIFI_FORMAT),tagLength:128},derived,bytes);
   return validateUnifi({server:UNIFI_SERVER,encrypted:{format:UNIFI_FORMAT,kdf:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))}});
  }finally{bytes.fill(0)}
 }
 async function decryptUnifi(value,pass){
  const e=validateUnifi(value).encrypted,c=provider(),derived=await key(c,pass,decode(e.salt,16,16),'decrypt');let bytes;
  try{
   bytes=new Uint8Array(await c.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv,12,12),additionalData:new TextEncoder().encode(UNIFI_FORMAT),tagLength:128},derived,decode(e.ciphertext,17,20000)));
   return unifiConfig(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
  }catch{throw Error('Palavra-passe incorreta ou dados UniFi cifrados alterados. Nenhum dado foi importado.')}
  finally{bytes?.fill(0)}
 }

 const SUPABASE_FORMAT='casa-leal-supabase-login-aes-gcm-v1',SUPABASE_SERVER='https://xnxkezilascdouyueukm.supabase.co';
 function supabaseConfig(value){
  if(!value||Object.keys(value).some(k=>!['server','email','password'].includes(k))||value.server!==SUPABASE_SERVER||typeof value.email!=='string'||value.email.length>320||!/^\S+@\S+\.\S+$/.test(value.email)||typeof value.password!=='string'||!value.password.length||value.password.length>4096)throw Error('Email ou palavra-passe Supabase inválidos.');
  return {server:SUPABASE_SERVER,email:value.email,password:value.password};
 }
 function validateSupabase(value){
  if(value?.server!==SUPABASE_SERVER||value.encrypted?.format!==SUPABASE_FORMAT)throw Error('Acesso Supabase cifrado inválido.');
  const clean=validate({...value,encrypted:{...value.encrypted,format:FORMAT}});return {...clean,encrypted:{...clean.encrypted,format:SUPABASE_FORMAT}};
 }
 async function encryptSupabase(value,pass){
  const plain=supabaseConfig(value),c=provider(),salt=c.getRandomValues(new Uint8Array(16)),iv=c.getRandomValues(new Uint8Array(12)),derived=await key(c,pass,salt,'encrypt'),bytes=new TextEncoder().encode(JSON.stringify(plain));
  try{const ciphertext=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(SUPABASE_FORMAT),tagLength:128},derived,bytes);return validateSupabase({server:SUPABASE_SERVER,encrypted:{format:SUPABASE_FORMAT,kdf:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))}})}finally{bytes.fill(0)}
 }
 async function decryptSupabase(value,pass){
  const e=validateSupabase(value).encrypted,c=provider(),derived=await key(c,pass,decode(e.salt,16,16),'decrypt');let bytes;
  try{bytes=new Uint8Array(await c.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv,12,12),additionalData:new TextEncoder().encode(SUPABASE_FORMAT),tagLength:128},derived,decode(e.ciphertext,17,20000)));return supabaseConfig(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)))}catch{throw Error('Palavra-passe incorreta ou acesso Supabase cifrado alterado. Nenhum dado foi importado.')}finally{bytes?.fill(0)}
 }
 const api={supabaseConfig,validateSupabase,encryptSupabase,decryptSupabase,FORMAT,ITERATIONS,validate,encrypt,decrypt,unifiConfig,validateUnifi,encryptUnifi,decryptUnifi};if(typeof module==='object'&&module.exports)module.exports=api;else root.CasaBackupCrypto=api;
})(typeof window==='object'?window:globalThis);
