/* Bounded status verification, never actuator retries. Each command has its own lifetime. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaConfirmationCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function create({now=()=>Date.now()}={}){
  const entries=new Map();
  function sync(pending){const live=new Set(pending.map(p=>p.key));for(const key of entries.keys())if(!live.has(key))entries.delete(key);for(const p of pending)if(!entries.has(p.key)||entries.get(p.key).target!==p.target||entries.get(p.key).revision!==p.revision){const cover=p.kind==='cover';entries.set(p.key,{...p,acceptedAt:now(),deadline:now()+(cover?60000:30000),delays:cover?[1500,4000,8000,12000,16000]:[1500,4000,10000],attempts:0,inFlight:false,nextAt:now()+1500})}}
  function due(){return [...entries.values()].filter(e=>!e.inFlight&&e.nextAt<=now()&&e.attempts<e.delays.length&&now()<e.deadline)}
  function attempted(keys){for(const key of keys){const e=entries.get(key);if(e){e.attempts++;e.inFlight=true;e.nextAt=now()+(e.delays[e.attempts]||0)}}}
  function expired(){return [...entries.values()].filter(e=>now()>=e.deadline||(e.attempts>=e.delays.length&&!e.inFlight))}
  function delay(){return entries.size?Math.max(1000,Math.min(...[...entries.values()].map(e=>Math.min(e.deadline,e.nextAt)-now()))):null}
  function finished(keys){for(const key of keys){const e=entries.get(key);if(e)e.inFlight=false}}
  return {sync,due,attempted,finished,expired,delay,get:key=>entries.get(key),clear:()=>entries.clear(),get size(){return entries.size}};
 }
 function current(ticket,reading){return !!(ticket&&reading?.online&&!reading.error&&!reading.missing&&!reading.errors?.length&&Number.isFinite(reading.fetchedAt)&&reading.fetchedAt>=ticket.acceptedAt)}
 function coverConfirmed(ticket,reading){
  if(!current(ticket,reading)||!reading.hasCover)return false;
  if(ticket.target==='stop')return ['stopped','open','closed'].includes(reading.state);
  if(Number.isFinite(reading.position)&&Math.abs(reading.position-ticket.target)<=1)return true;
  const direction=Number.isFinite(ticket.before)?Math.sign(ticket.target-ticket.before):ticket.target===100?1:ticket.target===0?-1:0;
  return direction>0&&reading.state==='opening'||direction<0&&reading.state==='closing';
 }
 return {create,current,coverConfirmed};
});
