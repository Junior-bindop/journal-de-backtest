# Journal de Backtest — Application Web d'Archivage & Analyse Long Terme

Application web professionnelle, durable et indépendante conçue pour enregistrer, conserver, analyser et archiver des dizaines de milliers de trades de backtest (de 2006 à aujourd'hui et au-delà) avec plus de 10 000 captures d'écran, statistiques avancées, graphiques interactifs et espaces multi-associés.

---

## 1. Principes Fondamentaux & Règle d'Or (Anti-Vendor-Lock-in)

> **RÈGLE ABSOLUE : Les données ne doivent jamais exister uniquement sur Netlify.**
> 
> L'utilisateur conserve à tout moment le contrôle complet de ses données grâce à des sauvegardes locales régulières au format standard universel (ZIP contenant `database.json`, `trades.json`, `trades.csv` et l'arborescence physique des captures d'écran WebP).
> 
> En cas de départ de Netlify, les données sont immédiatement exploitables sur un autre hébergeur ou localement sans aucune perte.

---

## 2. Architecture Globale

```
+-----------------------------------------------------------------------------------+
|                                 APPLICATION WEB                                   |
|                      (Vite + React + TypeScript + Tailwind CSS)                   |
|                        Hébergée sur Netlify (CDN Edge / HTTPS)                     |
+-----------------------------------------------------------------------------------+
                                         |
     +-----------------------------------+-----------------------------------+
     |                                                                       |
     v                                                                       v
+-------------------------------+                       +----------------------------------+
|     LOCAL PC / CLIENT-SIDE    |                       |           CLOUD BACKEND          |
|-------------------------------|                       |----------------------------------|
| - Moteur Offline-First        |                       | - Base Relationnelle Cloud       |
| - Base locale IndexedDB       |                       |   PostgreSQL                     |
|   (Dexie.js: trades, colonnes)|   SYNCHRONISATION     | - Stockage Objets S3-Compatible  |
| - Cache d'images WebP locales |<=====================>|   (Dossiers stricts par associé) |
| - File d'attente de synchro   |   (Delta + Conflits)  | - Netlify Functions (Serverless) |
| - Sauvegardes complètes ZIP   |                       |   (Auth serveur & vérification)  |
| - Export autonome CSV / JSON  |                       | - Row Level Security (RLS)       |
+-------------------------------+                       +----------------------------------+
```

---

## 3. Fonctionnalités Clés Implémentées

### 📒 All Trades (Tableau inspiré de Notion)
- **Fluidité Extrême (50 000+ trades)** : Rendu virtualisé via `@tanstack/react-virtual` (seules les lignes visibles sont rendues dans le DOM, garantissant 60 FPS constants).
- **Numérotation Séquentielle Automatique** : Chaque trade possède un numéro d'affichage séquentiel (1, 2, 3...) calculé automatiquement par associé, distinct de son UUID interne.
- **Règle Absolue RR** :
  - `SL` : force automatiquement le RR à `-1.00R` (fond bordeaux/rouge), verrouillé en écriture.
  - `BE` : force automatiquement le RR à `0.00R` (fond neutre gris).
  - `TP` : saisie numérique libre par l'utilisateur, formatée visuellement en vert (`+2.50R`).
  - Stockage en base sous forme de nombre pur (`2.5`).
- **Date Étendue** : Sélecteur permettant de naviguer sans contrainte à partir de l'an 2000 jusqu'aux dates futures.
- **Colonnes Personnalisables** : Ajout dynamique de colonnes (`TEXT`, `NUMBER`, `SELECT`, `MULTI-SELECT`, `DATE`, `CHECKBOX`) sans modifier le code source.
- **Filtres Combinés AND / OR** : Filtrage multicritères instantané sur toutes les colonnes par égalité, exclusion, supériorité, infériorité ou inclusion.
- **Multi-Tris & Recherche Globale** : Tri ascendant/descendant par date ou numéro et recherche plein texte (N°, actif, notes, session).
- **Corbeille & Soft Delete** : Suppression logique (`deleted_at`) avec possibilité de restauration ou de suppression définitive.

### 🖼️ Gestion des Captures d'Écran
- **Ajout Multi-Source** : Coller directement depuis le presse-papier (`Ctrl+V`), glisser-déposer ou sélection de fichiers.
- **Compression WebP & Miniatures** : Compression instantanée côté navigateur (1920px max pour l'original, 240px pour la miniature du tableau).
- **Règle Absolue de Remplacement** :
  1. Sélection de la nouvelle image
  2. Upload et compression de la nouvelle image
  3. Vérification de l'intégrité
  4. Mise à jour de la référence en base de données
  5. Suppression de l'ancienne image **uniquement après confirmation**
- **Visionneuse Plein Écran** : Zoom progressif, pan/déplacement, navigation précédente/suivante (flèches clavier), touche `ESC`, double-clic pour zoomer.
- **Commentaire Dédié par Image** : Chaque capture possède son champ de commentaire individuel extensible et persistant.
- **Détecteur d'Images Orphelines** : Scanner permettant de détecter et supprimer les captures non reliées à un trade.

### 📊 Statistiques & 📉 Graphiques
- **15+ Métriques Financières** : Total trades, TP, SL, BE, Winrate, Max winning streak, Max losing streak, Max drawdown en R, Profit factor, Espérance (Expectancy), Gain moyen, Perte moyenne, Rétention fréquente, Total R, RR moyen.
- **Respect Strict des Filtres** : Les statistiques et graphiques se recalculent dynamiquement selon les filtres sélectionnés (année, actif, session, BUY/SELL).
- **Graphiques Interactifs** :
  - Courbe d'équité (Equity Curve cumulative en R)
  - Courbe de Drawdown
  - Répartition TP / SL / BE en anneau
  - Histogramme de distribution des gains et pertes en R
  - Performance historique par mois, par session et par jour de la semaine (Lundi à Vendredi).

### 👥 Associés & Sécurité des Permissions
- **Espaces Indépendants** : `BINI_JR`, `LINHO`, et nouveaux associés inscrits.
- **Consultation Mutuelle** : Chaque associé peut consulter en lecture seule l'espace de ses confrères.
- **Modification Protégée** : Toute tentative d'ajout, modification ou suppression dans l'espace d'un autre associé déclenche une modale demandant le mot de passe de ce dernier, validé côté serveur/crypto avant délivrance d'un accès temporaire.

### 💾 Sauvegarde, Restauration & Mode Hors Ligne
- **Bouton « EXPORTER MES DONNÉES »** : Télécharge une archive `.zip` complète (`manifest.json`, `database.json`, `trades.json`, `trades.csv`, `columns.json`, `settings.json`, et le dossier physique `images/`).
- **Exports Légers Autonomes** : Téléchargement instantané des données en CSV (compatible Excel/Python) ou JSON.
- **Assistant de Restauration en 8 Étapes** : Contrôle d'intégrité, prévisualisation du contenu (nombre de trades, d'images et dates), choix du mode (fusion vs remplacement complet), **sauvegarde de sécurité préalable automatique** et vérification finale.
- **Offline-First & Indicateur** : Utilisation d'IndexedDB (Dexie.js). Indicateur d'état permanent dans l'en-tête : 🟢 Synchronisé / 🟠 Synchronisation... / 🔴 Hors connexion.

---

## 4. Installation & Démarrage en Local

### Prérequis
- Node.js version 18+ (testé avec Node v24)
- npm version 9+

### Étapes d'installation
```bash
# Cloner le dépôt
git clone <url-du-repo>
cd "Journal de Backtest"

# Installer les dépendances
npm install

# Démarrer le serveur de développement local
npm run dev
```

L'application s'ouvrira automatiquement à l'adresse : `http://localhost:5173`.

### Identifiants par défaut
- Associé 1 : `BINI_JR` / Mot de passe : `password123`
- Associé 2 : `LINHO` / Mot de passe : `password123`

---

## 5. Structure du Projet

```
Journal de Backtest/
├── dist/                        # Build de production compilé et minifié
├── public/
│   ├── favicon.svg              # Favicon vectoriel de l'application
│   └── manifest.json            # PWA manifest
├── src/
│   ├── components/
│   │   ├── common/              # Modale de protection cross-associé
│   │   └── layout/              # Navbar, sélecteur d'associé, indicateur de synchro
│   ├── features/
│   │   ├── associates/          # Vue de gestion et comparaison des associés
│   │   ├── auth/                # Contexte d'authentification et formulaire de connexion/inscription
│   │   ├── backup/              # Moteur d'export ZIP complet, export CSV/JSON et restauration 8 étapes
│   │   ├── charts/              # Vue des graphiques (Equity curve, drawdown, distributions)
│   │   ├── images/              # Visionneuse lightbox plein écran, zoom, pan et commentaires
│   │   ├── profile/             # Gestion du profil, mot de passe et thème clair/sombre
│   │   ├── statistics/          # Cartes de KPIs (15+ métriques) et ventilations analytiques
│   │   └── trades/              # Tableau virtuel Notion, gestion des colonnes, création de trades, filtres
│   ├── lib/
│   │   ├── db/                  # Dexie.js (schéma IndexedDB local & seed initial 2006-2026)
│   │   ├── storage/             # Service de stockage et règle absolue de remplacement d'images
│   │   └── sync/                # Contexte de synchronisation et détection en ligne/hors-ligne
│   ├── types/                   # Définitions TypeScript complètes (Trade, CustomColumn, Option, etc.)
│   ├── utils/                   # Moteur statistique, compression d'images WebP, crypto/hash
│   ├── App.tsx                  # Composant racine orchestrant les onglets et le thème
│   ├── main.tsx                 # Point d'entrée React avec les providers
│   └── index.css                # Styles Tailwind et variables de thèmes
├── netlify.toml                 # Configuration Netlify (redirections SPA, cache & sécurité)
├── vite.config.ts               # Configuration du bundler Vite et alias `@`
├── tailwind.config.js           # Configuration du design system et du mode sombre
├── tsconfig.json                # Typage strict TypeScript
└── package.json
```

---

## 6. Déploiement sur Netlify

### Méthode 1 : Déploiement Continu via GitHub / GitLab
1. Connectez votre dépôt Git à votre compte [Netlify](https://app.netlify.com).
2. Paramètres de build :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
3. Le fichier `netlify.toml` inclus gère automatiquement la réécriture des URLs SPA (`/* -> /index.html`) et applique les en-têtes HTTP de sécurité.
4. Cliquez sur **Deploy site**.

### Méthode 2 : Déploiement Manuel par Glisser-Déposer (Netlify Drop)
1. Exécutez en local :
   ```bash
   npm run build
   ```
2. Glissez-déposez le dossier `dist/` généré directement sur l'interface de Netlify Drop.

---

## 7. Migration vers un Autre Hébergeur

L'application a été expressément conçue sans dépendance propriétaire à Netlify.

### Pour migrer vers Vercel :
1. Créez un nouveau projet sur Vercel et pointez sur le dépôt.
2. Vercel détecte automatiquement Vite et utilise `dist`.
3. Ajoutez un fichier `vercel.json` si vous souhaitez personnaliser les en-têtes :
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Pour migrer vers Docker / Serveur Nginx :
Exécutez simplement `npm run build` et servez le dossier `dist/` avec la configuration Nginx suivante :
```nginx
server {
    listen 80;
    server_name backtest.votre-domaine.com;
    root /var/www/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. Sauvegarde & Archivage Recommandé

- **Fréquence conseillée** : Après chaque session de backtest importante ou au minimum une fois par mois, cliquez sur **« SAUVEGARDES » > « TÉLÉCHARGER L'ARCHIVE COMPLÈTE (.ZIP) »**.
- Conservez vos archives dans un répertoire dédié sur votre PC ou synchronisé sur votre disque dur externe / cloud personnel (OneDrive, Google Drive, NAS).
- Même dans 10 ou 20 ans, les fichiers `trades.csv` et les images WebP restent lisibles sur n'importe quel système d'exploitation sans nécessiter de logiciel spécifique.
