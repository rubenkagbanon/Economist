// ════════════════════════════════════════════════════════════
// main.js — onboarding + démarrage de l'app
// ════════════════════════════════════════════════════════════

function setNavDate(){
  const el=document.getElementById('nav-date'); if(!el)return;
  const locale = _lang==='en' ? 'en-US' : 'fr-FR';
  el.textContent = new Date().toLocaleDateString(locale, {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}

function maybeShowOnboarding(){
  let dismissed=false;
  try{ dismissed = localStorage.getItem('eco_onboard_dismissed')==='1'; }catch(e){}
  if(!dismissed) document.getElementById('onboard-overlay').classList.add('open');
}

// Appelé par data.js une fois la connexion Supabase établie ('db-ready')
async function init(){
  await loadData();

  if(_sb && _sb.auth){
    const { data: { session } } = await _sb.auth.getSession();
    if(session && session.user){
      await syncGoogleUserFromSession(session);
    } else {
      const savedEmail=getLocalEmail();
      if(savedEmail) currentUser = users.find(u=>u.email===savedEmail) || null;
    }
    _sb.auth.onAuthStateChange(async (_event, session) => {
      if(session && session.user){
        await syncGoogleUserFromSession(session);
        renderNav();
        if(typeof renderHome==='function') renderHome(currentActiveCat);
      }
    });
  } else {
    const savedEmail=getLocalEmail();
    if(savedEmail) currentUser = users.find(u=>u.email===savedEmail) || null;
  }

  applyTranslations();
  updateLangButton();
  setNavDate();
  renderNav();
  renderHome(currentActiveCat);

  const routePage=pageFromPath();
  if(routePage) showPage(routePage);

  try{
    const savedPage=localStorage.getItem('eco_page');
    if(!routePage && savedPage && savedPage!=='home' && document.getElementById('page-'+savedPage)) showPage(savedPage);
  }catch(e){}

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
  updateLangButton();
  setNavDate();
  initEmailJS();
});
