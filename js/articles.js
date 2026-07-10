// ════════════════════════════════════════════════════════════
// articles.js — Accueil, article, profil public, mes statistiques
// ════════════════════════════════════════════════════════════

// ═══════════════ NAVIGATION ═══════════════
function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pg=document.getElementById('page-'+name); if(!pg)return;
  pg.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='home')    { loadData().then(()=>renderHome(currentActiveCat)); }
  if(name==='write')   renderWritePage();
  if(name==='mystats') { loadData().then(()=>renderMyStats()); }
  if(name==='admin')   { loadData().then(()=>renderAdmin()); }
}
function filterCat(el,cat){
  document.querySelectorAll('.cat:not(.nav-link-item)').forEach(c=>c.classList.remove('active'));
  if(el)el.classList.add('active');
  currentActiveCat=cat; showPage('home'); renderHome(cat);
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
    <div class="art-thumb">${a.img?`<img class="art-thumb-img" src="${a.img}" alt="" onerror="this.parentNode.innerHTML='<div class=art-thumb-empty></div>'">`:`<div class="art-thumb-empty"></div>`}</div>
    <div class="art-card-body">
      <div class="art-k">${tCat(a.cat)}</div><div class="art-title">${a.title}</div>
      <div class="art-excerpt">${a.deck}</div>
      <div class="art-foot"><span>${a.author}</span><span class="dot"></span><span>${tDate(a.date)}</span><span class="dot"></span><span>${readTime(a.body)}</span></div>
    </div></div>`;
}

function renderHome(cat){
  const wrap=document.getElementById('home-content');
  const all=[...articles].reverse();
  const filtered=cat==='all'?all:all.filter(a=>a.cat===cat);
  if(filtered.length===0){
    wrap.innerHTML=`<div class="empty-state reveal"><div class="empty-anim"><span></span><span></span><span></span></div>
      <h2>${t('home_coming')}</h2>
      <p>${t('home_desc')}</p>
      <p>${cat==='all'?t('home_none_all'):t('home_none_cat')+' '+tCat(cat)+' » pour l\'instant.'}</p>
      <span class="empty-cta" onclick="showPage('propose')">${t('home_cta')}</span></div>`;
    triggerReveal();return;
  }
  const hero=filtered[0], rest=filtered.slice(1);
  const catLabel=cat==='all'?t('cat_une'):tCat(cat);
  const isMobile=window.innerWidth<768;
  if(isMobile){
    wrap.innerHTML=`<div class="sec-wrap reveal" style="padding-bottom:1rem">
      <div style="cursor:pointer;border-bottom:.5px solid var(--gris-clair);padding-bottom:2rem" onclick="openArticle(${hero.id})">
        ${hero.img?`<div style="width:100%;aspect-ratio:16/9;overflow:hidden;margin-bottom:1rem"><img src="${hero.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge);margin-bottom:.5rem">${tCat(hero.cat)}</div>
        <h1 style="font-family:var(--serif);font-size:clamp(1.6rem,5vw,2.4rem);font-weight:400;line-height:1.2;margin-bottom:.8rem">${hero.title}</h1>
        <p style="font-family:var(--serif-text);font-size:.95rem;line-height:1.7;color:var(--txt-soft);margin-bottom:1rem;font-style:italic">${hero.deck}</p>
        <div style="display:flex;flex-wrap:wrap;gap:.6rem;font-family:var(--sans);font-size:10px;color:var(--gris);text-transform:uppercase"><span>${hero.author}</span><span class="dot"></span><span>${tDate(hero.date)}</span><span class="dot"></span><span>${readTime(hero.body)}</span></div>
      </div></div>
      ${rest.length?`<div class="sec-wrap reveal" style="padding-top:1.5rem"><div class="sec-head"><span class="sec-name">${catLabel}</span></div><div class="grid-articles">${rest.map(a=>artCardHtml(a)).join('')}</div></div>`:''}`;
  } else {
    wrap.innerHTML=`<div class="sec-wrap reveal" style="padding-bottom:1rem">
      <div style="display:grid;grid-template-columns:1fr 320px;border-bottom:.5px solid var(--gris-clair)">
        <div style="padding-right:3rem;border-right:.5px solid var(--gris-clair);padding-bottom:3rem;cursor:pointer" onclick="openArticle(${hero.id})">
          ${hero.img?`<div style="width:100%;aspect-ratio:16/9;overflow:hidden;margin-bottom:1.5rem"><img src="${hero.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
          <div style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--rouge);margin-bottom:.8rem">${tCat(hero.cat)}</div>
          <h1 style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;line-height:1.15;margin-bottom:1rem">${hero.title}</h1>
          <p style="font-family:var(--serif-text);font-size:1rem;line-height:1.75;color:var(--txt-soft);margin-bottom:1.4rem;font-style:italic">${hero.deck}</p>
          <div style="display:flex;align-items:center;gap:1rem;font-family:var(--sans);font-size:10px;color:var(--gris);text-transform:uppercase"><span>${hero.author}</span><span class="dot"></span><span>${tDate(hero.date)}</span><span class="dot"></span><span>${readTime(hero.body)}</span></div>
        </div>
        <div style="padding-left:2.5rem;padding-top:.5rem">
          <div style="font-family:var(--sans);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:var(--gris);margin-bottom:1.5rem;padding-bottom:.7rem;border-bottom:.5px solid var(--gris-clair)">${t('home_alire')}</div>
          ${rest.slice(0,4).map(a=>`<div style="padding:1.1rem 0;border-bottom:.5px solid var(--gris-clair);cursor:pointer;display:flex;gap:.9rem;align-items:flex-start" onclick="openArticle(${a.id})">
            ${a.img?`<div style="width:72px;height:52px;flex-shrink:0;overflow:hidden"><img src="${a.img}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.style.display='none'"></div>`:''}
            <div style="flex:1"><div style="font-family:var(--sans);font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:var(--rouge);margin-bottom:.35rem">${tCat(a.cat)}</div>
            <div style="font-family:var(--serif);font-size:.95rem;line-height:1.3;margin-bottom:.3rem" onmouseover="this.style.color='var(--rouge)'" onmouseout="this.style.color=''">${a.title}</div>
            <div style="font-family:var(--sans);font-size:9.5px;color:var(--gris)">${tDate(a.date)}</div></div>
          </div>`).join('')}
        </div>
      </div></div>
      ${rest.length?`<div class="sec-wrap reveal" style="padding-top:2.5rem"><div class="sec-head"><span class="sec-name">${catLabel}</span></div><div class="grid-articles">${rest.map(a=>artCardHtml(a)).join('')}</div></div>`:''}`;
  }
  triggerReveal();
}

// ═══════════════ ARTICLE FULL ═══════════════
async function openArticle(id){
  const a=articles.find(x=>x.id===id); if(!a)return;
  a.reads=(a.reads||0)+1;
  await saveArticle(a);
  const bodyContent=a.bodyHtml||a.body.split(/\n\n+/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  const authorUser=users.find(u=>u.first+' '+u.last===a.author);
  const canDelete=isOwner()||(currentUser&&currentUser.first+' '+currentUser.last===a.author);
  const delBtn=canDelete?`<button onclick="confirmDeleteArticle(${a.id})" style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;background:none;border:.5px solid rgba(139,26,26,0.4);color:var(--rouge);padding:5px 12px;cursor:pointer;transition:all .2s;margin-left:auto" onmouseover="this.style.background='var(--rouge)';this.style.color='white'" onmouseout="this.style.background='none';this.style.color='var(--rouge)'">🗑 ${t('admin_delete')}</button>`:'';
  document.getElementById('article-content').innerHTML=`
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:2.5rem;flex-wrap:wrap">
      <button class="back-btn" style="margin-bottom:0" onclick="showPage('home')">${t('home_back')}</button>${delBtn}
    </div>
    <div class="art-full-k">${tCat(a.cat)}</div>
    <h1 class="art-full-title">${a.title}</h1>
    <div class="art-full-deck">${a.deck}</div>
    <div class="art-full-meta">
      <span>${t('home_par')} <span class="author-chip" onclick="${authorUser?`showPage('profile');openProfile('${authorUser.email}')`:'void(0)'}">${a.author}</span></span>
      <span class="dot"></span><span>${tDate(a.date)}</span><span class="dot"></span><span>${readTime(a.body)} ${t('home_read')}</span>
    </div>
    ${a.img?`<div class="art-full-cover"><img src="${a.img}" alt="" onerror="this.parentNode.style.display='none'"></div><div class="art-full-caption">${tCat(a.cat)} — ${tDate(a.date)}</div>`:''}
    <div class="art-full-body">${bodyContent}</div>`;
  showPage('article');
}

async function confirmDeleteArticle(id){
  if(!confirm(t('del_confirm')))return;
  articles=articles.filter(a=>a.id!==id);
  await deleteArticleDB(id);
  showToast(t('del_done'));
  showPage('home');
}

// ═══════════════ PROFIL PUBLIC ═══════════════
function openProfile(email){
  const u=users.find(x=>x.email===email);
  if(!u){document.getElementById('profile-content').innerHTML=`<p style="font-family:var(--sans);color:var(--txt-pale)">${t('profile_not_found')}</p>`;return;}
  const userArticles=articles.filter(a=>a.author===u.first+' '+u.last).reverse();
  const isMe=currentUser&&currentUser.email===email;
  const avatarEl=u.avatar?`<div class="profile-avatar"><img src="${u.avatar}" alt="${u.first}"></div>`:`<div class="profile-avatar" style="font-size:2rem">${(u.first[0]+(u.last[0]||'')).toUpperCase()}</div>`;
  document.getElementById('profile-content').innerHTML=`
    <button class="back-btn" onclick="showPage('home')">${t('home_back')}</button>
    <div class="profile-header">${avatarEl}
      <div style="flex:1">
        <div class="profile-name">${u.first} ${u.last}</div>
        <div class="profile-meta">${t('profile_member')} ${u.joined||'—'}${userArticles.length?` · ${userArticles.length} article${userArticles.length>1?'s':''} publié${userArticles.length>1?'s':''}`:' · '+t('profile_reader')}</div>
        ${u.bio?`<div class="profile-bio">"${u.bio}"</div>`:''}
        ${userArticles.length?`<div class="profile-badge">${t('profile_writer')}</div>`:''}
        ${isMe?`<button class="profile-edit-btn" onclick="openProfileEdit()">${t('profile_edit')}</button>`:''}
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

