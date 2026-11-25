(function(){
 'use strict';
 const house=document.currentScript.dataset.house,C=window.CasaPresenceHistoryCore,key=house==='t2'?'casa-nl-presence-history-v1':'casa-leal-presence-history-v1';
 let account=null,writer=()=>false,ledger=load(null),busy=false,queued=false,suspended=false,lastSync=0,cursor='',lastCleanup='',timer=null,latest=null,error='';
 const pending=new Map(),received=new Map();
 function load(user){try{const v=JSON.parse(localStorage.getItem(key)||'null');return C.create(v&&(!v.owner||v.owner===user)?v:undefined)}catch{return C.create()}}
 function persist(){clearTimeout(timer);timer=null;if(suspended)return;try{localStorage.setItem(key,JSON.stringify({...ledger.snapshot(),owner:account?.user||null}));error=''}catch{error='Não foi possível guardar o histórico neste navegador.'}}
 function changed(){window.dispatchEvent(new Event('presencehistorychange'))}
 function observe(people,at){
  if(!account||!writer()||suspended)return;
  if(busy){latest={people,at};return}
  const rows=ledger.observe(people,at);if(!rows.length)return;
  for(const r of rows)pending.set(C.key(r),r);
  clearTimeout(timer);timer=setTimeout(persist,300);changed();void sync();
 }
 async function sync(force=false){
  if(!account||suspended)return;
  if(busy){queued=true;return}
  if(!force&&Date.now()-lastSync<60000)return;
  const active=account,start=new Date().toISOString();busy=true;
  try{
   let after='';
   while(true){
    let query=active.client.from('casa_presence_history').select('id,value').eq('owner_id',active.user).eq('house',house).lte('updated_at',start).order('id').limit(1000);
    if(cursor)query=query.gte('updated_at',cursor);if(after)query=query.gt('id',after);
    const {data,error}=await query;if(error)throw error;if(account!==active||suspended)return;
    ledger.merge(data.map(r=>r.value));for(const r of data)received.set(C.key(r.value),r.value.lastAt);
    if(data.length<1000)break;after=data[data.length-1].id;
   }
   cursor=start;
   const current=new Map(ledger.rows().map(r=>[C.key(r),r]));
   for(const [id,r]of pending)if(current.get(id)?.lastAt>r.lastAt)pending.delete(id);
   if(writer()){
    for(const r of ledger.rows())if(r.lastAt>(received.get(C.key(r))??-1))pending.set(C.key(r),r);
    while(pending.size){
     const batch=[...pending.values()].slice(0,100),{error}=await active.client.rpc('casa_write_presence_history',{p_house:house,p_rows:batch});
     if(error)throw error;if(account!==active||suspended)return;
     for(const r of batch){received.set(C.key(r),r.lastAt);if(pending.get(C.key(r))===r)pending.delete(C.key(r))}
    }
    const today=C.day(Date.now());if(today!==lastCleanup){const {error}=await active.client.from('casa_presence_history').delete().eq('owner_id',active.user).eq('house',house).lt('date',C.cutoff(Date.now()));if(error)throw error;lastCleanup=today}
   }
   error='';lastSync=Date.now();persist();changed();
  }catch{if(account===active){error='Sincronização pendente. O registo local será enviado quando a ligação regressar.';lastSync=Date.now();changed()}}
  finally{busy=false;const retry=queued||account!==active;queued=false;if(retry)void sync(true);else if(latest){const value=latest;latest=null;observe(value.people,value.at)}}
 }
 function connect(client,user,isWriter){
  writer=isWriter;if(account?.user===user&&account?.client===client)return;
  if(timer)persist();account=user?{client,user}:null;ledger=load(user);pending.clear();received.clear();cursor='';lastSync=0;lastCleanup='';latest=null;changed();if(account)void sync(true);
 }
 function suspend(){suspended=true;clearTimeout(timer);timer=null;latest=null}
 function resume(){suspended=false;void sync(true)}
 window.CasaPresenceHistory={connect,observe,sync,current:person=>ledger.current(person),snapshot:()=>{if(timer)persist();return ledger.snapshot()},rows:()=>ledger.rows(),message:()=>error,suspend,resume};
 window.addEventListener('pagehide',persist);window.addEventListener('online',()=>sync(true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();else void sync(true)});
 setInterval(()=>{if(!document.hidden||writer())void sync()},15000);
})();
