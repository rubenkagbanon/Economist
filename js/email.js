// ════════════════════════════════════════════════════════════
// email.js — Envoi de vrais e-mails via EmailJS (sans backend)
// ════════════════════════════════════════════════════════════
//
// Pourquoi ce fichier existe :
// L'ancienne version utilisait des liens "mailto:", qui ouvrent le
// logiciel de messagerie DE L'UTILISATEUR — si la personne n'a pas
// Gmail/Outlook configuré sur son appareil (très fréquent sur mobile),
// rien ne se passe et aucun e-mail n'est réellement envoyé.
// EmailJS envoie le mail directement depuis le site, sans serveur.
//
// ────────────────────────────────────────────────────────────
// ⚠️  CONFIGURATION REQUISE (5 minutes, gratuit) :
// 1. Créez un compte sur https://www.emailjs.com
// 2. "Email Services" → ajoutez votre Gmail (ou autre) → notez le SERVICE_ID
// 3. "Email Templates" → créez un template avec les variables utilisées
//    ci-dessous ({{to_email}}, {{subject}}, {{message}}, etc.) → notez le TEMPLATE_ID
// 4. "Account" → "General" → copiez votre PUBLIC_KEY
// 5. Remplacez les 3 valeurs ci-dessous.
// ────────────────────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = "VOTRE_PUBLIC_KEY";     // ex: "a1B2c3D4e5F6g7H8i"
const EMAILJS_SERVICE_ID  = "VOTRE_SERVICE_ID";     // ex: "service_economist"
const EMAILJS_TEMPLATE_ID = "VOTRE_TEMPLATE_ID";    // ex: "template_notif"

let _emailjsReady = false;
function initEmailJS(){
  if(typeof emailjs === 'undefined'){
    console.warn('EmailJS non chargé — vérifiez la balise <script> dans index.html');
    return;
  }
  if(EMAILJS_PUBLIC_KEY==="VOTRE_PUBLIC_KEY"){
    console.warn('EmailJS : clés non configurées (voir js/email.js). Les e-mails ne seront pas envoyés tant que ce n\'est pas fait.');
    return;
  }
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  _emailjsReady = true;
}

// Envoi générique — renvoie true/false selon le succès
async function sendEmail(params){
  if(!_emailjsReady){
    console.warn('EmailJS non configuré : e-mail non envoyé.', params);
    return false;
  }
  try{
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    return true;
  }catch(err){
    console.error('Échec envoi e-mail :', err);
    return false;
  }
}

// ═══════════════ PROPOSITION D'ARTICLE → notifie la rédaction ═══════════════
async function emailNotifyOwnerOfProposal({first,last,email,job,cat,subj,why}){
  const message =
    `Nouvelle proposition d'article — Economist\n\n`+
    `Nom : ${first} ${last}\nEmail : ${email}\n`+
    (job?`Profession : ${job}\n`:'')+
    `Rubrique : ${cat}\n\nSujet :\n${subj}\n\n`+
    (why?`Motivation :\n${why}\n`:'');
  const ok = await sendEmail({
    to_email: OWNER_EMAIL,
    subject: `[Economist] Proposition — ${first} ${last}`,
    from_name: `${first} ${last}`,
    reply_to: email,
    message
  });
  // Solution de repli : si EmailJS n'est pas configuré, on ouvre quand même
  // un brouillon mailto pour ne jamais perdre la proposition.
  if(!ok){
    const body = encodeURIComponent(message);
    window.open(`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(`[Economist] Proposition — ${first} ${last}`)}&body=${body}`,'_blank');
  }
  return ok;
}

// ═══════════════ CODE DE VÉRIFICATION (mot de passe oublié / accès rédacteur) ═══════════════
async function emailSendVerificationCode(toEmail, toName, code, purpose){
  const subject = purpose==='reset'
    ? 'Economist — Votre code de réinitialisation'
    : 'Economist — Votre code d\'accès rédacteur';
  const message = purpose==='reset'
    ? `Bonjour ${toName||''},\n\nVoici votre code de vérification pour réinitialiser votre mot de passe : ${code}\n\nCe code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n— Economist`
    : `Bonjour ${toName||''},\n\nVotre idée d'article a été retenue ! Voici votre code d'accès rédacteur : ${code}\n\n— Economist`;
  const ok = await sendEmail({
    to_email: toEmail,
    subject,
    from_name: 'Economist',
    reply_to: OWNER_EMAIL,
    message
  });
  return ok;
}
