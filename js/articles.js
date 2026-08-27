// ════════════════════════════════════════════════════════════
// articles.js — Accueil, article, profil public, mes statistiques
// ════════════════════════════════════════════════════════════

// ═══════════════ NAVIGATION ═══════════════
let activeReadArticleId=null;
let activeReadTimer=null;

function cancelArticleRead(){
  if(activeReadTimer)clearTimeout(activeReadTimer);
  activeReadTimer=null;
  activeReadArticleId=null;
}
function articleReadKey(id){
  const visitor=currentUser?.email?.toLowerCase()||'guest';
  return `eco_article_read_${visitor}_${id}`;
}
function getReadVisitorKey(){
  const storageKey='eco_read_visitor_key';
  try{
    let key=localStorage.getItem(storageKey);
    if(!key){
      key=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey,key);
    }
    return key;
  }catch(e){ return null; }
}
function scheduleArticleRead(id){
  cancelArticleRead();
  if(localStorage.getItem(articleReadKey(id)))return;
  activeReadArticleId=id;
  activeReadTimer=setTimeout(async()=>{
    if(activeReadArticleId!==id)return;
    const {error}=await _sb.rpc('record_article_read',{p_article_id:id,p_visitor_key:getReadVisitorKey()});
    if(error){console.error('record_article_read',error);return;}
      const article=articles.find(item=>item.id===id);
      if(article)article.reads=(article.reads||0)+1;
      writeDataCache();
    localStorage.setItem(articleReadKey(id),'1');
    cancelArticleRead();
  },50000);
}

function showPage(name){
  if(name==='propose' && !currentUser){
    openModal('login');
    return;
  }
  if(name!=='article')cancelArticleRead();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+name); if(!pg)return;
  pg.classList.add('active');
  if(name==='propose')initProposalContact();
  document.title=name==='rules'
    ? 'Economist | Conditions d’utilisation'
    : name==='privacy'
      ? 'Economist | Politique de confidentialité'
      : 'Economist | Actualités et analyse dans plusieurs domaines';
  if(name!=='profile') resetProfileShareMetadata();
  document.body.classList.toggle('legal-view', name==='rules' || name==='privacy');
  const currentPath=window.location.pathname.replace(/\/+$/,'')||'/';
  const route=name==='privacy'?'/?page=privacy':name==='rules'?'/?page=rules':name==='profile'&&currentPath!=='/'?`${currentPath}/`:'/';
  const currentUrl=window.location.pathname+window.location.search;
  if(window.location.protocol!=='file:' && currentUrl!==route){
    try{ window.history.pushState({page:name},'',route); }catch(e){}
  }
  if(name!=='article'){
    try{ localStorage.setItem('eco_page', name); }catch(e){}
  }
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='home')    { loadData().then(()=>renderHome(currentActiveCat)); }
  if(name==='write')   renderWritePage();
  if(name==='mystats') { loadData().then(()=>renderMyStats()); }
  if(name==='admin')   { loadData(true).then(()=>renderAdmin()); }
}
function setProfileShareMetadata(user){
  const title=`${user?.first||''} ${user?.last||''}`.trim()||'Profil Economist';
  const description=user?.bio||`Profil de ${title} sur Economist.`;
  const image=user?.avatar||'https://www.econglobe.com/css/Logo.png';
  document.title=`${title} | Economist`;
  document.querySelector('meta[name="description"]')?.setAttribute('content',description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content',title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content',description);
  document.querySelector('meta[property="og:image"]')?.setAttribute('content',image);
  document.querySelector('meta[property="og:image:alt"]')?.setAttribute('content',`Photo de profil de ${title}`);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content',title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content',description);
  document.querySelector('meta[name="twitter:image"]')?.setAttribute('content',image);
}
function resetProfileShareMetadata(){
  const defaults={
    'meta[name="description"]':'Découvrez des articles issus de recherches, mémoires, études, enquêtes et découvertes dans de nombreux domaines. Economist donne une nouvelle visibilité aux travaux déjà réalisés et aux idées qui peuvent nous aider à mieux comprendre et faire avancer le monde.',
    'meta[property="og:title"]':'Economist | Actualités et analyse dans plusieurs domaines',
    'meta[property="og:description"]':'Découvrez des articles issus de recherches, mémoires, études, enquêtes et découvertes dans de nombreux domaines. Economist donne une nouvelle visibilité aux travaux déjà réalisés et aux idées qui peuvent nous aider à mieux comprendre et faire avancer le monde.',
    'meta[property="og:image"]':'https://www.econglobe.com/css/Logo.png',
    'meta[property="og:image:alt"]':'Logo Economist',
    'meta[name="twitter:title"]':'Economist | Actualités et analyse dans plusieurs domaines',
    'meta[name="twitter:description"]':'Découvrez des articles issus de recherches, mémoires, études, enquêtes et découvertes dans de nombreux domaines. Economist donne une nouvelle visibilité aux travaux déjà réalisés et aux idées qui peuvent nous aider à mieux comprendre et faire avancer le monde.',
    'meta[name="twitter:image"]':'https://www.econglobe.com/css/Logo.png'
  };
  document.title='Economist | Actualités et analyse dans plusieurs domaines';
  Object.entries(defaults).forEach(([selector,value])=>document.querySelector(selector)?.setAttribute('content',value));
}
function pageFromPath(){
  const requestedPage=new URLSearchParams(window.location.search).get('page');
  if(requestedPage==='privacy'||requestedPage==='rules')return requestedPage;
  if(window.location.protocol==='file:')return null;
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/privacy')return 'privacy';
  if(path==='/terms')return 'rules';
  if(path!=='/')return 'profile';
  return null;
}
function profileSlug(user){
  return `${user.first||''}${user.last||''}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
}
function profileLevelClass(level){
  return ['licence','master','doctorat','professor'].includes(level)?` profile-level-${level}`:'';
}
function profileEmailFromPath(){
  const path=window.location.pathname.replace(/^\/+|\/+$/g,'');
  if(!path||path==='privacy'||path==='terms')return null;
  const user=users.find(u=>profileSlug(u)===path.toLowerCase());
  return user?.email||null;
}
function findAuthorUser(authorName){
  const normalized=(authorName||'').trim().replace(/\s+/g,' ').toLowerCase();
  return users.find(user=>`${user.first||''} ${user.last||''}`.trim().replace(/\s+/g,' ').toLowerCase()===normalized)||null;
}
function articleBelongsToUser(article,user){
  if(article.owner_id && user.id)return String(article.owner_id)===String(user.id);
  const articleAuthor=findAuthorUser(article.author);
  if(articleAuthor)return String(articleAuthor.email||'').toLowerCase()===String(user.email||'').toLowerCase();
  const authorName=(article.author||'').trim().replace(/\s+/g,' ').toLowerCase();
  const userName=`${user.first||''} ${user.last||''}`.trim().replace(/\s+/g,' ').toLowerCase();
  return authorName===userName;
}
async function shareProfile(email){
  const user=users.find(u=>u.email===email);
  if(!user)return;
  const siteOrigin=window.location.protocol==='file:'?'https://www.econglobe.com':window.location.origin;
  const profileUrl=new URL(`/${profileSlug(user)}/`,siteOrigin);
  const shareData={title:`${user?.first||''} ${user?.last||''}`.trim(),text:`Profil de ${user?.first||''} ${user?.last||''}`.trim(),url:profileUrl.href};
  if(navigator.share){
    await navigator.share(shareData).catch(()=>{});
    return;
  }
  if(!navigator.clipboard?.writeText){ showToast(t('profile_share_error')); return; }
  navigator.clipboard.writeText(profileUrl.href).then(()=>showToast(t('profile_shared'))).catch(()=>showToast(t('profile_share_error')));
}
async function shareArticle(id){
  if(!currentUser){
    openModal('login');
    return;
  }
  const article=articles.find(item=>item.id===id);
  if(!article)return;
  const siteOrigin=window.location.protocol==='file:'?'https://www.econglobe.com':window.location.origin;
  const articleUrl=new URL(`/?article=${encodeURIComponent(article.id)}`,siteOrigin).href;
  const shareData={title:article.title,text:article.deck||`Lire l’article « ${article.title} » sur Economist.`,url:articleUrl};
  if(navigator.share){
    await navigator.share(shareData).catch(()=>{});
    return;
  }
  if(!navigator.clipboard?.writeText){showToast(t('article_share_error'));return;}
  navigator.clipboard.writeText(articleUrl).then(()=>showToast(t('article_shared'))).catch(()=>showToast(t('article_share_error')));
}
function filterRules(query){
  const term=(query||'').trim().toLowerCase();
  document.querySelectorAll('#rules-article .help-section').forEach(section=>{
    section.style.display=!term||section.textContent.toLowerCase().includes(term)?'':'none';
  });
}
function filterPrivacy(query){
  const term=(query||'').trim().toLowerCase();
  document.querySelectorAll('#privacy-article > section').forEach(section=>{
    section.style.display=!term||section.textContent.toLowerCase().includes(term)?'':'none';
  });
}
window.addEventListener('popstate',()=>{
  const page=pageFromPath();
  if(page)showPage(page); else showPage('home');
});
function filterCat(el,cat){
  document.querySelectorAll('.cat:not(.nav-link-item)').forEach(c=>c.classList.remove('active'));
  if(el)el.classList.add('active');
  currentActiveCat=cat; showPage('home');
}
function triggerReveal(){
  setTimeout(()=>{
    document.querySelectorAll('.reveal').forEach(el=>{
      if(el.classList.contains('revealed'))return;
      const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('revealed')});},{threshold:.08});
      obs.observe(el);
    });
  },50);
}

// ═══════════════ HOME ═══════════════
function artCardHtml(a){
  return `<div class="art-card" onclick="openArticle(${a.id})">
    <div class="art-thumb">${a.img?`<img class="art-thumb-img" loading="lazy" decoding="async" src="${a.img}" alt="" onerror="this.parentNode.innerHTML='<div class=art-thumb-empty></div>'">`:`<div class="art-thumb-empty"></div>`}</div>
    <div class="art-card-body">
      <div class="art-k">${tCat(a.cat)}</div><div class="art-title">${a.title}</div>
      <div class="art-excerpt">${a.deck}</div>
      <div class="art-foot"><span>${a.author}</span><span class="dot"></span><span>${tDate(a.date)}</span><span class="dot"></span><span>${readTime(a.body)}</span></div>
    </div></div>`;
}

function renderHome(cat){
  const wrap=document.getElementById('home-content');
  const all=articles.filter(article=>article.status==='published').reverse();
  const filtered=cat==='all'?all:all.filter(a=>a.cat===cat);
  if(filtered.length===0){
    wrap.innerHTML=`<div class="empty-state reveal"><div class="empty-anim"><img src="css/coming%20soon.png" alt="Coming soon"></div>
      <h2>${t('home_coming')}</h2>
      <p>${cat==='all'?t('home_none_all'):tEmptyCategory(cat)}</p>
      <span class="empty-cta" onclick="showPage('propose')">${t('home_cta')}</span></div>`;
    triggerReveal();return;
  }
  const hero=filtered[0], rest=filtered.slice(1);
  const catLabel=cat==='all'?t('cat_une'):tCat(cat);
  const isMobile=window.innerWidth<768;
  if(isMobile){
    wrap.innerHTML=`<div class="sec-wrap reveal" style="padding-bottom:1rem">
      <div style="cursor:pointer;border-bottom:.5px solid var(--gris-clair);padding-bottom:2rem" onclick="openArticle(${hero.id})">
        ${hero.img?`<div style="width:100%;aspect-ratio:16/9;overflow:hidden;margin-bottom:1rem"><img fetchpriority="high" decoding="async" src="${hero.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge);margin-bottom:.5rem">${tCat(hero.cat)}</div>
        <h1 style="font-family:'Oswald',Arial,sans-serif;font-size:clamp(1.6rem,5vw,2.4rem);font-weight:537;line-height:1.2;margin-bottom:.8rem">${hero.title}</h1>
        <p style="font-family:'Inter',var(--sans);font-size:.95rem;line-height:1.7;color:var(--txt-soft);margin-bottom:1rem;font-style:italic">${hero.deck}</p>
        <div style="display:flex;flex-wrap:wrap;gap:.6rem;font-family:var(--sans);font-size:10px;color:var(--gris);text-transform:uppercase"><span>${hero.author}</span><span class="dot"></span><span>${tDate(hero.date)}</span><span class="dot"></span><span>${readTime(hero.body)}</span></div>
      </div></div>
      ${rest.length?`<div class="sec-wrap reveal" style="padding-top:1.5rem"><div class="sec-head"><span class="sec-name">${catLabel}</span></div><div class="grid-articles">${rest.map(a=>artCardHtml(a)).join('')}</div></div>`:''}`;
  } else {
    wrap.innerHTML=`<div class="sec-wrap reveal" style="padding-bottom:1rem">
      <div style="display:grid;grid-template-columns:1fr 320px;border-bottom:.5px solid var(--gris-clair)">
        <div style="padding-right:3rem;border-right:.5px solid var(--gris-clair);padding-bottom:3rem;cursor:pointer" onclick="openArticle(${hero.id})">
          ${hero.img?`<div style="width:100%;aspect-ratio:16/9;overflow:hidden;margin-bottom:1.5rem"><img fetchpriority="high" decoding="async" src="${hero.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
          <div style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge);margin-bottom:.8rem">${tCat(hero.cat)}</div>
          <h1 style="font-family:'Oswald',Arial,sans-serif;font-size:clamp(1.8rem,3vw,2.6rem);font-weight:537;line-height:1.15;margin-bottom:1rem">${hero.title}</h1>
          <p style="font-family:'Inter',var(--sans);font-size:1rem;line-height:1.75;color:var(--txt-soft);margin-bottom:1.4rem;font-style:italic">${hero.deck}</p>
          <div style="display:flex;align-items:center;gap:1rem;font-family:var(--sans);font-size:10px;color:var(--gris);text-transform:uppercase"><span>${hero.author}</span><span class="dot"></span><span>${tDate(hero.date)}</span><span class="dot"></span><span>${readTime(hero.body)}</span></div>
        </div>
        <div style="padding-left:2.5rem;padding-top:.5rem">
          <div style="font-family:var(--sans);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--gris);margin-bottom:1.5rem;padding-bottom:.7rem;border-bottom:.5px solid var(--gris-clair)">${t('home_alire')}</div>
          ${rest.slice(0,4).map(a=>`<div style="padding:1.1rem 0;border-bottom:.5px solid var(--gris-clair);cursor:pointer;display:flex;gap:.9rem;align-items:flex-start" onclick="openArticle(${a.id})">
            ${a.img?`<div style="width:72px;height:52px;flex-shrink:0;overflow:hidden"><img loading="lazy" decoding="async" src="${a.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
            <div style="flex:1"><div style="font-family:var(--sans);font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--rouge);margin-bottom:.35rem">${tCat(a.cat)}</div>
            <div style="font-family:'Oswald',Arial,sans-serif;font-size:.95rem;font-weight:537;line-height:1.3;margin-bottom:.3rem" onmouseover="this.style.color='var(--rouge)'" onmouseout="this.style.color=''">${a.title}</div>
            <div style="font-family:var(--sans);font-size:9.5px;color:var(--gris)">${tDate(a.date)}</div></div>
          </div>`).join('')}
        </div>
      </div></div>
      ${rest.length?`<div class="sec-wrap reveal" style="padding-top:2.5rem"><div class="sec-head"><span class="sec-name">${catLabel}</span></div><div class="grid-articles">${rest.map(a=>artCardHtml(a)).join('')}</div></div>`:''}`;
  }
  triggerReveal();
}

// ═══════════════ ARTICLE FULL ═══════════════
async function openArticle(id,fromPage='home'){
  const a=articles.find(x=>x.id===id); if(!a)return;
  const backPage=fromPage==='admin'?'admin':'home';
  const bodyContent=a.bodyHtml||a.body.split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  const authorUser=(a.owner_id&&users.find(user=>String(user.id)===String(a.owner_id)))||findAuthorUser(a.author);
  const authorSlug=authorUser?profileSlug(authorUser):`${a.author||''}`.trim().replace(/\s+/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const canDelete=isOwner()||(currentUser&&currentUser.first+' '+currentUser.last===a.author);
  const shareBtn=`<button onclick="shareArticle(${a.id})" style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;background:none;border:.5px solid var(--gris-clair);color:var(--txt-mut);padding:5px 12px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='var(--rouge)';this.style.color='var(--rouge)'" onmouseout="this.style.borderColor='var(--gris-clair)';this.style.color='var(--txt-mut)'">${t('article_share')}</button>`;
  const delBtn=canDelete?`<button onclick="confirmDeleteArticle(${a.id})" style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;background:#8B0000;border:.5px solid #8B0000;color:#fff;padding:5px 12px;cursor:pointer;transition:all .2s;margin-left:auto" onmouseover="this.style.background='#700000';this.style.color='#fff'" onmouseout="this.style.background='#8B0000';this.style.color='#fff'">🗑 ${t('admin_delete')}</button>`:'';
  document.getElementById('article-content').innerHTML=`
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2.5rem;flex-wrap:wrap">
      <button class="back-btn" style="margin-bottom:0" onclick="showPage('${backPage}')">${t('home_back')}</button>${shareBtn}${delBtn}
    </div>
    <div class="art-full-k">${tCat(a.cat)}</div>
    <h1 class="art-full-title">${a.title}</h1>
    <div class="art-full-deck">${a.deck}</div>
    <div class="art-full-meta">
      <span>${t('home_par')} <a class="author-chip" href="/${authorSlug}/" onclick="event.preventDefault();${authorUser?`showPage('profile');openProfile('${authorUser.email}')`:`window.location.href=this.href`}">${a.author}</a></span>
      <span class="dot"></span><span>${tDate(a.date)}</span><span class="dot"></span><span>${readTime(a.body)} ${t('home_read')}</span>
    </div>
    ${a.img?`<div class="art-full-cover"><img decoding="async" src="${a.img}" alt="" onerror="this.parentNode.style.display='none'"></div><div class="art-full-caption">${tCat(a.cat)} — ${tDate(a.date)}</div>`:''}
    <div class="art-full-body">${bodyContent}</div>`;
  showPage('article');
  if(backPage==='home')scheduleArticleRead(id);
}

async function confirmDeleteArticle(id){
  if(!confirm(t('del_confirm')))return;
  const error=await deleteArticleDB(id);
  if(error){showToast(t('toast_delete_error'));return;}
  articles=articles.filter(a=>a.id!==id);
  showToast(t('del_done'));
  showPage('home');
}

// ═══════════════ PROFIL PUBLIC ═══════════════
function openProfile(email){
  const u=users.find(x=>x.email===email);
  if(!u){document.getElementById('profile-content').innerHTML=`<p style="font-family:var(--sans);color:var(--txt-pale)">${t('profile_not_found')}</p>`;return;}
  if(window.location.protocol!=='file:'){
    const profilePath=`/${profileSlug(u)}/`;
    const currentPath=window.location.pathname;
    if(currentPath!==profilePath)try{window.history.pushState({page:'profile'},'',profilePath);}catch(e){}
  }
  setProfileShareMetadata(u);
  const userArticles=articles.filter(article=>articleBelongsToUser(article,u)).reverse();
  const isMe=currentUser&&currentUser.email===email;
  const avatarClass=profileLevelClass(u.level);
  const avatarEl=u.avatar?`<div class="profile-avatar${avatarClass}"><img loading="lazy" decoding="async" src="${u.avatar}" alt="${u.first}"></div>`:`<div class="profile-avatar${avatarClass}" style="font-size:2rem">${(u.first[0]+(u.last[0]||'')).toUpperCase()}</div>`;
  document.getElementById('profile-content').innerHTML=`
    <button class="back-btn" onclick="showPage('home')">${t('home_back')}</button>
    <div class="profile-header">${avatarEl}
      <div style="flex:1">
        <div class="profile-name">${u.first} ${u.last}</div>
        <div class="profile-meta">${t('profile_member')} ${u.joined||'—'}${userArticles.length?` · ${userArticles.length} article${userArticles.length>1?'s':''} publié${userArticles.length>1?'s':''}`:' · '+t('profile_reader')}</div>
        ${u.bio?`<div class="profile-bio">${u.bio}</div>`:''}
        ${userArticles.length?`<div class="profile-badge">${t('profile_writer')}</div>`:''}
        <div class="profile-actions">
          ${isMe?`<button class="profile-edit-btn" onclick="openProfileEdit()">${t('profile_edit')}</button>`:''}
          <button class="profile-share-btn" onclick="shareProfile('${u.email}')">${t('profile_share')}</button>
        </div>
      </div>
    </div>
    ${userArticles.length?`<div class="stats-section-title">${t('profile_arts')}</div><div class="grid-articles">${userArticles.map(a=>artCardHtml(a)).join('')}</div>`:`<div style="font-family:var(--sans);font-size:.9rem;color:var(--gris);font-style:italic;padding:3rem 0">${t('profile_none')}</div>`}`;
}

// ═══════════════ MES STATS ═══════════════
function renderMyStats(){
  if(!currentUser){document.getElementById('my-stats-content').innerHTML=`<div style="font-family:var(--sans);font-size:.9rem;color:var(--txt-pale)">${t('write_connect')}</div>`;return;}
  const myArts=articles.filter(a=>a.author===currentUser.first+' '+currentUser.last).reverse();
  const totalReads=myArts.reduce((s,a)=>s+(a.reads||0),0);
  const totalWords=myArts.reduce((s,a)=>s+(a.body||'').trim().split(/\s+/).length,0);
  document.getElementById('my-stats-content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1.2rem;margin-bottom:3rem">
      <div class="my-stat-card"><div class="my-stat-num">${myArts.length}</div><div class="my-stat-label">${t('stats_articles')}</div></div>
      <div class="my-stat-card"><div class="my-stat-num">${totalReads}</div><div class="my-stat-label">${t('stats_reads')}</div></div>
      <div class="my-stat-card"><div class="my-stat-num">${totalWords.toLocaleString(_lang==='fr'?'fr':'en')}</div><div class="my-stat-label">${t('stats_words')}</div></div>
      <div class="my-stat-card"><div class="my-stat-num">${myArts.length?Math.round(totalReads/myArts.length):0}</div><div class="my-stat-label">${t('stats_avg')}</div></div>
    </div>
    ${myArts.length?`<div class="stats-section-title">${t('stats_my')}</div><div style="overflow-x:auto">
      <table class="stats-table"><thead><tr><th>${t('stats_table_titre')}</th><th>${t('stats_table_cat')}</th><th>${t('stats_table_date')}</th><th>${t('stats_table_reads')}</th><th>${t('stats_table_action')}</th></tr></thead><tbody>
      ${myArts.map(a=>`<tr><td><span class="td-title" onclick="openArticle(${a.id})">${a.title}</span></td><td><span class="stats-cat-badge">${tCat(a.cat)}</span></td><td>${tDate(a.date)}</td><td><strong style="color:var(--rouge)">${a.reads||0}</strong></td><td><button class="btn-danger" onclick="confirmDeleteArticle(${a.id})">${t('admin_delete')}</button></td></tr>`).join('')}
      </tbody></table></div>`:`<div style="font-family:var(--sans);font-size:.9rem;color:var(--gris);font-style:italic;padding:2rem 0">${t('stats_none')}</div>`}`;
}

