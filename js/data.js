// ════════════════════════════════════════════════════════════
// data.js — Configuration, état global, accès base de données
// ════════════════════════════════════════════════════════════

// ═══════════════ CONFIG ═══════════════
const VALID_CODES  = ["economist2026"]; // code permanent illimité
const ONE_TIME_CODES_PATH = 'access_codes';   // Firebase path for limited codes
const PASSWORD_RESETS_PATH = 'password_resets'; // Firebase path for recovery codes
const OWNER_EMAIL  = "theseeconomists@gmail.com"; // ⚠️ Changez ceci pour votre email admin
const MM = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// ═══════════════ STATE ═══════════════
let articles = [], users = [], currentUser = null, lastPublishedId = null;
let currentActiveCat = 'all';
let _db, _ref, _set, _get, _push, _remove, _onValue;
let fbReady = false;

// ═══════════════ FIREBASE INIT ═══════════════
document.addEventListener('fb-ready', () => {
  const fb = window._fb;
  _db = fb.db; _ref = fb.ref; _set = fb.set; _get = fb.get;
  _push = fb.push; _remove = fb.remove; _onValue = fb.onValue;
  fbReady = true;
  init();
});

// ═══════════════ DB HELPERS ═══════════════
async function dbGet(path) {
  const snap = await _get(_ref(_db, path));
  return snap.exists() ? snap.val() : null;
}
async function dbSet(path, val) {
  await _set(_ref(_db, path), val);
}
async function dbDelete(path) {
  await _remove(_ref(_db, path));
}

// ═══════════════ LOAD DATA ═══════════════
async function loadData() {
  const [arts, usrs] = await Promise.all([
    dbGet('articles'),
    dbGet('users')
  ]);
  articles = arts ? Object.values(arts) : [];
  // Normaliser : trier par id
  articles.sort((a,b) => (a.id||0) - (b.id||0));
  users    = usrs ? Object.values(usrs) : [];
}

async function saveArticle(a) {
  await dbSet(`articles/${a.id}`, a);
}
async function deleteArticleDB(id) {
  await dbDelete(`articles/${id}`);
}
// Clé Firebase = email encodé (les emails contiennent des caractères interdits comme "." et "@")
function userKey(email){
  return email.replace(/\./g,'_').replace(/@/g,'__at__');
}
async function saveUser(u) {
  await dbSet(`users/${userKey(u.email)}`, u);
}
async function deleteUserDB(email) {
  await dbDelete(`users/${userKey(email)}`);
}

// ═══════════════ SESSION ═══════════════
function saveLocalSession(email) { try{localStorage.setItem('eco_email',email);}catch(e){} }
function getLocalEmail()         { try{return localStorage.getItem('eco_email');}catch(e){return null;} }
function clearLocalSession()     { try{localStorage.removeItem('eco_email');}catch(e){} }

// ═══════════════ HELPERS ═══════════════
function today(){ const d=new Date(); return `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}`; }
function readTime(body){ const w=(body||'').trim().split(/\s+/).length; return `${Math.max(1,Math.round(w/200))} min`; }
function isOwner(){ return currentUser && currentUser.email.toLowerCase()===OWNER_EMAIL.toLowerCase(); }
function showToast(msg,dur=3200){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}
function avHtml(u,size=28){
  if(u&&u.avatar) return `<img src="${u.avatar}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1.5px solid var(--rouge)">`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--rouge);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:${size*0.4}px;color:white;flex-shrink:0">${((u&&u.first?u.first[0]:'')+((u&&u.last?u.last[0]:'')||'')).toUpperCase()||'?'}</div>`;
}
// Génère un code numérique à 6 chiffres (codes de vérification par e-mail)
function genVerifCode(){
  return String(Math.floor(100000 + Math.random()*900000));
}
