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
const DATA_CACHE_KEY = 'economist_public_data_cache_v3'; // v3 : sans e-mails des membres
try{ localStorage.removeItem('economist_public_data_cache_v1'); localStorage.removeItem('economist_public_data_cache_v2'); }catch(e){}
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
    // L'e-mail des membres n'est pas public (seul l'admin l'obtient, voir plus bas)
    _sb.from('profiles').select('id, first, last, joined, avatar, bio, level'),
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
  userRows.forEach(row=>{usrs[row.id]={...row,email:''};});
  // Son propre e-mail vient de la session ; l'admin reçoit ceux de tous les membres
  if(currentUser?.id && usrs[currentUser.id]) usrs[currentUser.id].email=currentUser.email||'';
  if(isOwner()){
    const { data: emails } = await _sb.rpc('admin_profile_emails');
    (emails||[]).forEach(r=>{ if(usrs[r.id]) usrs[r.id].email=r.email||''; });
  }
  applyData(arts, usrs);
  if(currentUser?.id){ const fresh=users.find(u=>u.id===currentUser.id); if(fresh) currentUser=fresh; }
  dataLoaded=true;
  writeDataCache();
}

async function dbGet(path) {
  const { data: row, error } = await _sb.from(KV_TABLE).select('value').eq('path', path).maybeSingle();
  if (error) { console.error('dbGet', path, error); return null; }
  if (row) return row.value;
  const { data: rows, error: err2 } = await _sb.from(KV_TABLE).select('path,value').like('path', `${path}/%`).order('updated_at', { ascending: false }).limit(200);
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
// Mise à jour puis, si le profil n'existe pas encore, création.
// (Pas d'« upsert » : il exige de pouvoir relire les colonnes privées e-mail et
// fournisseur, que la base ne rend plus lisibles. Ces deux colonnes sont
// renseignées par la base elle-même à partir du compte connecté.)
async function saveUser(u) {
  const row={id:u.id,first:u.first,last:u.last,joined:u.joined,avatar:u.avatar||'',bio:u.bio||'',level:u.level||''};
  // Pays estimé (caché : jamais relu côté client, visible seulement par l'admin)
  const country=getVisitorCountry();
  if(country)row.country=country;
  let { data: updated, error } = await _sb.from('profiles').update(row).eq('id', u.id).select('id');
  if(isMissingCountryColumn(error)){
    delete row.country;
    ({ data: updated, error } = await _sb.from('profiles').update(row).eq('id', u.id).select('id'));
  }
  if(!error && (!updated || !updated.length)){
    ({ error } = await _sb.from('profiles').insert({ ...row, email: u.email || '' }));
    if(isMissingCountryColumn(error)){ delete row.country; ({ error } = await _sb.from('profiles').insert({ ...row, email: u.email || '' })); }
  }
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
  const existing=users.find(user=>user.id===authUser.id);
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
    const index=users.findIndex(user=>user.id===authUser.id);
    if(index===-1)users.push(profile);
    else users[index]={...users[index],...profile};
    currentUser=users[index===-1?users.length-1:index];
  }
  return error;
}
// Suppression par identifiant de compte (jamais par e-mail, modifiable)
async function deleteUserDB(userId) {
  if(!userId)return new Error('Missing user id');

  try{
    const { data, error } = await _sb.functions.invoke('admin-delete-user', { body: { id: userId } });
    if (error) return error;
    if (data?.error) return new Error(String(data.error));
    if (!data || data.ok !== true) return new Error('Delete response was invalid');
    writeDataCache();
    return null;
  } catch (error) {
    return error || new Error('Unable to delete user');
  }
}

// ═══════════════ PAYS (feed « À la une » localisé) ═══════════════
// Donnée cachée : le pays des membres et des articles n'est jamais envoyé au
// navigateur. Pays du lecteur : position GPS du navigateur (si autorisée),
// sinon fuseau horaire ; la base renvoie seulement la liste des articles de
// ce pays (fonction local_article_ids).
// Fuseau horaire → pays : estimation de repli, calculée localement
const TZ_COUNTRY={
  'Africa/Abidjan':'CI','Africa/Accra':'GH','Africa/Addis_Ababa':'ET','Africa/Algiers':'DZ','Africa/Asmara':'ER','Africa/Bamako':'ML','Africa/Bangui':'CF','Africa/Banjul':'GM','Africa/Bissau':'GW','Africa/Blantyre':'MW','Africa/Brazzaville':'CG','Africa/Bujumbura':'BI','Africa/Cairo':'EG','Africa/Casablanca':'MA','Africa/Conakry':'GN','Africa/Dakar':'SN','Africa/Dar_es_Salaam':'TZ','Africa/Djibouti':'DJ','Africa/Douala':'CM','Africa/Freetown':'SL','Africa/Gaborone':'BW','Africa/Harare':'ZW','Africa/Johannesburg':'ZA','Africa/Juba':'SS','Africa/Kampala':'UG','Africa/Khartoum':'SD','Africa/Kigali':'RW','Africa/Kinshasa':'CD','Africa/Lagos':'NG','Africa/Libreville':'GA','Africa/Lome':'TG','Africa/Luanda':'AO','Africa/Lubumbashi':'CD','Africa/Lusaka':'ZM','Africa/Malabo':'GQ','Africa/Maputo':'MZ','Africa/Maseru':'LS','Africa/Mbabane':'SZ','Africa/Mogadishu':'SO','Africa/Monrovia':'LR','Africa/Nairobi':'KE','Africa/Ndjamena':'TD','Africa/Niamey':'NE','Africa/Nouakchott':'MR','Africa/Ouagadougou':'BF','Africa/Porto-Novo':'BJ','Africa/Sao_Tome':'ST','Africa/Tripoli':'LY','Africa/Tunis':'TN','Africa/Windhoek':'NA',
  'Indian/Antananarivo':'MG','Indian/Comoro':'KM','Indian/Mauritius':'MU','Indian/Mahe':'SC','Indian/Reunion':'RE','Atlantic/Cape_Verde':'CV',
  'Europe/Paris':'FR','Europe/Brussels':'BE','Europe/Zurich':'CH','Europe/Luxembourg':'LU','Europe/Monaco':'MC','Europe/London':'GB','Europe/Dublin':'IE','Europe/Berlin':'DE','Europe/Madrid':'ES','Europe/Lisbon':'PT','Europe/Rome':'IT','Europe/Amsterdam':'NL','Europe/Vienna':'AT','Europe/Warsaw':'PL','Europe/Prague':'CZ','Europe/Stockholm':'SE','Europe/Oslo':'NO','Europe/Copenhagen':'DK','Europe/Helsinki':'FI','Europe/Athens':'GR','Europe/Bucharest':'RO','Europe/Budapest':'HU','Europe/Kyiv':'UA','Europe/Kiev':'UA','Europe/Moscow':'RU','Europe/Istanbul':'TR',
  'America/Montreal':'CA','America/Toronto':'CA','America/Vancouver':'CA','America/New_York':'US','America/Chicago':'US','America/Denver':'US','America/Los_Angeles':'US','America/Phoenix':'US','America/Mexico_City':'MX','America/Port-au-Prince':'HT','America/Sao_Paulo':'BR','America/Argentina/Buenos_Aires':'AR','America/Bogota':'CO','America/Lima':'PE','America/Santiago':'CL','America/Cayenne':'FR','America/Guadeloupe':'FR','America/Martinique':'FR',
  'Asia/Dubai':'AE','Asia/Riyadh':'SA','Asia/Qatar':'QA','Asia/Beirut':'LB','Asia/Jerusalem':'IL','Asia/Kolkata':'IN','Asia/Calcutta':'IN','Asia/Shanghai':'CN','Asia/Hong_Kong':'HK','Asia/Tokyo':'JP','Asia/Seoul':'KR','Asia/Singapore':'SG','Asia/Bangkok':'TH','Asia/Ho_Chi_Minh':'VN','Asia/Jakarta':'ID','Asia/Manila':'PH','Asia/Karachi':'PK',
  'Australia/Sydney':'AU','Australia/Melbourne':'AU','Pacific/Auckland':'NZ'
};
function guessCountryFromTimezone(){
  try{ return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone]||null; }catch(e){ return null; }
}
// ── Position GPS du navigateur → pays / région / ville ──
// La position est demandée UNE SEULE FOIS par navigateur (acceptée ou refusée,
// on ne redemande plus). Le service de conversion ne reçoit que des
// coordonnées arrondies (~10 km) ; la base EconGlobe garde le lieu
// (pays / région / ville) ET les coordonnées exactes, lisibles par l'admin
// uniquement. Refus ou échec : fuseau horaire.
const GEO_LOCATION_KEY='eco_geo_location';
const GEO_ASKED_KEY='eco_geo_asked';
const GEO_SYNCED_KEY='eco_geo_synced';
function readGeoLocation(){
  try{
    const saved=JSON.parse(localStorage.getItem(GEO_LOCATION_KEY)||'null');
    if(saved && /^[A-Z]{2}$/.test(saved.c))return saved;
  }catch(e){}
  return null;
}
// Meilleur pays connu tout de suite (sans attendre le GPS)
function getVisitorCountry(){
  return readGeoLocation()?.c||guessCountryFromTimezone();
}
// Commune / quartier : le niveau administratif le plus précis qui n'est
// ni la ville, ni la région, ni le pays (ex. « Cocody » pour Abidjan)
function pickCommune(geo,city,region){
  const skip=new Set([city,region,geo?.countryName].filter(Boolean).map(s=>String(s).toLowerCase()));
  const all=(geo?.localityInfo?.administrative||[]).filter(a=>a?.name);
  // Seulement les niveaux plus précis que la ville (jamais région, département…)
  const cityLevel=Math.max(2,...all.filter(a=>String(a.name).toLowerCase()===String(city||'').toLowerCase()).map(a=>Number(a.adminLevel)||0));
  const admin=all
    .filter(a=>Number(a.adminLevel)>cityLevel)
    .sort((a,b)=>Number(b.adminLevel)-Number(a.adminLevel)||Number(b.order||0)-Number(a.order||0))
    .map(a=>a.name);
  const found=[geo?.locality,...admin].find(name=>name && !skip.has(String(name).toLowerCase()));
  return String(found||'').slice(0,100);
}
// Position → lieu. Le service de conversion reçoit une position arrondie
// à ~1 km (assez pour trouver la commune) ; la position exacte reste chez nous.
function locateFromPosition(pos){
  const lat=pos.coords.latitude.toFixed(2), lon=pos.coords.longitude.toFixed(2);
  return fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`)
    .then(res=>res.json()).then(geo=>{
      const code=String(geo?.countryCode||'').toUpperCase();
      if(!/^[A-Z]{2}$/.test(code))return null;
      const region=String(geo.principalSubdivision||'').slice(0,100);
      const city=String(geo.city||geo.locality||'').slice(0,100);
      const loc={c:code,region,city,commune:pickCommune(geo,city,region),
        lat:pos.coords.latitude,lon:pos.coords.longitude,acc:Math.round(pos.coords.accuracy||0),at:Date.now()};
      try{ localStorage.setItem(GEO_LOCATION_KEY,JSON.stringify(loc)); }catch(e){}
      return loc;
    }).catch(e=>{ console.error('geo location',e); return null; });
}
function getPosition(){
  return new Promise(resolve=>navigator.geolocation.getCurrentPosition(
    pos=>resolve(pos),()=>resolve(null),{enableHighAccuracy:false,timeout:15000,maximumAge:24*60*60*1000}));
}
let geoLocationPromise=null;
function requestGeoLocation(){
  if(geoLocationPromise)return geoLocationPromise;
  const saved=readGeoLocation();
  if(saved){
    // Lieu enregistré avant l'ajout de la commune : on le complète SANS
    // redemander, seulement si le navigateur a déjà l'autorisation.
    if(saved.commune!==undefined || !navigator.permissions?.query || !navigator.geolocation)return Promise.resolve(saved);
    geoLocationPromise=navigator.permissions.query({name:'geolocation'})
      .then(status=>status.state==='granted'?getPosition():null)
      .then(pos=>pos?locateFromPosition(pos):null)
      .then(loc=>loc||saved).catch(()=>saved);
    return geoLocationPromise;
  }
  let asked=false;
  try{ asked=!!localStorage.getItem(GEO_ASKED_KEY); }catch(e){}
  if(asked || !navigator.geolocation)return Promise.resolve(null);
  try{ localStorage.setItem(GEO_ASKED_KEY,String(Date.now())); }catch(e){}
  geoLocationPromise=getPosition().then(pos=>pos?locateFromPosition(pos):null);
  return geoLocationPromise;
}
// Envoie le lieu à la base (statistiques admin), seulement s'il a changé
// ou si le visiteur vient de se connecter (lien avec son compte).
function recordVisitorLocation(loc,source){
  if(!_sb || !loc?.c || typeof getReadVisitorKey!=='function')return;
  const visitorKey=getReadVisitorKey(); if(!visitorKey)return;
  const signature=[currentUser?.id||'anon',loc.c,loc.region||'',loc.city||'',loc.commune||'',source].join('|');
  try{ if(localStorage.getItem(GEO_SYNCED_KEY)===signature)return; }catch(e){}
  const params={
    p_visitor_key:visitorKey,p_country:loc.c,p_region:loc.region||null,p_city:loc.city||null,p_source:source,
    p_latitude:Number.isFinite(loc.lat)?loc.lat:null,p_longitude:Number.isFinite(loc.lon)?loc.lon:null,p_accuracy:Number.isFinite(loc.acc)?loc.acc:null,
    p_commune:loc.commune||null
  };
  (async()=>{
    let {error}=await _sb.rpc('record_visitor_location',params);
    // Base pas encore mise à jour (sans commune) : on réessaie sans ce champ
    if(error && /commune|PGRST202/i.test(String(error.message||error.code||''))){
      const {p_commune,...rest}=params;
      ({error}=await _sb.rpc('record_visitor_location',rest));
      if(!error)return;   // pas de mémorisation : la commune sera renvoyée une fois la base à jour
    }
    if(error){ console.error('record_visitor_location',error); return; }
    try{ localStorage.setItem(GEO_SYNCED_KEY,signature); }catch(e){}
  })().catch(()=>{});
}
function isMissingCountryColumn(error){
  const msg=String(error?.message||'');
  return !!error && /country/i.test(msg) && /column|schema cache/i.test(msg);
}
// Ids des articles du pays du lecteur (vide si pays inconnu ou fonction absente)
let localArticleIds=new Set();
let localIdsPromise=null;
let localIdsCountry=null;
function loadLocalArticleIds(country=getVisitorCountry()){
  if(!country || !_sb)return Promise.resolve(localArticleIds);
  if(!localIdsPromise || localIdsCountry!==country){
    localIdsCountry=country;
    localIdsPromise=Promise.resolve(_sb.rpc('local_article_ids',{p_country:country})).then(({data,error})=>{
      if(!error && Array.isArray(data))localArticleIds=new Set(data.map(row=>String(row&&typeof row==='object'?Object.values(row)[0]:row)));
      return localArticleIds;
    }).catch(()=>localArticleIds);
  }
  return localIdsPromise;
}
// Position (demandée une fois) → enregistrement en base → retri de l'accueil si besoin
function refineCountryWithGps(){
  const before=getVisitorCountry();
  requestGeoLocation().then(async loc=>{
    if(!loc){
      const tz=guessCountryFromTimezone();
      if(tz)recordVisitorLocation({c:tz},'timezone');
      return;
    }
    recordVisitorLocation(loc,'gps');
    if(loc.c===before)return;
    await loadLocalArticleIds(loc.c);
    if(currentUser?.id && typeof saveUser==='function')saveUser(currentUser);
    if(document.getElementById('page-home')?.classList.contains('active') && typeof renderHome==='function')renderHome(currentActiveCat);
  });
}
// ── Goûts de lecture (gardés dans ce navigateur uniquement, invisibles) ──
// Chaque article ouvert ajoute des points à sa rubrique et à son auteur ;
// une lecture complète (50 s) en ajoute davantage. Les anciens points
// s'effacent peu à peu pour suivre l'évolution des goûts.
const INTEREST_KEY='eco_reader_interests';
function readInterests(){
  try{
    const saved=JSON.parse(localStorage.getItem(INTEREST_KEY)||'null');
    if(saved && saved.cat && saved.author)return saved;
  }catch(e){}
  return {cat:{},author:{}};
}
function trackReadInterest(article,weight=1){
  if(!article)return;
  const data=readInterests();
  [data.cat,data.author].forEach(map=>Object.keys(map).forEach(k=>{ map[k]*=0.95; if(map[k]<0.05)delete map[k]; }));
  if(article.cat)data.cat[article.cat]=(data.cat[article.cat]||0)+weight;
  const author=String(article.owner_id||article.author||'');
  if(author)data.author[author]=(data.author[author]||0)+weight;
  try{ localStorage.setItem(INTEREST_KEY,JSON.stringify(data)); }catch(e){}
}
// ── Algorithme du feed (accueil et rubriques) ──
// Score = récence + bonus pays du lecteur + bonus goûts (rubrique, auteur).
// Puis on choisit les articles un par un en pénalisant les répétitions
// (même rubrique, même auteur, trop d'articles locaux d'affilée) pour que
// le lecteur voie aussi d'autres pays et d'autres sujets. Rien n'est masqué.
function rankFeed(list){
  if(list.length<2)return list;
  const interests=readInterests();
  const share=map=>{ const total=Object.values(map).reduce((s,v)=>s+v,0); return k=>total?(map[k]||0)/total:0; };
  const catShare=share(interests.cat), authorShare=share(interests.author);
  const authorKey=a=>String(a.owner_id||a.author||'');
  const isLocal=a=>localArticleIds.has(String(a.id));
  // list est déjà du plus récent au plus ancien
  const pool=list.map((a,rank)=>({a,base:
    Math.exp(-rank/10)                 // récence
    +(isLocal(a)?0.45:0)               // pays du lecteur
    +0.5*catShare(a.cat)               // rubriques préférées
    +0.3*authorShare(authorKey(a))     // auteurs préférés
  }));
  const out=[];
  while(pool.length){
    const recent=out.slice(-3);
    let best=0,bestScore=-Infinity;
    pool.forEach((item,i)=>{
      let s=item.base;
      s-=0.25*recent.filter(a=>a.cat===item.a.cat).length;
      s-=0.25*recent.filter(a=>authorKey(a)===authorKey(item.a)).length;
      if(isLocal(item.a) && recent.length>=2 && recent.slice(-2).every(isLocal))s-=0.6;
      if(s>bestScore){bestScore=s;best=i;}
    });
    out.push(pool.splice(best,1)[0].a);
  }
  return out;
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
// Recherche d'un membre par identifiant (ou, pour soi/l'admin, par e-mail connu)
function findUser(key){
  if(!key)return null;
  const k=String(key);
  return users.find(u=>String(u.id)===k) || users.find(u=>u.email && u.email.toLowerCase()===k.toLowerCase()) || null;
}
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

// ── Messages d'erreur compréhensibles ───────────────────────────
// Ne jamais afficher à l'utilisateur un message technique brut (noms de
// tables, codes SQL, « Failed to fetch »…). Le détail reste dans la console.
// fallbackKey : clé i18n utilisée si l'erreur n'est pas reconnue
// (passer null pour obtenir null dans ce cas).
const FRIENDLY_ERRORS = [
  { re:/failed to fetch|networkerror|network request|load failed|timeout|timed out|ECONN|offline/i,
    fr:'Connexion internet instable. Vérifiez votre connexion puis réessayez.',
    en:'Unstable internet connection. Check your connection and try again.' },
  { re:/invalid login credentials|invalid_credentials/i,
    fr:'Adresse e-mail ou mot de passe incorrect.',
    en:'Incorrect email address or password.' },
  { re:/email not confirmed|email_not_confirmed/i,
    fr:'Confirmez d’abord votre adresse e-mail grâce au lien reçu par e-mail, puis reconnectez-vous.',
    en:'Please confirm your email address using the link we sent you, then sign in again.' },
  { re:/user already registered|already been registered|user_already_exists/i,
    fr:'Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou utilisez « Mot de passe oublié ».',
    en:'An account already exists with this email address. Sign in or use “Forgot password”.' },
  { re:/password should be at least|weak_password|password is too weak/i,
    fr:'Mot de passe trop faible : utilisez au moins 8 caractères, en mélangeant lettres et chiffres.',
    en:'Password too weak: use at least 8 characters, mixing letters and numbers.' },
  { re:/should be different from the old password|same_password/i,
    fr:'Le nouveau mot de passe doit être différent de l’ancien.',
    en:'The new password must be different from the old one.' },
  { re:/unable to validate email|invalid email|email_address_invalid|invalid format/i,
    fr:'Cette adresse e-mail n’est pas valide.',
    en:'This email address is not valid.' },
  { re:/rate limit|too many requests|over_.*_rate_limit|\b429\b/i,
    fr:'Trop de tentatives en peu de temps. Patientez quelques minutes avant de réessayer.',
    en:'Too many attempts in a short time. Please wait a few minutes before trying again.' },
  { re:/jwt|sub claim|session|expired|not authenticated|unauthorized|refresh token/i,
    fr:'Votre session a expiré. Reconnectez-vous puis réessayez.',
    en:'Your session has expired. Please sign in again and retry.' },
  { re:/row-level security|permission denied|\b42501\b|policy|forbidden|\b403\b|not allowed/i,
    fr:'Vous n’avez pas l’autorisation d’effectuer cette action avec ce compte.',
    en:'You are not allowed to perform this action with this account.' },
  { re:/duplicate key|\b23505\b|already exists/i,
    fr:'Cet élément existe déjà.',
    en:'This item already exists.' },
  { re:/payload too large|request entity too large|\b413\b|value too long|too large/i,
    fr:'Le contenu est trop volumineux. Essayez avec une image plus légère ou un texte plus court.',
    en:'The content is too large. Try a lighter image or a shorter text.' },
  { re:/not found|no rows|\b404\b|PGRST116/i,
    fr:'Élément introuvable : il a peut-être été supprimé entre-temps. Actualisez la page.',
    en:'Item not found: it may have been deleted in the meantime. Please refresh the page.' }
];
function friendlyError(error, fallbackKey='toast_user_error'){
  if(error) console.error('[détail technique]', error);
  const raw=String(error?.message||error?.error||error?.msg||error?.code||error||'');
  const hit=raw && FRIENDLY_ERRORS.find(entry=>entry.re.test(raw));
  if(hit) return (typeof _lang!=='undefined'&&_lang==='en')?hit.en:hit.fr;
  if(fallbackKey===null) return null;
  return typeof t==='function'?t(fallbackKey):'Une erreur est survenue. Réessayez dans un instant.';
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
  // Couverture compressée générée par build-seo.mjs : version 800 px pour les mobiles
  const isStaticCover = /^[/]article[/].+[/]cover[.]jpg$/.test(String(url||''));
  const srcset = isStaticCover ? `${src.replace(/cover[.]jpg$/,'cover-800.jpg')} 800w, ${src} 1200w` : `${src} 1x`;
  return `src="${src}" srcset="${srcset}" sizes="${sizes}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}"${altAttr}`;
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
