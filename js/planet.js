// Réseau de particules sphérique animé en arrière-plan.
// Performance : 30 images/s, pause hors écran ou onglet masqué, traits groupés
// par niveau d'opacité (quelques appels de dessin au lieu de centaines),
// moins de points sur mobile, image fixe si l'utilisateur réduit les animations.
function initPlanet(id,radius,dotCount,lineThreshold,speed){
  const canvas=document.getElementById(id);if(!canvas)return;
  const size=canvas.offsetWidth||160;canvas.width=size;canvas.height=size;
  const cx=size/2,cy=size/2,r=radius*size/2,ctx=canvas.getContext('2d'),col='139,26,26';
  const small=window.matchMedia&&window.matchMedia('(max-width: 768px)').matches;
  // Sur ordinateur, l'animation tourne toujours (choix éditorial) ; sur téléphone,
  // on respecte le réglage « réduire les animations » de l'appareil.
  const reduced=small&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count=small?Math.round(dotCount*.55):dotCount;
  const dots=Array.from({length:count},()=>{const theta=Math.acos(1-2*Math.random()),phi=2*Math.PI*Math.random();return{theta,phi,vT:(Math.random()-.5)*.0003*speed,vP:(Math.random()-.5)*.0003*speed};});
  const LEVELS=8, FRAME_MS=1000/30;
  const threshold2=lineThreshold*lineThreshold;
  const buckets=Array.from({length:LEVELS},()=>[]);
  function project(dot){
    const st=Math.sin(dot.theta),x=r*st*Math.cos(dot.phi),y=r*Math.cos(dot.theta),z=r*st*Math.sin(dot.phi);
    return{x:cx+x,y:cy-y,alpha:Math.max(0,(z+r)/(2*r))};
  }
  function render(){
    ctx.clearRect(0,0,size,size);
    const points=dots.map(project);
    buckets.forEach(b=>b.length=0);
    for(let i=0;i<points.length;i++){
      const p=points[i];
      for(let j=i+1;j<points.length;j++){
        const q=points[j],dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy;
        if(d2<threshold2){
          const opacity=Math.min(p.alpha,q.alpha)*(1-Math.sqrt(d2)/lineThreshold)*.35;
          const level=Math.min(LEVELS-1,Math.floor(opacity/.35*LEVELS));
          buckets[level].push(p.x,p.y,q.x,q.y);
        }
      }
    }
    ctx.lineWidth=.5;
    buckets.forEach((b,level)=>{
      if(!b.length)return;
      ctx.beginPath();
      for(let k=0;k<b.length;k+=4){ctx.moveTo(b[k],b[k+1]);ctx.lineTo(b[k+2],b[k+3]);}
      ctx.strokeStyle=`rgba(${col},${((level+.5)/LEVELS*.35).toFixed(3)})`;
      ctx.stroke();
    });
    points.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,1.4,0,Math.PI*2);ctx.fillStyle=`rgba(${col},${point.alpha*.55})`;ctx.fill();});
  }
  function step(frames){
    dots.forEach(dot=>{dot.theta+=dot.vT*frames;dot.phi+=dot.vP*frames;if(dot.theta<.1||dot.theta>Math.PI-.1)dot.vT*=-1;});
  }

  if(reduced){render();return;}

  let visible=true,running=false,last=0;
  function loop(now){
    if(!visible||document.hidden){running=false;return;}
    if(now-last>=FRAME_MS){
      // vitesse identique à l'ancienne version (calée sur 60 images/s)
      step(last?Math.min(4,(now-last)/(1000/60)):1);
      last=now;
      render();
    }
    requestAnimationFrame(loop);
  }
  function start(){if(!running&&visible&&!document.hidden){running=true;last=0;requestAnimationFrame(loop);}}
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;start();}).observe(canvas);
  }
  document.addEventListener('visibilitychange',start);
  render();
  start();
}

document.addEventListener('DOMContentLoaded',()=>{
  // Démarre après le premier affichage pour ne pas retarder la page
  const go=()=>{
    initPlanet('planet-tr',.92,120,90,1.2);
    initPlanet('planet-bl',.9,90,80,.9);
  };
  if('requestIdleCallback' in window) requestIdleCallback(go,{timeout:1500}); else setTimeout(go,300);
});
