// ════════════════════════════════════════════════════════════
// planet.js — fonds animés (décor discret derrière le contenu)
// ════════════════════════════════════════════════════════════

function setupPlanetCanvas(id){
  const canvas=document.getElementById(id);
  if(!canvas) return;
  const ctx=canvas.getContext('2d');

  function resize(){
    const rect=canvas.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    canvas.width=rect.width*dpr;
    canvas.height=rect.height*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  let t=Math.random()*10;
  function draw(){
    const rect=canvas.getBoundingClientRect();
    const w=rect.width, h=rect.height, cx=w/2, cy=h/2, r=Math.min(w,h)/2;
    ctx.clearRect(0,0,w,h);

    const grad=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.1,cx,cy,r);
    grad.addColorStop(0,'rgba(139,26,26,0.10)');
    grad.addColorStop(0.55,'rgba(139,26,26,0.05)');
    grad.addColorStop(1,'rgba(139,26,26,0.01)');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle='rgba(139,26,26,0.08)'; ctx.lineWidth=.6;
    for(let i=1;i<=3;i++){
      ctx.beginPath();
      ctx.ellipse(cx,cy, r*0.35+r*0.22*i, r*0.12+r*0.08*i, t*0.04+i, 0, Math.PI*2);
      ctx.stroke();
    }
    for(let i=0;i<3;i++){
      const ang=t*0.15+i*(Math.PI*2/3);
      const ox=cx+Math.cos(ang)*r*0.85, oy=cy+Math.sin(ang)*r*0.3;
      ctx.fillStyle='rgba(139,26,26,0.35)';
      ctx.beginPath(); ctx.arc(ox,oy,2.2,0,Math.PI*2); ctx.fill();
    }
    t+=0.01;
    requestAnimationFrame(draw);
  }
  draw();
}

document.addEventListener('DOMContentLoaded', ()=>{
  setupPlanetCanvas('planet-tr');
  setupPlanetCanvas('planet-bl');
});
