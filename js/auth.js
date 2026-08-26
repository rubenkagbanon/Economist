// ════════════════════════════════════════════════════════════
// auth.js — Connexion, inscription, profil, mot de passe oublié
// ════════════════════════════════════════════════════════════

// ═══════════════ AUTH ═══════════════
function getAuthRedirectUrl(){
  if(window.location.protocol==='file:')return window.location.href.split('#')[0];
  return 'https://www.econglobe.com/';
}

async function profileFromAuthUser(authUser){
  const email=(authUser?.email||'').trim().toLowerCase();
  if(!email)return null;
  await loadData(true);
  let user=users.find(item=>(item.email||'').toLowerCase()===email);
  const meta=authUser.user_metadata||{};
  if(!user){
    const fullName=(meta.full_name||meta.name||email.split('@')[0]).trim();
    const parts=fullName.split(/\s+/).filter(Boolean);
    user={id:authUser.id,first:parts[0]||'Utilisateur',last:parts.slice(1).join(' ')||'',email,joined:today(),avatar:meta.avatar_url||'',bio:'',level:'',authProvider:'supabase'};
    users.push(user);
    await saveUser(user);
  } else if(!user.id){
    user.id=authUser.id;
    await saveUser(user);
  }
  currentUser=user;
  saveLocalSession(email);
  return user;
}

async function doLogin(){
  const btn=document.getElementById('btn-login');
  const email=document.getElementById('login-email').value.trim().toLowerCase();
  const pwd  =document.getElementById('login-pwd').value;
  if(!email||!pwd)return;
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  const {data,error}=await _sb.auth.signInWithPassword({email,password:pwd});
  btn.textContent='Se connecter';btn.disabled=false;
  if(error||!data.user){document.getElementById('login-err').style.display='block';return;}
  const u=await profileFromAuthUser(data.user);
  document.getElementById('login-err').style.display='none';
  closeModal(); renderNav(); renderHome(currentActiveCat);
  showToast(`${t('toast_welcome')}, ${u.first} !`);
}

async function savePassword(){
  if(!currentUser||!_sb?.auth)return;
  const btn=document.getElementById('btn-password');
  const errEl=document.getElementById('password-err');
  const pwd=document.getElementById('new-password').value;
  const pwd2=document.getElementById('confirm-password').value;
  errEl.style.display='none';
  if(!pwd||!pwd2){errEl.textContent=t('auth_err_fields');errEl.style.display='block';return;}
  if(pwd.length<8){errEl.textContent=t('auth_err_short');errEl.style.display='block';return;}
  if(pwd!==pwd2){errEl.textContent=t('auth_err_match');errEl.style.display='block';return;}
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  const {error}=await _sb.auth.updateUser({password:pwd});
  btn.textContent='Enregistrer le mot de passe';btn.disabled=false;
  if(error){errEl.textContent=error.message||"Impossible d'enregistrer le mot de passe.";errEl.style.display='block';return;}
  showToast('Mot de passe enregistré.');closeModal();
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
  const {data,error}=await _sb.auth.signUp({email,password:pwd,options:{
    data:{full_name:`${first} ${last}`},
    emailRedirectTo:getAuthRedirectUrl()
  }});
  if(error){
    errEl.textContent=error.message||t('auth_err_email');errEl.style.display='block';okEl.style.display='none';
    btn.textContent=t('auth_btn_signup');btn.disabled=false;return;
  }
  const u=data.user && data.session ? await profileFromAuthUser(data.user) : {first};
  if(data.session) emailSendWelcome(email,first);
  errEl.style.display='none';
  okEl.textContent=data.session ? t('auth_ok_created') : t('auth_ok_confirmation');
  okEl.style.display='block';
  setTimeout(()=>{
    closeModal();
    if(data.session){renderNav();showToast(`${t('toast_created')}, ${u.first} !`);}
  },1000);
  btn.textContent=t('auth_btn_signup');btn.disabled=false;
}

async function syncGoogleUserFromSession(session){
  if(!session || !session.user) return null;
  const email=(session.user.email||'').trim().toLowerCase();
  if(!email) return null;
  await loadData();
  const meta=session.user.user_metadata || {};
  const fullName=(meta.full_name || meta.name || email.split('@')[0] || 'Google User').trim();
  const nameParts=fullName.split(/\s+/).filter(Boolean);
  const first=nameParts[0] || 'Google';
  const last=nameParts.slice(1).join(' ') || 'User';
  const avatar=meta.avatar_url || '';

  let u = users.find(x => String(x.id||'') === String(session.user.id)) ||
    users.find(x => (x.email||'').toLowerCase() === email);
  if(!u){
    u={id:session.user.id,first,last,email,joined:today(),avatar,bio:'',level:'',authProvider:'google'};
    users.push(u);
    await saveUser(u);
  } else {
    let changed = false;
    if(!u.id){u.id=session.user.id;changed=true;}
    if(changed) await saveUser(u);
  }

  currentUser = u;
  saveLocalSession(email);
  return u;
}

async function syncAuthUserFromSession(session){
  const provider=session?.user?.app_metadata?.provider;
  if(provider==='google')return syncGoogleUserFromSession(session);
  return profileFromAuthUser(session?.user);
}

async function doGoogleAuth(mode='login'){
  const btn=document.getElementById(mode==='signup' ? 'btn-google-signup' : 'btn-google-login');
  const label = mode==='signup' ? 'Créer mon compte avec Google' : 'Se connecter avec Google';
  if(btn){
    btn.disabled=true;
    btn.innerHTML='<span class="spinner"></span>…';
  }

  try{
    if(!_sb || !_sb.auth){ throw new Error('Supabase Auth indisponible.'); }
    const redirectTo = getAuthRedirectUrl();
    const { data, error } = await _sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if(error) throw error;
    if(data && data.session){
      await syncGoogleUserFromSession(data.session);
      closeModal(); renderNav(); renderHome(currentActiveCat);
      showToast(`${t('toast_welcome')}, ${currentUser.first} !`);
      return;
    }
    if(data && data.url){
      window.location.href = data.url;
      return;
    }
    throw new Error('Impossible de démarrer la connexion Google.');
  } catch(err){
    console.error('Google OAuth error:', err);
    showToast(t('toast_google_error'));
  } finally{
    if(btn){
      btn.disabled=false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;display:block"><path fill="#EA4335" d="M12 10.2v3.7h5.2c-.2 1.3-1.6 3.7-5.2 3.7-3.1 0-5.6-2.6-5.6-5.7s2.5-5.7 5.6-5.7c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.3 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 11.5-4.8 11.5-11.5 0-.8-.1-1.5-.2-2.1H12z"/><path fill="#34A853" d="M3.9 7.4l3.4 2.5c.9-1.7 2.9-2.9 4.7-2.9 1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.3 14.7 2.5 12 2.5c-3.4 0-6.3 1.8-8.1 4.9z"/><path fill="#FBBC05" d="M12 21.5c2.8 0 5.1-.9 6.8-2.5l-3.1-2.6c-.9.6-2.1 1-3.7 1-3.6 0-4.9-2.5-5.2-3.7l-3.3 2.6C2.9 18.8 7 21.5 12 21.5z"/><path fill="#4285F4" d="M3.9 7.4c-.4.8-.7 1.8-.7 3.1s.3 2.3.7 3.1l3.4-2.5c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6L3.9 7.4z"/></svg> ${label}`;
    }
  }
}

async function doLogout(){
  try{ if(_sb && _sb.auth){ await _sb.auth.signOut(); } }catch(e){ console.error('Google logout error:', e); }
  currentUser=null;clearLocalSession();
  _writeUnlocked=false;editorBlocks=[];
  renderNav();showPage('home');maybeShowOnboarding();showToast(t('toast_logout'));
}

// ═══════════════ PROFILE EDIT ═══════════════
let editAvatarBase64=null;
function openProfileEdit(){
  if(!currentUser)return; editAvatarBase64=null;
  const prev=document.getElementById('edit-avatar-preview');
  if(currentUser.avatar){prev.innerHTML=`<img src="${currentUser.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
  else{prev.textContent=(currentUser.first[0]+(currentUser.last[0]||'')).toUpperCase();prev.style.background='var(--rouge)';}
  document.getElementById('edit-first').value=currentUser.first||'';
  document.getElementById('edit-last').value=currentUser.last||'';
  document.getElementById('edit-bio').value=currentUser.bio||'';
  const selectedLevel=document.querySelector(`input[name="profile-level"][value="${currentUser.level||''}"]`);
  document.querySelectorAll('input[name="profile-level"]').forEach(input=>{ input.checked=input===selectedLevel; });
  updateEditAvatarLevel(currentUser.level||'');
  document.getElementById('profile-edit-modal').classList.add('open');
}
function closeProfileEdit(){ document.getElementById('profile-edit-modal').classList.remove('open'); }
document.getElementById('profile-edit-modal').addEventListener('click',e=>{ if(e.target===e.currentTarget) closeProfileEdit(); });
function handleAvatarUpload(e){
  const file=e.target.files[0]; if(!file)return;
  if(file.size>4*1024*1024){showToast(t('toast_image_too_large'));return;}
  const image=new Image();
  image.onload=()=>{
    const maxSize=800;
    const scale=Math.min(1,maxSize/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
      if(!blob){showToast(t('toast_image_compress_error'));return;}
      const reader=new FileReader();
      reader.onload=ev=>{
        editAvatarBase64=ev.target.result;
        document.getElementById('edit-avatar-preview').innerHTML=`<img src="${editAvatarBase64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      };
      reader.readAsDataURL(blob);
    },'image/jpeg',.82);
    URL.revokeObjectURL(image.src);
  };
  image.onerror=()=>showToast(t('toast_invalid_image'));
  image.src=URL.createObjectURL(file);
  e.target.value='';
}
function updateEditAvatarLevel(level){
  const preview=document.getElementById('edit-avatar-preview');
  if(!preview)return;
  preview.classList.remove('profile-level-licence','profile-level-master','profile-level-doctorat','profile-level-professor');
  if(level)preview.classList.add(`profile-level-${level}`);
}
async function saveProfileEdit(){
  if(!currentUser)return;
  const first=document.getElementById('edit-first').value.trim();
  const last=document.getElementById('edit-last').value.trim();
  const bio=document.getElementById('edit-bio').value.trim();
  const level=document.querySelector('input[name="profile-level"]:checked')?.value||'';
  if(!first||!last){showToast(t('toast_profile_required'));return;}
  const currentEmail=(currentUser.email||'').trim().toLowerCase();
  const idx=users.findIndex(u=>(u.email||'').trim().toLowerCase()===currentEmail); if(idx===-1)return;
  const oldAuthor=`${users[idx].first} ${users[idx].last}`;
  const newAuthor=`${first} ${last}`;
  const updatedUser={...users[idx],first,last,bio,level};
  if(editAvatarBase64)updatedUser.avatar=editAvatarBase64;
  const profileError=await saveUser(updatedUser);
  if(profileError){showToast(t('toast_profile_save_error'));return;}
  users[idx]=updatedUser;
  currentUser=updatedUser;
  saveLocalSession(currentUser.email);
  writeDataCache();
  const authorInput=document.getElementById('f-author');
  if(authorInput && document.getElementById('page-write')?.classList.contains('active')){
    authorInput.value=newAuthor;
    saveDraft();
  }
  const normalizedOldAuthor=oldAuthor.trim().replace(/\s+/g,' ').toLowerCase();
  const authoredArticles=articles.filter(article=>
    (article.owner_id && currentUser.id && String(article.owner_id)===String(currentUser.id)) ||
    (article.author||'').trim().replace(/\s+/g,' ').toLowerCase()===normalizedOldAuthor
  );
  const articlesToUpdate=authoredArticles.filter(article=>article.author!==newAuthor);
  articlesToUpdate.forEach(article=>{article.author=newAuthor;});
  const articleErrors=await Promise.all(articlesToUpdate.map(article=>saveArticle(article)));

  closeProfileEdit();
  renderNav();
  openProfile(currentUser.email);
  if(document.getElementById('page-home')?.classList.contains('active'))renderHome(currentActiveCat);
  if(document.getElementById('page-mystats')?.classList.contains('active'))renderMyStats();
  if(articleErrors.some(Boolean)){
    showToast(t('toast_articles_update_error'));
    return;
  }
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
  if(!email){errEl.textContent=t('toast_enter_email');errEl.style.display='block';return;}
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  await loadData();
  const u=users.find(x=>x.email===email);
  if(!u){
    errEl.textContent=t('toast_account_missing');errEl.style.display='block';
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
  showToast(sent?t('toast_reset_email_sent'):t('toast_email_not_configured'));
}

async function confirmResetPwd(){
  const btn=document.getElementById('btn-fp-confirm');
  const code=document.getElementById('fp-code').value.trim();
  const pwd=document.getElementById('fp-new-pwd').value;
  const pwd2=document.getElementById('fp-new-pwd2').value;
  const errEl=document.getElementById('fp-err2');
  errEl.style.display='none';
  if(!code||!pwd||!pwd2){errEl.textContent=t('auth_err_fields');errEl.style.display='block';return;}
  if(pwd.length<8){errEl.textContent=t('auth_err_short');errEl.style.display='block';return;}
  if(pwd!==pwd2){errEl.textContent=t('auth_err_match');errEl.style.display='block';return;}
  btn.innerHTML='<span class="spinner"></span>…';btn.disabled=true;
  const record=await dbGet(`${PASSWORD_RESETS_PATH}/${userKey(_resetEmail)}`);
  if(!record||record.used||record.code!==code||Date.now()>record.expires){
    errEl.textContent=t('code_expired');errEl.style.display='block';
    btn.textContent='Réinitialiser';btn.disabled=false;return;
  }
  await loadData();
  const idx=users.findIndex(x=>x.email===_resetEmail);
  if(idx===-1){errEl.textContent=t('account_not_found');errEl.style.display='block';btn.textContent='Réinitialiser';btn.disabled=false;return;}
  users[idx].pwd=pwd;
  await saveUser(users[idx]);
  await dbSet(`${PASSWORD_RESETS_PATH}/${userKey(_resetEmail)}`,{...record,used:true});
  showToast(t('toast_password_updated'));
  closeModal();
  openModal('login');
}
