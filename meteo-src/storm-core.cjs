/* Background-only storm geometry and bounded scheduling. No network or device access. */
function makeBolt(random=Math.random){
 const x=140+random()*720,y=35+random()*65,end=440+random()*120,points=[[x,y]];
 for(let i=1;i<=7;i++)points.push([Math.max(30,Math.min(970,x+(random()-.5)*100+i*6)),y+(end-y)*i/7]);
 const path=points.map(([px,py],i)=>`${i?'L':'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
 const branches=[2,4,5].map(i=>{const [px,py]=points[i],side=random()>.5?1:-1;return `M${px.toFixed(1)} ${py.toFixed(1)} l${(side*(20+random()*40)).toFixed(1)} ${(18+random()*25).toFixed(1)} l${(side*(15+random()*30)).toFixed(1)} ${(20+random()*30).toFixed(1)}`}).join(' ');
 return {x,path,branches};
}
function createStorm({emit,intensity=50,random=Math.random,schedule=setTimeout,cancel=clearTimeout}){
 let running=false,next=null,fade=null;const strength=Math.max(0,Math.min(100,intensity));
 function strike(){if(!running)return;next=null;emit(makeBolt(random));fade=schedule(()=>{fade=null;if(running)emit(null)},1400);next=schedule(strike,9000+(100-strength)*35+random()*9000)}
 return {start(){if(running||strength===0)return;running=true;next=schedule(strike,1800+random()*1800)},stop(){running=false;if(next!==null)cancel(next);if(fade!==null)cancel(fade);next=fade=null;emit(null)}};
}
module.exports={makeBolt,createStorm};
