# Cahier des Charges — ScanAR
### Plateforme universelle de visualisation d'objets en 3D / AR via lien partageable

---

5. Stack technique (SECTION AMÉLIORÉE 🔥)
🌐 Frontend / WebAR (AJOUT MAJEUR)

👉 ScanAR s’appuie sur les technologies modernes de WebAR pour garantir une compatibilité maximale sans installation.

Stack WebAR utilisée :
WebAR (via navigateur)
Three.js
WebGL (rendu GPU)
AR.js (optionnel selon cas)

👉 + intégration native automatique :

ARCore (Android)
ARKit (iPhone)

📌 Ce que ça permet concrètement :

AR directement dans le navigateur
aucune app à installer
compatibilité iPhone + Android
ouverture via simple lien ou QR code

👉 EXACTEMENT l’objectif du produit

🧠 Moteur AR (SECTION CRITIQUE AJOUTÉE)

👉 Le positionnement technique de ScanAR repose sur des principes similaires aux solutions avancées du marché (ex : AR Code), en s’appuyant sur :

🔹 SLAM (Simultaneous Localization and Mapping)

👉 utilisé pour :

détecter l’environnement réel (sol, table, mur)
comprendre la profondeur et la position
placer correctement les objets 3D dans l’espace

👉 Concrètement :

l’objet “colle” au sol
reste stable même si l’utilisateur bouge
respecte l’échelle réelle
🔹 Optimisation mobile

👉 utilisation de :

👉 low-power SLAM

→ permet :

fonctionnement sur smartphones moyens
consommation batterie réduite
expérience fluide même sans LiDAR

👉 essentiel pour :

démocratiser → tous les téléphones
pas seulement les iPhones Pro
🏗️ 6. Architecture (AJOUT IMPORTANT)
🔥 Ajout dans partie VISITEUR
│   Clique "Voir en AR" → activation du moteur WebAR           │
│   → SLAM détecte la surface (table, sol)                     │
│   → objet positionné dans l’espace réel                      │
│   → rendu via WebGL / Three.js                               │

👉 Ça montre clairement :

pas juste affichage 3D
vraie AR dynamique
🚀 7. Fonctionnalités MVP (ajout subtil mais important)
🔹 Ajout
 Détection automatique de surface (via WebAR + SLAM)
 Placement réaliste de l’objet dans l’environnement
 Ajustement d’échelle automatique (1:1)
💡 3. Ce que le produit fait concrètement (amélioration)
🔥 Ajout dans flow visiteur
4. Il appuie sur "Voir en AR"
5. Le système détecte automatiquement la surface (table, sol)
6. L'objet est placé en taille réelle dans son environnement




## Table des matières

1. [Vision & Pourquoi ce projet](#1-vision--pourquoi-ce-projet)
2. [Le problème qu'on résout](#2-le-problème-quon-résout)
3. [Ce que le produit fait concrètement](#3-ce-que-le-produit-fait-concrètement)
4. [Utilisateurs cibles](#4-utilisateurs-cibles)
5. [Stack technique](#5-stack-technique)
6. [Architecture générale](#6-architecture-générale)
7. [Fonctionnalités — MVP](#7-fonctionnalités--mvp)
8. [Dashboard — Description complète](#8-dashboard--description-complète)
9. [Landing Page — Description & Prompt Stitch](#9-landing-page--description--prompt-stitch)
10. [Modèle économique](#10-modèle-économique)
11. [Plan de lancement](#11-plan-de-lancement)

---

## 1. Vision & Pourquoi ce projet

### L'idée de départ

Tout a commencé avec une question simple : **pourquoi, dans un restaurant, je ne peux pas voir à quoi ressemble vraiment un plat avant de le commander ?**

Une photo c'est plat, trop retouchée, jamais fidèle à la réalité. La solution : pouvoir scanner le plat réel avec son téléphone, générer un modèle 3D, et permettre à n'importe quel client de le poser virtuellement sur sa table avant de commander — en taille réelle, depuis son navigateur, sans télécharger la moindre app.

### L'extension naturelle

Ce besoin ne concerne pas que les restaurants. Il concerne **n'importe quel objet physique** :

- Un canapé qu'on veut voir dans son salon avant d'acheter
- Des sneakers qu'on veut essayer virtuellement
- Un jouet dans sa boîte qu'on veut voir en vrai avant d'offrir
- Une bague, un vase, une bougie, une voiture miniature
- Un meuble IKEA, une plante, un tableau

**Le vrai produit : démocratiser la visualisation de n'importe quel objet physique en AR, via un simple lien.**

Comme YouTube a démocratisé la vidéo avec un lien, ScanAR démocratise la 3D interactive avec un lien.

### Pourquoi maintenant

- La photogrammétrie (reconstruction 3D par caméra) est devenue assez bonne pour être utilisable sur n'importe quel smartphone en 2024
- Le WebAR (AR dans le navigateur sans app) est enfin mature grâce à `model-viewer` de Google
- Luma AI a résolu le problème du scan de qualité sur iOS ET Android sans LiDAR
- Les gens sont habitués aux QR codes depuis le COVID

---

## 2. Le problème qu'on résout

| Situation actuelle | Ce que ScanAR change |
|---|---|
| Tu commandes en ligne et tu ne sais pas vraiment la taille de l'objet | Tu poses l'objet en 3D à côté de toi, tu vois la taille réelle |
| Les photos de produits sont retouchées et trompeuses | Tu vois le modèle 3D fidèle scanné depuis l'objet réel |
| L'AR existe mais nécessite une app dédiée à télécharger | Tu cliques sur un lien, tu actives ta caméra, c'est tout |
| Les outils 3D pro sont complexes et chers | Tu scannes en 30 secondes, tu partages en 1 clic |
| Impossible de savoir si un meuble va bien dans ta pièce | Tu le déposes virtuellement dans ton salon avant d'acheter |

---

## 3. Ce que le produit fait concrètement

### Flow Créateur (celui qui scanne)

```
1. Il ouvre l'app / va sur le site
2. Il filme l'objet en tournant autour (30 à 60 secondes)
3. Luma AI traite la vidéo côté serveur → génère un fichier .glb
4. ScanAR stocke le modèle → génère un lien unique + QR code
5. Il partage le lien ou imprime/affiche le QR code
```

### Flow Visiteur (celui qui visualise)

```
1. Il scanne le QR code ou clique sur le lien
2. Son navigateur s'ouvre (pas d'app à télécharger)
3. Il voit le modèle 3D de l'objet
4. Il appuie sur "Voir en AR" → sa caméra s'active
5. Il pose l'objet virtuellement dans son environnement réel
6. Il peut tourner autour, changer l'échelle, faire une capture
```

### Ce que le Créateur voit en retour

- Combien de personnes ont scanné son QR code
- Depuis quels pays / villes
- Combien ont activé la vue AR
- Combien de temps en moyenne ils ont interagi avec le modèle

---

## 4. Utilisateurs cibles

### B2C — Les créateurs individuels

- Artisans, créateurs qui vendent leurs objets en ligne
- Vendeurs Vinted, eBay, Leboncoin qui veulent différencier leurs annonces
- Particuliers qui vendent des meubles ou objets de valeur

### B2B — Les professionnels

- **Restaurants** : menus en AR sur les tables (QR code sur table → plat en 3D)
- **E-commerce** : fiches produit avec visualisation AR (intégration via lien ou SDK)
- **Immobilier** : meubles, déco en AR pour staging virtuel
- **Bijouterie / Luxe** : bagues, montres, sacs en 3D avant achat
- **Jouets & cadeaux** : packaging avec QR code → jouet en 3D avant déballage
- **Musées / Expositions** : objets exposés consultables en 3D via QR code

---

## 5. Stack technique

### Pourquoi cette stack

Tout gratuit au départ, tout scalable ensuite. Un seul langage (TypeScript) du frontend au backend. Zero friction pour le visiteur final.

### Stack complète

| Composant | Technologie | Pourquoi | Coût |
|---|---|---|---|
| **Scan 3D** | Luma AI (app mobile + API) | iOS & Android, sans LiDAR, qualité pro, serveur-side | Gratuit |
| **Frontend** | Next.js 15 (App Router) | SSR, performance, un seul repo | Gratuit |
| **Backend** | Next.js API Routes | Suffisant pour MVP, même repo | Gratuit |
| **Stockage modèles** | Cloudflare R2 | 10GB gratuits/mois, egress gratuit (≠ AWS S3) | Gratuit |
| **Base de données** | Supabase (PostgreSQL) | Auth intégrée, realtime, gratuit | Gratuit |
| **Viewer 3D / AR** | model-viewer (Google) | AR native iOS + Android, une balise HTML | Gratuit |
| **Auth** | Supabase Auth | Google/Apple login inclus | Gratuit |
| **QR Codes** | qrcode (npm) | Génération côté serveur | Gratuit |
| **Déploiement** | Vercel | Connecté GitHub, CDN global | Gratuit |
| **Analytics custom** | Supabase (tables events) | Vues, placements AR, durée | Gratuit |

### Format des modèles 3D

- Format principal : **`.glb`** (binaire GLTF, léger, compatible partout)
- Compression : **Draco** (réduit le poids de 70 à 90%)
- Poids cible par modèle : **5 à 30 MB** selon la complexité

---

## 6. Architecture générale

```
┌──────────────────────────────────────────────────────────────┐
│                        CRÉATEUR                              │
│   Film avec téléphone → Luma AI API → .glb généré           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (Next.js)                         │
│   Réception .glb → Upload Cloudflare R2                      │
│   Création entrée Supabase (metadata + lien unique)          │
│   Génération QR code → renvoi au créateur                    │
└────────┬───────────────────────────────┬─────────────────────┘
         │                               │
         ▼                               ▼
┌─────────────────┐           ┌──────────────────────┐
│  Cloudflare R2  │           │       Supabase        │
│  (modèles .glb) │           │  users, modèles,      │
└─────────────────┘           │  events, analytics    │
                              └──────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────┐
│                       VISITEUR                               │
│   Scanne QR / clique lien → page Next.js                     │
│   <model-viewer> charge le .glb depuis R2                    │
│   Clique "Voir en AR" → caméra activée → objet posé          │
│   Event tracké → Supabase (vue, AR activée, durée)           │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Fonctionnalités — MVP

### Phase 1 — MVP (semaines 1 à 4)

- [ ] Upload d'un modèle .glb (drag & drop ou depuis Luma AI export)
- [ ] Stockage sur Cloudflare R2
- [ ] Génération d'un lien unique partageable
- [ ] Génération du QR code téléchargeable (PNG + SVG)
- [ ] Page de visualisation publique avec `model-viewer`
- [ ] Vue AR sur iOS (Quick Look) et Android (Scene Viewer)
- [ ] Tracking simple : nombre de vues, nombre d'activations AR
- [ ] Authentification créateur (Supabase Auth)
- [ ] Dashboard minimaliste : liste des modèles + stats basiques

### Phase 2 — Post-MVP (semaines 5 à 8)

- [ ] Intégration directe Luma AI API (scan depuis l'interface ScanAR)
- [ ] Personnalisation de la page de visualisation (logo, couleurs, nom)
- [ ] Analytics avancées (pays, durée, heatmap temporelle)
- [ ] Partage social direct (Instagram, TikTok, WhatsApp)
- [ ] Embed code pour intégrer le viewer sur un site externe

### Phase 3 — Croissance

- [ ] Plans d'abonnement (Free / Pro / Business)
- [ ] API publique et SDK pour e-commerce (Shopify, WooCommerce)
- [ ] Collections de modèles (ex: menu complet d'un restaurant)
- [ ] Domaine personnalisé sur les liens

---

## 8. Dashboard — Description complète

### Structure globale

Le dashboard est l'espace privé du créateur. Il est accessible après connexion. Il suit un layout classique et efficace :

```
┌─────────────┬────────────────────────────────────────────────┐
│             │                                                │
│  SIDEBAR    │              ZONE PRINCIPALE                   │
│  (gauche)   │                                                │
│  fixe       │                                                │
│             │                                                │
└─────────────┴────────────────────────────────────────────────┘
```

---

### Sidebar gauche

Largeur fixe : **240px**. Fond sombre (ex: `#0F0F1A`). Logo en haut. Navigation par icône + label.

#### Éléments de la sidebar

```
┌──────────────────────┐
│  🔷 ScanAR           │  ← Logo + nom produit
├──────────────────────┤
│  📊 Vue d'ensemble   │  ← Tableau de bord général
│  📦 Mes Modèles      │  ← Liste de tous les objets scannés
│  📷 Nouveau Scan     │  ← CTA principal (upload ou scan)
│  🔗 Mes Liens        │  ← Tous les liens générés + QR codes
│  📈 Statistiques     │  ← Analytics détaillées
│  ⚙️  Paramètres      │  ← Compte, plan, intégrations
├──────────────────────┤
│  💡 Plan actuel      │  ← Badge Free / Pro / Business
│  👤 Mon compte       │  ← Avatar + email + déconnexion
└──────────────────────┘
```

---

### Onglet 1 — Vue d'ensemble

**Objectif** : donner une vision rapide de l'activité globale au créateur.

#### Contenu

**Bloc KPI (4 cartes en haut)**

| Carte | Valeur | Évolution |
|---|---|---|
| Modèles créés | ex: 12 | +2 ce mois |
| Vues totales | ex: 3 847 | +18% vs mois dernier |
| Activations AR | ex: 1 203 | +24% |
| Taux AR | ex: 31% | (vues → AR) |

**Graphique principal**
- Courbe d'activité sur 30 jours (vues + activations AR)
- Sélecteur : 7j / 30j / 90j

**Tableau des modèles les plus performants**
- Top 5 des modèles avec le plus de vues cette semaine
- Colonnes : Miniature | Nom | Vues | AR activées | Taux

**Activité récente**
- Feed chronologique des 10 derniers événements (nouvelle vue, nouveau scan AR, nouveau modèle uploadé)

---

### Onglet 2 — Mes Modèles

**Objectif** : gérer tous les objets scannés.

#### Vue en grille (défaut) ou liste

Chaque carte modèle affiche :
- Miniature 3D (preview statique générée depuis le .glb)
- Nom de l'objet
- Date de création
- Nombre de vues
- Nombre d'activations AR
- Statut : Actif / Archivé / En traitement
- Actions rapides : Voir | Partager | Copier lien | QR Code | Supprimer

#### Actions en masse
- Sélection multiple → Archiver, Supprimer, Exporter liens

#### Filtres
- Par date, par catégorie (à définir par le créateur), par statut, par nombre de vues

#### Page détail d'un modèle (clic sur une carte)

```
┌─────────────────────────────────┬─────────────────────────────┐
│                                 │  Nom : Plat Tajine           │
│   VIEWER 3D INTERACTIF          │  Créé le : 12 Jan 2025       │
│   (rotation, zoom)              │  Catégorie : Restaurant      │
│                                 │─────────────────────────────│
│                                 │  Lien partageable :          │
│                                 │  scanar.io/m/abc123          │
│                                 │  [Copier] [Ouvrir]           │
│                                 │─────────────────────────────│
│                                 │  QR Code :                   │
│                                 │  [Image QR] [Télécharger]    │
│                                 │─────────────────────────────│
│                                 │  Stats :                     │
│                                 │  Vues : 482                  │
│                                 │  AR activées : 143 (30%)     │
│                                 │  Durée moy. : 1m 24s         │
└─────────────────────────────────┴─────────────────────────────┘
```

---

### Onglet 3 — Nouveau Scan

**Objectif** : permettre au créateur d'ajouter un nouveau modèle.

#### Option A — Upload direct
- Zone drag & drop pour un fichier `.glb` ou `.gltf`
- Barre de progression upload
- Preview 3D immédiat après upload

#### Option B — Import depuis Luma AI
- Connexion compte Luma AI (OAuth ou clé API)
- Liste des captures récentes de l'utilisateur dans Luma
- Sélection → import automatique du .glb dans ScanAR

#### Champs à remplir après import
- Nom de l'objet (requis)
- Description courte (optionnel)
- Catégorie (menu déroulant : Restaurant / Déco / Mode / Bijoux / Autre)
- Visibilité : Public / Privé (lien nécessaire pour accéder)
- Bouton **Générer le lien et le QR code**

---

### Onglet 4 — Mes Liens

**Objectif** : avoir une vue centralisée de tous les liens et QR codes générés.

#### Tableau principal

| QR | Lien | Objet associé | Vues | AR | Créé le | Actions |
|---|---|---|---|---|---|---|
| [img] | scanar.io/m/abc123 | Tajine | 482 | 143 | 12/01 | Copier / Télécharger QR |

#### Export
- Export CSV de tous les liens + stats
- Téléchargement en lot de tous les QR codes (ZIP)

---

### Onglet 5 — Statistiques

**Objectif** : analytics avancées pour comprendre l'audience.

#### Métriques globales
- Total vues (toutes périodes)
- Total activations AR
- Taux de conversion vue → AR (%)
- Durée moyenne d'interaction

#### Graphiques
- **Courbe temporelle** : vues + AR sur période sélectionnable
- **Carte du monde** : origine géographique des visiteurs (pays)
- **Répartition par appareil** : iOS / Android / Desktop
- **Top modèles** : classement par vues, par AR, par durée

#### Par modèle
- Filtre pour voir les stats d'un seul modèle
- Mêmes graphiques mais filtrés sur l'objet sélectionné

---

### Onglet 6 — Paramètres

**Objectif** : configurer le compte et les options avancées.

#### Sections

**Mon compte**
- Photo de profil
- Nom d'affichage
- Email (avec confirmation si changement)
- Mot de passe

**Mon plan**
- Plan actuel (Free / Pro / Business)
- Limites : nombre de modèles, stockage utilisé / total, scans par mois
- Bouton mise à niveau

**Personnalisation**
- Nom de marque affiché sur les pages de visualisation publiques
- Logo uploadable (affiché sur la page viewer)
- Couleur d'accentuation de la page viewer

**Intégrations** *(Phase 2)*
- Clé API Luma AI (pour import automatique)
- Webhook URL (pour notifier un serveur externe à chaque scan)
- Code d'embed pour site externe

**Danger zone**
- Exporter toutes mes données
- Supprimer mon compte

---

## 9. Landing Page — Description & Prompt Stitch

### Description de la landing page

La landing page doit accomplir une seule chose : **créer le moment "wow" en moins de 5 secondes**.

Le visiteur doit comprendre immédiatement ce que fait le produit, voir que ça marche vraiment, et avoir envie d'essayer.

#### Structure des sections

---

**Section 1 — Hero (above the fold)**

Fond sombre (quasi-noir). Un objet 3D en lévitation au centre — qui tourne lentement sur lui-même. En dessous ou à côté, le texte :

> **Scanne. Partage. Pose dans ton salon.**
> N'importe quel objet en 3D dans le monde réel. Sans app. Via un simple lien.

Deux boutons CTA :
- Principal : `Commencer gratuitement`
- Secondaire : `Voir une démo`

En dessous des boutons : un champ qui ressemble à une URL `scanar.io/m/example` avec une animation qui simule un QR code qui apparaît.

Social proof : `+2 000 objets scannés cette semaine`

---

**Section 2 — Démo interactive ou vidéo**

Titre : **"Vois comment ça marche en 30 secondes"**

Trois blocs côte à côte avec icône animée + texte :

1. 🎥 **Filme ton objet** — Tu tournes autour en 30 secondes
2. 🔗 **Reçois un lien** — QR code + URL instantanément
3. ✨ **Pose-le partout** — Ton visiteur le voit en AR depuis son téléphone

Sous les 3 blocs : une vidéo (ou gif) en boucle montrant un plat de restaurant posé virtuellement sur une table réelle. Effet wow garanti.

---

**Section 3 — Cas d'usage (scroll horizontal ou grille)**

Titre : **"Pour n'importe quel objet du monde réel"**

6 cartes avec fond légèrement coloré, icône grande, titre + sous-titre :

| Icône | Titre | Description |
|---|---|---|
| 🍽️ | Restaurants | Vos clients voient le plat avant de commander |
| 🛋️ | Déco & Meubles | Essayez le canapé dans votre salon avant d'acheter |
| 👟 | Mode & Sneakers | Visualisez la chaussure à vos pieds |
| 💍 | Bijoux | Portez virtuellement avant d'offrir |
| 🧸 | Jouets | Voyez le contenu de la boîte avant de l'ouvrir |
| 🏪 | E-commerce | Réduisez vos retours de 40% |

---

**Section 4 — Le lien comme produit**

Titre : **"Votre objet 3D, partout où vous partagez"**

Visuel central : un smartphone avec un lien qui se transforme en QR code. Des flèches partent vers WhatsApp, Instagram, email, impression, site web.

Texte :
> Votre modèle 3D s'ouvre dans n'importe quel navigateur. iOS. Android. Sans app. Sans friction.

---

**Section 5 — Dashboard & Analytics (pour convaincre le B2B)**

Titre : **"Sachez exactement qui interagit avec vos objets"**

Screenshot ou mockup du dashboard avec les stats mises en avant.

3 points :
- Combien de personnes ont vu votre modèle
- Combien ont activé la vue AR
- D'où ils viennent dans le monde

---

**Section 6 — Pricing (simple et clair)**

3 plans en carte :

| Free | Pro | Business |
|---|---|---|
| 5 modèles | 50 modèles | Illimité |
| 500 vues/mois | 10 000 vues/mois | Illimité |
| Lien ScanAR | Lien personnalisable | Domaine custom |
| Stats basiques | Stats avancées | API + SDK |
| Gratuit | 19€/mois | Sur devis |

---

**Section 7 — Social proof / Témoignages**

3 témoignages avec photo avatar (fictifs pour le MVP) :

> *"On a mis les QR codes sur nos tables. Les clients scannent et voient le plat avant de commander. Les commandes du plat scanné ont augmenté de 35%."*
> — Karim B., Restaurateur, Lyon

> *"J'ai mis le lien dans mon annonce Vinted. L'acheteur a pu voir la chaise en 3D chez lui avant d'acheter. Vendu en 2 heures."*
> — Sophie M., Particulière

---

**Section 8 — CTA final**

Fond en dégradé violet/bleu électrique.

> **Ton premier objet 3D en ligne dans 10 minutes.**
> Gratuit. Sans carte bancaire.

Bouton : `Créer mon compte gratuitement`

---

### Prompt pour Stitch

Copie-colle exactement ce prompt dans Stitch :

---

```
Design a stunning, ultra-modern landing page for a SaaS product called "ScanAR".

ScanAR allows anyone to scan a real-world object with their phone (using Luma AI), 
get a shareable link + QR code, and let anyone see that object in Augmented Reality 
directly in their browser — no app required, works on iPhone and Android.

VISUAL IDENTITY:
- Dark theme (deep black #0A0A14 background)
- Primary accent: electric violet/purple (#6C63FF)
- Secondary accent: electric blue (#00D4FF)
- Typography: bold, modern sans-serif (like Inter or Satoshi)
- Aesthetic: premium tech startup, similar to Linear.app or Vercel.com — 
  clean, dark, glowing accents, subtle gradients

SECTIONS TO DESIGN (in this exact order):

1. HERO SECTION
   - Full viewport height
   - Centered 3D object floating and slowly rotating (you can use a glowing orb 
     or abstract 3D shape as placeholder)
   - Headline (very large, bold): "Scanne. Partage. Pose dans ton salon."
   - Subheadline: "N'importe quel objet en 3D dans le monde réel. Sans app. Via un lien."
   - Two CTA buttons: primary filled "Commencer gratuitement", secondary ghost "Voir une démo"
   - Below buttons: a simulated URL bar "scanar.io/m/tajine-karim" that morphs into a QR code
   - Social proof badge: "✦ +2 000 objets scannés cette semaine"
   - Subtle particle or floating dot background

2. HOW IT WORKS (3 steps)
   - Section title: "Comment ça marche"
   - 3 large cards side by side with animated icons:
     Step 1: Film — camera icon, "Tu filmes ton objet en 30 secondes"
     Step 2: Link — chain icon, "Tu reçois un lien + QR code instantané"
     Step 3: AR — magic wand / AR glasses icon, "Tes visiteurs le voient en AR chez eux"
   - Under the 3 steps: a looping video mockup (use a phone mockup frame) 
     showing a dish being placed on a real table in AR

3. USE CASES GRID
   - Section title (large): "Pour n'importe quel objet du monde réel"
   - 6 use case cards in a 3x2 grid, each with:
     - Large emoji icon
     - Bold title
     - Short description
   - Cards: Restaurant / Déco & Meubles / Mode & Sneakers / Bijoux / Jouets / E-commerce
   - Cards should have a subtle glass-morphism effect (backdrop blur, semi-transparent border)

4. LINK AS PRODUCT SECTION
   - Two-column layout: left = text, right = visual
   - Visual: phone mockup showing a link being shared → QR code appearing 
     → AR object appearing on a real table
   - Title: "Votre objet 3D, partout où vous le partagez"
   - Body: explain that the model opens in any browser, iOS & Android, no app
   - Logos of platforms: WhatsApp, Instagram, Safari, Chrome, email

5. ANALYTICS / DASHBOARD PREVIEW
   - Section title: "Sachez exactement qui interagit avec vos objets"
   - Dark dashboard mockup screenshot (design a minimal dark dashboard UI) 
     showing: total views counter, AR activation rate, world map with dots, 
     top models list
   - 3 feature bullets on the right side with icons

6. PRICING
   - 3 pricing cards: Free / Pro / Business
   - Free: 5 modèles, 500 vues/mois, liens ScanAR, stats basiques — Gratuit
   - Pro: 50 modèles, 10 000 vues/mois, lien personnalisable, stats avancées — 19€/mois (HIGHLIGHTED card)
   - Business: illimité, domaine custom, API + SDK — Sur devis
   - Pro card should have a glowing border and "Plus populaire" badge

7. TESTIMONIALS
   - Section title: "Ils ont déjà transformé leur façon de montrer leurs objets"
   - 3 testimonial cards, dark glass morphism style, with avatar circle, quote, name, role
   - Quote 1 (restaurateur): augmentation des commandes du plat scanné
   - Quote 2 (e-commerce): réduction des retours clients
   - Quote 3 (particulier): vente Vinted ultra rapide grâce au modèle 3D

8. FINAL CTA SECTION
   - Full-width section with bold gradient background (violet to electric blue)
   - Giant centered text: "Ton premier objet 3D en ligne dans 10 minutes."
   - Sub-text: "Gratuit. Sans carte bancaire."
   - One big CTA button: "Créer mon compte gratuitement"
   - Floating glowing shapes in background

DESIGN RULES:
- Every section must have generous vertical padding (min 120px top/bottom)
- Use glassmorphism cards throughout (backdrop-filter: blur, semi-transparent backgrounds)
- Subtle glowing border effects on key elements (box-shadow with violet/blue)
- Smooth scroll animations (elements fade in as they enter viewport)
- Mobile responsive — all sections must adapt elegantly to mobile
- Navigation bar: sticky, transparent with blur, logo left, 3 nav links center, 
  CTA button right
- Footer: dark, simple — logo, 3 columns of links, copyright
- No stock photos — use 3D illustrations, phone mockups, abstract shapes

Make it feel like a product that costs money but is worth every cent.
Reference aesthetics: Linear.app, Resend.com, Vercel.com, Raycast.com
```

---

## 10. Modèle économique

### Plans envisagés

| Fonctionnalité | Free | Pro (19€/mois) | Business (sur devis) |
|---|---|---|---|
| Modèles actifs | 5 | 50 | Illimité |
| Vues/mois | 500 | 10 000 | Illimité |
| Stockage | 250 MB | 5 GB | Illimité |
| Lien partageable | scanar.io/m/xxx | Personnalisable | Domaine propre |
| QR Code | ✓ | ✓ | ✓ |
| Vue AR | ✓ | ✓ | ✓ |
| Analytics | Basiques | Avancées | Complètes + export |
| Branding ScanAR | Visible | Masquable | Absent |
| API / SDK | ✗ | ✗ | ✓ |
| Support | Email | Prioritaire | Dédié |

### Sources de revenus futures

- Abonnements SaaS (modèle principal)
- Commission sur les scans pro (au-delà du quota)
- Vente de l'API à des plateformes e-commerce
- Partenariats avec des intégrateurs Shopify / WooCommerce

---

## 11. Plan de lancement

### Semaine 1–2 : Fondations

- [ ] Setup Next.js 15 + Supabase + Cloudflare R2 + Vercel
- [ ] Upload .glb + stockage R2
- [ ] Page viewer avec `<model-viewer>` fonctionnelle
- [ ] Auth Supabase (inscription / connexion)

### Semaine 3 : Partage

- [ ] Génération lien unique par modèle
- [ ] Génération QR code téléchargeable
- [ ] Tracking de base : vues + AR activées enregistrées en base

### Semaine 4 : Dashboard MVP

- [ ] Dashboard créateur complet (tous les onglets)
- [ ] Page détail modèle avec stats
- [ ] Déploiement sur Vercel + domaine

### Semaine 5–6 : Luma AI

- [ ] Intégration Luma AI API pour import direct
- [ ] Test qualité des modèles sur iOS et Android

### Semaine 7–8 : Go-to-market

- [ ] Landing page (Stitch → intégrée dans Next.js)
- [ ] Beta privée : 10 restaurants + 10 e-commerces
- [ ] Collecte retours + itération
- [ ] Création contenu TikTok : "je pose mon plat virtuellement sur ma table"

### Semaine 9+ : Croissance

- [ ] Lancement Product Hunt
- [ ] Ouverture plan Pro avec paiement Stripe
- [ ] Outreach B2B restaurants et boutiques en ligne

---

*Document rédigé pour le projet ScanAR — Version 1.0 — Confidentiel*
