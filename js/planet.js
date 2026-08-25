// ════════════════════════════════════════════════════════════
// planet.js — réseau de particules animé en arrière-plan
// ════════════════════════════════════════════════════════════

function setupPlanetCanvas(id){
  const canvas=document.getElementById(id);
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let points=[];
  let width=0;
  let height=0;

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    width=rect.width;height=rect.height;
    canvas.width=width*dpr;canvas.height=height*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    points=Array.from({length:Math.max(28,Math.round(width*height/11500))},()=>({
      x:Math.random()*width,y:Math.random()*height,
      dx:(Math.random()-.5)*.06,dy:(Math.random()-.5)*.06,
      radius:Math.random()<.18?1.8:1.1
    }));
  }
  resize();
  window.addEventListener('resize',resize);

  function draw(){
    ctx.clearRect(0,0,width,height);
    points.forEach(point=>{
      point.x+=point.dx;point.y+=point.dy;
      if(point.x<0||point.x>width)point.dx*=-1;
      if(point.y<0||point.y>height)point.dy*=-1;
    });
    for(let i=0;i<points.length;i++){
      for(let j=i+1;j<points.length;j++){
        const first=points[i],second=points[j];
        const distance=Math.hypot(first.x-second.x,first.y-second.y);
        if(distance<115){
          ctx.strokeStyle=`rgba(139,26,26,${(1-distance/115)*.13})`;
          ctx.lineWidth=.55;
          ctx.beginPath();ctx.moveTo(first.x,first.y);ctx.lineTo(second.x,second.y);ctx.stroke();
        }
      }
    }
    points.forEach(point=>{
      ctx.fillStyle='rgba(139,26,26,0.34)';
      ctx.beginPath();ctx.arc(point.x,point.y,point.radius,0,Math.PI*2);ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupPlanetCanvas('planet-tr');
  setupPlanetCanvas('planet-bl');
});
