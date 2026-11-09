/* House-specific mapping is supplied below. Stored history contains no account key. */
(function(){'use strict';const C=window.CasaDailyEnergyCore,KEY="casa-nl-daily-energy-v1";let storage=null,initial=null;try{storage=localStorage;initial=JSON.parse(storage.getItem(KEY)||'null')}catch{}let ledger=C.create(initial),dirty=false,pending=null,suspended=false,failed=false;
 function flush(){if(pending!==null)clearTimeout(pending);pending=null;if(!dirty||suspended)return;try{storage?.setItem(KEY,JSON.stringify(ledger.snapshot()));failed=!storage;if(storage)dirty=false}catch{failed=true}if(typeof Event==='function')window.dispatchEvent?.(new Event('dailyenergychange'))}
 let shared = null;
 function setSharedHistory(snapshot){
  shared=snapshot?C.create(C.validate(snapshot)):null;
  window.dispatchEvent(new Event('dailyenergychange'));
  for(const node of document.querySelectorAll('[data-daily-energy-units]')){
   show(node,node.dataset.dailyHistoryRole,node.dataset.dailyHistoryId,node.dataset.dailyEnergyUnits==='true');
  }
 }
 const currentPower = new Map();
 function record(server,b,r){
  if(suspended)return;
  const key=C.identity(server,b);
  if(!key)return;
  const valid=r?.online&&!r.error&&!r.missing&&!r.errors?.length&&r.valid!==false&&r.hasMeter!==false&&Number.isFinite(r.fetchedAt);
  if(!valid){currentPower.delete(key);return}
  const watts=r.powerWatts??r.power??(Number.isFinite(r.powerKW)?r.powerKW*1000:null);
  if(Number.isFinite(watts)&&watts>=0)currentPower.set(key,{watts,at:r.fetchedAt});
  else currentPower.delete(key);
  if(!Number.isFinite(r.energyKWh)||r.energyKWh<0)return;
  if(ledger.record(key,r.energyKWh,r.fetchedAt)){dirty=true;if(pending===null)pending=setTimeout(flush,1000)}
 }
 function binding(role,id){let c={};try{c=JSON.parse(localStorage.getItem('casa-nl-shelly-cloud-v1')||'{}')}catch{}let b=role==='energy'?window.CasaEnergyCore.binding(c):role==='cover'?c.bindings?.[id]:role==='light'?c.lightBindings?.[id]:role==='media'?{...c.mediaBindings,...c.officeBindings,...c.kitchenBindings}[id]:role==='ev'?c.ev?.[id||'meter']:role==='alarm'?c.alarm?.[id]:c[role];if(b)b={...b,...(role==='energy'?{component:'emeter'}:['cover','light'].includes(role)?{kind:role}:{})};return {server:c.server,b}}
 function today(role,id=''){const {server,b}=binding(role,id),key=C.identity(server,b);const now=Date.now(),remote=shared?.today(key,now);
  const reading=remote?.from!=null?remote:ledger.today(key,now);
  return {...reading,kWh:reading.unavailable?null:reading.kWh,persistent:!failed}}
 function power(role,id='',now=Date.now()){
  const source=binding(role,id);
  const reading=currentPower.get(C.identity(source.server,source.b));
  return reading&&now>=reading.at&&now-reading.at<=45000?reading.watts:null;
 }
 function history(role,id='',start,end,timed=false){
  const {server,b}=binding(role,id),key=C.identity(server,b);
  const local=ledger.history(key,start,end,timed);
  const now=Date.now(),today=C.day(now);
  if(shared){
   const remote=shared.history(key,start,end,timed);
   for(const [date,row] of Object.entries(remote.days)){
    if(date===today||row.observed||row.interrupted||!local.days[date])local.days[date]=row;
   }
  }
  const current=shared?.today(key,now);
  const latest=current?.from!=null?current:ledger.today(key,now);
  for(const [date,row] of Object.entries(local.days)){
   if(row.interrupted||(date===today&&latest.unavailable))delete local.days[date];
  }
  return local;
 }
 function timedHistory(role,id,start,end){return history(role,id,start,end,true)}
 function text(role,id='',units=true){const d=today(role,id);return d.kWh===null?'':d.kWh.toLocaleString('pt-PT',{maximumFractionDigits:3})+(units?' kWh':'')}
 function show(node,role,id='',units=true){if(!node)return;node.dataset.dailyEnergyUnits=String(units);if(node.dataset.dailyHistoryRole!==role)node.dataset.dailyHistoryRole=role;if(node.dataset.dailyHistoryId!==id)node.dataset.dailyHistoryId=id;window.CasaEnergyHistory?.attach(node,role,id);const d=today(role,id),value=d.kWh===null?'':d.kWh.toLocaleString('pt-PT',{maximumFractionDigits:3})+(units?' kWh':'');if(node.textContent!==value)node.textContent=value;window.CasaEnergyCost?.today(node,role,id);node.title='Consumo registado hoje até à última leitura. O valor fica em branco quando faltam leituras.';const label=node.parentElement?.querySelector('span');if(label&&/acumulad|Energia acumulada|Consumo registado hoje/.test(label.textContent)&&label.textContent!=='Consumo registado hoje')label.textContent='Consumo registado hoje'}
 function suspend(){suspended=true;if(pending!==null)clearTimeout(pending);pending=null}
 window.addEventListener('pagehide',flush);window.CasaDailyEnergy={record,today,power,history,timedHistory,text,show,setSharedHistory,flush,suspend,resume:()=>{suspended=false},snapshot:()=>ledger.snapshot()};
})();
