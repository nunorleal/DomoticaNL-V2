const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../power-button.js');
function fixture(property='on'){
 const b={dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},addEventListener(k,fn){this[k]=fn}};
 let d={[property]:false,canControl:true},commands=[];
 const update=CasaPowerButton.bind(b,()=>d,property,on=>commands.push(on),{on:'Ligar',off:'Desligar'});
 return {b,commands,update,set(v){d=v}};
}
test('single power control sends explicit inverse of a fresh snapshot without optimistic colouring',()=>{
 const f=fixture();assert.equal(f.b.dataset.power,'off');f.b.click();assert.deepEqual(f.commands,[true]);assert.equal(f.b.dataset.power,'off');
 f.set({on:true,canControl:true});f.update();assert.equal(f.b.dataset.power,'on');assert.equal(f.b.attributes['aria-pressed'],'true');f.b.click();assert.deepEqual(f.commands,[true,false]);
});
test('missing, stale, busy and pending states cannot send commands, including a changed snapshot after draw',()=>{
 const f=fixture();for(const d of [{on:null,canControl:true},{on:false,canControl:false},{on:true,canControl:true,busy:true},{on:false,canControl:true,pending:true},null]){
 f.set(d);f.b.click();f.update();assert.equal(f.b.disabled,true);
 }assert.deepEqual(f.commands,[]);assert.equal(f.b.attributes['aria-pressed'],'mixed');
});
test('alarm uses armed state and EV uses feed state rather than consumption',()=>{
 for(const property of ['armed','feed']){const f=fixture(property);f.set({[property]:true,canControl:true});f.update();f.b.click();assert.deepEqual(f.commands,[false]);assert.equal(f.b.dataset.power,'on')}
});
