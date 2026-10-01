// Relais sécurisé entre le portail (GitHub Pages) et l'API Claude.
// La clé API vit ici comme SECRET Cloudflare (ANTHROPIC_API_KEY) : elle n'est jamais
// dans le code du site, ni dans GitHub, ni dans le navigateur des utilisateurs.
//
// Déploiement : voir worker/README.md

const ORIGINES_PERMISES = [
  'https://0pixelz.github.io',
  'http://localhost:8765',
];
const MODELES_PERMIS = ['claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-opus-5-5'];
const MODELE_DEFAUT = 'claude-sonnet-5-5';
const MAX_TOKENS = 1500;
const MAX_MESSAGES = 40;
const MAX_REQ_PAR_MINUTE = 20; // par adresse IP (au mieux, par instance)

const compteurs = new Map();

function cors(origine) {
  return {
    'Access-Control-Allow-Origin': origine,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function json(obj, status, origine) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(origine) } });
}

export default {
  async fetch(request, env) {
    const origine = request.headers.get('Origin') || '';
    if (!ORIGINES_PERMISES.includes(origine)) return new Response('Origine non permise', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origine) });
    if (request.method !== 'POST') return json({ error: { message: 'Méthode non permise' } }, 405, origine);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { message: 'Clé API non configurée sur le relais' } }, 500, origine);

    // limite simple par IP
    const ip = request.headers.get('CF-Connecting-IP') || 'inconnu';
    const minute = Math.floor(Date.now() / 60000);
    const c = compteurs.get(ip);
    if (c && c.minute === minute) { if (++c.n > MAX_REQ_PAR_MINUTE) return json({ error: { message: 'Trop de requêtes, réessayez dans une minute' } }, 429, origine); }
    else compteurs.set(ip, { minute, n: 1 });

    let corps;
    try { corps = await request.json(); } catch { return json({ error: { message: 'JSON invalide' } }, 400, origine); }
    if (!Array.isArray(corps.messages) || corps.messages.length === 0) return json({ error: { message: 'messages requis' } }, 400, origine);

    // On ne relaie que ce dont le portail a besoin, avec des plafonds.
    const requete = {
      model: MODELES_PERMIS.includes(corps.model) ? corps.model : MODELE_DEFAUT,
      max_tokens: Math.min(Number(corps.max_tokens) || MAX_TOKENS, MAX_TOKENS),
      system: typeof corps.system === 'string' ? corps.system.slice(0, 30000) : undefined,
      tools: Array.isArray(corps.tools) ? corps.tools.slice(0, 10) : undefined,
      messages: corps.messages.slice(-MAX_MESSAGES),
    };

    const rep = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requete),
    });
    const texte = await rep.text();
    return new Response(texte, { status: rep.status, headers: { 'content-type': 'application/json', ...cors(origine) } });
  },
};
