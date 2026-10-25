/* Shared-link configuration only. Never store a camera link in published sources. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CasaCameraCore=factory()})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function config(value){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.url!=='string')throw Error('Link UniFi inválido.');const url=value.url.trim();if(url==='')return {url:''};if(!/^https:\/\/monitor\.ui\.com\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(url))throw Error('Use o link HTTPS de partilha monitor.ui.com da câmara.');return {url:new URL(url).href}}
 return {config};
});
