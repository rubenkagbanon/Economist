// ════════════════════════════════════════════════════════════
// email.js — Envoi des e-mails via la fonction serveur Supabase "send-email"
// ════════════════════════════════════════════════════════════
//
// Les e-mails partent de supabase/functions/send-email (Resend). Aucune clé
// n'est présente dans le navigateur, et le serveur décide du destinataire :
//   • vers OWNER_EMAIL       → "admin_notification" (ouvert à tous)
//   • message de bienvenue   → "welcome" (adresse du compte connecté uniquement)
//   • vers un autre membre   → "user_message" (compte admin uniquement)
// ────────────────────────────────────────────────────────────
const EMAIL_LOGO_URL = "https://www.econglobe.com/css/Logo.png";

// Conservé pour compatibilité avec main.js (plus rien à initialiser)
function initEmailJS(){}

// Envoi générique — renvoie true/false selon le succès
async function sendEmail(params){
  if(!window._sb?.functions){
    console.warn('Supabase indisponible : e-mail non envoyé.');
    return false;
  }
  const toOwner=(params.to_email||'').toLowerCase()===OWNER_EMAIL.toLowerCase();
  const type=params.type||(toOwner?'admin_notification':'user_message');
  try{
    const { data, error } = await _sb.functions.invoke('send-email', {
      body:{
        type,
        to:params.to_email,
        subject:params.subject,
        message:params.message,
        reply_to:params.reply_to,
        from_name:params.from_name,
        lang:typeof _lang!=='undefined'?_lang:'fr'
      }
    });
    if(error||!data?.ok){ console.error('Échec envoi e-mail :', error||data); return false; }
    return true;
  }catch(err){
    console.error('Échec envoi e-mail :', err);
    return false;
  }
}

// ═══════════════ PROPOSITION D'ARTICLE → notifie la rédaction ═══════════════
async function emailNotifyOwnerOfProposal({first,last,email,job,cat,subj,why,lang='fr'}){
  const english=lang==='en';
  const message = english
    ? `New article proposal — EconGlobe\n\nName: ${first} ${last}\nEmail: ${email}\n`+
      (job?`Profession: ${job}\n`:'')+
      `Category: ${cat}\nSubject: ${subj}\n`+
      (why?`Motivation: ${why}\n`:'')
    : `Nouvelle proposition d'article — EconGlobe\n\nNom : ${first} ${last}\nEmail : ${email}\n`+
      (job?`Profession : ${job}\n`:'')+
      `Rubrique : ${cat}\nSujet : ${subj}\n`+
      (why?`Motivation : ${why}\n`:'');
  const ok = await sendEmail({
    to_email: OWNER_EMAIL,
    subject: english ? `[EconGlobe] Proposal — ${first} ${last}` : `[EconGlobe] Proposition — ${first} ${last}`,
    from_name: `${first} ${last}`,
    reply_to: email,
    message
  });
  // Solution de repli : si l'envoi échoue, on ouvre quand même
  // un brouillon mailto pour ne jamais perdre la proposition.
  if(!ok){
    const body = encodeURIComponent(message);
    window.open(`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(english ? `[EconGlobe] Proposal — ${first} ${last}` : `[EconGlobe] Proposition — ${first} ${last}`)}&body=${body}`,'_blank');
  }
  return ok;
}

async function emailNotifyAdmin(subject, message){
  return sendEmail({to_email:OWNER_EMAIL,subject,from_name:'EconGlobe',reply_to:OWNER_EMAIL,message});
}

async function emailNotifyAdminNewArticle(article){
  const english=article.lang==='en';
  const subject=english?'[EconGlobe] New article for review':'[EconGlobe] Nouvel article à valider';
  const message=english
    ? `A new article was submitted for review.\n\nTitle: ${article.title}\nAuthor: ${article.author}\nCategory: ${article.cat}\nDate: ${article.date}`
    : `Un nouvel article a été envoyé pour validation.\n\nTitre : ${article.title}\nAuteur : ${article.author}\nRubrique : ${article.cat}\nDate : ${article.date}`;
  return emailNotifyAdmin(subject,message);
}

async function emailNotifyAdminNewAccount(user,lang='fr'){
  const english=lang==='en';
  const subject=english?'[EconGlobe] New account created':'[EconGlobe] Nouveau compte créé';
  const message=english
    ? `A new account was created.\n\nName: ${user.first||''} ${user.last||''}\nEmail: ${user.email}`
    : `Un nouveau compte a été créé.\n\nNom : ${user.first||''} ${user.last||''}\nEmail : ${user.email}`;
  return emailNotifyAdmin(subject,message);
}

async function emailNotifyAdminDeletedAccount(email,lang='fr'){
  const english=lang==='en';
  const subject=english?'[EconGlobe] Account deleted':'[EconGlobe] Compte supprimé';
  const message=english?`The account ${email} was deleted.`:`Le compte ${email} a été supprimé.`;
  return emailNotifyAdmin(subject,message);
}

// ═══════════════ CODE DE VÉRIFICATION (mot de passe oublié / accès rédacteur) ═══════════════
async function emailSendVerificationCode(toEmail, toName, code, purpose, lang='fr'){
  const english=lang==='en';
  const subject = purpose==='reset'
    ? (english ? 'EconGlobe — Your password reset code' : 'EconGlobe — Votre code de réinitialisation')
    : (english ? 'EconGlobe — Your writer access code' : 'EconGlobe — Votre code d\'accès rédacteur');
  const message = purpose==='reset'
    ? (english
      ? `Hello ${toName||''},\n\nHere is your verification code to reset your password: ${code}\n\nUse this code as soon as possible. If you did not request it, please ignore this message.\n\nEconGlobe`
      : `Bonjour ${toName||''},\n\nVoici votre code de vérification pour réinitialiser votre mot de passe : ${code}\n\nUtilisez ce code dès que possible. Si vous n’êtes pas à l'origine de cette demande, ignorez ce message.\n\nEconGlobe`)
    : (english
      ? `Hello ${toName||''},\n\nYour article idea was selected! Here is your writer access code: ${code}\n\nThis code gives you access to the editor to submit an article. After submission, you will need to request a new code.\n\nEconGlobe`
      : `Bonjour ${toName||''},\n\nVotre idée d'article a été retenue ! Voici votre code d'accès rédacteur : ${code}\n\nCe code permet d'accéder à l'éditeur pour publier un article. Après publication, vous devrez demander un nouveau code.\n\nEconGlobe`);
  const ok = await sendEmail({
    to_email: toEmail,
    subject,
    from_name: 'EconGlobe',
    reply_to: OWNER_EMAIL,
    message
  });
  return ok;
}

async function emailNotifyArticleDecision(article, approved){
  const authorUser=(article.owner_id&&users.find(user=>String(user.id)===String(article.owner_id)))||findAuthorUser(article.author);
  const toEmail=authorUser?.email||'';
  if(!toEmail)return false;
  const firstName=authorUser?.first||article.author||'';
  const english=article.lang==='en';
  const subject=approved
    ? (english ? 'Your article has been published' : 'Votre article a été publié')
    : (english ? 'Your article was not selected' : 'Votre article n’a pas été retenu');
  const message=approved
    ? (english ? `Hello ${firstName},\n\nGood news: your article “${article.title}” was accepted and published on EconGlobe.\n\nThank you for your contribution.` : `Bonjour ${firstName},\n\nBonne nouvelle : votre article « ${article.title} » a été accepté et publié sur EconGlobe.\n\nMerci pour votre contribution.`)
    : (english ? `Hello ${firstName},\n\nAfter review, your article “${article.title}” was not selected for publication and has been removed from our review space.\n\nThank you for your submission.` : `Bonjour ${firstName},\n\nAprès examen, votre article « ${article.title} » n’a pas été retenu pour publication et a été supprimé de notre espace de validation.\n\nMerci pour votre proposition.`);
  const messageHtml=message.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')+
    `<br><br><img src="${EMAIL_LOGO_URL}" alt="EconGlobe" style="width:96px;height:auto;display:block">`;
  return sendEmail({to_email:toEmail,subject,from_name:'EconGlobe',reply_to:OWNER_EMAIL,message,message_html:messageHtml,logo_url:EMAIL_LOGO_URL});
}

async function emailNotifyProposalRejected(proposal, lang='fr'){
  const toEmail=(proposal?.email||'').trim();
  if(!toEmail)return false;
  const english=lang==='en';
  const firstName=proposal.first||'';
  const subject=english?'Your proposal was not selected':'Votre proposition n’a pas été retenue';
  const message=english
    ? `Hello ${firstName},\n\nThank you for your proposal “${proposal.subj||''}”. After review, it was not selected for publication on EconGlobe.\n\nThank you for your interest.`
    : `Bonjour ${firstName},\n\nMerci pour votre proposition « ${proposal.subj||''} ». Après examen, elle n’a pas été retenue pour publication sur EconGlobe.\n\nMerci pour votre intérêt.`;
  const messageHtml=message.replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')+
    `<br><br><img src="${EMAIL_LOGO_URL}" alt="EconGlobe" style="width:96px;height:auto;display:block">`;
  return sendEmail({to_email:toEmail,subject,from_name:'EconGlobe',reply_to:OWNER_EMAIL,message,message_html:messageHtml,logo_url:EMAIL_LOGO_URL});
}

// ═══════════════ BIENVENUE (nouvelle inscription) ═══════════════
async function emailSendWelcome(toEmail, toFirstName){
  const message =
    `Bonjour ${toFirstName||''},\n\n`+
    `Bienvenue sur EconGlobe ! Votre compte a bien été créé avec l'adresse ${toEmail}.\n\n`+
    `Vous pouvez dès maintenant lire tous nos articles, et proposer les vôtres depuis "Proposer un article".\n\n`+
    `— EconGlobe`;
  return await sendEmail({
    type: 'welcome',
    to_email: toEmail,
    subject: 'Bienvenue sur EconGlobe !',
    from_name: 'EconGlobe',
    reply_to: OWNER_EMAIL,
    message
  });
}
