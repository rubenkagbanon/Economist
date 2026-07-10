// ════════════════════════════════════════════════════════════
// ui.js — navigation, recherche, modales, thème
// ════════════════════════════════════════════════════════════

// ═══════════════ NAV (desktop + mobile) ═══════════════
function renderNav(){
  const loggedIn = !!currentUser;
  const toggle = (id, show) => { const el=document.getElementById(id); if(el) el.style.display = show ? '' : 'none'; };
  toggle('nav-cats-write', loggedIn);
  toggle('nav-cats-mystats', loggedIn);
  toggle('nav-cats-admin', loggedIn && isOwner());
  toggle('nav-cats-login', !loggedIn);
  toggle('nav-cats-logout', loggedIn);
  toggle('mob-write-item', loggedIn);
  toggle('mob-mystats-item', loggedIn);
  toggle('mob-admin-item', loggedIn && isOwner());

  const searchHtml = `<div class="nav-search-wrap">
      <svg class="nav-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="nav-search-input" placeholder="Articles, auteurs…"
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

// ═══════════════ SEARCH (desktop + mobile share this) ═══════════════
function doSearch(q, targetId){
  const el=document.getElementById(targetId); if(!el)return;
  q=q.trim().toLowerCase();
  if(!q){ el.classList.remove('open'); el.innerHTML=''; return; }
  const results = articles.filter(a =>
    a.title.toLowerCase().includes(q) || a.author.toLowerCase().includes(q)
  ).slice(0,8);
  if(!results.length){
    el.innerHTML = `<div class="srd-section">Aucun résultat</div>`;
  } else {
    el.innerHTML = results.map(a => `
      <div class="srd-item" onclick="selectSearchResult(${a.id},'${targetId}')">
        <div class="srd-cat">${tCat(a.cat)}</div>
        <div class="srd-title">${a.title}</div>
        <div class="srd-author">${a.author}</div>
      </div>`).join('');
  }
  el.classList.add('open');
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

// ═══════════════ AUTH MODAL ═══════════════
function openModal(tab){
  document.getElementById('auth-modal').classList.add('open');
  switchTab(tab||'login');
}
function closeModal(){
  document.getElementById('auth-modal').classList.remove('open');
}
function switchTab(tab){
  const tabsEl = document.querySelector('.modal-tabs');
  if(tab==='forgot'){
    if(tabsEl) tabsEl.style.display='none';
  } else {
    if(tabsEl) tabsEl.style.display='flex';
    document.querySelectorAll('.modal-tab').forEach((el,i)=>{
      el.classList.toggle('active', (tab==='login'&&i===0) || (tab==='signup'&&i===1));
    });
  }
  switchAuthPanel(tab);
}
function togglePwd(inputId, btn){
  const inp=document.getElementById(inputId);
  if(!inp)return;
  const show = inp.type==='password';
  inp.type = show ? 'text' : 'password';
  if(btn) btn.textContent = show ? '🙈' : '👁';
}

// ═══════════════ THEME ═══════════════
function toggleTheme(){
  const html=document.documentElement;
  const dark = html.getAttribute('data-theme')==='dark';
  const next = dark ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
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
