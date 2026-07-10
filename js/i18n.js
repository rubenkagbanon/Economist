// ════════════════════════════════════════════════════════════
// i18n.js — traductions FR / EN
// ════════════════════════════════════════════════════════════

let _lang = 'fr';

const I18N = {
  fr: {
    auth_welcome:"Bienvenue", auth_sync:"Votre compte est synchronisé sur tous vos appareils.",
    auth_login:"Connexion", auth_signup:"Créer un compte", auth_email:"Email", auth_pwd:"Mot de passe",
    auth_err_login:"Email ou mot de passe incorrect.", auth_btn_login:"Se connecter",
    auth_no_account:"Pas de compte ?", auth_ok_created:"Compte créé !", auth_btn_signup:"Créer mon compte",
    auth_err_fields:"Veuillez remplir tous les champs.", auth_err_short:"8 caractères minimum.",
    auth_err_match:"Les mots de passe ne correspondent pas.", auth_err_email:"Cet email est déjà utilisé.",

    cat_une:"À la une", cat_eco:"Économie", cat_fin:"Finance", cat_pol:"Politiques", cat_soc:"Sociologie",
    cat_dro:"Droit", cat_tec:"Technologies", cat_afr:"Afrique", cat_mon:"Monde", cat_ecol:"Écologie",
    cat_ia:"IA", cat_data:"Data Science",

    nav_propose:"Proposer un article", nav_write:"Écrire", nav_stats:"Mes statistiques",
    nav_admin:"Admin", nav_login:"S'abonner / Connexion", nav_logout:"Déconnexion",

    lbl_rubrique:"Rubrique *", lbl_corps:"Corps de l'article *",

    admin_access:"Accès réservé à l'administrateur.", admin_btn_login:"Se connecter",
    admin_badge:"Espace administrateur", admin_members:"Membres", admin_codes:"Codes d'accès",
    admin_new_code:"Nouveau code", admin_new_code_ph:"ex: economist-vip", admin_max:"Utilisations max",
    admin_create:"Créer", admin_loading:"Chargement…", admin_arts:"Articles",
    admin_table_titre:"Titre", admin_table_auteur:"Auteur", admin_table_cat:"Rubrique",
    admin_table_date:"Date", admin_table_reads:"Lectures", admin_table_action:"Action",
    admin_delete:"Supprimer", admin_none_art:"Aucun article publié.",
    admin_member_name:"Nom", admin_member_email:"Email", admin_member_joined:"Inscrit le",
    admin_member_arts:"Articles", admin_member_profile:"Profil", admin_view:"Voir",
    admin_none_members:"Aucun membre inscrit.",

    toast_del_code:"Code supprimé.", toast_welcome:"Bon retour", toast_created:"Bienvenue",
    toast_logout:"Vous êtes déconnecté.", toast_profile:"Profil mis à jour.",

    home_coming:"À paraître", home_desc:"Nos rédacteurs travaillent sur de nouveaux articles.",
    home_none_all:"Aucun article publié pour l'instant.", home_none_cat:"Aucun article en «",
    home_cta:"Proposer un article →", home_alire:"À lire aussi", home_par:"Par", home_read:"de lecture",
    home_back:"← Retour",

    del_confirm:"Supprimer définitivement cet article ?", del_done:"Article supprimé.",

    profile_not_found:"Profil introuvable.", profile_member:"Membre depuis le", profile_reader:"Lecteur",
    profile_writer:"Rédacteur", profile_edit:"Modifier mon profil", profile_arts:"Articles publiés",
    profile_none:"Aucun article publié.",

    write_connect:"Connectez-vous pour voir vos statistiques.",

    stats_articles:"Articles", stats_reads:"Lectures", stats_words:"Mots écrits",
    stats_avg:"Lectures / article", stats_my:"Mes articles", stats_table_titre:"Titre",
    stats_table_cat:"Rubrique", stats_table_date:"Date", stats_table_reads:"Lectures",
    stats_table_action:"Action", stats_none:"Vous n'avez publié aucun article."
  },
  en: {
    auth_welcome:"Welcome", auth_sync:"Your account is synced across all your devices.",
    auth_login:"Log in", auth_signup:"Create account", auth_email:"Email", auth_pwd:"Password",
    auth_err_login:"Incorrect email or password.", auth_btn_login:"Log in",
    auth_no_account:"No account?", auth_ok_created:"Account created!", auth_btn_signup:"Create my account",
    auth_err_fields:"Please fill in all fields.", auth_err_short:"8 characters minimum.",
    auth_err_match:"Passwords do not match.", auth_err_email:"This email is already in use.",

    cat_une:"Front page", cat_eco:"Economy", cat_fin:"Finance", cat_pol:"Politics", cat_soc:"Sociology",
    cat_dro:"Law", cat_tec:"Technology", cat_afr:"Africa", cat_mon:"World", cat_ecol:"Ecology",
    cat_ia:"AI", cat_data:"Data Science",

    nav_propose:"Submit an article", nav_write:"Write", nav_stats:"My stats",
    nav_admin:"Admin", nav_login:"Subscribe / Log in", nav_logout:"Log out",

    lbl_rubrique:"Category *", lbl_corps:"Article body *",

    admin_access:"Access restricted to the administrator.", admin_btn_login:"Log in",
    admin_badge:"Administrator area", admin_members:"Members", admin_codes:"Access codes",
    admin_new_code:"New code", admin_new_code_ph:"e.g. economist-vip", admin_max:"Max uses",
    admin_create:"Create", admin_loading:"Loading…", admin_arts:"Articles",
    admin_table_titre:"Title", admin_table_auteur:"Author", admin_table_cat:"Category",
    admin_table_date:"Date", admin_table_reads:"Reads", admin_table_action:"Action",
    admin_delete:"Delete", admin_none_art:"No article published yet.",
    admin_member_name:"Name", admin_member_email:"Email", admin_member_joined:"Joined on",
    admin_member_arts:"Articles", admin_member_profile:"Profile", admin_view:"View",
    admin_none_members:"No members yet.",

    toast_del_code:"Code deleted.", toast_welcome:"Welcome back", toast_created:"Welcome",
    toast_logout:"You have been logged out.", toast_profile:"Profile updated.",

    home_coming:"Coming soon", home_desc:"Our writers are working on new articles.",
    home_none_all:"No articles published yet.", home_none_cat:"No articles in «",
    home_cta:"Submit an article →", home_alire:"Also worth reading", home_par:"By", home_read:"read",
    home_back:"← Back",

    del_confirm:"Permanently delete this article?", del_done:"Article deleted.",

    profile_not_found:"Profile not found.", profile_member:"Member since", profile_reader:"Reader",
    profile_writer:"Writer", profile_edit:"Edit my profile", profile_arts:"Published articles",
    profile_none:"No articles published.",

    write_connect:"Log in to see your stats.",

    stats_articles:"Articles", stats_reads:"Reads", stats_words:"Words written",
    stats_avg:"Reads / article", stats_my:"My articles", stats_table_titre:"Title",
    stats_table_cat:"Category", stats_table_date:"Date", stats_table_reads:"Reads",
    stats_table_action:"Action", stats_none:"You haven't published any articles yet."
  }
};

// Rubriques : traduction fr → en (les articles stockent toujours le nom fr)
const CAT_EN = {
  'Économie':'Economy', 'Finance':'Finance', 'Politiques':'Politics', 'Sociologie':'Sociology',
  'Droit':'Law', 'Technologies':'Technology', 'Afrique':'Africa', 'Monde':'World',
  'Écologie':'Ecology', 'IA':'AI', 'Data Science':'Data Science'
};
const MONTH_EN = {
  'janvier':'January','février':'February','mars':'March','avril':'April','mai':'May','juin':'June',
  'juillet':'July','août':'August','septembre':'September','octobre':'October','novembre':'November','décembre':'December'
};

function t(key){
  return (I18N[_lang] && I18N[_lang][key]) || (I18N.fr[key]) || key;
}
function tCat(cat){
  return _lang==='en' ? (CAT_EN[cat]||cat) : cat;
}
function tDate(dateStr){
  if(_lang!=='en' || !dateStr) return dateStr;
  let out = dateStr;
  Object.keys(MONTH_EN).forEach(fr=>{ out = out.replace(new RegExp(fr,'i'), MONTH_EN[fr]); });
  return out;
}
function applyTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}
function updateLangButton(){
  const btn=document.getElementById('lang-toggle');
  if(btn) btn.textContent = _lang==='fr' ? 'EN' : 'FR';
}
function refreshCurrentPage(){
  const activePage=document.querySelector('.page.active');
  if(!activePage)return;
  const name=activePage.id.replace('page-','');
  if(name==='home') renderHome(currentActiveCat);
  else if(name==='mystats') renderMyStats();
  else if(name==='admin') renderAdmin();
}
function toggleLang(){
  _lang = _lang==='fr' ? 'en' : 'fr';
  try{ localStorage.setItem('eco_lang', _lang); }catch(e){}
  updateLangButton();
  applyTranslations();
  if(typeof setNavDate==='function') setNavDate();
  if(typeof renderNav==='function') renderNav();
  refreshCurrentPage();
}
