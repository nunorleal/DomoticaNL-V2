/* A single control, always driven by the latest confirmed snapshot. */
(function(root){
 const glyph='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9m-5-7a9 9 0 1 0 10 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
 function bind(button,snapshot,property,command,labels){
  button.innerHTML=glyph;button.type='button';button.className='shelly-power-toggle';
  function update(d=snapshot()){
   const value=d?.[property],known=typeof value==='boolean',pending=!!d?.pending;
   button.dataset.power=value===true?'on':value===false?'off':'unknown';
   button.disabled=!d?.canControl||!known||!!d?.busy||pending;
   button.setAttribute('aria-pressed',known?String(value):'mixed');
   button.setAttribute('aria-busy',String(pending));
   button.setAttribute('aria-label',pending?'A aguardar confirmação':known?(value?labels.off:labels.on):'Estado por confirmar');
   button.title=button.getAttribute('aria-label');
  }
  button.addEventListener('click',()=>{const d=snapshot();if(d?.canControl&&!d.busy&&!d.pending&&typeof d[property]==='boolean')command(!d[property]);});
  update();return update;
 }
 root.CasaPowerButton={bind};
})(typeof window==='undefined'?globalThis:window);
