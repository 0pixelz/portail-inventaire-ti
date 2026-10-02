// Relais sécurisé portail → API Claude (Vercel Function, déployée depuis GitHub).
// La clé API est une variable d'environnement Vercel (ANTHROPIC_API_KEY) :
// jamais dans le code du site, ni dans GitHub, ni dans le navigateur.

const MODELES_PERMIS = ['claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-opus-5-5'];
const MODELE_DEFAUT = 'claude-sonnet-5-5';
const MAX_TOKENS = 1500;
const MAX_MESSAGES = 40;
const MAX_REQ_PAR_MINUTE = 20;
const compteurs = new Map();

function env(nom) {
  return process.env[nom];
}
function originePermise(origine, hote) {
  if (!origine) return false;
  const liste = ['https://0pixelz.github.io', ...String(env('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean)];
  if (liste.includes(origine)) return true;
  try { return new URL(origine).host === hote; } catch (e) { return false; } // même site
}
function cors(origine) {
  return { 'Access-Control-Allow-Origin': origine, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
function json(obj, status, origine) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...cors(origine) } });
}

async function relais(request) {
  const origine = request.headers.get('origin') || '';
  const hote = new URL(request.url).host;
  if (!originePermise(origine, hote)) return new Response('Origine non permise', { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origine) });
  if (request.method !== 'POST') return json({ error: { message: 'Méthode non permise' } }, 405, origine);
  const cle = env('ANTHROPIC_API_KEY');
  if (!cle) return json({ error: { message: 'Clé API non configurée sur le serveur (ANTHROPIC_API_KEY)' } }, 500, origine);

  const ip = (request.headers.get('x-forwarded-for') || 'inconnu').split(',')[0].trim();
  const minute = Math.floor(Date.now() / 60000), c = compteurs.get(ip);
  if (c && c.minute === minute) { if (++c.n > MAX_REQ_PAR_MINUTE) return json({ error: { message: 'Trop de requêtes, réessayez dans une minute' } }, 429, origine); }
  else compteurs.set(ip, { minute, n: 1 });

  let corps;
  try { corps = await request.json(); } catch (e) { return json({ error: { message: 'JSON invalide' } }, 400, origine); }
  if (!Array.isArray(corps.messages) || !corps.messages.length) return json({ error: { message: 'messages requis' } }, 400, origine);

  const rep = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELES_PERMIS.includes(corps.model) ? corps.model : MODELE_DEFAUT,
      max_tokens: Math.min(Number(corps.max_tokens) || MAX_TOKENS, MAX_TOKENS),
      system: typeof corps.system === 'string' ? corps.system.slice(0, 30000) : undefined,
      tools: Array.isArray(corps.tools) ? corps.tools.slice(0, 10) : undefined,
      messages: corps.messages.slice(-MAX_MESSAGES),
    }),
  });
  return new Response(await rep.text(), { status: rep.status, headers: { 'content-type': 'application/json', ...cors(origine) } });
}

export default { fetch: relais };
