// Où l'assistant envoie ses questions. La clé API n'est JAMAIS ici :
// elle est une variable d'environnement sur Netlify (voir README, section Assistant IA).
// - Site servi par Netlify : le relais est sur le même site (/api/chat).
// - Site servi par GitHub Pages : mettre l'adresse Netlify ci-dessous (ex. https://portail-inventaire-ti.netlify.app).
window.__IA_PROXY_NETLIFY = '';
window.__IA_PROXY = /\.netlify\.app$/.test(location.hostname) ? '/api/chat' : (window.__IA_PROXY_NETLIFY ? window.__IA_PROXY_NETLIFY.replace(/\/$/, '') + '/api/chat' : '');
