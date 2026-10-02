// Où l'assistant envoie ses questions. La clé API n'est JAMAIS ici :
// elle est une variable d'environnement sur Vercel (voir README, section Assistant IA).
// - Site servi par Vercel : le relais est sur le même site (/api/chat).
// - Site servi par GitHub Pages : mettre l'adresse Vercel ci-dessous (ex. https://portail-inventaire-ti.vercel.app).
window.__IA_PROXY_SERVEUR = '';
window.__IA_PROXY = /\.(vercel|netlify)\.app$/.test(location.hostname) ? '/api/chat' : (window.__IA_PROXY_SERVEUR ? window.__IA_PROXY_SERVEUR.replace(/\/$/, '') + '/api/chat' : '');
