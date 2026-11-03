/* Shared, local path reservations. No transport, polling or off-route detours. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaCatsTraffic=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 // Covers the head, animated tail and rotation of both drawings, plus a gap.
 const CLEARANCE=84;
 const pointDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function pointSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
 function segmentDistance(a,b,c,d){const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x),x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);if(x*y<0&&z*w<0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b))}
 function segments(path){return path.length===1?[[path[0],path[0]]]:path.slice(1).map((b,i)=>[path[i],b])}
 function clear(path,others,core,exclude){for(const other of others){if(other===exclude)continue;const p=core.sample(other.journey,other.elapsed);const reserved=other.elapsed<other.journey.duration&&!other.waiting?other.journey.path:[p];for(const [a,b]of segments(path))for(const [c,d]of segments(reserved))if(segmentDistance(a,b,c,d)<CLEARANCE)return false}return true}
 function create(core,cats,random=Math.random){let clock=0;const destinations=core.destinations||Object.values(core.anchors);for(const cat of cats){cat.retryAt=0;if(!cat.trafficInitialized){const start=cat.journey.path[0].id;cat.preferred=core.nodes[cat.to]?cat.to:core.anchors[cat.to];cat.from=start;cat.to=start;cat.journey=core.journey(start,start);cat.elapsed=core.CYCLE;cat.waiting=true;cat.trafficInitialized=true;cat.visits={...(cat.visits||{}),[start]:1}}}
  function plan(cat){const from=cat.journey.path.slice(-1)[0].id,options=destinations.filter(id=>id!==from).map(id=>({id,score:(cat.visits?.[id]||0)+(id===cat.previous?2:0),tie:random()}));options.sort((a,b)=>(a.id===cat.preferred?-1:b.id===cat.preferred?1:a.score-b.score||a.tie-b.tie));for(const {id}of options){const journey=core.journey(from,id);if(!clear(journey.path,cats,core,cat))continue;cat.previous=from;cat.from=from;cat.to=id;cat.journey=journey;cat.elapsed=0;cat.waiting=false;cat.preferred=null;cat.visits[id]=(cat.visits[id]||0)+1;return true}cat.waiting=true;cat.retryAt=clock+1000;return false}
  function step(dt){dt=Math.min(100,Math.max(0,Number.isFinite(dt)?dt:0));clock+=dt;for(const cat of cats){if(cat.elapsed>=core.CYCLE){if(clock>=cat.retryAt)plan(cat)}else cat.elapsed=Math.min(core.CYCLE,cat.elapsed+dt)}return cats.map(cat=>core.sample(cat.journey,cat.elapsed))}
  return {step};
 }
 return {CLEARANCE,pointDistance,pointSegment,segmentDistance,clear,create};
});
