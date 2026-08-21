# Economist

<p align="center">
   <a href="https://www.econglobe.com/">
      <img src="css/Logo.png" alt="Logo du site Economist" width="220">
   </a>
</p>

**Economist** est une plateforme éditoriale consacrée à l'actualité, à
l'analyse et au partage de perspectives sur les grands enjeux contemporains.
Elle aborde notamment l'économie, la finance, la politique, la sociologie,
le droit, la technologie, la santé, l'écologie, l'intelligence artificielle et
la data science.

Les visiteurs peuvent consulter et rechercher des articles dans plusieurs
domaines. Les membres peuvent créer un compte, proposer un sujet, rédiger des
articles avec un éditeur de blocs et publier leurs analyses. Le site propose
également un espace de gestion réservé à l'administration.

## Voir le site

[**www.econglobe.com**](https://www.econglobe.com/)

---

## Informations techniques

Cette section est destinée aux personnes qui maintiennent le projet. Les
identifiants, clés API, adresses e-mail d'administration et paramètres de
sécurité ne doivent jamais être ajoutés à ce fichier ni publiés dans le dépôt.

### Arborescence

```
economist/
├── index.html              ← page principale (structure uniquement)
├── css/
│   ├── style.css           ← styles de base (clair)
│   └── dark-theme.css      ← surcharge du mode nuit
└── js/
    ├── supabase-config.js  ← connexion à la base de données
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

Chargez le dossier entier sur votre hébergement en conservant cette
arborescence : les chemins utilisés par `index.html` sont relatifs.

La configuration des services externes et les procédures de déploiement
doivent rester dans une documentation privée destinée aux mainteneurs.
