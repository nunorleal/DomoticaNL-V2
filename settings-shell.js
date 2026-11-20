/* One visual frame for settings and the pages opened from it. Existing controls stay in place. */
(function(){
 'use strict';
 const root=document.getElementById('settings-dialog');if(!root)return;
 const pages=new WeakMap();
 const title=dialog=>{const known={'presence-history-dialog':'Histórico de presenças','sensor-history-dialog':'Temperatura e humidade','energy-history-dialog':'Histórico de consumo'};if(known[dialog.id])return known[dialog.id];const labelled=dialog.getAttribute('aria-labelledby');return (labelled&&document.getElementById(labelled)?.textContent||dialog.querySelector('h2')?.textContent||dialog.getAttribute('aria-label')||'Opções').trim()};
 function path(dialog){if(dialog===root){const heading=title(root);return root.classList.contains('settings-submenu-open')&&heading!=='Definições'?['Definições',heading]:['Definições']}return pages.get(dialog)?.path||[title(dialog)]}
 function paint(dialog){
  const entry=pages.get(dialog);if(!entry)return;const steps=path(dialog);entry.list.replaceChildren();entry.nav.title=steps.join(' → ');
  for(const step of steps){const li=document.createElement('li'),span=document.createElement('span');span.textContent=step;li.append(span);entry.list.append(li)}
  entry.list.lastElementChild?.setAttribute('aria-current','page');entry.back.disabled=dialog===root?!root.classList.contains('settings-submenu-open'):!entry.parent?.open;
  entry.back.setAttribute('aria-label',dialog===root?'Voltar às Definições':'Voltar a '+(entry.parent?path(entry.parent).at(-1):'Definições'));
 }
 function setup(dialog){
  if(pages.has(dialog)){dialog.classList.add('settings-shell');return pages.get(dialog)}
  const close=dialog.querySelector(':scope>.popup-close,:scope>.energy-tariff-close,:scope>.close,:scope>.history-header>.energy-history-close,:scope>.history-header>.presence-history-close,:scope>.history-header>.sensor-history-close');
  if(close&&!close.querySelector('svg'))close.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const nav=document.createElement('nav');nav.className='settings-shell-path';nav.setAttribute('aria-label','Caminho das definições');
  const back=document.createElement('button');back.type='button';back.className='settings-shell-back';back.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
  const list=document.createElement('ol');nav.append(back,list);dialog.prepend(nav);dialog.classList.add('settings-shell');
  const entry={nav,back,list,parent:null,path:[],trigger:null,scroll:0};pages.set(dialog,entry);
  back.addEventListener('click',()=>{if(dialog===root)window.CasaSettingsMenu?.back();else dialog.close()});
  dialog.addEventListener('close',()=>{
   const parent=entry.parent;parent?.classList.remove('settings-shell-covered');dialog.classList.remove('settings-shell-covered');
   if(parent?.open){parent.scrollTop=entry.scroll;requestAnimationFrame(()=>{if(entry.trigger?.isConnected&&entry.trigger.getClientRects().length)entry.trigger.focus({preventScroll:true});else pages.get(parent)?.back.focus({preventScroll:true})})}
   entry.parent=null;
  });
  return entry;
 }
 function open(dialog,options={}){
  const trigger=options.trigger||document.activeElement;let parent=trigger?.closest?.('dialog');
  if(!parent){const visible=[...document.querySelectorAll('dialog.settings-shell[open]:not(.settings-shell-covered)')];parent=visible.at(-1)}
  if(parent===dialog)parent=pages.get(dialog)?.parent;
  if(parent?.open&&parent.classList.contains('settings-shell')){
   const entry=setup(dialog);entry.parent=parent;entry.trigger=trigger;entry.scroll=parent.scrollTop;entry.path=[...path(parent),title(dialog)];paint(dialog);
   parent.classList.add('settings-shell-covered');if(!dialog.open)dialog.showModal();
   requestAnimationFrame(()=>{if(dialog.open)entry.back.focus({preventScroll:true})});
  }else{
   const entry=pages.get(dialog);if(entry){entry.parent?.classList.remove('settings-shell-covered');entry.parent=null}
   dialog.classList.remove('settings-shell','settings-shell-covered');if(!dialog.open)dialog.showModal();
  }
 }
 function closeAll(){
  const opened=[...document.querySelectorAll('dialog[open]')];
  for(const dialog of opened){const entry=pages.get(dialog);if(entry){entry.parent=null;entry.trigger=null}dialog.classList.remove('settings-shell-covered')}
  for(const dialog of opened.reverse())if(dialog.open)dialog.close();
 }
 setup(root);paint(root);
 const refresh=()=>{paint(root);const active=document.activeElement;if(root.open&&root.classList.contains('settings-submenu-open')&&root.contains(active)&&!active.getClientRects().length)pages.get(root).back.focus({preventScroll:true})};
 const observer=new MutationObserver(refresh);observer.observe(root,{attributes:true,attributeFilter:['class']});const heading=root.querySelector('#settings-title');if(heading)observer.observe(heading,{subtree:true,childList:true,characterData:true});
 window.CasaSettingsShell={open,refresh,closeAll};
})();
