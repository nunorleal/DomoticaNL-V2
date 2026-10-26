/* Presentation-only inactivity state. Waking never invokes an underlying control. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaMeteoFocus=factory()})(typeof window==='undefined'?globalThis:window,function(){
 const SECONDS=[0,15,30,60,120,300];
 function createFocus({seconds=30,now=()=>Date.now()}={}){if(!SECONDS.includes(seconds))throw Error('Tempo de ampliação inválido.');let last=now(),expanded=false;return {activity(){if(!expanded)last=now()},wake(){expanded=false;last=now()},tick(blocked=false){if(blocked){expanded=false;last=now()}else if(seconds>0&&now()-last>=seconds*1000)expanded=true;return expanded},get expanded(){return expanded}}}
 return {SECONDS,createFocus};
});
