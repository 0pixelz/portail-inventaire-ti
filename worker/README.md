# Relais IA (Cloudflare Worker)

Garde la clé API Claude **côté serveur**. Le portail (GitHub Pages) appelle ce relais; personne ne voit la clé.

## Déployer (tableau de bord Cloudflare, gratuit)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → nom : `claude-proxy` → **Deploy**.
2. **Edit code** → remplacer tout le code par le contenu de `claude-proxy.js` → **Deploy**.
3. **Settings → Variables and Secrets → Add** → Type **Secret**, nom `ANTHROPIC_API_KEY`, valeur = votre clé API (`sk-ant-api03-…`) → **Deploy**.
4. Copier l'adresse du Worker (ex. `https://claude-proxy.<compte>.workers.dev`) et la mettre dans `docs/ia-config.js` :
   `window.__IA_PROXY = 'https://claude-proxy.<compte>.workers.dev';`

L'assistant est alors actif pour tous les utilisateurs, sans clé à saisir.

## Protections incluses
- Seules les requêtes venant de `https://0pixelz.github.io` sont acceptées.
- Modèles permis : Sonnet 5.5, Haiku 4.5, Opus 5.5 · `max_tokens` plafonné à 1500 · 40 messages max.
- 20 requêtes / minute par adresse IP.
- Fixer aussi une **limite de dépenses mensuelle** dans console.anthropic.com → Billing → Spend limits.
