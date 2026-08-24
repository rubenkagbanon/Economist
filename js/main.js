// ════════════════════════════════════════════════════════════
// main.js — onboarding + démarrage de l'app
// ════════════════════════════════════════════════════════════

let initStarted=false;

function setNavDate(){
  const el=document.getElementById('nav-date'); if(!el)return;
  const locale = _lang==='en' ? 'en-US' : 'fr-FR';
  el.textContent = new Date().toLocaleDateString(locale, {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}

function maybeShowOnboarding(){
  if(currentUser)return;
  let dismissed=false;
  try{ dismissed = localStorage.getItem('eco_onboard_dismissed')==='1'; }catch(e){}
  if(!dismissed) document.getElementById('onboard-overlay').classList.add('open');
}
function setLoadingStatus(message){
  const el=document.getElementById('loading-text');
  if(el)el.textContent=`Economist · ${message}`;
}
function waitForPageReady(){
  const images=[...document.images].filter(image=>{
    if(image.complete)return false;
    const bounds=image.getBoundingClientRect();
    return bounds.top<window.innerHeight*1.25;
  });
  const imagePromise=Promise.all(images.map(image=>new Promise(resolve=>{
    image.addEventListener('load',resolve,{once:true});
    image.addEventListener('error',resolve,{once:true});
  })));
  const fontPromise=document.fonts?.ready||Promise.resolve();
  return Promise.race([
    Promise.all([imagePromise,fontPromise,new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))]),
    new Promise(resolve=>setTimeout(resolve,3000))
  ]);
}

// Appelé par data.js une fois la connexion Supabase établie ('db-ready')
async function init(){
  if(initStarted)return;
  initStarted=true;
  setLoadingStatus('Connexion sécurisée à Supabase…');
  try{
    await loadData();
  }catch(error){
    console.error('initial data load',error);
  }

  if(_sb && _sb.auth){
    setLoadingStatus('Vérification de votre session…');
    const { data: { session } } = await _sb.auth.getSession();
    if(session && session.user) await syncAuthUserFromSession(session);
    _sb.auth.onAuthStateChange(async (_event, nextSession) => {
      if(!nextSession || !nextSession.user)return;
      setTimeout(async ()=>{
        await syncAuthUserFromSession(nextSession);
        renderNav();
        if(typeof renderHome==='function') renderHome(currentActiveCat);
        if(_event==='SIGNED_IN')showToast(`${t('toast_welcome')}, ${currentUser.first} !`);
      },0);
    });
  } else {
    currentUser = null;
  }

  setLoadingStatus('Préparation des articles et des profils…');
  applyTranslations();
  translateLegalPages();
  updateLangButton();
  setNavDate();
  renderNav();
  renderHome(currentActiveCat);

  const sharedArticleId=new URLSearchParams(window.location.search).get('article');
  if(sharedArticleId){
    const sharedArticle=articles.find(article=>String(article.id)===sharedArticleId);
    if(sharedArticle)openArticle(sharedArticle.id);
  }

  const routePage=pageFromPath();
  if(routePage) showPage(routePage);

  const sharedProfile=new URLSearchParams(window.location.search).get('profile');
  const pathProfile=profileEmailFromPath();
  if(sharedProfile || pathProfile){ showPage('profile'); openProfile(pathProfile||sharedProfile); }

  try{
    const savedPage=localStorage.getItem('eco_page');
    if(!routePage && savedPage && !['home','privacy','rules','profile'].includes(savedPage) && document.getElementById('page-'+savedPage)) showPage(savedPage);
  }catch(e){}

  setLoadingStatus('Chargement des images et des polices…');
  await waitForPageReady();
  setLoadingStatus('Tout est prêt.');
  document.getElementById('loading-screen').classList.add('hidden');
  maybeShowOnboarding();
}

document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const savedTheme=localStorage.getItem('eco_theme');
    if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }catch(e){}
  updateLogoForTheme();
  try{
    const savedLang=localStorage.getItem('eco_lang');
    if(savedLang) _lang=savedLang;
  }catch(e){}
  applyTranslations();
  translateLegalPages();
  updateLangButton();
  setNavDate();
  initEmailJS();
  if(!initStarted && (dbReady || window._sb)){ _sb=window._sb; dbReady=true; init(); }
});
