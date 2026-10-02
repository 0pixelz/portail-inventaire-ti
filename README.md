# Portail inventaire TI

Portail client de gestion d'inventaire informatique : chaque client a son compte, voit son parc (postes, portables, écrans, réseau), ses garanties et son historique, et parle à un assistant IA qui connaît son inventaire. Phase 2 : commande en ligne. Côté interne : gestion des billets et de l'inventaire de tous les clients, avec un copilote IA.

## 🔗 Tester le prototype (site HTML, sans installation)

**https://0pixelz.github.io/portail-inventaire-ti/**

Fonctionne sur ordinateur et sur iPhone (mise en page adaptée sous 820 px).

| Page | Lien |
|---|---|
| Écran de chargement → accueil | [index.html](https://0pixelz.github.io/portail-inventaire-ti/index.html) |
| Site public (accueil, forfaits, contact) | [accueil.html](https://0pixelz.github.io/portail-inventaire-ti/accueil.html) |
| Évaluateur de forfait — interactif | [evaluateur.html](https://0pixelz.github.io/portail-inventaire-ti/evaluateur.html) |
| Connexion (client / admin) | [connexion.html](https://0pixelz.github.io/portail-inventaire-ti/connexion.html) |
| Mot de passe oublié | [mot-de-passe.html](https://0pixelz.github.io/portail-inventaire-ti/mot-de-passe.html) |
| **Client** — tableau de bord + assistant IA | [inventaire.html](https://0pixelz.github.io/portail-inventaire-ti/inventaire.html) |
| Client — fiche d'un équipement | [equipement.html](https://0pixelz.github.io/portail-inventaire-ti/equipement.html) |
| Client — étiquette QR à imprimer | [etiquette.html](https://0pixelz.github.io/portail-inventaire-ti/etiquette.html) |
| Client — signaler un problème | [nouveau-billet.html](https://0pixelz.github.io/portail-inventaire-ti/nouveau-billet.html) |
| Client — mes billets | [mes-billets.html](https://0pixelz.github.io/portail-inventaire-ti/mes-billets.html) |
| Client — suivi d'un billet | [mon-billet.html](https://0pixelz.github.io/portail-inventaire-ti/mon-billet.html) |
| Client — plan de remplacement | [plan-remplacement.html](https://0pixelz.github.io/portail-inventaire-ti/plan-remplacement.html) |
| Client — panier (gestion, quantités, livraison) | [panier.html](https://0pixelz.github.io/portail-inventaire-ti/panier.html) |
| Client — catalogue | [commande.html](https://0pixelz.github.io/portail-inventaire-ti/commande.html) |
| Client — commande confirmée | [commande-confirmee.html](https://0pixelz.github.io/portail-inventaire-ti/commande-confirmee.html) |
| Client — suivi d'une commande | [ma-commande.html](https://0pixelz.github.io/portail-inventaire-ti/ma-commande.html) |
| Client — facture (imprimable) | [facture.html](https://0pixelz.github.io/portail-inventaire-ti/facture.html) |
| Client — mes commandes et soumissions | [mes-commandes.html](https://0pixelz.github.io/portail-inventaire-ti/mes-commandes.html) |
| Client — mon compte (profil, paramètres, notifications, utilisateurs) | [mon-compte.html](https://0pixelz.github.io/portail-inventaire-ti/mon-compte.html) |
| Client — assistant IA, vue détaillée | [assistant.html](https://0pixelz.github.io/portail-inventaire-ti/assistant.html) |
| **Admin** — tableau de bord | [admin-tableau.html](https://0pixelz.github.io/portail-inventaire-ti/admin-tableau.html) |
| Admin — calendrier de l’équipe (jour/semaine/mois/liste, glisser-déposer, conflits, à planifier, export .ics) | [admin-calendrier.html](https://0pixelz.github.io/portail-inventaire-ti/admin-calendrier.html) |
| Admin — billets (filtres, résolus) | [admin.html](https://0pixelz.github.io/portail-inventaire-ti/admin.html) |
| Admin — gestion d'un billet | [billet.html](https://0pixelz.github.io/portail-inventaire-ti/billet.html) |
| Admin — nouveau billet pour un client | [admin-nouveau-billet.html](https://0pixelz.github.io/portail-inventaire-ti/admin-nouveau-billet.html) |
| Admin — inventaire de tous les clients | [admin-inventaire.html](https://0pixelz.github.io/portail-inventaire-ti/admin-inventaire.html) |
| Admin — stock et réapprovisionnement (budget, demande prévue, bons de commande) | [admin-stock.html](https://0pixelz.github.io/portail-inventaire-ti/admin-stock.html) |
| Admin — importer un inventaire (CSV) | [admin-import.html](https://0pixelz.github.io/portail-inventaire-ti/admin-import.html) |
| Admin — fiche d'un équipement (gestion) | [admin-equipement.html](https://0pixelz.github.io/portail-inventaire-ti/admin-equipement.html) |
| Admin — ajouter un équipement | [admin-ajouter-equipement.html](https://0pixelz.github.io/portail-inventaire-ti/admin-ajouter-equipement.html) |
| Admin — clients | [admin-clients.html](https://0pixelz.github.io/portail-inventaire-ti/admin-clients.html) |
| Admin — fiche client | [admin-client.html](https://0pixelz.github.io/portail-inventaire-ti/admin-client.html) |
| Admin — nouveau client (dont concessionnaire automobile) | [admin-nouveau-client.html](https://0pixelz.github.io/portail-inventaire-ti/admin-nouveau-client.html) |
| Admin — planifier une visite | [admin-visite.html](https://0pixelz.github.io/portail-inventaire-ti/admin-visite.html) |
| Admin — commandes et soumissions | [admin-commandes.html](https://0pixelz.github.io/portail-inventaire-ti/admin-commandes.html) |
| Admin — détail d'une commande | [admin-commande.html](https://0pixelz.github.io/portail-inventaire-ti/admin-commande.html) |
| Admin — suivi des soumissions | [admin-soumissions.html](https://0pixelz.github.io/portail-inventaire-ti/admin-soumissions.html) |
| Admin — nouvelle soumission | [admin-soumission.html](https://0pixelz.github.io/portail-inventaire-ti/admin-soumission.html) |
| Admin — catalogue et prix | [admin-catalogue.html](https://0pixelz.github.io/portail-inventaire-ti/admin-catalogue.html) |
| Admin — utilisateurs et rôles | [utilisateurs.html](https://0pixelz.github.io/portail-inventaire-ti/utilisateurs.html) |
| Admin — paramètres (profil, entreprise, facturation, intégrations) | [admin-parametres.html](https://0pixelz.github.io/portail-inventaire-ti/admin-parametres.html) |
| Admin — rapports | [admin-rapports.html](https://0pixelz.github.io/portail-inventaire-ti/admin-rapports.html) |

Les boutons sans page dédiée (ex. « Changer la photo ») affichent un message « action simulée ». Les exports CSV téléchargent un vrai fichier; « Exporter (PDF) » et « Imprimer » ouvrent la boîte d'impression.

> Si le lien donne 404 : **Settings → Pages → Build and deployment → Source : Deploy from a branch → Branch : `main`, dossier `/docs`** → Save. Le site est en ligne 1 à 2 minutes plus tard. GitHub Pages sur un dépôt **privé** exige un compte Pro; sinon rendre le dépôt public (Settings → General → Danger zone → Change visibility) ou glisser le dossier `docs/` sur https://app.netlify.com/drop.

## 🤖 Assistant IA réel (API Claude) — clé gardée sur le serveur

GitHub Pages ne sert que des fichiers publics : une clé API placée dans le site serait visible par tous (et révoquée automatiquement par Anthropic). La clé vit donc sur **Vercel**, connecté à ce dépôt GitHub :

- `api/chat.mjs` — relais sécurisé `/api/chat` (lit `ANTHROPIC_API_KEY`, accepte seulement ce site et GitHub Pages, plafonne modèles / longueur / débit).
- `vercel.json` — Vercel sert `docs/` + la fonction, sans compilation; redéploie à chaque push sur `main`.
- `docs/ia-config.js` — sur Vercel, l'assistant utilise `/api/chat` automatiquement.

### Mise en ligne (une seule fois)
1. https://vercel.com/signup → **Continue with GitHub** (plan Hobby, gratuit).
2. **Add New → Project** → importer `portail-inventaire-ti` (les réglages viennent de `vercel.json`).
3. **Environment Variables** : `ANTHROPIC_API_KEY` = votre clé (`sk-ant-api03-…`) → **Deploy**.
4. Ouvrir `https://<votre-projet>.vercel.app/inventaire.html` → l'assistant affiche « Connecté à Claude » pour tout le monde.

Optionnel : pour que la copie GitHub Pages utilise aussi l'IA, mettre l'adresse Vercel dans `window.__IA_PROXY_SERVEUR` (`docs/ia-config.js`).
Fixer une **limite de dépenses mensuelle** : console.anthropic.com → Billing → Spend limits.

Sans relais configuré, l'assistant reste en mode démo (un admin peut tester avec sa propre clé via ⚙, gardée dans son navigateur seulement).

## Structure du dépôt

```
docs/                 Prototype HTML autonome — servi par GitHub Pages et Vercel
api/chat.mjs          Relais IA sécurisé (clé API côté serveur, Vercel)
supabase/schema.sql   Modèle de données + politiques RLS (isolation par client)
app/api/chat/route.ts Assistant IA : boucle d'outils avec l'API Claude
app/inventaire/       Tableau de bord client (Next.js, App Router)
components/           Widget de clavardage
lib/supabase.ts       Client Supabase côté serveur
```

## Lancer l'application (Next.js + Supabase)

1. Créer un projet Supabase et exécuter `supabase/schema.sql` dans l'éditeur SQL.
2. Copier `.env.example` → `.env.local` et remplir les clés (Supabase + `ANTHROPIC_API_KEY`).
3. `npm install && npm run dev` → http://localhost:3000/inventaire
4. Créer un utilisateur dans Supabase Auth, puis lui assigner une organisation :
   `update profils set organisation_id = '<uuid>' where id = '<user id>';`

## Sécurité multi-clients

- Le serveur n'utilise jamais la clé `service_role` pour répondre à un client.
- Chaque requête passe par RLS : `mon_organisation()` filtre toutes les tables.
- L'assistant IA utilise le client Supabase de l'utilisateur connecté → il ne peut pas lire un autre client.
- Les techniciens (`role = technicien | admin`) voient tout et sont les seuls à modifier `equipements` / `historique`.

## Prochaines étapes

- [ ] Fixer les tarifs (`[X] $` dans `docs/index.html`, props dans `docs/evaluateur.html`) et le nom d'entreprise
- [x] Version mobile du prototype (règles dans `docs/responsive.css`, injectées dans chaque page)
- [ ] Pages Next.js : connexion, fiche équipement, billets, admin
- [ ] Phase 2 : catalogue, panier, commandes → ajout automatique à l'inventaire à la livraison
- [ ] Streaming des réponses IA et transfert à un technicien
- [ ] Import CSV de l'inventaire initial, étiquettes QR
