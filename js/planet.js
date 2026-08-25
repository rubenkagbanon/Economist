// Réseau de particules sphérique animé en arrière-plan.
function initPlanet(id,radius,dotCount,lineThreshold,speed){
  const canvas=document.getElementById(id);if(!canvas)return;
  const size=canvas.offsetWidth||160;canvas.width=size;canvas.height=size;
  const cx=size/2,cy=size/2,r=radius*size/2,ctx=canvas.getContext('2d'),col='139,26,26';
  const dots=Array.from({length:dotCount},()=>{const theta=Math.acos(1-2*Math.random()),phi=2*Math.PI*Math.random();return{theta,phi,vT:(Math.random()-.5)*.0003*speed,vP:(Math.random()-.5)*.0003*speed};});
  function project(theta,phi){const x=r*Math.sin(theta)*Math.cos(phi),y=r*Math.cos(theta),z=r*Math.sin(theta)*Math.sin(phi);return{x:cx+x,y:cy-y,alpha:Math.max(0,(z+r)/(2*r))};}
  function draw(){
    ctx.clearRect(0,0,size,size);
    const points=dots.map(dot=>project(dot.theta,dot.phi));
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      const distance=Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y);
      if(distance<lineThreshold){const opacity=Math.min(points[i].alpha,points[j].alpha)*(1-distance/lineThreshold)*.35;ctx.beginPath();ctx.moveTo(points[i].x,points[i].y);ctx.lineTo(points[j].x,points[j].y);ctx.strokeStyle=`rgba(${col},${opacity})`;ctx.lineWidth=.5;ctx.stroke();}
    }
    points.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,1.4,0,Math.PI*2);ctx.fillStyle=`rgba(${col},${point.alpha*.55})`;ctx.fill();});
    dots.forEach(dot=>{dot.theta+=dot.vT;dot.phi+=dot.vP;if(dot.theta<.1||dot.theta>Math.PI-.1)dot.vT*=-1;});
    requestAnimationFrame(draw);
  }
  draw();
}

document.addEventListener('DOMContentLoaded',()=>{
  initPlanet('planet-tr',.92,120,90,1.2);
  initPlanet('planet-bl',.9,90,80,.9);
});
