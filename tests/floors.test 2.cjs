const {test}=require('node:test'),assert=require('node:assert/strict');
const {destination,swipe}=require('../floors-core.js');
test('scroll down opens basement, scroll up returns home, limits do not wrap',()=>{
 assert.equal(destination(0,80),-1);assert.equal(destination(-1,-80),0);
 assert.equal(destination(-1,80),-1);assert.equal(destination(0,-80),0);assert.equal(destination(0,0),0);
});
test('touch requires a deliberate vertical swipe; taps, small movement and horizontal drags keep the floor',()=>{
 assert.equal(swipe(0,0,-100),-1);assert.equal(swipe(-1,0,100),0);
 for(const [dx,dy]of [[0,0],[0,-40],[100,-100],[100,10]])assert.equal(swipe(0,dx,dy),0);
 assert.equal(swipe(-1,0,-100),-1);assert.equal(swipe(0,0,100),0);
});
