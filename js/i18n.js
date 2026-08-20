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
    cat_dro:"Droit", cat_tec:"Technologies", cat_health:"Santé", cat_ecol:"Écologie",
    cat_ia:"IA", cat_data:"Data Science",

    nav_propose:"Proposer un article", nav_write:"Écrire un article", nav_stats:"Mes statistiques", nav_about:"À propos",
    nav_admin:"Admin", nav_login:"S'abonner / Connexion", nav_logout:"Déconnexion", nav_privacy:"Confidentialité", nav_rules:"Conditions d’utilisation",

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

    about_intro_title:"Economist",
    about_intro_desc:"Un espace indépendant pour lire, comprendre et partager les grandes transformations économiques et sociales.",
    home_coming:"À paraître", home_desc:"Nos rédacteurs travaillent sur de nouveaux articles.",
    home_none_all:"Aucun article publié pour l'instant.", home_none_cat:"Aucun article en «",
    home_cta:"Proposer un article →", home_alire:"À lire aussi", home_par:"Par", home_read:"de lecture",
    home_back:"← Retour",

    del_confirm:"Supprimer définitivement cet article ?", del_done:"Article supprimé.",

    profile_not_found:"Profil introuvable.", profile_member:"Membre depuis le", profile_reader:"Lecteur",
    profile_writer:"Rédacteur", profile_edit:"Modifier mon profil", profile_share:"Partager le profil",
    profile_shared:"Lien du profil copié.", profile_share_error:"Impossible de copier le lien.", profile_arts:"Articles publiés",
    profile_none:"Aucun article publié.",

    write_connect:"Connectez-vous pour voir vos statistiques.",

    stats_articles:"Articles", stats_reads:"Lectures", stats_words:"Mots écrits",
    stats_avg:"Lectures / article", stats_my:"Mes articles", stats_table_titre:"Titre",
    stats_table_cat:"Rubrique", stats_table_date:"Date", stats_table_reads:"Lectures",
    stats_table_action:"Action", stats_none:"Vous n'avez publié aucun article.",
    search_label:"Rechercher", search_placeholder:"Articles, auteurs…", search_users:"Utilisateurs", search_articles:"Articles", search_empty:"Aucun résultat",
    editor_paragraph:"Paragraphe", editor_h1:"Titre H1", editor_h2:"Sous-titre H2", editor_h3:"Sous-titre H3", editor_image:"Image", editor_quote:"Citation", editor_separator:"Séparateur", editor_info:"Info", editor_sources:"Sources", editor_credits:"Crédits",
    editor_choose:"Choisir le type de bloc", editor_add_here:"+ Ajouter ici", editor_add_title:"Insérer un bloc à cet emplacement",
    loading:"Economist · Connexion à la base…", footer_rights:"Tous droits réservés.", privacy_search:"Rechercher dans la politique de confidentialité", rules_search:"Rechercher dans les conditions d’utilisation"
  },
  en: {
    auth_welcome:"Welcome", auth_sync:"Your account is synced across all your devices.",
    auth_login:"Log in", auth_signup:"Create account", auth_email:"Email", auth_pwd:"Password",
    auth_err_login:"Incorrect email or password.", auth_btn_login:"Log in",
    auth_no_account:"No account?", auth_ok_created:"Account created!", auth_btn_signup:"Create my account",
    auth_err_fields:"Please fill in all fields.", auth_err_short:"8 characters minimum.",
    auth_err_match:"Passwords do not match.", auth_err_email:"This email is already in use.",

    cat_une:"Front page", cat_eco:"Economy", cat_fin:"Finance", cat_pol:"Politics", cat_soc:"Sociology",
    cat_dro:"Law", cat_tec:"Technology", cat_health:"Health", cat_ecol:"Ecology",
    cat_ia:"AI", cat_data:"Data Science",

    nav_propose:"Submit an article", nav_write:"Write an article", nav_stats:"My statistics", nav_about:"About",
    nav_admin:"Admin", nav_login:"Subscribe / Log in", nav_logout:"Log out", nav_privacy:"Privacy", nav_rules:"Terms of Use",

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

    about_intro_title:"Economist: understand the economy and the world",
    about_intro_desc:"An editorial platform publishing news articles, analysis and perspectives on economics, finance, politics, data science, technology and social change.",
    home_coming:"Coming soon", home_desc:"Our writers are working on new articles.",
    home_none_all:"No articles published yet.", home_none_cat:"No articles in «",
    home_cta:"Submit an article →", home_alire:"Also worth reading", home_par:"By", home_read:"read",
    home_back:"← Back",

    del_confirm:"Permanently delete this article?", del_done:"Article deleted.",

    profile_not_found:"Profile not found.", profile_member:"Member since", profile_reader:"Reader",
    profile_writer:"Writer", profile_edit:"Edit my profile", profile_share:"Share profile",
    profile_shared:"Profile link copied.", profile_share_error:"Unable to copy the link.", profile_arts:"Published articles",
    profile_none:"No articles published.",

    write_connect:"Log in to see your stats.",

    stats_articles:"Articles", stats_reads:"Reads", stats_words:"Words written",
    stats_avg:"Reads / article", stats_my:"My articles", stats_table_titre:"Title",
    stats_table_cat:"Category", stats_table_date:"Date", stats_table_reads:"Reads",
    stats_table_action:"Action", stats_none:"You haven't published any articles yet.",
    search_label:"Search", search_placeholder:"Articles, authors…", search_users:"Users", search_articles:"Articles", search_empty:"No results",
    editor_paragraph:"Paragraph", editor_h1:"H1 title", editor_h2:"H2 subtitle", editor_h3:"H3 subtitle", editor_image:"Image", editor_quote:"Quote", editor_separator:"Separator", editor_info:"Info", editor_sources:"Sources", editor_credits:"Credits",
    editor_choose:"Choose a block type", editor_add_here:"+ Add here", editor_add_title:"Insert a block at this position",
    loading:"Economist · Connecting to database…", footer_rights:"All rights reserved.", privacy_search:"Search the privacy policy", rules_search:"Search the Terms of Use"
  }
};

// Rubriques : traduction fr → en (les articles stockent toujours le nom fr)
const CAT_EN = {
  'Économie':'Economy', 'Finance':'Finance', 'Politiques':'Politics', 'Sociologie':'Sociology',
  'Droit':'Law', 'Technologies':'Technology', 'Santé':'Health',
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
function tEmptyCategory(cat){
  return _lang==='en'
    ? `No articles in “${tCat(cat)}” for now.`
    : `Aucun article en « ${tCat(cat)} » pour l'instant.`;
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    el.title = t(el.getAttribute('data-i18n-title'));
  });
}
function updateLangButton(){
  const btn=document.getElementById('lang-toggle');
  if(btn) btn.textContent = _lang==='fr' ? 'EN' : 'FR';
  document.querySelectorAll('.help-lang').forEach(helpButton=>{
    helpButton.textContent = _lang==='fr' ? 'EN' : 'FR';
  });
}
const legalFrenchContent = new Map();
function setLegalText(selector, translations){
  document.querySelectorAll(selector).forEach((el,index)=>{
    if(!legalFrenchContent.has(el)) legalFrenchContent.set(el, el.innerHTML);
    if(_lang==='en' && translations[index]!==undefined) el.innerHTML=translations[index];
    if(_lang==='fr') el.innerHTML=legalFrenchContent.get(el);
  });
}
function translateLegalPages(){
  setLegalText('.help-kicker', ['Help Center','Help Center']);
  setLegalText('.help-back', ['Back to site','Back to site']);
  setLegalText('.help-sidebar-label', ['Economist Help','Economist Help']);
  setLegalText('#privacy-article .help-article-kicker', ['Privacy and data']);
  setLegalText('#rules-article .help-article-kicker', ['Rules and policies']);
  setLegalText('#privacy-article > h2', ['Privacy Policy']);
  setLegalText('#rules-article > h2', ['Terms of Use']);
  setLegalText('#privacy-article .help-article-lead', ['At Economist, we want you to understand what information is used to operate the platform, publish articles and protect your account.']);
  setLegalText('#rules-article .help-article-lead', ['These terms explain how to use Economist, publish content and participate responsibly on the platform.']);
  setLegalText('.help-updated', ['Last updated: August 20, 2026','Last updated: August 20, 2026']);
  setLegalText('.help-callout strong', ['In brief','In brief']);
  setLegalText('#privacy-article .help-callout p', ['This policy explains what information Economist receives, how it is used and what choices you have to manage your data.']);
  setLegalText('#rules-article .help-callout p', ['Economist is an editorial space covering news and analysis across several fields. By using the service, you agree to respect other users, copyrights and the publishing rules below.']);
  setLegalText('#privacy-article .help-sidebar a', ['Privacy Policy','Information collected','How we use information','Sharing and third-party services','Your rights','Contact']);
  setLegalText('#rules-article .help-sidebar a', ['Terms of Use','Account and access','Content and rights','Safety and moderation','Contact']);
  setLegalText('#privacy-article .help-section h2', ['Purpose of this policy','Information collected','How we use information','Sharing and third-party services','Retention and security','Your rights','Changes to this policy','Contact us']);
  setLegalText('#privacy-article .help-section h3', ['Information you provide','Usage-related information','Google sign-in']);
  setLegalText('#privacy-article .help-section p', [
    'This policy applies to the Economist website and its reading, search, account creation and article publishing features.',
    'It explains the information we receive, how it is used and the choices available to you. It does not replace the service rules available on the <a href="/terms" onclick="event.preventDefault();showPage(\'rules\')">Terms of Use</a> page.',
    'When you create or update an account, we may receive your first name, last name, email address, biography and profile photo. When you publish, we store the title, deck, text, images, sources and credits associated with the article.',
    'The service may record information needed to operate, such as your sign-in session, selected language, visual theme and article reading statistics.',
    'If you choose Google OAuth, Supabase Auth processes the information needed to sign you in, including your email address and public Google profile information.',
    'We use this information to create and secure accounts, display profiles and articles, enable search, manage publishing rights, measure readership and improve Economist.',
    'User-published content may be publicly visible depending on the site features. Do not publish personal information you want to keep private.',
    'We may use service providers needed to operate the platform, including Supabase for authentication and application storage, Google for OAuth sign-in and EmailJS for certain emails configured by the administrator.',
    'We do not sell your personal information. We may disclose information when required by law, to protect the service or to respond to a valid legal request.',
    'We retain information as long as necessary to provide the service, maintain published articles, meet our obligations and resolve disputes. Retention periods may vary by data type and purpose.',
    'We apply reasonable security measures. However, no online service can guarantee absolute protection against every risk.',
    'Depending on your situation and applicable law, you may request access to, correction of or deletion of your data, as well as information about its processing.',
    'To exercise these rights, contact the Economist team using the email address linked to your account. We may request additional information to verify your identity.',
    'We may update this policy when the service changes or regulations require it. The update date at the top of this page identifies the current version.',
    'For questions about this policy or your data, contact the Economist team through the service administration email address.'
  ]);
  setLegalText('#rules-article .help-section h3', ['1. Account and access','2. Content and rights','3. Safety and moderation','4. How the service works','5. Personal data','6. Contact']);
  setLegalText('#rules-article .help-section h4', ['Authorized publishing','Accuracy and transparency','Our actions']);
  setLegalText('#rules-article .help-section p', [
    'You must provide accurate information when creating your account and protect your credentials. You may not use another person’s account, share restricted access or attempt to bypass the service controls.',
    'Access to writing and publishing may require approval or a code provided by Economist. This control helps preserve the quality and security of the platform.',
    'You remain responsible for the text, images, sources and links you add. You must have the necessary permissions and respect copyrights, trademarks and the privacy of people mentioned.',
    'Articles should be written in good faith. When appropriate, cite your sources and clearly distinguish facts, analysis, opinions and content generated or assisted by a tool.',
    'You may not publish illegal, fraudulent, defamatory, hateful, misleading or harmful content, content that violates another person’s rights, or content intended to disrupt the service.',
    'Economist may hide or remove content, limit a feature or suspend an account when a rule is broken, a security risk is identified or a legal obligation requires it.',
    'The service may change, be updated or experience temporary interruptions. Reading statistics, recommendations and article visibility may vary as the platform operates.',
    'Economist does not guarantee that every piece of content will be published, recommended or available without interruption.',
    'Data related to your account and use of the service is handled according to our <a href="/privacy" onclick="event.preventDefault();showPage(\'privacy\')">Privacy Policy</a>.',
    'If you have a question about these terms or want to report content, contact the Economist team through the service administration email address.'
  ]);
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
  translateLegalPages();
  if(typeof setNavDate==='function') setNavDate();
  if(typeof renderNav==='function') renderNav();
  refreshCurrentPage();
}
