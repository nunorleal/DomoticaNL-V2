/* Local ImageGen inserts. Original renders and all structural wall masks stay untouched. */
(function(){
 'use strict';
 const assets={day:'assets/candeeiros-dia-v1.png',night:'assets/candeeiros-apagados-v1.png',electric:'assets/candeeiros-acesos-v1.png'};
 // Source disks are sampled from matching generated renders; destinations follow the user's red marks.
 const points={master:{source:[737,223],target:[737,223],sampleRadius:20,radius:20},bedroom2:{source:[686,623],target:[750,534],sampleRadius:23,radius:18},living:{source:[464,825],target:[475,840],sampleRadius:19,radius:19}};
 function patch(room,variant){
  const p=points[room];if(!p)return '';
  const [sx,sy]=p.source,[tx,ty]=p.target,r=p.sampleRadius,id='lamp-'+room+'-'+variant;
  // The outer SVG clips to a small disk. No pixels from the generated room can affect the rest of the plan.
  return `<svg class="lamp-insert" style="width:${2*p.radius}px;height:${2*p.radius}px;stroke:none;fill:none" data-lamp-room="${room}" data-lamp-environment="${variant}" x="${tx-p.radius}" y="${ty-p.radius}" width="${2*p.radius}" height="${2*p.radius}" viewBox="${sx-r} ${sy-r} ${2*r} ${2*r}" overflow="hidden" pointer-events="none"><defs><radialGradient id="${id}-edge"><stop offset="94%" stop-color="white"/><stop offset="100%" stop-color="black"/></radialGradient><mask id="${id}-mask" maskUnits="userSpaceOnUse" x="${sx-r}" y="${sy-r}" width="${2*r}" height="${2*r}"><circle cx="${sx}" cy="${sy}" r="${r}" fill="url(#${id}-edge)"/></mask></defs><image href="${assets[variant]}" x="0" y="0" width="1024" height="1536" mask="url(#${id}-mask)"/></svg>`;
 }
 function trigger(room,name){
  const p=points[room];if(!p)return '';const [x,y]=p.target;
  return `<button type="button" class="lamp-trigger" data-room="${room}" style="left:${x/10.24}%;top:${(y-140)/11.8}%;width:${2*p.radius/10.24}%;height:${2*p.radius/11.8}%" title="Candeeiro · ${name}" aria-label="Abrir controlos do candeeiro de ${name}"></button>`;
 }
 function halo(room){const p=points[room];if(!p)return '';const [x,y]=p.target;return `<circle class="lamp-on-halo" data-lamp-halo-room="${room}" cx="${x}" cy="${y}" r="${p.radius+1}" aria-hidden="true"/>`}
 window.CasaLamps={patch,trigger,halo};
})();
