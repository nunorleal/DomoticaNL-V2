/* Portable positions for the three cellar banners, in parent percentages. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBasementLayoutCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const IDS=['cellar','alarm','ev','fan'];
 function layout(v){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Posições da cave inválidas.');const out={};for(const [id,p]of Object.entries(v)){if(!IDS.includes(id)||!p||typeof p!=='object'||Array.isArray(p)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>100||p.y<0||p.y>(id==='ev'?130:100))throw Error('Posição de banner da cave inválida.');out[id]={x:p.x,y:p.y}}return out}
 function clamp(center,size,bounds){const axis=(n,half,lo,hi)=>hi-lo<half*2?(lo+hi)/2:Math.max(lo+half,Math.min(hi-half,n));return {x:axis(center.x,size.width/2,bounds.left,bounds.right),y:axis(center.y,size.height/2,bounds.top,bounds.bottom)}}
 return {IDS,layout,clamp};
});
