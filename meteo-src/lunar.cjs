// Local astronomical approximation; SunCalc 1.9.0 (BSD-2-Clause, vendor license).
const {getMoonIllumination}=require('./vendor/suncalc.cjs');
function lunarState(time){
 const {fraction,phase}=getMoonIllumination(new Date(time));
 if(!Number.isFinite(fraction)||!Number.isFinite(phase))throw new TypeError('Invalid lunar date');
 const waxing=phase<.5;
 const name=fraction<.01?'Lua nova':fraction>.99?'Lua cheia':Math.abs(fraction-.5)<.025?(waxing?'Quarto crescente':'Quarto minguante'):fraction<.5?(waxing?'Lua crescente':'Lua minguante'):(waxing?'Gibosa crescente':'Gibosa minguante');
 return {fraction,phase,waxing,name};
}
// Orthographic terminator: its projected ellipse gives the illuminated area f.
function lunarPath(fraction,waxing){
 const f=Math.max(0,Math.min(1,fraction)),side=waxing?1:-1,points=[];
 for(let i=0;i<=64;i++){const y=-1+i/32;points.push([side*Math.sqrt(Math.max(0,1-y*y)),y]);}
 for(let i=64;i>=0;i--){const y=-1+i/32;points.push([side*(1-2*f)*Math.sqrt(Math.max(0,1-y*y)),y]);}
 return points.map(([x,y],i)=>(i?'L':'M')+(37+x*21).toFixed(4)+' '+(30+y*21).toFixed(4)).join(' ')+'Z';
}
module.exports={lunarState,lunarPath};
