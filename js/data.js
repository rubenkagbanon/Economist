// ════════════════════════════════════════════════════════════
// data.js — Configuration, état global, accès base de données
// ════════════════════════════════════════════════════════════

// ═══════════════ CONFIG ═══════════════
const ONE_TIME_CODES_PATH = 'access_codes';   // Supabase path (kv_store) for limited codes
const PASSWORD_RESETS_PATH = 'password_resets'; // Supabase path (kv_store) for recovery codes
const WRITER_SESSIONS_PATH = 'writer_sessions';
const OWNER_EMAIL  = "econglobe26@gmail.com"; //  Changez ceci pour votre email admin
const MM = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// ═══════════════ STATE ═══════════════
let articles = [], users = [], currentUser = null, lastPublishedId = null;
let currentActiveCat = 'all';
let _sb;
let dbReady = false;
let dataLoaded = false;
let dataLoadPromise = null;
const DATA_CACHE_KEY = 'economist_public_data_cache_v2'; // v2 : sans images base64
try{ localStorage.removeItem('economist_public_data_cache_v1'); }catch(e){}
const DATA_CACHE_TTL = 10 * 60 * 1000;
const DATA_REFRESH_MIN_AGE = 60 * 1000;

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

function applyData(arts, usrs){
  articles = arts ? Object.values(arts).map(article=>({...article,status:article.status||'published'})) : [];
  articles.sort((a,b) => (a.id||0) - (b.id||0));
  users = usrs ? Object.values(usrs) : [];
}
function readDataCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(DATA_CACHE_KEY)||'null');
    if(!cached || Date.now()-cached.savedAt>DATA_CACHE_TTL)return null;
    return cached;
  }catch(e){ return null; }
}
function writeDataCache(){
  try{ localStorage.setItem(DATA_CACHE_KEY,JSON.stringify({savedAt:Date.now(),articles,users})); }catch(e){}
}
// Performance : la liste des articles ne contient NI les images base64 (souvent
// plusieurs Mo) NI le HTML du corps. Les couvertures base64 sont servies par les
// JPEG compressés générés par scripts/build-seo.mjs (/article/<slug>/cover.jpg) ;
// le contenu complet n'est chargé qu'à l'ouverture d'un article (loadArticleFull).
async function fetchData(){
  const visible=q=>isOwner()?q:q.or('status.eq.published,status.is.null');
  const [
    {data:articleRows,error:articleError},
    {data:userRows,error:userError},
    {data:urlImgRows},
    {data:dataImgRows}
  ]=await Promise.all([
    visible(_sb.from('articles').select('id, owner_id, title, deck, cat, author, body, date, reads, status, lang').order('id')),
    _sb.from('profiles').select('id, email, first, last, joined, avatar, bio, level, auth_provider'),
    visible(_sb.from('articles').select('id, img').not('img','is',null).not('img','like','data:%')),
    visible(_sb.from('articles').select('id').like('img','data:%'))
  ]);
  if(articleError||userError)throw articleError||userError;
  const urlImgs=new Map((urlImgRows||[]).map(r=>[String(r.id),r.img]));
  const dataImgIds=new Set((dataImgRows||[]).map(r=>String(r.id)));
  const arts={},usrs={};
  articleRows.forEach(row=>{
    const art={...row,status:row.status||'published',fullLoaded:false};
    if(urlImgs.has(String(row.id))) art.img=urlImgs.get(String(row.id));
    else if(dataImgIds.has(String(row.id))){ art.img=`${articlePath(art)}cover.jpg`; art.imgStatic=true; }
    else art.img='';
    arts[row.id]=art;
  });
  userRows.forEach(row=>{usrs[row.email]={...row,authProvider:row.auth_provider};});
  applyData(arts, usrs);
  dataLoaded=true;
  writeDataCache();
}

async function dbGet(path) {
  const { data: row, error } = await _sb.from(KV_TABLE).select('value').eq('path', path).maybeSingle();
  if (error) { console.error('dbGet', path, error); return null; }
  if (row) return row.value;
  const { data: rows, error: err2 } = await _sb.from(KV_TABLE).select('path,value').like('path', `${path}/%`).limit(200);
  if (err2) { console.error('dbGet', path, err2); return null; }
  if (!rows || !rows.length) return null;
  const out = {};
  rows.forEach(r => { out[r.path.slice(path.length + 1)] = r.value; });
  return out;
}
async function dbSet(path, val) {
  const { error } = await _sb.from(KV_TABLE).upsert({ path, value: val });
  if (error) console.error('dbSet', path, error);
  return error || null;
}
async function dbDelete(path) {
  const { error: e1 } = await _sb.from(KV_TABLE).delete().eq('path', path);
  if (e1) { console.error('dbDelete', path, e1); return e1; }
  const { error: e2 } = await _sb.from(KV_TABLE).delete().like('path', `${path}/%`);
  if (e2) console.error('dbDelete', path, e2);
  return e2 || null;
}

// ═══════════════ LOAD DATA ═══════════════
function loadData(force=false) {
  if(!force && dataLoaded)return Promise.resolve();
  if(dataLoadPromise)return dataLoadPromise;
  if(!force){
    const cached=readDataCache();
    if(cached){
      applyData(cached.articles,cached.users);
      dataLoaded=true;
      if(Date.now()-cached.savedAt<DATA_REFRESH_MIN_AGE)return Promise.resolve();
      dataLoadPromise=fetchData().then(()=>{
        if(typeof renderHome==='function')renderHome(currentActiveCat);
      }).catch(error=>console.error('data refresh',error)).finally(()=>{dataLoadPromise=null;});
      return Promise.resolve();
    }
  }
  dataLoadPromise=fetchData().finally(()=>{dataLoadPromise=null;});
  return dataLoadPromise;
}

async function saveArticle(a) {
  const {error}=await _sb.from('articles').upsert({
    id:a.id,owner_id:a.owner_id,title:a.title,deck:a.deck,cat:a.cat,author:a.author,
    img:a.img,body:a.body,body_html:a.bodyHtml,date:a.date,reads:a.reads||0,status:a.status||'pending',lang:a.lang||'fr'
  });
  if(error)console.error('saveArticle',error);
  writeDataCache();
  return error || null;
}
// Charge le corps HTML et l'image d'origine d'un article (à l'ouverture).
async function loadArticleFull(a){
  if(!a || a.fullLoaded || !window._sb) return a;
  const { data, error } = await _sb.from('articles').select('img, body_html').eq('id', a.id).maybeSingle();
  if(!error && data){
    a.bodyHtml=data.body_html||'';
    if(a.imgStatic) a.imgData=data.img||'';   // repli si cover.jpg n'est pas encore généré
    else a.img=data.img||a.img;
    a.fullLoaded=true;
  }
  return a;
}
// Repli quand une couverture statique n'existe pas encore (article récent) :
// on récupère l'image d'origine depuis la base, sinon on masque le cadre.
async function coverFallback(imgEl, id){
  imgEl.onerror=null;
  const a=articles.find(x=>String(x.id)===String(id));
  if(a && a.imgStatic && !a.imgData && window._sb){
    const { data } = await _sb.from('articles').select('img').eq('id', a.id).maybeSingle();
    a.imgData=data?.img||'';
  }
  if(a?.imgData){ imgEl.removeAttribute('srcset'); imgEl.src=a.imgData; }
  else if(imgEl.parentNode) imgEl.parentNode.style.display='none';
}
// Mise à jour du seul nom d'auteur (ne touche ni à l'image ni au corps)
async function updateArticleAuthor(id, author){
  const {error}=await _sb.from('articles').update({author}).eq('id',id);
  if(error)console.error('updateArticleAuthor',error);
  return error||null;
}
async function updateArticleStatus(id,status){
  const {error}=await _sb.from('articles').update({status}).eq('id',id);
  return error||null;
}
async function deleteArticleDB(id) {
  const {error}=await _sb.from('articles').delete().eq('id',id);
  if(!error)writeDataCache();
  return error;
}
// Clé de path = email encodé (les emails contiennent des caractères interdits par certains systèmes, comme "." et "@")
function userKey(email){
  return email.replace(/\./g,'_').replace(/@/g,'__at__');
}
async function saveUser(u) {
  const {error}=await _sb.from('profiles').upsert({
    id:u.id,email:u.email,first:u.first,last:u.last,joined:u.joined,avatar:u.avatar||'',bio:u.bio||'',level:u.level||'',auth_provider:u.authProvider||''
  });
  if(error)console.error('saveUser',error);
  else writeDataCache();
  return error || null;
}
async function ensureAuthProfile(authUser) {
  if(!authUser?.id)return new Error('Missing authenticated user');
  const email=(authUser.email||'').trim().toLowerCase();
  const metadata=authUser.user_metadata||{};
  const fullName=(metadata.full_name||metadata.name||email.split('@')[0]||'Utilisateur').trim();
  const nameParts=fullName.split(/\s+/).filter(Boolean);
  const profile={
    id:authUser.id,
    email,
    first:nameParts[0]||'Utilisateur',
    last:nameParts.slice(1).join(' '),
    joined:today(),
    avatar:metadata.avatar_url||'',
    bio:'',
    level:'',
    authProvider:authUser.app_metadata?.provider||'supabase'
  };
  const existing=users.find(user=>(user.email||'').toLowerCase()===email);
  if(existing){
    profile.first=existing.first||profile.first;
    profile.last=existing.last||profile.last;
    profile.joined=existing.joined||profile.joined;
    profile.avatar=existing.avatar||profile.avatar;
    profile.bio=existing.bio||'';
    profile.level=existing.level||'';
  }
  const error=await saveUser(profile);
  if(!error){
    const index=users.findIndex(user=>(user.email||'').toLowerCase()===email);
    if(index===-1)users.push(profile);
    else users[index]={...users[index],...profile};
    currentUser=users[index===-1?users.length-1:index];
  }
  return error;
}
async function deleteUserDB(email) {
  const normalizedEmail=(email||'').trim().toLowerCase();
  if(!normalizedEmail)return new Error('Missing user email');

  try{
    const { data, error } = await _sb.functions.invoke('admin-delete-user', { body: { email: normalizedEmail } });
    if (error) return error;
    if (data?.error) return new Error(String(data.error));
    if (!data || data.ok !== true) return new Error('Delete response was invalid');
    writeDataCache();
    return null;
  } catch (error) {
    return error || new Error('Unable to delete user');
  }
}

// ═══════════════ SESSION ═══════════════
function saveLocalSession(email) { try{localStorage.setItem('eco_email',email);}catch(e){} }
function getLocalEmail()         { try{return localStorage.getItem('eco_email');}catch(e){return null;} }
function clearLocalSession()     { try{localStorage.removeItem('eco_email');}catch(e){} }

// ═══════════════ HELPERS ═══════════════
function today(){ const d=new Date(); return `${d.getDate()} ${MM[d.getMonth()]} ${d.getFullYear()}`; }
function articleSlug(title){
  return String(title||'')
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .slice(0,80).replace(/-+$/,'');
}
function articlePath(article){
  const slug=articleSlug(article.title);
  return `/article/${article.id}${slug?'-'+slug:''}/`;
}
function articleIdFromPath(){
  const match=window.location.pathname.match(/^\/article\/(\d+)/);
  return match?match[1]:null;
}
function readTime(body){ const w=(body||'').trim().split(/\s+/).length; return `${Math.max(1,Math.round(w/200))} min`; }
function isOwnerEmail(email){
  return !!email && String(email).trim().toLowerCase()===OWNER_EMAIL.toLowerCase();
}
function isOwner(){
  return !!currentUser && isOwnerEmail(currentUser.email);
}
function showToast(msg,dur=3200){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}
// ── Sécurité : toute donnée saisie par un utilisateur doit passer par esc()
// avant d'être insérée dans du HTML (innerHTML / gabarits).
function esc(value){
  return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Argument de chaîne pour un attribut onclick="fn(...)" : JSON puis échappement HTML
function jsArg(value){
  return esc(JSON.stringify(String(value ?? '')));
}
// HTML riche (corps d'article) : nettoyé par DOMPurify, repli sur du texte brut
function safeHtml(html){
  if(window.DOMPurify) return DOMPurify.sanitize(String(html ?? ''), { ADD_ATTR: ['target'] });
  return esc(String(html ?? '').replace(/<[^>]*>/g,' '));
}

function avHtml(u,size=28){
  if(u&&u.avatar) return `<img src="${esc(u.avatar)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1.5px solid var(--rouge)">`;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--rouge);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:${size*0.4}px;color:white;flex-shrink:0">${((u&&u.first?u.first[0]:'')+((u&&u.last?u.last[0]:'')||'')).toUpperCase()||'?'}</div>`;
}

function optimizeImageUrl(url, { maxWidth = 1600, quality = 80 } = {}) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.searchParams.has('width') || u.searchParams.has('quality')) return trimmed;
    u.searchParams.set('width', String(maxWidth));
    u.searchParams.set('quality', String(quality));
    return u.toString();
  } catch (error) {
    return trimmed;
  }
}

function imageAttrs(url, { maxWidth = 1600, quality = 80, sizes = '(max-width: 768px) 100vw, 50vw', loading = 'lazy', fetchPriority = 'auto', alt } = {}) {
  const src = esc(optimizeImageUrl(url, { maxWidth, quality }));
  const altAttr = alt === undefined ? '' : ` alt="${esc(alt)}"`;
  return `src="${src}" srcset="${src} 1x" sizes="${sizes}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${altAttr}`;
}

// Génère un code numérique à 6 chiffres (codes de vérification par e-mail)
function genVerifCode(){
  return String(Math.floor(100000 + Math.random()*900000));
}

function normalizeAccessCodeEntries(codes){
  const out = {};
  if (!codes || typeof codes !== 'object' || Array.isArray(codes)) return out;

  if (Object.prototype.hasOwnProperty.call(codes, 'code') &&
      (Object.prototype.hasOwnProperty.call(codes, 'max') ||
       Object.prototype.hasOwnProperty.call(codes, 'used') ||
       Object.prototype.hasOwnProperty.call(codes, 'forEmail'))) {
    const codeValue = String(codes.code ?? '').trim();
    if (codeValue) out[codeValue] = codes;
    return out;
  }

  Object.entries(codes).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    const codeValue = String(value.code ?? key ?? '').trim();
    if (!codeValue) return;
    out[codeValue] = value;
  });

  return out;
}

function buildAccessCodeRecord({ code, max = 1, used = 0, forEmail = null, source = 'manual', proposalId = null, lang = 'fr' }) {
  const entry = {
    code: String(code || '').trim(),
    max: Number(max) || 1,
    used: Number(used) || 0,
    source: String(source || 'manual'),
    lang: String(lang || 'fr'),
    createdAt: Date.now()
  };
  if (forEmail && String(forEmail).trim()) entry.forEmail = String(forEmail).trim().toLowerCase();
  if (proposalId) entry.proposalId = String(proposalId);
  return entry;
}
