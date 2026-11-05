const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('function all(target,');
const end=source.indexOf("document.getElementById('all-open')",start);
const fn=source.slice(start,end);
for(const mode of ['lights','blinds'])test(`scenario actions keep their own kind with legacy mode ${mode}`,()=>{
 const calls=[],listeners={};
 const rooms=[{id:'blind',blind:20},{id:'lamp',light:false}];
 const context={mode,rooms,isCloudRoom:id=>id==='blind',isCloudLight:id=>id==='lamp',move:()=>{},render:()=>{},notify:()=>{},window:{CasaShelly:{commandAll:(...a)=>calls.push(['blinds',...a]),commandAllLights:(...a)=>calls.push(['lights',...a])}},document:{getElementById:id=>({addEventListener:(event,fn)=>listeners[id]=fn})}};
 vm.createContext(context);
 const handlers=source.split("\n").filter(line=>/^document\.getElementById\('all-(?:open|close|lights-on|lights-off)'\)\.addEventListener/.test(line)).join("\n");
 vm.runInContext(fn+handlers,context);
 for(const id of ['all-open','all-close','all-lights-on','all-lights-off'])listeners[id]();
 assert.deepEqual(calls.map(c=>c.slice(0,2)),[['blinds','open'],['blinds','close'],['lights',true],['lights',false]]);
});
