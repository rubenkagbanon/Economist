// ════════════════════════════════════════════════════════════
// admin.js — Espace administrateur (contrôle manuel du back-office)
// ════════════════════════════════════════════════════════════
// Accessible uniquement au compte dont l'email correspond à
// OWNER_EMAIL (voir js/data.js). Permet de :
//  - suivre les statistiques globales
//  - créer / supprimer des codes d'accès rédacteur
//  - voir les propositions d'articles reçues et leur envoyer
//    un code d'accès par e-mail en un clic
//  - gérer manuellement articles et membres (suppression)
// ════════════════════════════════════════════════════════════

function renderAdmin(){
  const el=document.getElementById('admin-content');
  if(!isOwner()){el.innerHTML=`<div style="border:.5px solid var(--gris-clair);border-left:3px solid var(--rouge);padding:2.5rem;max-width:440px"><p style="font-family:var(--sans);font-size:.9rem;color:var(--txt-soft);margin-bottom:1.2rem;font-weight:300">${t('admin_access')}</p><button class="btn-red" onclick="openModal('login')">${t('admin_btn_login')}</button></div>`;return;}
  const totalReads=articles.reduce((s,a)=>s+(a.reads||0),0);
  el.innerHTML=`<div class="admin-badge">${t('admin_badge')}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1.2rem;margin-bottom:3rem">
      <div class="my-stat-card"><div class="my-stat-num">${articles.length}</div><div class="my-stat-label">${t('stats_articles')}</div></div>
      <div class="my-stat-card"><div class="my-stat-num">${users.length}</div><div class="my-stat-label">${t('admin_members')}</div></div>
      <div class="my-stat-card"><div class="my-stat-num">${totalReads}</div><div class="my-stat-label">${t('stats_reads')}</div></div>
    </div>

    <div class="stats-section-title">✉ Envoyer un code manuellement</div>
    <div style="border:.5px solid var(--gris-clair);padding:1.5rem;margin-bottom:3rem;max-width:520px">
      <p style="font-family:var(--sans);font-size:.85rem;color:var(--txt-mut);margin-bottom:1.2rem;line-height:1.65;font-weight:300">Contrôle manuel : envoyez un code d'accès rédacteur directement à n'importe quelle adresse e-mail, sans passer par une proposition.</p>
      <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:.3rem;flex:1;min-width:200px">
          <label style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gris)">E-mail destinataire</label>
          <input type="email" id="manual-code-email" placeholder="personne@email.com" style="font-family:var(--sans);font-size:.9rem;border:.5px solid var(--gris-clair);padding:.55rem .9rem;outline:none;width:100%">
        </div>
        <button class="btn-red" onclick="adminSendManualCode()" style="padding:10px 18px;white-space:nowrap">Générer et envoyer</button>
      </div>
    </div>

    <div class="stats-section-title">📩 Propositions reçues</div>
    <div id="admin-proposals-list" style="margin-bottom:3rem;font-family:var(--sans);font-size:.85rem;color:var(--txt-lite);font-style:italic">${t('admin_loading')}</div>

    <div class="stats-section-title">${t('admin_codes')}</div>
    <div style="border:.5px solid var(--gris-clair);padding:1.5rem;margin-bottom:3rem;max-width:520px">
      <p style="font-family:var(--sans);font-size:.85rem;color:var(--txt-mut);margin-bottom:1.2rem;line-height:1.65;font-weight:300">Créez des codes à usage limité (max 2 utilisations par défaut). Le code <strong>economist2026</strong> reste permanent et illimité.</p>
      <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:flex-end;margin-bottom:1rem">
        <div style="display:flex;flex-direction:column;gap:.3rem;flex:1">
          <label style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gris)">${t('admin_new_code')}</label>
          <input type="text" id="new-code-val" placeholder="${t('admin_new_code_ph')}" style="font-family:var(--sans);font-size:.9rem;border:.5px solid var(--gris-clair);padding:.55rem .9rem;outline:none;width:100%">
        </div>
        <div style="display:flex;flex-direction:column;gap:.3rem">
          <label style="font-family:var(--sans);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gris)">${t('admin_max')}</label>
          <input type="number" id="new-code-max" value="2" min="1" max="99" style="font-family:var(--sans);font-size:.9rem;border:.5px solid var(--gris-clair);padding:.55rem .9rem;outline:none;width:80px">
        </div>
        <button class="btn-red" onclick="adminAddCode()" style="padding:10px 18px;white-space:nowrap">${t('admin_create')}</button>
      </div>
      <div id="admin-codes-list" style="font-family:var(--sans);font-size:.85rem;color:var(--txt-lite);font-style:italic">${t('admin_loading')}</div>
    </div>

    <div class="stats-section-title">${t('admin_arts')}</div>
    ${articles.length?`<div style="overflow-x:auto;margin-bottom:3rem"><table class="stats-table"><thead><tr><th>${t('admin_table_titre')}</th><th>${t('admin_table_auteur')}</th><th>${t('admin_table_cat')}</th><th>${t('admin_table_date')}</th><th>${t('admin_table_reads')}</th><th>${t('admin_table_action')}</th></tr></thead><tbody>
      ${[...articles].reverse().map(a=>`<tr><td><span class="td-title" onclick="openArticle(${a.id})">${a.title}</span></td><td>${a.author}</td><td><span class="stats-cat-badge">${tCat(a.cat)}</span></td><td>${tDate(a.date)}</td><td><strong style="color:var(--rouge)">${a.reads||0}</strong></td><td><button class="btn-danger" onclick="confirmDeleteArticle(${a.id})">${t('admin_delete')}</button></td></tr>`).join('')}
      </tbody></table></div>`:`<div style="font-family:var(--sans);font-size:.9rem;color:var(--txt-pale);font-style:italic;margin-bottom:2rem">${t('admin_none_art')}</div>`}
    <div class="stats-section-title">${t('admin_members')}</div>
    ${users.length?`<div style="overflow-x:auto"><table class="stats-table"><thead><tr><th>${t('admin_member_name')}</th><th>${t('admin_member_email')}</th><th>${t('admin_member_joined')}</th><th>${t('admin_member_arts')}</th><th>${t('admin_member_profile')}</th><th>Action</th></tr></thead><tbody>
      ${users.map(u=>{const c=articles.filter(a=>a.author===u.first+' '+u.last).length;return `<tr><td>${u.first} ${u.last}</td><td style="color:var(--gris);font-family:var(--sans);font-size:.85rem">${u.email}</td><td style="font-family:var(--sans);font-size:.85rem">${u.joined||'—'}</td><td>${c}</td><td><span style="font-family:var(--sans);font-size:9.5px;color:var(--rouge);cursor:pointer;text-decoration:underline" onclick="showPage('profile');openProfile('${u.email}')">${t('admin_view')}</span></td><td>${u.email.toLowerCase()===OWNER_EMAIL.toLowerCase()?'':`<button class="btn-danger" onclick="adminDeleteUser('${u.email}')">Supprimer</button>`}</td></tr>`;}).join('')}
      </tbody></table></div>`:`<div style="font-family:var(--sans);font-size:.9rem;color:var(--txt-pale);font-style:italic">${t('admin_none_members')}</div>`}`;
  loadAdminCodes();
  loadAdminProposals();
}

// ═══════════════ CODES D'ACCÈS ═══════════════
async function loadAdminCodes(){
  const el=document.getElementById('admin-codes-list');if(!el)return;
  const codes=await dbGet(ONE_TIME_CODES_PATH);
  if(!codes){el.textContent='Aucun code créé.';el.style.fontStyle='italic';return;}
  const rows=Object.entries(codes).map(([k,v])=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:.5px solid var(--gris-clair);gap:.8rem;flex-wrap:wrap">
      <div>
        <span style="font-family:var(--sans);font-weight:500;color:var(--noir);letter-spacing:.05em">${v.code||k}</span>
        <span style="font-family:var(--sans);font-size:.78rem;color:var(--gris);margin-left:.8rem">${v.used||0} / ${v.max||2} utilisations</span>
        ${v.forEmail?`<span style="font-family:var(--sans);font-size:.75rem;color:var(--txt-pale);margin-left:.6rem">→ ${v.forEmail}</span>`:''}
      </div>
      <div style="display:flex;gap:.5rem;align-items:center">
        ${(v.used||0)>=(v.max||2)?'<span style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--txt-pale)">Épuisé</span>':'<span style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#4a9a5a">Actif</span>'}
        <button class="btn-danger" onclick="adminDeleteCode('${k}')">✕</button>
      </div>
    </div>`).join('');
  el.innerHTML=rows||'<span>Aucun code créé.</span>';el.style.fontStyle='normal';
}

async function adminAddCode(){
  const val=document.getElementById('new-code-val').value.trim();
  const max=parseInt(document.getElementById('new-code-max').value)||2;
  if(!val){showToast('Entrez un code.');return;}
  const key=val.replace(/[^a-zA-Z0-9]/g,'_');
  const existing=await dbGet(`${ONE_TIME_CODES_PATH}/${key}`);
  if(existing){showToast('Ce code existe déjà.');return;}
  await dbSet(`${ONE_TIME_CODES_PATH}/${key}`,{code:val,max,used:0});
  document.getElementById('new-code-val').value='';
  showToast(`Code "${val}" créé (max ${max} utilisations).`);
  loadAdminCodes();
}

async function adminDeleteCode(key){
  if(!confirm('Supprimer ce code ?'))return;
  await dbDelete(`${ONE_TIME_CODES_PATH}/${key}`);
  showToast(t('toast_del_code'));
  loadAdminCodes();
}

// Génère un code, l'enregistre comme code à usage unique et l'envoie par e-mail
async function adminSendManualCode(){
  const emailEl=document.getElementById('manual-code-email');
  const email=emailEl.value.trim().toLowerCase();
  if(!email){showToast('Entrez un e-mail.');return;}
  const code=genVerifCode();
  const key=code;
  await dbSet(`${ONE_TIME_CODES_PATH}/${key}`,{code,max:1,used:0,forEmail:email});
  const sent=await emailSendVerificationCode(email,'',code,'access');
  showToast(sent?`Code envoyé à ${email}.`:'E-mail non configuré (voir js/email.js). Code créé: '+code);
  emailEl.value='';
  loadAdminCodes();
}

// ═══════════════ PROPOSITIONS D'ARTICLES ═══════════════
async function loadAdminProposals(){
  const el=document.getElementById('admin-proposals-list');if(!el)return;
  const props=await dbGet('proposals');
  if(!props){el.textContent='Aucune proposition reçue.';el.style.fontStyle='italic';return;}
  const entries=Object.entries(props).sort((a,b)=>(b[1].ts||0)-(a[1].ts||0));
  el.style.fontStyle='normal';
  el.innerHTML=entries.map(([id,p])=>`
    <div style="border:.5px solid var(--gris-clair);padding:1.2rem 1.4rem;margin-bottom:.8rem">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.5rem">
        <div>
          <strong style="font-family:var(--serif);font-size:1.05rem;font-weight:400">${p.first} ${p.last}</strong>
          <span style="font-family:var(--sans);font-size:.8rem;color:var(--txt-mut);margin-left:.6rem">${p.email}</span>
        </div>
        <span class="stats-cat-badge">${p.cat||''}</span>
      </div>
      <div style="font-family:var(--sans);font-size:.85rem;color:var(--txt-soft);line-height:1.6;margin-bottom:.8rem">${p.subj||''}</div>
      <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
        ${p.status==='sent'?'<span style="font-family:var(--sans);font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#4a9a5a">Code envoyé</span>':`<button class="btn-red" style="padding:6px 14px;font-size:9.5px" onclick="adminApproveProposal('${id}','${p.email}','${p.first}')">Envoyer un code d'accès</button>`}
        <button class="btn-danger" onclick="adminDeleteProposal('${id}')">Supprimer</button>
      </div>
    </div>`).join('');
}

async function adminApproveProposal(id,email,firstName){
  const code=genVerifCode();
  await dbSet(`${ONE_TIME_CODES_PATH}/${code}`,{code,max:1,used:0,forEmail:email});
  const sent=await emailSendVerificationCode(email,firstName,code,'access');
  const prop=await dbGet(`proposals/${id}`);
  await dbSet(`proposals/${id}`,{...prop,status:'sent'});
  showToast(sent?`Code envoyé à ${email}.`:'E-mail non configuré — code créé: '+code);
  loadAdminProposals();loadAdminCodes();
}
async function adminDeleteProposal(id){
  if(!confirm('Supprimer cette proposition ?'))return;
  await dbDelete(`proposals/${id}`);
  loadAdminProposals();
}

// ═══════════════ GESTION DES MEMBRES ═══════════════
async function adminDeleteUser(email){
  if(!confirm(`Supprimer définitivement le compte ${email} ?`))return;
  await deleteUserDB(email);
  users=users.filter(u=>u.email!==email);
  showToast('Compte supprimé.');
  renderAdmin();
}
