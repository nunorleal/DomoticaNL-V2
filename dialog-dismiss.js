/* One backdrop gesture policy for static and dynamically created dialogs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaDialogDismiss=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function outside(dialog,event){const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom}
 function install(root,close=dialog=>dialog.close()){
  let started=null;
  function down(event){const d=event.target;started=d?.tagName==='DIALOG'&&d.open&&outside(d,event)?d:null}
  function cancel(){started=null}
  function click(event){const d=event.target,shouldClose=d===started&&d?.open&&outside(d,event);started=null;if(!shouldClose)return;event.preventDefault();event.stopImmediatePropagation();close(d)}
  root.addEventListener('pointerdown',down,true);root.addEventListener('pointercancel',cancel,true);root.addEventListener('click',click,true);
  return ()=>{root.removeEventListener('pointerdown',down,true);root.removeEventListener('pointercancel',cancel,true);root.removeEventListener('click',click,true);started=null};
 }
 return {install};
});
