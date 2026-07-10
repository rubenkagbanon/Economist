// ════════════════════════════════════════════════════════════
// data.js — Configuration, état global, accès base de données
// ════════════════════════════════════════════════════════════

// ═══════════════ CONFIG ═══════════════
const VALID_CODES  = ["economist2026"]; // code permanent illimité
const ONE_TIME_CODES_PATH = 'access_codes';   // Supabase path (kv_store) for limited codes
const PASSWORD_RESETS_PATH = 'password_resets'; // Supabase path (kv_store) for recovery codes
const OWNER_EMAIL  = "rubenkagbanon@gmail.com"; // ⚠️ Changez ceci pour votre email admin
const MM = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// ═══════════════ STATE ═══════════════
let articles = [], users = [], currentUser = null, lastPublishedId = null;
let currentActiveCat = 'all';
let _sb;
let dbReady = false;

// ═══════════════ SUPABASE INIT ═══════════════
document.addEventListener('db-ready', () => {
  _sb = window._sb;
  dbReady = true;
  init();
});

// ═══════════════ DB HELPERS ═══════════════
// Émule l'arbre de chemins de l'ancienne base Firebase au-dessus d'une
// simple table Postgres `kv_store(path text primary key, value jsonb)` :
// dbGet('articles') renvoie l'objet {id: article, ...} de toutes les
// lignes dont le path commence par "articles/", comme le faisait Firebase.
const KV_TABLE = 'kv_store';

async function dbGet(path) {
  const { data: row, error } = await _sb.from(KV_TABLE).select('value').eq('path', path).maybeSingle();
  if (error) { console.error('dbGet', path, error); return null; }
  if (row) return row.value;
  const { data: rows, error: err2 } = await _sb.from(KV_TABLE).select('path,value').like('path', `${path}/%`);
  if (err2) { console.error('dbGet', path, err2); return null; }
  if (!rows || !rows.length) return null;
  const out = {};
  rows.forEach(r => { out[r.path.slice(path.length + 1)] = r.value; });
  return out;
}
async function dbSet(path, val) {
  const { error } = await _sb.from(KV_TABLE).upsert({ path, value: val });
  if (error) console.error('dbSet', path, error);
}
async function dbDelete(path) {
  const { error: e1 } = await _sb.from(KV_TABLE).delete().eq('path', path);
  const { error: e2 } = await _sb.from(KV_TABLE).delete().like('path', `${path}/%`);
  if (e1) console.error('dbDelete', path, e1);
  if (e2) console.error('dbDelete', path, e2);
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
// Clé de path = email encodé (les emails contiennent des caractères interdits par certains systèmes, comme "." et "@")
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
