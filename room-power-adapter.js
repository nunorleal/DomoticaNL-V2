/* T2 adapter: cached consumption snapshots; no new reads or cross-house bindings. */
(function(){
 'use strict';
 window.CasaRoomPowerAdapter={
  mountButton(button){document.querySelector('.plan-status-rails').append(button)},
  entries(){const api=window.CasaShelly,rows=api.houseSnapshot().deviceRows,out=[];for(const r of rows){if(['sensor','window','door','energy'].includes(r.kind)||r.kind==='ev'&&r.key!=='meter')continue;const role=['office','kitchen'].includes(r.kind)?'media':r.kind,id=['fan','heater','dehumidifier'].includes(role)?'':r.key,s=api.consumptionSnapshot(role,id),d=s.reading;out.push({room:r.kind==='kitchen'&&r.key==='washer'?'balcony':r.room,key:s.key||r.kind+':'+r.key,name:r.name,role:r.kind,id:r.key,watts:d?.power,current:s.fresh===true&&!!d?.online&&!d.error&&!d.missing&&!d.errors?.length})}return out},
  scale:()=>window.CasaBannerSize.value()/100,
  control(e){const c=window.CasaShelly;let s,command;
   if(e.role==='light'){const r=c.lampSnapshot(e.id);s={...r,on:r.state?.on,canControl:r.ready};command=on=>c.commandLight(e.id,on,undefined,'consumption')}else if(['media','office','kitchen'].includes(e.role)){s=c.mediaSnapshot(e.id);command=on=>c[e.role==='media'?'commandMedia':e.role==='office'?'commandOffice':'commandKitchen'](e.id,on)}else if(['heater','dehumidifier','fan'].includes(e.role)){s=c[e.role+'Snapshot']();command=on=>c['command'+e.role[0].toUpperCase()+e.role.slice(1)](on)}else if(e.role==='ev'){s=c.evSnapshot();s={...s,on:s.feed};command=on=>c.commandEV(on)}else if(e.role==='alarm'&&e.id==='arm'){s=c.alarmSnapshot();s={...s,on:s.armed};command=on=>c.commandAlarm(on)}else return null;
   return {...s,canControl:!!s.canControl&&!c.hasUnsavedChanges(),command};
  },
  plan(){const cellar=window.CasaFloors.current()===-1,host=document.querySelector(cellar?'#basement-view .basement-plan':'#house-view #plan-stage');if(!host)return null;return {host,rooms:cellar?[{id:'cellar',name:'Cave',lx:50,ly:35}]:rooms.map(r=>({id:r.id,name:r.name,lx:r.lx,ly:r.ly}))}},
  position(plan,row,node){node.style.left=row.lx+'%';node.style.top=row.ly+'%';const limit=row.id==='cellar'?140:pinMaxWidth(rooms.find(r=>r.id===row.id));node.style.maxWidth=Math.max(45,Math.min(116,limit))+'px';node.classList.toggle('is-compact',limit<80);if(row.id!=='cellar'){const p=BannerGeometry.nearestFit(roomPolygons(row.id),{x:row.lx*10.24,y:140+row.ly*11.8},node.getBoundingClientRect().width/plan.host.getBoundingClientRect().width*1024,node.getBoundingClientRect().height/plan.host.getBoundingClientRect().height*1180);if(p){node.style.left=p.x/10.24+'%';node.style.top=(p.y-140)/11.8+'%'}}}
 };
})();
