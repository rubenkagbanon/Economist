// ════════════════════════════════════════════════════════════
// ui.js — navigation, recherche, modales, thème
// ════════════════════════════════════════════════════════════

// ═══════════════ NAV (desktop + mobile) ═══════════════
function renderNav(){
  const loggedIn = !!currentUser;
  const toggle = (id, show) => { const el=document.getElementById(id); if(el) el.style.display = show ? '' : 'none'; };
  toggle('nav-cats-write', loggedIn);
  toggle('nav-cats-mystats', loggedIn && isOwner());
  toggle('nav-cats-admin', loggedIn && isOwner());
  toggle('nav-cats-login', !loggedIn);
  toggle('nav-cats-logout', loggedIn);
  toggle('mob-write-item', loggedIn);
  toggle('mob-mystats-item', loggedIn);
  toggle('mob-password-item', loggedIn);
  toggle('mob-logout-item', loggedIn);
  toggle('mob-admin-item', loggedIn && isOwner());
  toggle('desktop-nav-login', !loggedIn);
  toggle('desktop-nav-logout', loggedIn);
  toggle('desktop-nav-write', loggedIn);
  toggle('desktop-nav-stats', loggedIn);
  toggle('desktop-nav-password', loggedIn);
  toggle('nav-cats-propose', loggedIn);
  toggle('mob-propose-item', loggedIn);
  toggle('footer-propose-link', loggedIn);

  const searchHtml = `<div class="nav-search-wrap">
      <svg class="nav-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="nav-search-input" placeholder="${t('search_placeholder')}"
        oninput="doSearch(this.value,'nav-search-results')"
        onblur="setTimeout(()=>hideSearchResults('nav-search-results'),150)">
      <div class="srd" id="nav-search-results"></div>
    </div>`;

  const actionsEl = document.getElementById('nav-actions');
  const mobActionsEl = document.getElementById('mob-actions');
  if(loggedIn){
    actionsEl.innerHTML = `${searchHtml}
      <div class="nav-user" onclick="showPage('profile');openProfile('${currentUser.email}')">
        ${avHtml(currentUser,28)}<span>${currentUser.first}</span><span class="nav-user-dot"></span>
      </div>`;
    mobActionsEl.innerHTML = `<button class="btn-outline" style="width:100%" onclick="closeMobileMenu();showPage('profile');openProfile('${currentUser.email}')">${t('profile_edit')}</button>`;
  } else {
    actionsEl.innerHTML = `${searchHtml}
      <button class="btn-outline" onclick="openModal('login')">${t('auth_login')}</button>
      <button class="btn-red" onclick="openModal('signup')">${t('auth_signup')}</button>`;
    mobActionsEl.innerHTML = `<button class="btn-outline" style="width:100%" onclick="closeMobileMenu();openModal('login')">${t('auth_login')}</button>
      <button class="btn-red" style="width:100%" onclick="closeMobileMenu();openModal('signup')">${t('auth_signup')}</button>`;
  }
}

// ═══════════════ MOBILE MENU ═══════════════
function toggleMobileMenu(){
  document.getElementById('mob-menu').classList.toggle('open');
  document.getElementById('mob-overlay').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
}
function closeMobileMenu(){
  document.getElementById('mob-menu').classList.remove('open');
  document.getElementById('mob-overlay').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}
function navGo(name){ closeMobileMenu(); showPage(name); }

// ═══════════════ DESKTOP MENU ═══════════════
function toggleDesktopMenu(){
  document.getElementById('desktop-nav-menu').classList.toggle('open');
  document.getElementById('desktop-nav-overlay').classList.toggle('open');
  document.getElementById('desktop-hamburger').classList.toggle('open');
}
function closeDesktopMenu(){
  document.getElementById('desktop-nav-menu').classList.remove('open');
  document.getElementById('desktop-nav-overlay').classList.remove('open');
  document.getElementById('desktop-hamburger').classList.remove('open');
}

// ═══════════════ SEARCH (desktop + mobile share this) ═══════════════
const searchTimers={};
const normalizeSearch = value => (value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function doSearch(q, targetId){
  const el=document.getElementById(targetId); if(!el)return;
  const isMobileSearch = targetId === 'mob-search-results';
  q=normalizeSearch(q.trim());
  clearTimeout(searchTimers[targetId]);
  if(!q){
    el.classList.remove('open');
    if(isMobileSearch) el.style.display='none';
    el.innerHTML='';
    return;
  }
  searchTimers[targetId]=setTimeout(()=>renderSearchResults(q,targetId),180);
}
function renderSearchResults(q,targetId){
  const el=document.getElementById(targetId); if(!el)return;
  const isMobileSearch = targetId === 'mob-search-results';
  const userResults = users.filter(u => {
    const profileText = normalizeSearch(`${u.first||''} ${u.last||''}`);
    return profileText.includes(q);
  }).slice(0,4);
  const articleResults = articles.filter(a => {
    const articleText = normalizeSearch(a.title||'');
    return articleText.includes(q);
  }).slice(0,8);
  if(!userResults.length && !articleResults.length){
    el.innerHTML = `<div class="srd-section">Aucun résultat</div>`;
  } else {
    el.innerHTML = `${userResults.length ? `<div class="srd-section">Utilisateurs</div>${userResults.map(u => `
      <div class="srd-item" onpointerdown="event.preventDefault();selectSearchUser(${users.indexOf(u)},'${targetId}')">
        <div class="srd-cat">Profil</div>
        <div class="srd-profile-row">
          ${avHtml(u,32)}
          <div class="srd-title">${u.first||''} ${u.last||''}</div>
        </div>
      </div>`).join('')}` : ''}${articleResults.length ? `<div class="srd-section">Articles</div>${articleResults.map(a => `
      <div class="srd-item" onpointerdown="event.preventDefault();selectSearchResult(${a.id},'${targetId}')">
        <div class="srd-cat">${tCat(a.cat)}</div>
        <div class="srd-title">${a.title||''}</div>
        <div class="srd-author">${a.author||''}</div>
      </div>`).join('')}` : ''}`;
  }
  el.classList.add('open');
  if(isMobileSearch) el.style.display='block';
}
function doMobSearch(q){ doSearch(q, 'mob-search-results'); }
function hideSearchResults(targetId){
  const el=document.getElementById(targetId); if(el) el.classList.remove('open');
}
function selectSearchResult(id, targetId){
  hideSearchResults(targetId);
  const el=document.getElementById(targetId); if(el) el.innerHTML='';
  document.querySelectorAll('.nav-search-input,#mob-search').forEach(i=>i.value='');
  closeMobileMenu();
  openArticle(id);
}
function selectSearchUser(userIndex, targetId){
  hideSearchResults(targetId);
  const el=document.getElementById(targetId); if(el) el.innerHTML='';
  document.querySelectorAll('.nav-search-input,#mob-search').forEach(i=>i.value='');
  closeMobileMenu();
  const user=users[userIndex];
  if(!user)return;
  showPage('profile');
  openProfile(user.email);
}

// ═══════════════ AUTH MODAL ═══════════════
function openModal(tab){
  document.getElementById('auth-modal').classList.add('open');
  switchTab(tab||'login');
}
function closeModal(){
  document.getElementById('auth-modal').classList.remove('open');
}
function togglePasswordVisibility(inputId){
  const input = document.getElementById(inputId);
  const btn = document.querySelector(`[data-target="${inputId}"]`);
  if(!input || !btn) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? 'Masquer' : 'Afficher';
  btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
  input.focus();
}

function switchTab(tab){
  const tabsEl = document.querySelector('.modal-tabs');
  if(tab==='forgot'||tab==='password'){
    if(tabsEl) tabsEl.style.display='none';
  } else {
    if(tabsEl) tabsEl.style.display='flex';
    document.querySelectorAll('.modal-tab').forEach((el,i)=>{
      el.classList.toggle('active', (tab==='login'&&i===0) || (tab==='signup'&&i===1));
    });
  }
  switchAuthPanel(tab);
}
function openPasswordModal(){
  if(!currentUser){openModal('login');return;}
  openModal('password');
  document.getElementById('new-password').value='';
  document.getElementById('confirm-password').value='';
  document.getElementById('password-err').style.display='none';
}
function togglePwd(inputId, btn){
  const inp=document.getElementById(inputId);
  if(!inp)return;
  const show = inp.type==='password';
  inp.type = show ? 'text' : 'password';
  if(btn) btn.textContent = show ? '🙈' : '👁';
}

// ═══════════════ THEME ═══════════════
const themeLogoSources=['css/Logo.png','css/dark logo.png'];
themeLogoSources.forEach(src=>{ const img=new Image(); img.src=src; });

function updateLogoForTheme(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const logoSrc=isDark ? 'css/dark logo.png' : 'css/Logo.png';
  document.querySelectorAll('.loading-logo-image, .nav-logo-image').forEach(img=>{
    if(img.src !== new URL(logoSrc, document.baseURI).href) img.src=logoSrc;
  }); 
  const favicon=document.getElementById('site-favicon');
  if(favicon) favicon.href=logoSrc;
  updateThemeToggle(isDark);
}

function updateThemeToggle(isDark=document.documentElement.getAttribute('data-theme')==='dark'){
  const button=document.getElementById('theme-toggle');
  if(!button)return;
  button.title=isDark ? 'Activer le thème clair' : 'Activer le thème sombre';
  button.setAttribute('aria-label', button.title);
  button.innerHTML=isDark
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

function applySystemTheme(event){
  let saved=null;
  try{ saved=localStorage.getItem('eco_theme'); }catch(e){}
  if(saved)return;
  const isDark=event?.matches ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme',isDark?'dark':'light');
  updateLogoForTheme();
}

function initThemeSync(){
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  if(!media)return;
  const handler=event=>applySystemTheme(event);
  if(media.addEventListener)media.addEventListener('change',handler);
  else if(media.addListener)media.addListener(handler);
}

function toggleTheme(){
  const html=document.documentElement;
  const dark = html.getAttribute('data-theme')==='dark';
  const next = dark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  updateLogoForTheme();
  try{ localStorage.setItem('eco_theme', next); }catch(e){}
}

// ═══════════════ ONBOARDING ═══════════════
function closeOnboard(){
  document.getElementById('onboard-overlay').classList.remove('open');
  const noShow=document.getElementById('onboard-no-show');
  if(noShow && noShow.checked){
    try{ localStorage.setItem('eco_onboard_dismissed','1'); }catch(e){}
  }
}
