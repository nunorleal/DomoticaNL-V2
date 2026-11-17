/* Group presentation settings only. Move nodes so current values/listeners survive. */
(function(){
 'use strict';
 const dialog=document.getElementById('settings-dialog');
 if(!dialog||document.getElementById('plant-display-settings'))return;

 const visibilityOptions=[
  ['energy-banner', 'Mostrar barra do contador geral', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-8 12h7l-1 8 8-12h-7Z"/></svg>'],
  ['ev-banner', 'Mostrar banner do carregador do carro', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="12" height="16" rx="2"/><path d="M6 8h6M15 10h3l3 3v4a2 2 0 0 1-4 0v-4M19 5l2 2v4"/></svg>'],
  ['blind-bars', 'Mostrar barras discretas dos estores', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 12h10M7 15h6"/></svg>'],
  ['heater', 'Mostrar termoventilador', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="M6 9h12M6 12h12M8 16h.01M16 16h.01"/></svg>'],
  ['dehumidifier', 'Mostrar desumidificador', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 9h8M12 12s-3 3-3 5a3 3 0 0 0 6 0c0-2-3-5-3-5Z"/></svg>'],
 ];
 function addVisibilityControl(name,label,glyph){
  const key='casa-nl-show-'+name;
  const button=document.createElement('button');
  button.id='show-'+name;
  button.type='button';
  button.className='settings-row';
  button.setAttribute('role','checkbox');
  button.innerHTML='<span>'+glyph+'</span>'+label+'<span class="row-check">'+icon('check')+'</span>';
  let shown=true;
  try{shown=JSON.parse(localStorage.getItem(key))!==false}catch{}
  function update(){
   document.body.classList.toggle('hide-plan-'+name,!shown);
   button.setAttribute('aria-checked',String(shown));
  }
  update();
  button.addEventListener('click',()=>{
   shown=!shown;
   update();
   try{localStorage.setItem(key,JSON.stringify(shown))}catch{}
  });
  return button;
 }

 const existing=[...dialog.querySelectorAll(':scope > [role="checkbox"]')];
 const added=visibilityOptions.map(option=>addVisibilityControl(...option));
 const controls=new Map([...existing,...added].map(control=>[control.id,control]));
 const order=[
  'toggle-labels','toggle-sensor-readings','show-energy-banner','show-ev-banner',
  'toggle-blind-labels','show-blind-bars','show-christmas-tree','show-heater',
  'show-dehumidifier','toggle-console-icons','toggle-house-cats'
 ];
 const size=dialog.querySelector('#room-power-size')?.closest('section');
 const group=document.createElement('details');group.id='plant-display-settings';group.className='settings-display';
 group.innerHTML="<summary><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg><span>Visualização da planta</span></summary>";
 const content=document.createElement('div');
 content.className='display-settings';
 for(const id of order){
  const control=controls.get(id);
  if(control)content.append(control);
  controls.delete(id);
 }
 content.append(...controls.values());
 if(size)content.append(size);
 group.append(content);
 const screensaver=dialog.querySelector('#screensaver-delay')?.closest('section');
 (screensaver||dialog.querySelector('#open-shelly')).after(group);
 const shellyButton=dialog.querySelector('#open-shelly');if(shellyButton){
  const shellyGroup=document.createElement('details');shellyGroup.id='shelly-settings-group';shellyGroup.className='settings-display';
  shellyGroup.innerHTML="<summary><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 18a4 4 0 0 1-.6-8A6.5 6.5 0 0 1 18 8.5a4.8 4.8 0 0 1 0 9.5Z\"/></svg><span>Shelly Cloud e equipamentos</span></summary>";
  group.after(shellyGroup);
  const shellyContent=document.createElement('div');shellyContent.className='settings-shelly-content';
  const warning=dialog.querySelector('#settings-missing-ids'),note=dialog.querySelector(':scope > .simulation-note');
  shellyContent.append(shellyButton);if(warning)shellyContent.append(warning);if(note)shellyContent.append(note);shellyGroup.append(shellyContent);
 }
})();
