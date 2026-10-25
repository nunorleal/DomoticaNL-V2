/* Settings backup controls; import never sends commands to devices. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);let pending=null,sourceBackup=null;
 function status(message,error=false){$('backup-status').textContent=message;$('backup-status').classList.toggle('error',error)}
 function clear(){pending=null;sourceBackup=null;$('backup-preview').hidden=true;$('backup-file').value=''}
 $('export-data').addEventListener('click',()=>{
  try{
   if(window.CasaShelly?.hasUnsavedChanges())throw Error('Há alterações Shelly por guardar. Use Guardar configuração no menu Shelly Cloud antes de exportar.');
   persist();persistRoomLayout();
   // Always include defaults even before the user has changed a preference.
   const env=CasaEnvironment.getState();localStorage.setItem('casa-nl-environment-v1',JSON.stringify({city:env.city,mode:env.mode}));localStorage.setItem('casa-nl-show-banners',JSON.stringify(labels));localStorage.setItem('casa-nl-show-blind-banners',JSON.stringify(showBlindBanners));
   const version=document.querySelector('[data-app-version]').textContent.replace(/^Versão\s*/,'').trim();
   const backup=CasaBackup.create(localStorage,version),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=`casa-nl-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Cópia de segurança exportada. '+CasaBackup.describe(backup)+'. A chave Cloud só é incluída se escolheu guardá-la.');
  }catch(e){status(e.message||'Não foi possível exportar os dados.',true)}
 });
 $('import-data').addEventListener('click',()=>{clear();$('backup-file').click()});
 $('backup-file').addEventListener('change',async()=>{
  const file=$('backup-file').files[0];if(!file)return;
  try{
   if(file.size>CasaBackup.MAX_BYTES)throw new Error('O ficheiro deve ter no máximo 8 MB.');
   pending=CasaBackup.parse(await file.text());
   // Reject room centres outside their respective floor polygons.
   for(const [id,r]of Object.entries(pending.data['casa-nl-room-layout-v1']))if(!BannerGeometry.rectFits(roomPolygons(id),{x:r.lx*10.24,y:140+r.ly*11.8},1,1))throw new Error('O ficheiro contém uma posição de divisão inválida.');
   sourceBackup=pending;updatePreview();
   $('backup-preview').hidden=false;status('Ficheiro validado. Pronto para restaurar.');
  }catch(e){if(sourceBackup){pending=null;$('backup-preview').hidden=false}else clear();status(e.message||'Não foi possível ler o ficheiro.',true)}
 });
 const preserve=document.createElement('label');preserve.className='shelly-remember';preserve.innerHTML='<input id="backup-preserve-ids" type="checkbox" checked>Preservar associações Shelly atuais que faltam no ficheiro';$('backup-preview').prepend(preserve);
 function updatePreview(){if(!sourceBackup)return;const plan=CasaBackup.prepareImport(localStorage,sourceBackup,$('backup-preserve-ids').checked);pending=plan.backup;const env=pending.data['casa-nl-environment-v1'];$('backup-summary').textContent=`8 divisões · ${env.city?.name||'Cidade por selecionar'} · ${CasaBackup.describe(pending)}. ${plan.preserved?plan.preserved+' associações atuais preservadas. ':''}${plan.differentAccount?'Conta Cloud diferente: não juntámos IDs das duas contas. ':''}As restantes preferências serão substituídas pelas do ficheiro.`}
 $('backup-preserve-ids').addEventListener('change',()=>{try{updatePreview();status('Pré-visualização atualizada.')}catch(e){pending=null;status(e.message,true)}});
 $('cancel-import').addEventListener('click',()=>{clear();status('Importação cancelada. Os dados atuais foram mantidos.')});
 $('confirm-import').addEventListener('click',()=>{
  if(!pending)return;
  try{
   updatePreview();CasaBackup.restore(localStorage,pending);
   for(const id of [...motions.keys()])stopMotion(id);
   // The pagehide persistence must use imported states, never the previous rooms.
   const saved=pending.data['casa-nl-realistic-v2'];rooms=defaults.map(r=>({...r,...saved.find(s=>s.id===r.id)}));
   restoreRoomLayout();persist();window.location.reload();
  }catch(e){status(e.message||'Não foi possível importar os dados.',true)}
 });
})();
