/* Assistant IA branché sur l'API Claude (prototype).
   La clé API est saisie par l'utilisateur dans le panneau ⚙ de l'assistant et reste
   uniquement dans le navigateur (localStorage). Elle n'est jamais dans le dépôt.
   En production : passer par un serveur (voir app/api/chat/route.ts). */
(function () {
  var CFG = window.__ASSIST || { mode: 'client', page: 'index.html' };
  var SITE = window.__SITE || [];
  var LS_KEY = 'claude-cle-api', LS_MODEL = 'claude-modele';
  var PROXY = (window.__IA_PROXY || '').replace(/\/$/, '');
  function connecte() { return !!PROXY || !!get(LS_KEY); }
  if (PROXY && get(LS_KEY)) set(LS_KEY, ''); // ancienne clé de test : le serveur prend le relais
  var CONV_KEY = 'ia-conv-' + CFG.mode;
  var MODELES = [
    ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (recommandé)'],
    ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 (rapide, économique)'],
    ['claude-opus-5-5', 'Claude Opus 5.5 (le plus puissant)']
  ];

  function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ---------- Pages accessibles selon l'espace ----------
  var permis = SITE.filter(function (p) {
    if (CFG.mode === 'admin') return true;
    if (CFG.mode === 'client') return p.espace === 'client' || p.espace === 'public';
    return p.espace === 'public';
  });
  var nomsPermis = permis.map(function (p) { return p.page; });
  function titreDe(f) { for (var i = 0; i < SITE.length; i++) if (SITE[i].page === f) return SITE[i].titre; return f; }

  // ---------- Extraction du texte d'une page ----------
  var BLOCS = /^(DIV|P|LI|H1|H2|H3|H4|H5|H6|SECTION|HEADER|ARTICLE|TR|LABEL|A|BUTTON|ASIDE|FOOTER|UL|OL|TABLE|FORM)$/;
  function texteDe(root) {
    var out = [];
    (function walk(n) {
      if (n.nodeType === 3) { out.push(n.nodeValue); return; }
      if (n.nodeType !== 1) return;
      var t = n.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'SVG' || t === 'svg' || t === 'NAV') return;
      if (n.hasAttribute && (n.hasAttribute('data-floating') || n.hasAttribute('data-notif-panel') || n.getAttribute('role') === 'menu' || n.hasAttribute('data-usermenu'))) return;
      if (t === 'SELECT') { var opts = [].map.call(n.options || [], function (o) { return o.textContent.trim(); }); out.push(' [liste : ' + opts.join(' | ') + '] '); return; }
      if (t === 'INPUT' || t === 'TEXTAREA') { var v = n.value || n.getAttribute('value') || ''; var ph = n.getAttribute('placeholder') || ''; if (v || ph) out.push(' [' + (v ? 'valeur : ' + v : 'champ : ' + ph) + '] '); return; }
      if (t === 'IMG') return;
      var bloc = BLOCS.test(t);
      if (bloc) out.push('\n');
      for (var c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (bloc) out.push('\n'); else out.push(' ');
    })(root);
    return out.join('').split('\n').map(function (l) { return l.replace(/\s+/g, ' ').trim(); }).filter(Boolean).join('\n');
  }
  function textePageCourante() { return texteDe(document.querySelector('main') || document.body).slice(0, 7000); }
  var cachePages = {};
  function lirePage(f) {
    if (nomsPermis.indexOf(f) < 0) return Promise.resolve('Accès refusé : cette page n’est pas accessible depuis cet espace.');
    if (f === CFG.page) return Promise.resolve(textePageCourante());
    if (cachePages[f]) return Promise.resolve(cachePages[f]);
    return fetch(f + '?v=' + (CFG.build || '')).then(function (r) { return r.text(); }).then(function (html) {
      html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      var d = new DOMParser().parseFromString(html, 'text/html');
      var t = texteDe(d.querySelector('main') || d.body).slice(0, 12000);
      cachePages[f] = t; return t;
    }).catch(function () { return 'Impossible de lire la page ' + f + '.'; });
  }

  // ---------- Actions ----------
  function majPanierBadges(c) { var n = c.reduce(function (s, x) { return s + (+x.qte || 0); }, 0); document.querySelectorAll('[data-cart-count]').forEach(function (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }); }
  function panier() { try { var c = JSON.parse(localStorage.getItem('panier')); if (Array.isArray(c)) return c; } catch (e) {} return [{ nom: 'LG 27UL500 — 27 po 4K', cat: 'Écran', prix: '389,00 $', qte: 1 }, { nom: 'Extension de garantie 2 ans', cat: 'Service', prix: '79,00 $', qte: 1 }]; }
  var navigationEnAttente = null;

  var OUTILS = {
    lire_page: {
      def: { name: 'lire_page', description: 'Lit le contenu texte d’une page du portail (inventaire, billets, commandes, soumissions, catalogue, clients, rapports, paramètres…). Utilise-le dès que la réponse dépend de données que tu n’as pas encore. Tu peux l’appeler plusieurs fois.', input_schema: { type: 'object', properties: { page: { type: 'string', enum: nomsPermis, description: 'Nom du fichier de la page' } }, required: ['page'] } },
      run: function (i) { return lirePage(i.page); }, statut: function (i) { return 'Lecture : ' + titreDe(i.page) + '…'; }
    },
    ouvrir_page: {
      def: { name: 'ouvrir_page', description: 'Ouvre une page du portail pour l’utilisateur (navigation). Utilise-le quand il demande d’aller quelque part, de voir, d’ouvrir ou de remplir un formulaire. La page s’ouvre après ta réponse.', input_schema: { type: 'object', properties: { page: { type: 'string', enum: nomsPermis }, ancre: { type: 'string', description: 'Optionnel : ancre (#…) ou no de série à présélectionner' } }, required: ['page'] } },
      run: function (i) { if (nomsPermis.indexOf(i.page) < 0) return 'Page non permise.'; navigationEnAttente = i.page + '?v=' + (CFG.build || '') + (i.ancre ? '#' + String(i.ancre).replace(/^#/, '') : ''); return 'La page « ' + titreDe(i.page) + ' » va s’ouvrir après ta réponse.'; },
      statut: function (i) { return 'Ouverture : ' + titreDe(i.page); }
    },
    filtrer_page: {
      def: { name: 'filtrer_page', description: 'Tape un texte dans le champ de recherche de la page actuelle pour filtrer la liste affichée (no de série, nom, client, emplacement). Texte vide = réinitialiser.', input_schema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'] } },
      run: function (i) { var r = document.getElementById('rech') || document.querySelector('[data-etq-rech]') || document.querySelector('main input[type=search]'); if (!r) return 'Aucun champ de recherche sur cette page.'; r.value = i.texte || ''; r.dispatchEvent(new Event('input')); return 'Filtre appliqué : « ' + (i.texte || '') + ' ».'; },
      statut: function () { return 'Filtrage de la liste…'; }
    },
    creer_billet: {
      def: { name: 'creer_billet', description: 'Crée un billet de support. Avant de l’appeler, assure-toi d’avoir l’appareil et une description du problème; demande confirmation si l’utilisateur ne l’a pas clairement demandé.', input_schema: { type: 'object', properties: { appareil: { type: 'string' }, description: { type: 'string' }, priorite: { type: 'string', enum: ['Basse', 'Normale', 'Haute'] }, client: { type: 'string', description: 'Admin seulement : nom du client' } }, required: ['appareil', 'description'] } },
      run: function (i) {
        var l = []; try { l = JSON.parse(localStorage.getItem('billets-ia')) || []; } catch (e) {}
        var no = 4424 + l.length; l.push({ no: no, appareil: i.appareil, description: i.description, priorite: i.priorite || 'Normale', client: i.client || (CFG.mode === 'client' ? 'Clinique Dentaire Ste-Rose' : ''), date: new Date().toISOString() });
        set('billets-ia', JSON.stringify(l));
        window.__toast && window.__toast('Billet #' + no + ' créé — ' + i.appareil, true);
        return 'Billet #' + no + ' créé (priorité ' + (i.priorite || 'Normale') + '). Un technicien est avisé. (Prototype : enregistré dans ce navigateur.)';
      },
      statut: function () { return 'Création du billet…'; }
    },
    creer_evenement: {
      def: { name: 'creer_evenement', description: 'Ajoute un rendez-vous au calendrier de l’équipe (admin-calendrier.html) : intervention, visite, livraison, maintenance, relance, échéance ou interne. Lis d’abord le calendrier pour éviter les conflits du technicien. Confirme avec l’utilisateur si la demande est ambiguë.', input_schema: { type: 'object', properties: { titre: { type: 'string' }, type: { type: 'string', enum: ['intervention', 'visite', 'livraison', 'maintenance', 'relance', 'echeance', 'interne'] }, date: { type: 'string', description: 'AAAA-MM-JJ' }, debut: { type: 'string', description: 'HH:MM (vide si toute la journée)' }, fin: { type: 'string', description: 'HH:MM' }, technicien: { type: 'string', enum: ['Jonathan', 'Samuel', 'Karine', 'Tous'] }, client: { type: 'string' }, lieu: { type: 'string' }, notes: { type: 'string' } }, required: ['titre', 'type', 'date', 'technicien'] } },
      run: function (i) {
        var S; try { S = JSON.parse(localStorage.getItem('agenda-v1')); } catch (e) {}
        if (!S || !S.ajouts) S = { ajouts: [], modifs: {}, suppr: [], planifies: [] };
        var e = { id: 'ia' + Date.now(), titre: i.titre, type: i.type, date: i.date, debut: i.debut || '', fin: i.fin || '', journee: !i.debut, tech: i.technicien, client: i.client || '', lieu: i.lieu || '', notes: i.notes || '', lien: '' };
        S.ajouts.push(e); set('agenda-v1', JSON.stringify(S));
        if (window.__CAL) window.__CAL.rafraichir();
        window.__toast && window.__toast('Ajouté au calendrier : ' + i.titre, true);
        return 'Événement ajouté au calendrier : ' + i.titre + ', ' + i.date + (i.debut ? ' de ' + i.debut + ' à ' + (i.fin || '?') : ' (toute la journée)') + ', ' + i.technicien + '. (Prototype : enregistré dans ce navigateur.)';
      },
      statut: function () { return 'Ajout au calendrier…'; }
    },
    lire_messages: {
      def: { name: 'lire_messages', description: 'Lit les conversations de la messagerie privée client ↔ équipe (sujet, participants, derniers messages, non lus, id de conversation). Utilise-le avant de proposer une réponse dans un fil existant ou quand on te demande les messages.', input_schema: { type: 'object', properties: { client: { type: 'string', description: 'Admin seulement : filtrer sur un client' }, non_lus_seulement: { type: 'boolean' } } } },
      run: function (i) {
        var M = messagerie(), cote = CFG.mode === 'admin' ? 'admin' : 'client';
        var L = M.threads.filter(function (t) { return (CFG.mode === 'admin' || t.client === CLIENT_PORTAIL) && !(((t.org || {})[cote] || {}).supprime) && (!i.client || t.client.toLowerCase().indexOf(String(i.client).toLowerCase()) > -1); });
        L = L.filter(function (t) { return !i.non_lus_seulement || estNonLu(t); });
        if (!L.length) return 'Aucune conversation correspondante.';
        return L.map(function (t) { var o = ((t.org || {})[cote] || {}); return '[' + t.id + '] « ' + t.sujet + ' » — ' + t.client + ' (' + t.contact + ')' + (t.tech ? ', suivi par ' + t.tech : ', non assigné') + (estNonLu(t) ? ' — NON LU' : '') + (o.dossier && o.dossier !== 'inbox' ? ' — dossier : ' + o.dossier : '') + '\n' + t.messages.slice(-3).map(function (m) { return '  ' + m.date.replace('T', ' ').slice(0, 16) + ' ' + m.auteur + ' : ' + m.texte; }).join('\n'); }).join('\n\n');
      },
      statut: function () { return 'Lecture des messages…'; }
    },
    proposer_message: {
      def: { name: 'proposer_message', description: 'Prépare un message de la messagerie privée pour que l’utilisateur le relise et l’envoie lui-même (rien n’est envoyé automatiquement). Client : message à son équipe TI. Admin : message à un client. Pour répondre dans une conversation existante, donne conversation_id (voir lire_messages).', input_schema: { type: 'object', properties: { client: { type: 'string', description: 'Admin seulement : nom exact du client destinataire' }, conversation_id: { type: 'string', description: 'Id d’une conversation existante pour y répondre' }, sujet: { type: 'string', description: 'Sujet (nouvelle conversation)' }, texte: { type: 'string', description: 'Texte complet du message, prêt à envoyer, signé' } }, required: ['texte'] } },
      run: function (i) {
        var M = messagerie(), t = i.conversation_id ? M.threads.filter(function (x) { return x.id === i.conversation_id; })[0] : null;
        var client = CFG.mode === 'admin' ? (t ? t.client : trouverClient(i.client)) : CLIENT_PORTAIL;
        if (CFG.mode === 'admin' && !client) return 'Client introuvable. Clients : ' + Object.keys(CONTACTS).join(', ') + '.';
        if (t && CFG.mode !== 'admin' && t.client !== CLIENT_PORTAIL) t = null;
        cartes.push({ thread: t ? t.id : '', client: client, contact: t ? t.contact : (CFG.mode === 'admin' ? CONTACTS[client] : 'Marie Tremblay'), sujet: t ? t.sujet : (i.sujet || 'Message'), texte: i.texte });
        return 'Brouillon affiché à l’utilisateur sous ta réponse (destinataire : ' + (CFG.mode === 'admin' ? CONTACTS[client] + ', ' + client : 'équipe [ENTREPRISE]') + '). Il le relit et clique « Envoyer » lui-même : ne dis pas que c’est envoyé.';
      },
      statut: function () { return 'Préparation du message…'; }
    },
    ajouter_au_panier: {
      def: { name: 'ajouter_au_panier', description: 'Ajoute un produit du catalogue au panier du client. Lis d’abord commande.html pour connaître les produits et prix exacts.', input_schema: { type: 'object', properties: { produit: { type: 'string', description: 'Nom exact du produit tel qu’affiché au catalogue' }, quantite: { type: 'integer', minimum: 1 } }, required: ['produit'] } },
      run: function (i) {
        return fetch('commande.html?v=' + (CFG.build || '')).then(function (r) { return r.text(); }).then(function (html) {
          var d = new DOMParser().parseFromString(html, 'text/html');
          var prods = [].map.call(d.querySelectorAll('[data-produit]'), function (p) { return { nom: p.getAttribute('data-produit'), prix: p.getAttribute('data-prix'), cat: p.getAttribute('data-cat') }; });
          var q = i.produit.toLowerCase(), p = prods.filter(function (x) { return x.nom.toLowerCase() === q; })[0] || prods.filter(function (x) { return x.nom.toLowerCase().indexOf(q) > -1 || q.indexOf(x.nom.toLowerCase().split(' —')[0]) > -1; })[0];
          if (!p) return 'Produit introuvable. Produits disponibles : ' + prods.map(function (x) { return x.nom + ' (' + x.prix + ')'; }).join('; ');
          var c = panier(), ex = c.filter(function (x) { return x.nom === p.nom; })[0], n = i.quantite || 1;
          if (ex) ex.qte = (+ex.qte || 0) + n; else c.push({ nom: p.nom, cat: p.cat, prix: p.prix, qte: n });
          set('panier', JSON.stringify(c)); majPanierBadges(c);
          window.__toast && window.__toast(n + ' × ' + p.nom + ' ajouté au panier', true);
          return 'Ajouté : ' + n + ' × ' + p.nom + ' à ' + p.prix + '. Panier : ' + c.map(function (x) { return x.qte + ' × ' + x.nom; }).join(', ') + '.';
        }).catch(function () { return 'Impossible de lire le catalogue.'; });
      },
      statut: function () { return 'Ajout au panier…'; }
    }
  };
  var actifs = CFG.mode === 'public' ? ['lire_page', 'ouvrir_page'] : CFG.mode === 'admin' ? ['lire_page', 'ouvrir_page', 'filtrer_page', 'creer_billet', 'creer_evenement', 'lire_messages', 'proposer_message'] : ['lire_page', 'ouvrir_page', 'filtrer_page', 'creer_billet', 'ajouter_au_panier', 'lire_messages', 'proposer_message'];

  // ---------- messagerie : lecture / envoi depuis l'assistant ----------
  var CLIENT_PORTAIL = 'Clinique Dentaire Ste-Rose', MK = 'messagerie-v1', cartes = [];
  var CONTACTS = { 'Clinique Dentaire Ste-Rose': 'Marie Tremblay', 'Garderie Les Lucioles': 'Sophie Côté', 'Studio Nord Design': 'Julie D.', 'Comptabilité Marchand': 'Pierre Marchand', 'Groupe Auto Laurentides': 'Martin Lévesque', 'Physio Rive-Nord': 'Nadia K.', 'Notaires Lacasse & Fils': 'Me Lacasse', 'Atelier Mécanique Dubé': 'Éric Dubé' };
  function messagerie() { try { var o = JSON.parse(localStorage.getItem(MK)); if (o && o.threads) return o; } catch (e) {} return { threads: JSON.parse(JSON.stringify(window.__MSG_SEED || [])) }; }
  function maintenant() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
  function estNonLu(t) { var m = t.messages[t.messages.length - 1], adm = CFG.mode === 'admin'; return m.de !== (adm ? 'equipe' : 'client') && m.date > (adm ? t.luEquipe : t.luClient); }
  function trouverClient(n) { if (!n) return ''; n = String(n).toLowerCase(); return Object.keys(CONTACTS).filter(function (c) { return c.toLowerCase() === n || c.toLowerCase().indexOf(n) > -1 || n.indexOf(c.toLowerCase().split(' ').slice(-1)[0]) > -1; })[0] || ''; }
  function envoyerMessage(c, sujet, texte) {
    var M = messagerie(), adm = CFG.mode === 'admin', moi = adm ? 'Jonathan' : 'Marie Tremblay', autre = adm ? 'client' : 'admin', t = c.thread ? M.threads.filter(function (x) { return x.id === c.thread; })[0] : null;
    var msg = { de: adm ? 'equipe' : 'client', auteur: moi, date: maintenant(), texte: texte };
    if (t) { t.messages.push(msg); if (adm) { t.luEquipe = msg.date; if (!t.tech) t.tech = moi; } else t.luClient = msg.date; t.org = t.org || {}; var oa = t.org[autre]; if (oa && (oa.dossier !== 'inbox' || oa.supprime)) { oa.dossier = 'inbox'; oa.supprime = false; } }
    else { t = { id: 'm' + Date.now(), client: c.client, contact: c.contact, sujet: sujet, tech: adm ? moi : '', lien: '', luClient: adm ? '2000-01-01T00:00:00' : msg.date, luEquipe: adm ? msg.date : '2000-01-01T00:00:00', messages: [msg] }; M.threads.push(t); }
    try { localStorage.setItem(MK, JSON.stringify(M)); } catch (e) {}
    if (window.__MSG && window.__MSG.rafraichir) window.__MSG.rafraichir();
    return t.id;
  }
  function carteMessage(fil, c) {
    var adm = CFG.mode === 'admin', d = document.createElement('div');
    var IN = "font-family:'IBM Plex Sans',system-ui,sans-serif;-webkit-appearance:none;border-radius:0;border:1px solid #B8C4CE;font-size:16px;width:100%;box-sizing:border-box;padding:8px 10px;color:#14202B;background:#fff";
    d.style.cssText = 'align-self:stretch;background:#fff;border:1px solid #D5DCE2;border-left:4px solid ' + COL + ';padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13.5px';
    d.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-weight:600;color:' + COL + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3.5 6.5l8.5 6 8.5-6"></path></svg>Message à envoyer</div>'
      + '<div style="font-size:12.5px;color:#5B6B78">À : <strong style="color:#14202B">' + esc(adm ? c.contact + ' — ' + c.client : 'Équipe [ENTREPRISE]') + '</strong>' + (c.thread ? ' · réponse à « ' + esc(c.sujet) + ' »' : '') + '</div>'
      + (c.thread ? '' : '<input data-c-sujet value="' + esc(c.sujet) + '" aria-label="Sujet" style="' + IN + ';height:40px;font-weight:600">')
      + '<textarea data-c-texte rows="6" aria-label="Message" style="' + IN + ';line-height:1.45;resize:vertical;min-height:120px">' + esc(c.texte) + '</textarea>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" data-c-env style="height:38px;padding:0 16px;border:0;background:' + COL + ';color:#fff;font:inherit;font-weight:600;cursor:pointer">Envoyer</button><button type="button" data-c-ann style="height:38px;padding:0 12px;border:1px solid #B8C4CE;background:#fff;font:inherit;cursor:pointer">Annuler</button><span style="font-size:11.5px;color:#5B6B78">Relisez avant d’envoyer.</span></div>';
    fil.appendChild(d); fil.scrollTop = fil.scrollHeight;
    d.querySelector('[data-c-ann]').onclick = function () { d.innerHTML = '<span style="color:#5B6B78">Message annulé.</span>'; };
    d.querySelector('[data-c-env]').onclick = function () {
      var tx = d.querySelector('[data-c-texte]').value.trim(), sj = c.thread ? c.sujet : (d.querySelector('[data-c-sujet]').value.trim() || 'Message');
      if (!tx) return;
      var id = envoyerMessage(c, sj, tx), page = (adm ? 'admin-messages.html' : 'messages.html') + '?v=' + (CFG.build || '') + '#' + id;
      d.innerHTML = '<div style="color:#1B6B3A;font-weight:600">✓ Message envoyé à ' + esc(adm ? c.contact : 'votre équipe TI') + '</div><a href="' + page + '" style="color:' + COL + ';font-weight:600;text-decoration:none">Voir la conversation →</a>';
      messages.push({ role: 'user', content: '(Système : l’utilisateur a envoyé le message « ' + sj + ' ».)' }); messages.push({ role: 'assistant', content: [{ type: 'text', text: 'Noté.' }] }); sauver(messages);
      window.__toast && window.__toast('Message envoyé — ' + sj, true);
    };
  }

  // ---------- Instructions système ----------
  function systeme() {
    var commun = 'Tu es intégré au portail web d’une entreprise québécoise de services TI gérés (MSP) qui s’appelle pour l’instant « [ENTREPRISE] ». ' +
      'Réponds toujours en français québécois professionnel, de façon brève et directe (l’écran est souvent un iPhone) : 2 à 6 phrases ou une courte liste. ' +
      'Ne devine jamais une donnée (appareil, no de série, date, prix, statut) : lis la page qui la contient avec lire_page. Si l’info n’existe pas sur le site, dis-le. ' +
      'Pour diriger l’utilisateur vers une page, écris un lien markdown [Titre](fichier.html) ou utilise ouvrir_page s’il veut y aller. ' +
      'Aujourd’hui : ' + new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '. ' +
      'Offre : prix par appareil par mois — Visibilité 8 $, Géré 25 $, Géré + matériel 55 $ (indicatifs); visite d’inventaire gratuite (scan + étiquettes QR, portail prêt en 48 h); remplacement planifié; support en français; aucun verrouillage; reprise et recyclage; spécialité PME 5-50 postes des Laurentides / Rive-Nord et concessionnaires automobiles (DMS, postes F&I, tablettes de diagnostic, Wi-Fi atelier et cour, multi-succursales). ' +
      'Ceci est un prototype : les actions (billets, panier) sont enregistrées dans le navigateur seulement.';
    var role = CFG.mode === 'admin'
      ? 'Tu es le Copilote interne de Jonathan (propriétaire) et de ses techniciens (Karine, Samuel). Tu as accès à tout : billets, inventaire de tous les clients, clients, commandes, soumissions, catalogue et prix, rapports, utilisateurs, paramètres. Aide à prioriser la journée, résumer des billets, trouver un appareil chez n’importe quel client, préparer des soumissions (lignes, prix, taxes TPS+TVQ 14,975 %), rédiger des courriels aux clients. Les échanges écrits avec les clients sont dans admin-messages.html (tu peux les résumer et proposer une réponse, mais c’est l’humain qui l’envoie). Pour l’horaire de l’équipe (interventions, visites, livraisons, maintenances, congés, échéances), lis admin-calendrier.html et utilise creer_evenement pour planifier; vérifie la charge et les conflits du technicien. Pour le stock et les achats, lis admin-stock.html : stock en main, réservé par les commandes clients, en commande, demande prévue (soumissions × probabilité, plans de remplacement, consommation), seuils/cibles, quantités suggérées et répartition du budget. Explique les priorités (commandes client non couvertes d’abord) et propose des arbitrages si le budget est insuffisant. N’envoie jamais rien à un client toi-même. Quand il faut écrire à un client (confirmer un rendez-vous, demander une information, annoncer une livraison, répondre à son message), PROPOSE le message avec proposer_message (vouvoiement, signé « Jonathan ») : lis d’abord lire_messages pour répondre dans le bon fil (conversation_id). Jonathan relit et clique « Envoyer ».'
      : CFG.mode === 'client'
        ? 'Tu es l’assistant support de Marie Tremblay (administratrice) chez le client Clinique Dentaire Ste-Rose. Tu connais son inventaire, ses billets, ses commandes, soumissions, factures, son plan de remplacement et le catalogue. Tu peux créer un billet, ajouter au panier, filtrer la liste et ouvrir des pages. Tu ne parles jamais des autres clients ni des prix internes. Pour une urgence (toute la clinique arrêtée), recommande d’appeler le support et crée un billet de priorité Haute. Quand Marie veut joindre une personne, poser une question à son technicien, confirmer un détail, ou quand tu ne peux pas régler la demande toi-même, PROPOSE d’envoyer un message à l’équipe avec proposer_message : rédige-le complètement (appareil, no de série, emplacement, symptôme, depuis quand, disponibilités) et signe « Marie ». Pour répondre à un fil existant, utilise lire_messages puis conversation_id. Ne dis jamais que le message est envoyé : elle clique « Envoyer ». Si un problème dépasse tes moyens, propose qu’un technicien prenne le relais.'
        : 'Tu es l’assistant du site public. Tu expliques les services, les forfaits, la visite gratuite et l’évaluateur de forfait, et tu invites à réserver la visite ou à essayer l’évaluateur. Tu n’as pas accès aux données des clients.';
    var pages = 'Pages accessibles (fichier — titre) :\n' + permis.map(function (p) { return '- ' + p.page + ' — ' + p.titre; }).join('\n');
    return commun + '\n\n' + role + '\n\n' + pages + '\n\nPage actuellement ouverte : ' + CFG.page + ' (' + titreDe(CFG.page) + '). Son contenu :\n"""\n' + textePageCourante() + '\n"""';
  }

  // ---------- Conversation ----------
  function charger() { try { return JSON.parse(sessionStorage.getItem(CONV_KEY)) || []; } catch (e) { return []; } }
  function sauver(m) { try { sessionStorage.setItem(CONV_KEY, JSON.stringify(m.slice(-30))); } catch (e) {} }
  var messages = charger();

  function mdHtml(t) {
    var h = esc(t);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\[([^\]]+)\]\(([a-z0-9-]+\.html)(#[^)]*)?\)/gi, function (m, txt, f, a) { return '<a href="' + f + '?v=' + (CFG.build || '') + (a || '') + '" style="color:inherit;font-weight:600">' + txt + '</a>'; });
    h = h.split('\n').map(function (l) { return /^\s*[-•]\s+/.test(l) ? '<div style="padding-left:12px;text-indent:-10px">• ' + l.replace(/^\s*[-•]\s+/, '') + '</div>' : (/^#+\s/.test(l) ? '<strong>' + l.replace(/^#+\s/, '') + '</strong>' : l); }).join('<br>');
    return h.replace(/(<\/div>)<br>/g, '$1');
  }
  function bulleIA(fil, html) { var d = document.createElement('div'); d.style.cssText = 'align-self:flex-start;max-width:88%;background:#fff;border:1px solid #D5DCE2;padding:10px 12px;overflow-wrap:anywhere'; d.innerHTML = html; fil.appendChild(d); fil.scrollTop = fil.scrollHeight; return d; }
  function bulleMoi(fil, t, col) { var d = document.createElement('div'); d.style.cssText = 'align-self:flex-end;max-width:85%;background:' + col + ';color:#fff;padding:10px 12px;overflow-wrap:anywhere'; d.textContent = t; fil.appendChild(d); fil.scrollTop = fil.scrollHeight; }
  var COL = CFG.mode === 'admin' ? '#B4540A' : '#0F6E8C';

  function appel(msgs) {
    return appelAPI({ model: get(LS_MODEL) || MODELES[0][0], max_tokens: 1500, system: systeme(), tools: actifs.map(function (k) { return OUTILS[k].def; }), messages: msgs });
  }
  function appelAPI(corps) {
    var perso = PROXY ? '' : get(LS_KEY); // serveur configuré : on ignore toute clé locale
    return fetch(perso || !PROXY ? 'https://api.anthropic.com/v1/messages' : PROXY, {
      method: 'POST',
      headers: perso || !PROXY ? { 'content-type': 'application/json', 'x-api-key': perso, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } : { 'content-type': 'application/json' },
      body: JSON.stringify(corps)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var m = (j && j.error && j.error.message) || ('HTTP ' + r.status); var e = new Error(m); e.status = r.status; throw e; }
        return j;
      });
    });
  }


  // ---------- Suggestions pour la messagerie (client ↔ équipe) ----------
  // Rassemble le contexte (fil, données du site sur ce client, calendrier, autres conversations, utilisateurs)
  // et demande à Claude des propositions de message en JSON. Rien n'est envoyé automatiquement.
  function filtrerLignes(texte, mots, max) {
    var L = texte.split('\n'), garder = {};
    L.forEach(function (l, i) { var b = l.toLowerCase(); if (mots.some(function (m) { return m && b.indexOf(m) > -1; })) { garder[i - 1] = garder[i] = garder[i + 1] = garder[i + 2] = 1; } });
    var out = L.filter(function (_, i) { return garder[i]; }).join('\n');
    return out.slice(0, max);
  }
  // Extrait seulement les « rangées » (appareil, billet, commande, rendez-vous, contact…) qui mentionnent ce client.
  var cacheDocs = {};
  function docPage(f) {
    if (f === CFG.page) return Promise.resolve(document);
    if (cacheDocs[f]) return Promise.resolve(cacheDocs[f]);
    return fetch(f + '?v=' + (CFG.build || '')).then(function (r) { return r.text(); }).then(function (h) {
      h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      return (cacheDocs[f] = new DOMParser().parseFromString(h, 'text/html'));
    }).catch(function () { return null; });
  }
  function rangees(f, mots) {
    if (nomsPermis.indexOf(f) < 0) return Promise.resolve('');
    return docPage(f).then(function (d) {
      if (!d) return '';
      var main = d.querySelector('main') || d.body;
      var exclu = function (el) { return el.closest('nav,[data-floating],[data-notif-panel],[data-msg-panel],[role=menu],[data-usermenu]'); };
      var cand = [].slice.call(main.querySelectorAll('a,div,li,tr,section,article,button,label')).filter(function (el) {
        if (exclu(el) || el.children.length < 2 || el.querySelector('select')) return false;
        var t = (el.textContent || '').replace(/\s+/g, ' ').toLowerCase(); if (t.length > 700) return false;
        return mots.some(function (m) { return t.indexOf(m) > -1; });
      });
      var rows = cand.filter(function (el) { return !cand.some(function (o) { return o !== el && el.contains(o); }); });
      var vus = {}, out = [];
      rows.forEach(function (el) { var t = texteDe(el).split('\n').join(' · '); if (t && !vus[t]) { vus[t] = 1; out.push('- ' + t); } });
      return out.join('\n').slice(0, 3500);
    });
  }
  function contexteMessagerie(o) {
    var admin = CFG.mode === 'admin';
    var pages = admin ? ['admin-clients.html', 'admin-inventaire.html', 'admin.html', 'admin-commandes.html', 'admin-soumissions.html', 'admin-calendrier.html', 'utilisateurs.html', 'admin-stock.html']
      : ['mon-inventaire.html', 'mes-billets.html', 'mes-commandes.html', 'plan-remplacement.html', 'mon-compte.html'];
    var cl = (o.client || '').toLowerCase(), mots = [cl, cl.split(' ').slice(-1)[0], (o.contact || '').toLowerCase()].filter(function (m) { return m && m.length > 3; });
    var titres = (o.sujet + ' ' + o.fil.map(function (m) { return m.texte; }).join(' ')).match(/#\d{4}|[CS]-\d{3}|F-\d{4}-\d{4}/g) || [];
    titres.forEach(function (t) { mots.push(t.toLowerCase()); });
    return Promise.all(pages.filter(function (p) { return nomsPermis.indexOf(p) > -1; }).map(function (p) {
      var prom = admin ? rangees(p, p === 'utilisateurs.html' ? mots.concat(['jonathan', 'samuel', 'karine']) : mots) : lirePage(p).then(function (t) { return t.slice(0, 4000); });
      return prom.then(function (x) { return x ? '### ' + titreDe(p) + ' (' + p + ')\n' + x : ''; });
    })).then(function (blocs) {
      var extra = [];
      try { var A = JSON.parse(localStorage.getItem('agenda-v1')); if (A && A.ajouts) A.ajouts.filter(function (e) { return (e.client || '').toLowerCase() === cl; }).forEach(function (e) { extra.push('- Rendez-vous ' + (e.statut === 'propose' ? 'à confirmer' : 'confirmé') + ' : ' + e.titre + ', ' + e.date + ' ' + (e.debut || '') + '–' + (e.fin || '') + ', ' + e.tech); }); } catch (e) {}
      try { var M = JSON.parse(localStorage.getItem('messagerie-v1')); if (M && M.threads) M.threads.filter(function (t) { return t.client === o.client && t.id !== o.id; }).forEach(function (t) { var d = t.messages.slice(-2).map(function (m) { return m.auteur + ' : ' + m.texte.slice(0, 220); }).join(' / '); extra.push('- Autre conversation « ' + t.sujet + ' » : ' + d); }); } catch (e) {}
      return blocs.filter(Boolean).join('\n\n') + (extra.length ? '\n\n### Activité récente enregistrée dans le portail\n' + extra.join('\n') : '');
    });
  }
  function suggerer(o) {
    if (!connecte()) return Promise.reject(new Error('Assistant IA non configuré.'));
    var admin = CFG.mode === 'admin';
    return contexteMessagerie(o).then(function (ctx) {
      var date = new Date().toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      var sys = 'Tu aides à rédiger des messages dans la messagerie privée d’un portail de services TI gérés (« [ENTREPRISE] », Laurentides / Rive-Nord, Québec). Aujourd’hui : ' + date + '. '
        + (admin ? 'Tu écris AU NOM de ' + (o.moi || 'Jonathan') + ' (équipe [ENTREPRISE]) à ' + (o.contact || 'un client') + ' de ' + o.client + '. Vouvoie le client. Ton professionnel, chaleureux et concret, comme un technicien de confiance. Signe avec le prénom « ' + (o.moi || 'Jonathan') + ' ». '
          : 'Tu aides ' + (o.moi || 'Marie Tremblay') + ' (cliente, ' + o.client + ') à écrire à son équipe TI. Message clair et poli; donne les détails utiles au technicien (appareil, no de série, emplacement, depuis quand, urgence) tirés de son inventaire. Signe « ' + (o.moi || 'Marie') .split(' ')[0] + ' ». ')
        + 'Français québécois naturel, phrases courtes, aucune formule creuse. Appuie-toi UNIQUEMENT sur le fil et les données fournies : ne promets jamais un prix, une date ou un délai absent des données; si une info manque, écris-la entre crochets, ex. [heure à confirmer]. Ne mentionne jamais d’autres clients. '
        + 'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"suggestions":[{"titre":"…","texte":"…"}],"infos":["fait utilisé 1","…"]}. '
        + (o.intention === 'ameliorer' ? 'Donne 2 suggestions : « Version améliorée » (même contenu, mieux écrit) et « Plus courte ».' : o.intention === 'rediger' ? 'Donne 3 suggestions de premier message : « Courte », « Détaillée », « Avec contexte » .' : 'Donne 3 suggestions de réponse : « Courte », « Détaillée » et « Question / prochaine étape ».')
        + ' « infos » : 2 à 5 faits précis des données que tu as utilisés (ex. « Billet #4421 : réseau rétabli par Samuel »).';
      var fil = o.fil.map(function (m) { return '[' + m.date.replace('T', ' ').slice(0, 16) + '] ' + m.auteur + (m.de === 'equipe' ? ' (équipe)' : ' (client)') + ' : ' + m.texte; }).join('\n');
      var tache = o.intention === 'ameliorer' ? 'Améliore ce brouillon :\n"""' + o.brouillon + '"""' : o.intention === 'rediger' ? 'Rédige un nouveau message. Sujet : « ' + o.sujet + ' »' + (o.brouillon ? '. Idées de départ : ' + o.brouillon : '') : 'Propose la prochaine réponse de ' + (admin ? 'l’équipe' : 'la cliente') + ' dans ce fil' + (o.brouillon ? ' (tiens compte de ce début de brouillon : ' + o.brouillon + ')' : '') + '.';
      var contenu = '## Conversation « ' + (o.sujet || '(nouveau)') + ' » — ' + o.client + (o.tech ? ' — technicien assigné : ' + o.tech : '') + '\n' + (fil || '(aucun message encore)') + '\n\n## Données du portail\n' + ctx + '\n\n## Tâche\n' + tache;
      return appelAPI({ model: get(LS_MODEL) || MODELES[0][0], max_tokens: 1400, system: sys, messages: [{ role: 'user', content: contenu }] });
    }).then(function (rep) {
      var t = (rep.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
      var i = t.indexOf('{'), j = t.lastIndexOf('}');
      try { var o2 = JSON.parse(t.slice(i, j + 1)); if (o2 && o2.suggestions && o2.suggestions.length) return o2; } catch (e) {}
      return { suggestions: [{ titre: 'Suggestion', texte: t.trim() }], infos: [] };
    });
  }

  var occupe = false;
  function envoyer(q, panel, fil) {
    if (occupe) return; occupe = true;
    bulleMoi(fil, q, COL);
    var debut = messages.length;
    messages.push({ role: 'user', content: q });
    var attente = bulleIA(fil, '<span style="color:#5B6B78">…</span>');
    var tours = 0;
    function boucle() {
      tours++;
      return appel(messages).then(function (rep) {
        messages.push({ role: 'assistant', content: rep.content });
        var uses = (rep.content || []).filter(function (b) { return b.type === 'tool_use'; });
        if (rep.stop_reason === 'tool_use' && uses.length && tours < 8) {
          attente.innerHTML = '<span style="color:#5B6B78">' + esc(uses.map(function (u) { return OUTILS[u.name] ? OUTILS[u.name].statut(u.input || {}) : u.name; }).join(' · ')) + '</span>';
          return Promise.all(uses.map(function (u) {
            var o = OUTILS[u.name];
            var p = o && actifs.indexOf(u.name) > -1 ? Promise.resolve(o.run(u.input || {})) : Promise.resolve('Outil non disponible ici.');
            return p.then(function (res) { return { type: 'tool_result', tool_use_id: u.id, content: String(res) }; });
          })).then(function (results) { messages.push({ role: 'user', content: results }); return boucle(); });
        }
        var texte = (rep.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim() || 'C’est fait.';
        attente.innerHTML = mdHtml(texte);
        cartes.splice(0).forEach(function (c) { carteMessage(fil, c); });
        fil.scrollTop = fil.scrollHeight;
        // ne garder que le texte dans l'historique affichable
        sauver(messages);
        if (navigationEnAttente) { var u = navigationEnAttente; navigationEnAttente = null; setTimeout(function () { location.href = u; }, 1400); }
      });
    }
    boucle().catch(function (e) {
      cartes.length = 0;
      messages = messages.slice(0, debut); // annule ce tour
      var m = e.status === 401 ? (get(LS_KEY) || !PROXY ? 'Clé API refusée. Vérifiez-la dans ⚙ Réglages.' : 'Le service IA est mal configuré (clé refusée). Avisez l’administrateur.') : e.status === 429 ? 'Limite de requêtes atteinte. Réessayez dans un instant.' : e.status === 400 ? 'Requête refusée par l’API : ' + e.message : (e.status ? 'Erreur API (' + e.status + ') : ' + e.message : 'Connexion impossible à l’API Claude (réseau).');
      attente.innerHTML = '<span style="color:#9B1C1C">' + esc(m) + '</span>';
      sauver(messages);
    }).then(function () { occupe = false; });
  }

  // ---------- Réglages (⚙) ----------
  function installer() {
    var panel = document.querySelector('section[data-floating]'); if (!panel) return;
    var fermer = panel.querySelector('[aria-label="Fermer l\'assistant"]'); if (!fermer) return;
    var fil = panel.querySelector('div[style*="overflow: auto"]');
    var g = document.createElement('button'); g.type = 'button'; g.setAttribute('data-ia-reglages', ''); g.setAttribute('aria-label', 'Réglages de l’assistant'); g.title = 'Réglages (clé API Claude)';
    g.style.cssText = 'width:32px;height:32px;background:transparent;border:0;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer';
    g.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>';
    fermer.parentNode.insertBefore(g, fermer);
    // pastille d'état dans le sous-titre
    var sous = panel.querySelector('div > div > span + span');
    function etat() { if (sous) { var on = connecte(); sous.lastChild.nodeValue = on ? ' Connecté à Claude' : ' Mode démo · ajoutez votre clé ⚙'; var dot = sous.querySelector('span'); if (dot) dot.style.background = on ? '#3FBF7F' : '#E3A008'; } }
    etat();

    var R = document.createElement('div'); R.setAttribute('data-ia-panneau', '');
    R.style.cssText = 'display:none;flex-direction:column;gap:10px;padding:14px;background:#fff;border-bottom:1px solid #D5DCE2;font-size:13px;color:#14202B';
    R.innerHTML = '<strong style="font-size:14px">Assistant IA — réglages</strong>' +
      '<label style="display:flex;flex-direction:column;gap:4px;font-weight:600">Clé API Claude<input data-ia-cle type="password" autocomplete="off" placeholder="sk-ant-…" style="height:38px;padding:0 10px;border:1px solid #B8C4CE;font:inherit;font-weight:400"></label>' +
      '<label style="display:flex;flex-direction:column;gap:4px;font-weight:600">Modèle<select data-ia-modele style="height:38px;padding:0 8px;border:1px solid #B8C4CE;font:inherit;font-weight:400;background:#fff">' + MODELES.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '</select></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-ia-ok style="height:36px;padding:0 14px;background:' + COL + ';border:0;color:#fff;font:inherit;font-weight:600">Enregistrer</button><button type="button" data-ia-oublier style="height:36px;padding:0 12px;background:#fff;border:1px solid #B8C4CE;font:inherit">Retirer la clé</button><button type="button" data-ia-vider style="height:36px;padding:0 12px;background:#fff;border:1px solid #B8C4CE;font:inherit">Nouvelle conversation</button></div>' +
      '<span style="font-size:12px;color:#5B6B78;line-height:1.4">La clé reste seulement dans ce navigateur (jamais envoyée ailleurs qu’à api.anthropic.com, jamais dans GitHub). Pour le vrai site, elle sera sur le serveur. Créez une clé dédiée avec une limite de dépenses dans console.anthropic.com.</span>';
    panel.insertBefore(R, fil);
    var ci = R.querySelector('[data-ia-cle]'), ms = R.querySelector('[data-ia-modele]');
    if (PROXY) { ci.parentNode.style.display = 'none'; ci.placeholder = 'Optionnel — le service IA est déjà configuré'; R.querySelector('[data-ia-oublier]').style.display = 'none'; R.lastChild.textContent = 'L’assistant est connecté à Claude par le serveur de l’entreprise : aucune clé à saisir.'; }
    g.addEventListener('click', function (e) { e.stopPropagation(); var o = R.style.display !== 'flex'; R.style.display = o ? 'flex' : 'none'; if (o) { ci.value = get(LS_KEY); ms.value = get(LS_MODEL) || MODELES[0][0]; } });
    R.querySelector('[data-ia-ok]').addEventListener('click', function () { var k = ci.value.trim(); if (k && !/^sk-ant-/.test(k)) { window.__toast && window.__toast('Une clé API Claude commence par « sk-ant- »', false); return; } set(LS_KEY, k); set(LS_MODEL, ms.value); R.style.display = 'none'; etat(); window.__toast && window.__toast(k ? 'Assistant connecté à Claude (' + ms.options[ms.selectedIndex].text.split(' (')[0] + ')' : 'Clé retirée — mode démo', !!k); });
    R.querySelector('[data-ia-oublier]').addEventListener('click', function () { set(LS_KEY, ''); ci.value = ''; etat(); R.style.display = 'none'; window.__toast && window.__toast('Clé retirée de ce navigateur — mode démo', false); });
    R.querySelector('[data-ia-vider]').addEventListener('click', function () { messages = []; sauver(messages); [].slice.call(fil.querySelectorAll('[data-ia-hist]')).forEach(function (n) { n.remove(); }); R.style.display = 'none'; window.__toast && window.__toast('Nouvelle conversation', true); });

    // réafficher la conversation (après navigation)
    if (connecte() && messages.length) {
      messages.forEach(function (m) {
        if (typeof m.content === 'string') { bulleMoi(fil, m.content, COL); fil.lastChild.setAttribute('data-ia-hist', ''); }
        else if (m.role === 'assistant') { var t = m.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim(); if (t && !m.content.some(function (b) { return b.type === 'tool_use'; })) { bulleIA(fil, mdHtml(t)).setAttribute('data-ia-hist', ''); } else if (t) { bulleIA(fil, mdHtml(t)).setAttribute('data-ia-hist', ''); } }
      });
      try { if (sessionStorage.getItem('ia-ouvert') === '1') panel.style.display = 'flex'; } catch (e) {}
    }
    window.addEventListener('beforeunload', function () { try { sessionStorage.setItem('ia-ouvert', panel.style.display === 'flex' ? '1' : '0'); } catch (e) {} });
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var p = document.querySelector('section[data-floating]'); if (p) p.style.display = 'none'; } });
  window.__IA = {
    actif: function () { return connecte(); },
    suggerer: suggerer,
    envoyer: function (q) { var panel = document.querySelector('section[data-floating]'); var fil = panel.querySelector('div[style*="overflow: auto"]'); envoyer(q, panel, fil); }
  };
  // iOS / Android : quand le clavier s'ouvre, la zone visible rétrécit. On colle la fenêtre
  // de l'assistant à cette zone visible pour que l'en-tête (✕) et la saisie restent à l'écran.
  function ajusterAuClavier() {
    var panel = document.querySelector('section[data-floating]'); var vv = window.visualViewport;
    if (!panel) return;
    var P = ['top', 'height', 'bottom', 'left', 'width', 'right'];
    if (window.innerWidth >= 820 || !vv) { if (panel._vvOrig) { P.forEach(function (k) { panel.style.setProperty(k, panel._vvOrig[k]); }); panel._vvOrig = null; } return; }
    if (!panel._vvOrig) { panel._vvOrig = {}; P.forEach(function (k) { panel._vvOrig[k] = panel.style.getPropertyValue(k); }); }
    panel.style.setProperty('top', Math.round(vv.offsetTop + 8) + 'px', 'important');
    panel.style.setProperty('height', Math.round(vv.height - 16) + 'px', 'important');
    panel.style.setProperty('bottom', 'auto', 'important');
    panel.style.setProperty('left', Math.round(vv.offsetLeft + 8) + 'px', 'important');
    panel.style.setProperty('width', Math.round(vv.width - 16) + 'px', 'important');
    panel.style.setProperty('right', 'auto', 'important');
    var fil = panel.querySelector('div[style*="overflow: auto"]'); if (fil) fil.scrollTop = fil.scrollHeight;
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', ajusterAuClavier); window.visualViewport.addEventListener('scroll', ajusterAuClavier); }
  window.addEventListener('orientationchange', function () { setTimeout(ajusterAuClavier, 300); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[aria-label="Ouvrir l\'assistant"]')) setTimeout(ajusterAuClavier, 0); });
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('section[data-floating]')) setTimeout(ajusterAuClavier, 350); });
  installer();
  ajusterAuClavier();
})();
