# Economist — structure du projet

## 📁 Arborescence

```
economist/
├── index.html              ← page principale (structure uniquement)
├── css/
│   ├── style.css           ← styles de base (clair)
│   └── dark-theme.css      ← surcharge du mode nuit
└── js/
    ├── firebase-config.js  ← connexion à la base de données
    ├── data.js              ← état global + accès base de données
    ├── email.js             ← envoi de vrais e-mails (EmailJS)
    ├── i18n.js               ← traductions FR / EN
    ├── ui.js                 ← navigation, recherche, modales, thème
    ├── auth.js               ← connexion / inscription / mot de passe oublié
    ├── articles.js           ← accueil, article, profil, mes statistiques
    ├── admin.js               ← espace administrateur
    ├── editor.js              ← proposition, écriture, éditeur de blocs
    ├── planet.js              ← fonds animés
    └── main.js                ← onboarding + démarrage de l'app
```

Chargez le dossier entier sur votre hébergement (Firebase Hosting, Netlify,
Vercel, GitHub Pages…) en conservant cette arborescence : les chemins dans
`index.html` (`css/style.css`, `js/data.js`, etc.) sont relatifs.

---

## ⚠️ 1. Pourquoi l'e-mail ne fonctionnait pas — et comment le faire marcher

L'ancienne version utilisait des liens `mailto:`, qui ouvrent l'application
de messagerie **de la personne qui utilise le site**. Si elle n'a pas Gmail
ou Outlook configuré sur son téléphone (le cas le plus courant), rien ne se
passe : aucun e-mail n'est réellement envoyé.

Le site utilise maintenant **EmailJS**, un service qui envoie de vrais
e-mails directement depuis le site, sans serveur à gérer. Configuration
(5 minutes, gratuit jusqu'à 200 e-mails/mois) :

1. Créez un compte sur **https://www.emailjs.com**
2. *Email Services* → connectez votre Gmail (ou autre) → notez le **Service ID**
3. *Email Templates* → créez un template utilisant ces variables :
   `{{to_email}}`, `{{subject}}`, `{{from_name}}`, `{{reply_to}}`, `{{message}}`
   → notez le **Template ID**
4. *Account → General* → copiez votre **Public Key**
5. Ouvrez `js/email.js` et remplacez les 3 valeurs en haut du fichier :
   ```js
   const EMAILJS_PUBLIC_KEY  = "...";
   const EMAILJS_SERVICE_ID  = "...";
   const EMAILJS_TEMPLATE_ID = "...";
   ```

Tant que ce n'est pas fait, le site n'affiche qu'un avertissement dans la
console — pour la proposition d'article uniquement, il rouvre alors un
brouillon `mailto:` en secours pour ne jamais perdre une demande.

---

## ⚠️ 2. Protéger réellement les données de vos utilisateurs

Déplacer le code Firebase dans son propre fichier (`firebase-config.js`)
organise le projet, **mais ce n'est pas ce qui protège vos utilisateurs** :
cette configuration n'est pas un secret, elle est visible côté client même
chez les plus grandes entreprises.

La vraie protection se fait dans **Firebase Console → Realtime Database →
Rules**. Actuellement votre base est probablement en "mode test", qui autorise
n'importe qui à lire/écrire toutes les données pendant 30 jours, puis bloque
tout ensuite. Avant de mettre le site en ligne pour de vrai, remplacez les
règles par quelque chose comme :

```json
{
  "rules": {
    "articles": { ".read": true, ".write": true },
    "users":    { ".read": true, ".write": true },
    "access_codes": { ".read": false, ".write": false },
    "password_resets": { ".read": false, ".write": false },
    "proposals": { ".read": false, ".write": true }
  }
}
```
(à ajuster selon vos besoins réels — l'idéal à terme est d'ajouter
Firebase Authentication pour des règles par utilisateur plutôt que ce
système de mots de passe stockés en clair, hérité de la version originale).

---

## 3. Espace administrateur

Déjà présent et enrichi : connectez-vous avec le compte dont l'e-mail
correspond à `OWNER_EMAIL` dans `js/data.js` (actuellement
`theseeconomists@gmail.com` — changez-le pour le vôtre), puis ouvrez
**Admin** dans le menu. Vous y trouverez :
- les statistiques globales,
- l'envoi manuel d'un code d'accès à n'importe quel e-mail,
- la liste des propositions d'articles reçues, avec un bouton pour
  envoyer directement un code au proposant,
- la gestion des codes à usage limité,
- la suppression d'articles et de comptes membres.

---

## 4. Mot de passe oublié

Nouveau lien "Mot de passe oublié ?" sous le formulaire de connexion :
la personne entre son e-mail → reçoit un code à 6 chiffres (valable
15 minutes) → l'entre avec un nouveau mot de passe. Nécessite qu'EmailJS
soit configuré (voir point 1).
