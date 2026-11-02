/* Local walking routes, in the original 1024 × 1536 floor coordinates. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaCatsCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const CYCLE=30000;
 // Centre lines through open interior passages. No balcony, stairs or basement.
 const nodes={master:{x:460,y:432,room:'master'},masterDoor:{x:165,y:432,room:'master'},hallTop:{x:165,y:530,room:'hall'},guiDoor:{x:265,y:550,room:'bedroom2'},gui:{x:530,y:580,room:'bedroom2'},hall:{x:165,y:670,room:'hall'},hallBottom:{x:165,y:760,room:'hall'},livingDoor:{x:165,y:840,room:'living'},living:{x:260,y:880,room:'living'},livingClear:{x:535,y:880,room:'living'},kitchen:{x:535,y:1120,room:'kitchen'},kitchenClear:{x:770,y:1120,room:'kitchen'}};
 const edges=[['master','masterDoor'],['masterDoor','hallTop'],['hallTop','guiDoor'],['guiDoor','gui'],['hallTop','hall'],['hall','hallBottom'],['hallBottom','livingDoor'],['livingDoor','living'],['living','livingClear'],['livingClear','kitchen'],['kitchen','kitchenClear']];
 const anchors={master:'master',hall:'hall',bedroom2:'gui',living:'livingClear',kitchen:'kitchenClear'};
 const neighbours={master:['hall'],hall:['master','bedroom2','living'],bedroom2:['hall'],living:['hall','kitchen'],kitchen:['living']};
 function route(from,to){if(!nodes[from]||!nodes[to])throw Error('Unknown cat waypoint');const queue=[[from]],seen=new Set([from]);while(queue.length){const path=queue.shift(),last=path[path.length-1];if(last===to)return path;for(const [a,b]of edges){const next=a===last?b:b===last?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next])}}}throw Error('Unreachable cat waypoint')}
 const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 function journey(from,to){const path=route(from,to).map(id=>({...nodes[id],id})),length=path.slice(1).reduce((n,b,i)=>n+distance(path[i],b),0);return {path,length,duration:Math.min(26000,Math.max(9000,length/35*1000))}}
 function sample(j,elapsed){const progress=Math.min(1,Math.max(0,elapsed/j.duration));let left=j.length*progress;for(let i=1;i<j.path.length;i++){const a=j.path[i-1],b=j.path[i],d=distance(a,b);if(left<=d||i===j.path.length-1){const t=d?Math.min(1,left/d):1;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+90,room:t<.5?a.room:b.room,walking:progress<1}}left-=d}return {...j.path[0],angle:0,walking:false}}
 function next(room,random=Math.random){const options=neighbours[room];return options[Math.min(options.length-1,Math.max(0,Math.floor(random()*options.length)))]}
 return {CYCLE,nodes,edges,anchors,neighbours,route,journey,sample,next};
});
