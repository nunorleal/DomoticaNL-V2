/* Settings backup controls; import never sends commands to devices. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);let pending=null,sourceBackup=null,busy=false,readGeneration=0;
 function status(message,error=false){$('backup-status').textContent=message;$('backup-status').classList.toggle('error',error)}
 function clearPasswords(){for(const id of ['backup-password','backup-password-confirm','backup-import-password'])$(id).value=''}
 function setBusy(value){busy=value;for(const id of ['export-data','import-data','backup-include-cloud-key','backup-restore-cloud-key','backup-preserve-ids']){const el=$(id);if(el)el.disabled=value}$('confirm-import').disabled=value||!pending}
 function syncEncryption(){$('backup-encryption-fields').hidden=!$('backup-include-cloud-key').checked;if(!$('backup-include-cloud-key').checked)clearPasswords()}
 function syncDecryption(){$('backup-decryption-fields').hidden=!$('backup-restore-cloud-key').checked||!CasaBackup.credentials(sourceBackup||{data:{}})?.encrypted;if($('backup-decryption-fields').hidden)$('backup-import-password').value=''}
 function clear(){readGeneration++;pending=null;sourceBackup=null;clearPasswords();$('backup-preview').hidden=true;$('backup-file').value='';$('backup-restore-cloud-key').checked=false;$('backup-restore-cloud-key-row').hidden=true;syncDecryption();setBusy(busy)}
 $('backup-include-cloud-key').addEventListener('change',syncEncryption);$('backup-restore-cloud-key').addEventListener('change',syncDecryption);$('settings-dialog').addEventListener('close',()=>{readGeneration++;clearPasswords()});syncEncryption();

 $('export-data').addEventListener('click',async()=>{
  if(busy)return;const includeKey=$('backup-include-cloud-key').checked,generation=readGeneration;setBusy(true);
  try{
   if(window.CasaShelly?.hasUnsavedChanges())throw Error('Há alterações Shelly por guardar. Use Guardar configuração no menu Shelly Cloud antes de exportar.');
   persist();persistRoomLayout();
   // Always include defaults even before the user has changed a preference.
   const env=CasaEnvironment.getState();localStorage.setItem('casa-nl-environment-v1',JSON.stringify({city:env.city,mode:env.mode}));localStorage.setItem('casa-nl-show-banners',JSON.stringify(labels));localStorage.setItem('casa-nl-show-blind-banners',JSON.stringify(showBlindBanners));
   const version=document.querySelector('[data-app-version]').textContent.replace(/^Versão\s*/,'').trim();
   window.CasaDailyEnergy?.flush();const before=localStorage.getItem('casa-nl-shelly-cloud-v1'),backup=CasaBackup.create(localStorage,version);if(window.CasaDailyEnergy)backup.data['casa-nl-daily-energy-v1']=window.CasaDailyEnergyCore.validate(window.CasaDailyEnergy.snapshot());
   if(includeKey){
    const password=$('backup-password').value;if(password!==$('backup-password-confirm').value)throw Error('As palavras-passe do backup não coincidem.');
    status('A encriptar a chave localmente…');
    backup.shellyCredentials=await CasaBackupCrypto.encrypt({server:backup.data['casa-nl-shelly-cloud-v1']?.server,authKey:$('shelly-key').value.trim()},password);
    if(generation!==readGeneration)return;
    if(window.CasaShelly?.hasUnsavedChanges()||localStorage.getItem('casa-nl-shelly-cloud-v1')!==before)throw Error('A configuração mudou durante a exportação. Exporte novamente.');
    CasaBackup.parse(JSON.stringify(backup));
   }
   const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   const now=new Date(),pad=value=>String(value).padStart(2,'0');
   const date=[now.getFullYear(),pad(now.getMonth()+1),pad(now.getDate())].join('-'),time=[now.getHours(),now.getMinutes(),now.getSeconds()].map(pad).join('-');
   a.href=url;a.download=`T2-NL-${date}_${time}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status(includeKey?'Cópia JSON exportada com a chave Cloud encriptada. A palavra-passe não está no ficheiro.':'Cópia JSON exportada sem a chave Cloud.');
  }catch(e){window.CasaDailyEnergy?.resume();status(e.message||'Não foi possível exportar os dados.',true)}finally{clearPasswords();setBusy(false)}
 });
 $('import-data').addEventListener('click',()=>{clear();$('backup-file').click()});
 $('backup-file').addEventListener('change',async()=>{
  const file=$('backup-file').files[0];if(!file)return;const generation=++readGeneration;
  try{
   if(file.size>CasaBackup.MAX_BYTES)throw new Error('O ficheiro deve ter no máximo 8 MB.');
   const text=await file.text();if(generation!==readGeneration)return;pending=CasaBackup.parse(text);
   // Reject room centres outside their respective floor polygons.
   for(const [id,r]of Object.entries(pending.data['casa-nl-room-layout-v1']))if(!BannerGeometry.rectFits(roomPolygons(id),{x:r.lx*10.24,y:140+r.ly*11.8},1,1))throw new Error('O ficheiro contém uma posição de divisão inválida.');
   sourceBackup=pending;updatePreview();const credentials=CasaBackup.credentials(pending);$('backup-restore-cloud-key-row').hidden=!credentials;$('backup-restore-cloud-key').checked=!!credentials;syncDecryption();setBusy(false);
   $('backup-preview').hidden=false;status(CasaBackup.credentials(pending)?.encrypted?'Ficheiro validado. Introduza a palavra-passe para restaurar a chave Cloud.':'Ficheiro validado. Pronto para restaurar.');
  }catch(e){if(sourceBackup){pending=null;$('backup-preview').hidden=false}else clear();status(e.message||'Não foi possível ler o ficheiro.',true)}
 });
 const preserve=document.createElement('label');preserve.className='shelly-remember';preserve.innerHTML='<input id="backup-preserve-ids" type="checkbox" checked>Preservar associações Shelly atuais que faltam no ficheiro';$('backup-preview').prepend(preserve);
 function updatePreview(){if(!sourceBackup)return;const plan=CasaBackup.prepareImport(localStorage,sourceBackup,$('backup-preserve-ids').checked);pending=plan.backup;const env=pending.data['casa-nl-environment-v1'];$('backup-summary').textContent=`8 divisões · ${env.city?.name||'Cidade por selecionar'} · ${CasaBackup.describe(pending)}. ${plan.preserved?plan.preserved+' associações atuais preservadas. ':''}${plan.differentAccount?'Conta Cloud diferente: não juntámos IDs das duas contas. ':''}As restantes preferências serão substituídas pelas do ficheiro.`}
 $('backup-preserve-ids').addEventListener('change',()=>{try{updatePreview();status('Pré-visualização atualizada.')}catch(e){pending=null;status(e.message,true)}});
 setBusy(false);
 $('cancel-import').addEventListener('click',()=>{clear();status('Importação cancelada. Os dados atuais foram mantidos.')});
 $('confirm-import').addEventListener('click',async()=>{
  if(!pending||busy)return;const selected=sourceBackup,generation=readGeneration,restoreCredentials=$('backup-restore-cloud-key').checked;setBusy(true);
  try{
   const included=CasaBackup.credentials(sourceBackup);let decrypted=null;
   if(restoreCredentials&&included?.encrypted){status('A desencriptar a chave localmente…');decrypted=await CasaBackupCrypto.decrypt(included,$('backup-import-password').value);if(generation!==readGeneration||sourceBackup!==selected)return}
   updatePreview();window.CasaDailyEnergy?.suspend();CasaBackup.restore(localStorage,pending,{restoreCredentials,decrypted});
   for(const id of [...motions.keys()])stopMotion(id);
   // The pagehide persistence must use imported states, never the previous rooms.
   const saved=pending.data['casa-nl-realistic-v2'];rooms=defaults.map(r=>({...r,...saved.find(s=>s.id===r.id)}));
   restoreRoomLayout();persist();window.location.reload();
  }catch(e){window.CasaDailyEnergy?.resume();status(e.message||'Não foi possível importar os dados.',true)}finally{$('backup-import-password').value='';setBusy(false)}
 });
})();
