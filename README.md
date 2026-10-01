# Portail inventaire TI

Portail client de gestion d'inventaire informatique : chaque client a son compte, voit son parc (postes, portables, écrans, réseau), ses garanties et son historique, et parle à un assistant IA qui connaît son inventaire. Phase 2 : commande en ligne. Côté interne : gestion des billets et de l'inventaire de tous les clients, avec un copilote IA.

## 🔗 Tester le prototype (site HTML, sans installation)

**https://0pixelz.github.io/portail-inventaire-ti/**

Fonctionne sur ordinateur et sur iPhone (mise en page adaptée sous 820 px).

| Page | Lien |
|---|---|
| Site public (accueil, forfaits, contact) | [index.html](https://0pixelz.github.io/portail-inventaire-ti/) |
| Évaluateur de forfait — interactif | [evaluateur.html](https://0pixelz.github.io/portail-inventaire-ti/evaluateur.html) |
| Connexion client | [connexion.html](https://0pixelz.github.io/portail-inventaire-ti/connexion.html) |
| Tableau de bord client + assistant IA | [inventaire.html](https://0pixelz.github.io/portail-inventaire-ti/inventaire.html) |
| Fiche d'un équipement | [equipement.html](https://0pixelz.github.io/portail-inventaire-ti/equipement.html) |
| Catalogue / panier (phase 2) | [commande.html](https://0pixelz.github.io/portail-inventaire-ti/commande.html) |
| Assistant client — vue détaillée | [assistant.html](https://0pixelz.github.io/portail-inventaire-ti/assistant.html) |
| Administration + copilote interne | [admin.html](https://0pixelz.github.io/portail-inventaire-ti/admin.html) |
| Utilisateurs et rôles (admin) | [utilisateurs.html](https://0pixelz.github.io/portail-inventaire-ti/utilisateurs.html) |
| Admin — tableau de bord | [admin-tableau.html](https://0pixelz.github.io/portail-inventaire-ti/admin-tableau.html) |
| Admin — inventaire de tous les clients | [admin-inventaire.html](https://0pixelz.github.io/portail-inventaire-ti/admin-inventaire.html) |
| Admin — clients | [admin-clients.html](https://0pixelz.github.io/portail-inventaire-ti/admin-clients.html) |
| Admin — commandes et soumissions | [admin-commandes.html](https://0pixelz.github.io/portail-inventaire-ti/admin-commandes.html) |
| Admin — rapports | [admin-rapports.html](https://0pixelz.github.io/portail-inventaire-ti/admin-rapports.html) |

> Si le lien donne 404 : **Settings → Pages → Build and deployment → Source : Deploy from a branch → Branch : `main`, dossier `/docs`** → Save. Le site est en ligne 1 à 2 minutes plus tard. GitHub Pages sur un dépôt **privé** exige un compte Pro; sinon rendre le dépôt public (Settings → General → Danger zone → Change visibility) ou glisser le dossier `docs/` sur https://app.netlify.com/drop.

## Structure du dépôt

```
docs/                 Prototype HTML autonome (8 pages) — servi par GitHub Pages
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
