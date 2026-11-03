/* Read-only closure indicator. Opening 0 = fully filled, 100 = empty. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaBlindBarCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function reading(configured,status,demo,now=Date.now()) {const valid=p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=100;const position=configured?(valid(status?.position)?status.position:null):(valid(demo)?demo:null);const fresh=!configured||!!status?.online&&!status.error&&Number.isFinite(status.fetchedAt)&&now>=status.fetchedAt&&now-status.fetchedAt<=120000;return {position,closed:position===null?null:1-position/100,quality:position===null?'unknown':fresh?'current':'last'}}
 return {reading};
});
