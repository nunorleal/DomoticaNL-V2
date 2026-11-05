/* Group presentation settings only. Move nodes so current values/listeners survive. */
(function(){
 'use strict';const dialog=document.getElementById('settings-dialog');if(!dialog||document.getElementById('plant-display-settings'))return;
 const controls=[...dialog.querySelectorAll(':scope > [role="checkbox"]')];
 const size=dialog.querySelector('#room-power-size')?.closest('section');if(!controls.length&&!size)return;
 const group=document.createElement('details');group.id='plant-display-settings';group.className='settings-display';
 group.innerHTML="<summary><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg><span>Visualização da planta</span></summary>";
 const content=document.createElement('div');content.className='display-settings';
 const first=controls[0]||size;first.before(group);content.append(...controls);if(size)content.append(size);group.append(content);
 const screensaver=dialog.querySelector('#screensaver-delay')?.closest('section');if(screensaver)group.before(screensaver);
 const shellyButton=dialog.querySelector('#open-shelly');if(shellyButton){
  const shellyGroup=document.createElement('details');shellyGroup.id='shelly-settings-group';shellyGroup.className='settings-display';
  shellyGroup.innerHTML="<summary><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 18a4 4 0 0 1-.6-8A6.5 6.5 0 0 1 18 8.5a4.8 4.8 0 0 1 0 9.5Z\"/></svg><span>Shelly Cloud e equipamentos</span></summary>";
  group.after(shellyGroup);
  const shellyContent=document.createElement('div');shellyContent.className='settings-shelly-content';
  const warning=dialog.querySelector('#settings-missing-ids'),note=dialog.querySelector(':scope > .simulation-note');
  shellyContent.append(shellyButton);if(warning)shellyContent.append(warning);if(note)shellyContent.append(note);shellyGroup.append(shellyContent);
 }
})();
