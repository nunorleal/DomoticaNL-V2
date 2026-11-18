/* Optional Supabase login in password-protected portable backups. */
(function(){
 'use strict';
 const host=document.getElementById('backup-encryption-fields');
 const group=document.createElement('fieldset');group.className='backup-supabase-fields';
 group.innerHTML='<legend>Acesso Supabase</legend><p>Para incluir o acesso, indique o email e a palavra-passe Supabase. Só ficam no JSON encriptado; a palavra-passe não é guardada em texto simples neste navegador.</p><label>Email Supabase<input id="backup-supabase-email" type="email" autocomplete="username"></label><label>Palavra-passe Supabase<input id="backup-supabase-password" type="password" autocomplete="current-password" maxlength="4096"></label>';
 host.append(group);
 const email=document.getElementById('backup-supabase-email'),secret=document.getElementById('backup-supabase-password');
 function fill(){const access=window.CasaHistorySyncAccess;if(!email.value)email.value=access?.email()||''}
 document.getElementById('backup-include-cloud-key').addEventListener('change',fill);
 async function credentials(password){
  fill();const access=window.CasaHistorySyncAccess,memory=access?.credentials();
  if(secret.value)return window.CasaBackupCrypto.supabaseConfig({server:'https://xnxkezilascdouyueukm.supabase.co',email:email.value.trim(),password:secret.value});
  if(memory&&(!email.value||email.value.trim()===memory.email))return memory;
  let saved=null;try{saved=JSON.parse(localStorage.getItem(access?.storageKey)||'null')}catch{}
  if(saved)try{const plain=await window.CasaBackupCrypto.decryptSupabase(saved,password);if(email.value.trim()&&email.value.trim()!==plain.email)throw Error('other account');return plain}catch{throw Error('Introduza a palavra-passe Supabase para incluir o acesso neste novo backup.');}
  if(email.value.trim())throw Error('Introduza a palavra-passe Supabase para a incluir encriptada no backup.');
  return null;
 }
 window.CasaBackupSupabase={credentials,clear:()=>{secret.value=''}};
})();
