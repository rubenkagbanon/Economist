// ════════════════════════════════════════════════════════════
// auth.js — Connexion, inscription, profil, mot de passe oublié
// ════════════════════════════════════════════════════════════

// ═══════════════ AUTH ═══════════════
async function doLogin(){
  const btn=document.getElementById('btn-login');
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pwd  =document.getElementById('login-pwd').value;
  if(!email||!pwd)return;
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  await loadData(); // recharger depuis Supabase
  const u=users.find(u=>u.email===email&&u.pwd===pwd);
  btn.textContent='Se connecter';btn.disabled=false;
  if(!u){document.getElementById('login-err').style.display='block';return;}
  document.getElementById('login-err').style.display='none';
  currentUser=u; saveLocalSession(u.email);
  closeModal(); renderNav(); renderHome(currentActiveCat);
  showToast(`${t('toast_welcome')}, ${u.first} !`);
}

async function doSignup(){
  const btn=document.getElementById('btn-signup');
  const first=document.getElementById('su-first').value.trim();
  const last =document.getElementById('su-last').value.trim();
  const email=document.getElementById('su-email').value.trim().toLowerCase();
  const pwd  =document.getElementById('su-pwd').value;
  const pwd2 =document.getElementById('su-pwd2').value;
  const errEl=document.getElementById('su-err'),okEl=document.getElementById('su-ok');
  if(!first||!last||!email||!pwd||!pwd2){
    errEl.textContent=t('auth_err_fields');
    errEl.style.display='block';okEl.style.display='none';return;
  }
  if(pwd.length<8){
    errEl.textContent=t('auth_err_short');
    errEl.style.display='block';okEl.style.display='none';return;
  }
  if(pwd!==pwd2){
    errEl.textContent=t('auth_err_match');
    errEl.style.display='block';okEl.style.display='none';
    document.getElementById('su-pwd2').focus();return;
  }
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  await loadData();
  if(users.find(u=>u.email===email)){
    errEl.textContent=t('auth_err_email');errEl.style.display='block';okEl.style.display='none';
    btn.textContent=t('auth_btn_signup');btn.disabled=false;return;
  }
  const u={first,last,email,pwd,joined:today(),avatar:'',bio:''};
  users.push(u); await saveUser(u);
  currentUser=u; saveLocalSession(u.email);
  errEl.style.display='none';okEl.style.display='block';
  setTimeout(()=>{closeModal();renderNav();showToast(`${t('toast_created')}, ${first} !`);},1000);
  btn.textContent=t('auth_btn_signup');btn.disabled=false;
}

function doLogout(){
  currentUser=null;clearLocalSession();
  _writeUnlocked=false;editorBlocks=[];
  renderNav();showPage('home');showToast(t('toast_logout'));
}

// ═══════════════ PROFILE EDIT ═══════════════
let editAvatarBase64=null;
function openProfileEdit(){
  if(!currentUser)return; editAvatarBase64=null;
  const prev=document.getElementById('edit-avatar-preview');
  if(currentUser.avatar){prev.innerHTML=`<img src="${currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
  else{prev.textContent=(currentUser.first[0]+(currentUser.last[0]||'')).toUpperCase();prev.style.background='var(--rouge)';}
  document.getElementById('edit-bio').value=currentUser.bio||'';
  document.getElementById('profile-edit-modal').classList.add('open');
}
function closeProfileEdit(){ document.getElementById('profile-edit-modal').classList.remove('open'); }
document.getElementById('profile-edit-modal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeProfileEdit(); });
function handleAvatarUpload(e){
  const file=e.target.files[0]; if(!file)return;
  if(file.size>1.5*1024*1024){showToast('Image trop lourde (max 1.5Mo)');return;}
  const r=new FileReader();r.onload=ev=>{
    editAvatarBase64=ev.target.result;
    document.getElementById('edit-avatar-preview').innerHTML=`<img src="${editAvatarBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  };r.readAsDataURL(file);e.target.value='';
}
async function saveProfileEdit(){
  if(!currentUser)return;
  const bio=document.getElementById('edit-bio').value.trim();
  const idx=users.findIndex(u=>u.email===currentUser.email); if(idx===-1)return;
  if(editAvatarBase64) users[idx].avatar=editAvatarBase64;
  users[idx].bio=bio;
  currentUser=users[idx];
  saveLocalSession(currentUser.email);
  await saveUser(currentUser);
  closeProfileEdit();renderNav();openProfile(currentUser.email);
  showToast(t('toast_profile'));
}

// ═══════════════════════════════════════════════════════════
// MOT DE PASSE OUBLIÉ — récupération par e-mail + code
// ═══════════════════════════════════════════════════════════
// Étape 1 : la personne entre son e-mail → on génère un code à 6
//           chiffres, on le stocke dans Supabase (valable 15 min)
//           et on l'envoie par e-mail via EmailJS (js/email.js).
// Étape 2 : la personne entre le code reçu + un nouveau mot de
//           passe → on vérifie le code puis on met à jour le compte.
// ═══════════════════════════════════════════════════════════
let _resetEmail=null;

function openForgotPwd(){
  switchAuthPanel('forgot');
  const tabsEl=document.querySelector('.modal-tabs'); if(tabsEl)tabsEl.style.display='none';
  document.getElementById('fp-step1').style.display='block';
  document.getElementById('fp-step2').style.display='none';
  document.getElementById('fp-email').value='';
  document.getElementById('fp-err').style.display='none';
}

function switchAuthPanel(panel){
  document.querySelectorAll('.modal-panel').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById('tab-'+panel);
  if(el)el.classList.add('active');
}

async function sendResetCode(){
  const btn=document.getElementById('btn-fp-send');
  const email=document.getElementById('fp-email').value.trim().toLowerCase();
  const errEl=document.getElementById('fp-err');
  errEl.style.display='none';
  if(!email){errEl.textContent='Entrez votre e-mail.';errEl.style.display='block';return;}
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  await loadData();
  const u=users.find(x=>x.email===email);
  if(!u){
    errEl.textContent='Aucun compte associé à cet e-mail.';errEl.style.display='block';
    btn.textContent='Envoyer le code';btn.disabled=false;return;
  }
  const code=genVerifCode();
  const expires=Date.now()+15*60*1000; // 15 minutes
  await dbSet(`${PASSWORD_RESETS_PATH}/${userKey(email)}`,{code,expires,used:false});
  const sent=await emailSendVerificationCode(email,u.first,code,'reset');
  _resetEmail=email;
  document.getElementById('fp-step1').style.display='none';
  document.getElementById('fp-step2').style.display='block';
  document.getElementById('fp-email-shown').textContent=email;
  btn.textContent='Envoyer le code';btn.disabled=false;
  showToast(sent?'Code envoyé par e-mail !':'E-mail non configuré — voir la console.');
}

async function confirmResetPwd(){
  const btn=document.getElementById('btn-fp-confirm');
  const code=document.getElementById('fp-code').value.trim();
  const pwd=document.getElementById('fp-new-pwd').value;
  const pwd2=document.getElementById('fp-new-pwd2').value;
  const errEl=document.getElementById('fp-err2');
  errEl.style.display='none';
  if(!code||!pwd||!pwd2){errEl.textContent='Remplissez tous les champs.';errEl.style.display='block';return;}
  if(pwd.length<8){errEl.textContent='8 caractères minimum.';errEl.style.display='block';return;}
  if(pwd!==pwd2){errEl.textContent='Les mots de passe ne correspondent pas.';errEl.style.display='block';return;}
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  const record=await dbGet(`${PASSWORD_RESETS_PATH}/${userKey(_resetEmail)}`);
  if(!record||record.used||record.code!==code||Date.now()>record.expires){
    errEl.textContent='Code incorrect ou expiré. Redemandez un code.';errEl.style.display='block';
    btn.textContent='Réinitialiser';btn.disabled=false;return;
  }
  await loadData();
  const idx=users.findIndex(x=>x.email===_resetEmail);
  if(idx===-1){errEl.textContent='Compte introuvable.';errEl.style.display='block';btn.textContent='Réinitialiser';btn.disabled=false;return;}
  users[idx].pwd=pwd;
  await saveUser(users[idx]);
  await dbSet(`${PASSWORD_RESETS_PATH}/${userKey(_resetEmail)}`,{...record,used:true});
  showToast('Mot de passe mis à jour ! Connectez-vous.');
  closeModal();
  openModal('login');
}
