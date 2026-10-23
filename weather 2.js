/* Live weather: Open-Meteo Forecast + Geocoding. No API key or geolocation. */
(function(){
 'use strict';
 const CORE=window.WeatherCore,KEY='casa-nl-environment-v1',CACHE='casa-nl-weather-v1';
 const state={city:null,mode:'auto',data:null,fetchedAt:0,loading:false,error:false};
 const $=id=>document.getElementById(id);
 const validCity=c=>c&&typeof c.name==='string'&&c.name.length<=150&&Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=90&&Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180;
 const cityKey=c=>c?`${c.latitude},${c.longitude}`:'';
 let forecastController,searchController,forecastVersion=0,searchVersion=0;
 try{const saved=JSON.parse(localStorage.getItem(KEY));if(validCity(saved?.city))state.city=saved.city;if(['auto','day','night'].includes(saved?.mode))state.mode=saved.mode;const cache=JSON.parse(localStorage.getItem(CACHE));if(state.city&&cache?.cityKey===cityKey(state.city)&&Date.now()-cache.fetchedAt<86400000&&validForecast(cache.data)){state.data=cache.data;state.fetchedAt=cache.fetchedAt}}catch{}
 function validForecast(d){return !!d?.current&&Number.isFinite(d.current.temperature_2m)&&Number.isFinite(d.current.weather_code)&&Number.isFinite(d.current.time)&&d.daily&&Array.isArray(d.daily.sunrise)&&Array.isArray(d.daily.sunset)&&Array.isArray(d.daily.time)}
 function save(){try{localStorage.setItem(KEY,JSON.stringify({city:state.city,mode:state.mode}))}catch{}}
 function actualDay(){return CORE.resolveDay('auto',state.city,state.data)}
 function isDay(){return CORE.resolveDay(state.mode,state.city,state.data)}
 function darkness(r,rooms=[]){return CORE.darkness(r,isDay(),rooms)}
 function roomDescription(r,rooms=[]){
  const day=isDay(),natural=CORE.naturalLight(r,day,rooms),source=CORE.daylightSource(r,rooms);
  if(source&&window.CasaShelly?.binding(source.id)){const d=window.CasaShelly.reading(source.id);if(!d?.online||d.position===null)return `${r.light?'Luz ligada (demonstração)':'Luz apagada'} · luz natural por confirmar`}
  const via=source&&source.id!==r.id?` · estore de ${source.name}`:'';
  if(r.light)return CORE.electricOpacity(r,day,rooms)===1?'Luz ligada · iluminação elétrica':`Luz ligada · luz natural (${Math.round(natural*100)}%) e elétrica${via}`;
  if(day&&r.id==='balcony')return 'Luz apagada · luz natural exterior';
  if(day&&natural>0)return `Luz apagada · luz natural (${Math.round(natural*100)}%)${via}`;
  return 'Luz apagada · ambiente escuro'+(day?via:'');
 }
 const shapes={sun:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8|M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5',moon:'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z',cloud:'M6 18a4 4 0 1 1 .6-7.95 6 6 0 0 1 11.5 1.3A3.4 3.4 0 1 1 18 18Z',partly:'M9 3v2M3 9h2M4.5 4.5 6 6M13 4l-1 2|M9 7a4 4 0 0 0-3.8 5|M8 20a4 4 0 1 1 .6-7.95 5 5 0 0 1 9.5 1.3A3.4 3.4 0 1 1 18 20Z',rain:'M6 14a4 4 0 1 1 .6-7.95 6 6 0 0 1 11.5 1.3A3.4 3.4 0 1 1 18 14Z|M8 18l-1 3M13 18l-1 3M18 18l-1 3',snow:'M6 14a4 4 0 1 1 .6-7.95 6 6 0 0 1 11.5 1.3A3.4 3.4 0 1 1 18 14Z|M8 19v2M7 20h2M16 19v2M15 20h2',fog:'M6 13a4 4 0 1 1 .6-7.95 6 6 0 0 1 11.5 1.3A3.4 3.4 0 1 1 18 13Z|M4 17h16M6 21h12',storm:'M6 13a4 4 0 1 1 .6-7.95 6 6 0 0 1 11.5 1.3A3.4 3.4 0 1 1 18 13Z|M13 15l-4 5h4l-2 4'};
 function weatherIcon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${(shapes[name]||shapes.cloud).split('|').map(d=>`<path d="${d}"/>`).join('')}</svg>`}
 function clock(time,zone){try{return new Intl.DateTimeFormat('pt-PT',{hour:'2-digit',minute:'2-digit',timeZone:zone||'UTC'}).format(new Date(time))}catch{return new Intl.DateTimeFormat('pt-PT',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(time))+' UTC'}}
 function render(){
  const c=state.city,d=state.data,stale=state.error||(state.fetchedAt&&Date.now()-state.fetchedAt>1800000);
  const weather=CORE.weather(d?.current?.weather_code,actualDay());
  $('weather-temp').textContent=d?`${Math.round(d.current.temperature_2m)}°`:'—°';
  $('weather-city').textContent=c?.name||'Escolher cidade';
  $('weather-icon').innerHTML=weatherIcon(d?weather.icon:(actualDay()===false?'moon':'cloud'));
  $('weather-button').classList.toggle('loading',state.loading);$('weather-button').classList.toggle('stale',!!stale);
  $('weather-button').setAttribute('aria-label',`${c?.name||'Selecionar cidade'} · ${d?`${Math.round(d.current.temperature_2m)} graus, ${weather.text}`:'meteorologia indisponível'}${stale?' · dados desatualizados':''}. Abrir MeteoNL`);
  $('selected-city-name').textContent=c?[c.name,c.admin1,c.country].filter(Boolean).join(' · '):'Por selecionar';
  let status=state.loading?'A atualizar meteorologia…':!d?'Sem dados de meteorologia. Tente atualizar.':`${Math.round(d.current.temperature_2m)} °C · ${weather.text} · ${stale?'Dados guardados':'Atualizado'} às ${clock(state.fetchedAt,c.timezone)}`;
  if(state.error)status+=d?' · Sem ligação neste momento.':' Verifique a ligação à Internet.';
  $('weather-detail').textContent=status;$('weather-refresh').disabled=state.loading||!c;
  $('environment-mode').value=state.mode;
  const day=isDay(),period=day===null?'A aguardar cidade':day?'Dia':'Noite';
  $('environment-status').textContent=state.mode==='auto'?`Automático · ${period}${c?' em '+c.name:''}${!state.data&&c?' · estimativa solar':''}`:`Pré-visualização ${state.mode==='day'?'diurna':'noturna'} · horário automático suspenso`;
  document.body.dataset.period=day===true?'day':day===false?'night':'unknown';
 }
 function changed(){render();window.dispatchEvent(new Event('environmentchange'))}
 async function jsonRequest(url,controller){const timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('API '+response.status);return await response.json()}finally{clearTimeout(timer)}}
 async function refresh(){
  if(!state.city)return;
  forecastController?.abort();forecastController=new AbortController();const version=++forecastVersion,c=state.city;
  state.loading=true;state.error=false;render();
  try{
   const params=new URLSearchParams({latitude:c.latitude,longitude:c.longitude,current:'temperature_2m,weather_code,is_day',daily:'sunrise,sunset',timezone:'auto',timeformat:'unixtime',forecast_days:'3'});
   const data=await jsonRequest('https://api.open-meteo.com/v1/forecast?'+params,forecastController);
   if(version!==forecastVersion)return;if(!validForecast(data))throw new Error('Invalid data');
   state.data=data;state.fetchedAt=Date.now();state.error=false;
   try{localStorage.setItem(CACHE,JSON.stringify({cityKey:cityKey(c),data,fetchedAt:state.fetchedAt}))}catch{}
  }catch(e){if(version!==forecastVersion)return;state.error=true}
  finally{if(version===forecastVersion){state.loading=false;changed()}}
 }
 function normalizeCity(r){return {id:r.id,name:r.name,latitude:r.latitude,longitude:r.longitude,admin1:r.admin1||'',country:r.country||'',country_code:r.country_code||'',timezone:r.timezone||'UTC'}}
 async function selectCity(r){if(!validCity(r))return;state.city=normalizeCity(r);state.data=null;state.fetchedAt=0;save();$('city-results').replaceChildren();$('city-feedback').textContent='Cidade selecionada.';$('city-search').value=r.name;changed();await refresh()}
 async function search(query,initial=false){
  searchController?.abort();searchController=new AbortController();const version=++searchVersion;
  $('city-feedback').classList.remove('error');$('city-feedback').textContent='A pesquisar cidades…';$('city-results').replaceChildren();$('city-search-button').disabled=true;
  try{
   const params=new URLSearchParams({name:query,count:'8',language:'pt',format:'json'});
   const data=await jsonRequest('https://geocoding-api.open-meteo.com/v1/search?'+params,searchController);
   if(version!==searchVersion)return;const results=(data.results||[]).map(normalizeCity).filter(validCity);
   if(initial){const match=results.find(r=>r.country_code==='PT'&&r.name.toLocaleLowerCase('pt').includes('figueira'));if(match&&!state.city){$('city-feedback').textContent='';await selectCity(match);return}}
   $('city-feedback').textContent=results.length?'Selecione a cidade certa na lista.':'Não foram encontradas cidades. Tente outro nome.';
   for(const city of results){const b=document.createElement('button');b.type='button';b.className='city-result';const name=document.createElement('span');name.textContent=city.name;const sub=document.createElement('small');sub.textContent=[city.admin1,city.country].filter(Boolean).join(' · ');b.append(name,sub);b.addEventListener('click',()=>selectCity(city));$('city-results').append(b)}
  }catch(e){if(version!==searchVersion)return;$('city-feedback').classList.add('error');$('city-feedback').textContent='Não foi possível pesquisar. Verifique a ligação e tente novamente.'}
  finally{if(version===searchVersion)$('city-search-button').disabled=false}
 }
 $('city-form').addEventListener('submit',e=>{e.preventDefault();const q=$('city-search').value.trim();if(q.length>=2)search(q)});
 $('environment-mode').addEventListener('change',()=>{state.mode=$('environment-mode').value;save();changed()});
 $('weather-refresh').addEventListener('click',refresh);
 $('weather-button').addEventListener('click',()=>window.CasaMeteoBridge?.open());
 window.CasaEnvironment={isDay,darkness,electricOpacity:(r,rooms=[])=>CORE.electricOpacity(r,isDay(),rooms),roomDescription,refresh,selectCity,getState:()=>({...state})};
 render();
 if(state.city){$('city-search').value=state.city.name;refresh()}else search('Figueira da Foz',true);
 setInterval(()=>{changed();if(state.city&&!state.loading&&Date.now()-state.fetchedAt>900000)refresh()},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){changed();if(state.city&&!state.loading&&Date.now()-state.fetchedAt>900000)refresh()}});
 window.addEventListener('online',()=>{if(state.city)refresh();else search('Figueira da Foz',true)});
})();
