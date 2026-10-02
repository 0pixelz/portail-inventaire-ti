/* Messagerie interne client ↔ équipe (sans IA).
   - Icône enveloppe dans l'en-tête (à côté de la cloche) : non lus + aperçu des conversations
   - Page boîte de réception [data-messagerie] : liste, fil, réponse, nouveau message
   Mode : window.__MSG_MODE = 'client' (Clinique Dentaire Ste-Rose, Marie Tremblay) ou 'admin' (toutes les conversations).
   Données : localStorage 'messagerie-v1' (prototype; en production : API + table messages avec RLS). */
(function () {
  var MODE = window.__MSG_MODE || 'client', ADMIN = MODE === 'admin';
  var MOI_CLIENT = 'Clinique Dentaire Ste-Rose', MOI = ADMIN ? 'Jonathan' : 'Marie Tremblay';
  var BUILD = ((document.querySelector('meta[name=build]') || {}).content) || '';
  var PAGE0 = ADMIN ? 'admin-messages.html' : 'messages.html', PAGE = PAGE0 + (BUILD ? '?v=' + BUILD : '');
  var K = 'messagerie-v1', COL = ADMIN ? '#B4540A' : '#0F6E8C';
  var TECHS = { Jonathan: '#B4540A', Samuel: '#0F6E8C', Karine: '#6B4FA0' };
  var FF = "font-family:'IBM Plex Sans',system-ui,-apple-system,sans-serif;";
  var MC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  function lire() { try { var o = JSON.parse(localStorage.getItem(K)); if (o && o.threads) return o; } catch (e) {} return { threads: JSON.parse(JSON.stringify(window.__MSG_SEED || [])) }; }
  function ecrire() { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  var S = lire();
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(m, ok) { if (window.__toast) window.__toast(m, ok); }
  function now() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()); }
  function quand(s, long) {
    var d = new Date(s), a = new Date(), h = d.getHours() + ' h ' + ('0' + d.getMinutes()).slice(-2);
    var j = Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (j === 0) return long ? 'aujourd’hui, ' + h : h;
    if (j === 1) return long ? 'hier, ' + h : 'hier';
    return d.getDate() + ' ' + MC[d.getMonth()] + (long ? ', ' + h : '');
  }
  function mes() { return S.threads.filter(function (t) { return ADMIN || t.client === MOI_CLIENT; }).sort(function (a, b) { return dernier(b).date < dernier(a).date ? -1 : 1; }); }
  function dernier(t) { return t.messages[t.messages.length - 1]; }
  function nonLu(t) { var m = dernier(t); return m.de !== (ADMIN ? 'equipe' : 'client') && m.date > (ADMIN ? t.luEquipe : t.luClient); }
  function marquerLu(t) { if (ADMIN) t.luEquipe = now(); else t.luClient = now(); ecrire(); }
  function initiales(n) { return (n || '?').split(/\s+/).map(function (x) { return x[0]; }).join('').slice(0, 2).toUpperCase(); }
  function nomAffiche(t) { return ADMIN ? t.client : 'Équipe [ENTREPRISE]' + (t.tech ? ' · ' + t.tech : ''); }
  var ENV = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3.5 6.5l8.5 6 8.5-6"></path></svg>';

  // ================= icône d'en-tête =================
  function entete() {
    var nf = document.querySelector('[data-notifmenu]'); if (!nf || document.querySelector('[data-msgmenu]')) return;
    var w = document.createElement('div'); w.setAttribute('data-msgmenu', ''); w.style.position = 'relative';
    w.innerHTML = '<button type="button" data-msg-btn aria-label="Messages" aria-haspopup="true" title="Messages" style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;background:#FFFFFF;border:1px solid #B8C4CE;color:#14202B;cursor:pointer">' + ENV + '<span data-msg-count style="position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;padding:0 5px;box-sizing:border-box;border-radius:9px;background:' + COL + ';color:#FFFFFF;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;border:2px solid #FFFFFF;' + FF + '"></span></button>'
      + '<div data-msg-panel role="menu" style="display:none;' + FF + 'color:#14202B;position:absolute;right:0;top:46px;width:360px;max-height:70vh;background:#FFFFFF;border:1px solid #D5DCE2;box-shadow:0 14px 34px rgba(20,32,43,.16);border-radius:12px;overflow:hidden;z-index:20;flex-direction:column"></div>';
    nf.parentNode.insertBefore(w, nf);
    var b = w.querySelector('[data-msg-btn]'), p = w.querySelector('[data-msg-panel]');
    b.addEventListener('click', function (e) { e.stopPropagation(); var np = document.querySelector('[data-notif-panel]'); if (np) np.style.display = 'none'; var um = document.querySelector('[data-usermenu] [role=menu]'); if (um) um.style.display = 'none'; var o = p.style.display !== 'flex'; if (o) panneau(p); p.style.display = o ? 'flex' : 'none'; });
    p.addEventListener('click', function (e) {
      e.stopPropagation();
      var a = e.target.closest('a'); if (!a || !B) return; // autres pages : navigation normale vers la page Messages
      e.preventDefault(); p.style.display = 'none';
      var h = (a.getAttribute('href').split('#')[1] || '');
      if (h === 'nouveau') { nouveau(); return; }
      if (h) { recherche = ''; ouvrir(h); }
      else { sel = null; dossier = 'inbox'; recherche = ''; coches = {}; rendre(); try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {} }
      B.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
    document.addEventListener('click', function () { p.style.display = 'none'; });
    badge();
  }
  function panneau(p) {
    var L = mes().filter(function (t) { var o = (t.org || {})[ADMIN ? 'admin' : 'client'] || {}; return o.dossier !== 'corbeille' && !o.supprime; }), n = L.filter(nonLu).length;
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #D5DCE2"><span style="font-size:14px;font-weight:600">Messages <span style="font-weight:400;color:#5B6B78;font-size:12.5px">' + (n ? n + ' non lu' + (n > 1 ? 's' : '') : 'tout est lu') + '</span></span><a href="' + PAGE + '#nouveau" style="font-size:12.5px;font-weight:600;color:' + COL + ';text-decoration:none">+ Nouveau</a></div>'
      + '<div style="overflow:auto">' + (L.length ? L.slice(0, 6).map(function (t) {
        var m = dernier(t), u = nonLu(t);
        return '<a href="' + PAGE + '#' + t.id + '" style="display:grid;grid-template:auto / 34px 1fr;gap:10px;padding:10px 14px;border-bottom:1px solid #EEF1F4;text-decoration:none;color:#14202B;background:' + (u ? '#F2F8FA' : '#FFFFFF') + '"><span style="width:34px;height:34px;border-radius:17px;background:' + (ADMIN ? '#2A3B49' : (TECHS[t.tech] || COL)) + ';color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">' + initiales(ADMIN ? t.contact : (t.tech || 'Équipe')) + '</span><span style="min-width:0;display:flex;flex-direction:column;gap:1px"><span style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span style="font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(nomAffiche(t)) + '</span><span style="color:#5B6B78;font-size:12px;flex:none">' + quand(m.date) + '</span></span><span style="font-size:12.5px;font-weight:' + (u ? 600 : 400) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u ? '<span style="display:inline-block;width:7px;height:7px;border-radius:4px;background:' + COL + ';margin-right:6px"></span>' : '') + esc(t.sujet) + '</span><span style="font-size:12px;color:#5B6B78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.de === (ADMIN ? 'equipe' : 'client') ? 'Vous : ' : '') + esc(m.texte) + '</span></span></a>';
      }).join('') : '<div style="padding:20px;text-align:center;color:#5B6B78;font-size:13px">Aucune conversation</div>') + '</div>'
      + '<a href="' + PAGE + '" style="display:block;padding:11px 14px;border-top:1px solid #EEF1F4;text-align:center;font-size:13px;font-weight:600;color:' + COL + ';text-decoration:none">Ouvrir la messagerie</a>';
  }
  function badge() {
    var n = mes().filter(function (t) { var o = (t.org || {})[ADMIN ? 'admin' : 'client'] || {}; return nonLu(t) && o.dossier !== 'corbeille' && !o.supprime; }).length;
    document.querySelectorAll('[data-msg-count]').forEach(function (c) { c.textContent = n; c.style.display = n ? 'inline-flex' : 'none'; });
    document.querySelectorAll('[data-msg-nav-count]').forEach(function (c) { c.textContent = n; c.style.display = n ? '' : 'none'; });
  }

  // ================= page boîte de réception (style Outlook) =================
  var B = document.querySelector('[data-messagerie]'), sel = null, dossier = 'inbox', recherche = '', grouper = ADMIN, coches = {}, tiroir = false;
  var mobile = window.innerWidth < 820;
  var BT = FF + 'height:38px;padding:0 14px;font-size:14px;cursor:pointer;border:1px solid #B8C4CE;background:#fff;color:#14202B;border-radius:0;-webkit-appearance:none';
  var IN = FF + '-webkit-appearance:none;appearance:none;border-radius:0;height:44px;padding:0 12px;border:1px solid #B8C4CE;font-size:16px;width:100%;box-sizing:border-box;background:#fff;color:#14202B';
  var CATS = { urgent: ['Urgent', '#9B1C1C'], technique: ['Technique', '#0F6E8C'], facturation: ['Facturation', '#1B6B3A'], commercial: ['Commercial', '#B4540A'], rappeler: ['À rappeler', '#6B4FA0'], info: ['Information', '#5B6B78'] };
  var COTE = ADMIN ? 'admin' : 'client', AUTRE = ADMIN ? 'client' : 'admin';
  function org(t, cote) { cote = cote || COTE; t.org = t.org || {}; return t.org[cote] = t.org[cote] || { dossier: 'inbox', cats: [], drapeau: false }; }
  function mesDossiers() { S.dossiers = S.dossiers || {}; return S.dossiers[COTE] = S.dossiers[COTE] || []; }
  function th(id) { return S.threads.filter(function (x) { return x.id === id; })[0]; }
  function visibles() { return mes().filter(function (t) { return !org(t).supprime; }); }
  function moiA(t) { return t.messages.some(function (m) { return m.de === (ADMIN ? 'equipe' : 'client'); }); }
  function dans(t, d) {
    var o = org(t), poub = o.dossier === 'corbeille';
    if (d === 'inbox') return o.dossier === 'inbox';
    if (d === 'nonlus') return !poub && nonLu(t);
    if (d === 'suivi') return !poub && o.drapeau;
    if (d === 'envoyes') return !poub && moiA(t);
    if (d === 'archive') return o.dossier === 'archive';
    if (d === 'corbeille') return poub;
    if (d.indexOf('client:') === 0) return !poub && t.client === d.slice(7);
    if (d.indexOf('cat:') === 0) return !poub && o.cats.indexOf(d.slice(4)) > -1;
    return o.dossier === d;
  }
  function nomDossier(d) {
    var base = { inbox: 'Boîte de réception', nonlus: 'Non lus', suivi: 'Avec suivi', envoyes: 'Envoyés', archive: 'Archives', corbeille: 'Corbeille' };
    if (base[d]) return base[d];
    if (d.indexOf('client:') === 0) return d.slice(7);
    if (d.indexOf('cat:') === 0) return (CATS[d.slice(4)] || ['?'])[0];
    var f = mesDossiers().filter(function (x) { return x.id === d; })[0]; return f ? f.nom : 'Dossier';
  }
  var IC = {
    inbox: '<path d="M3 13h5l1.5 3h5L16 13h5M5 5h14l2 8v6H3v-6z"/>', nonlus: '<circle cx="12" cy="12" r="4"/>', suivi: '<path d="M5 21V4h11l-2 4 2 4H5"/>', envoyes: '<path d="M4 12L20 4l-4 16-4-7z"/>',
    archive: '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>', corbeille: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', dossier: '<path d="M3 6h7l2 2h9v11H3z"/>', client: '<path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6"/>'
  };
  function ico(k, c) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="1.9" style="flex:none">' + (IC[k] || IC.dossier) + '</svg>'; }
  function ligneDossier(d, lab, icone, couleur) {
    var n = visibles().filter(function (t) { return dans(t, d) && nonLu(t); }).length, tot = visibles().filter(function (t) { return dans(t, d); }).length, on = dossier === d;
    var cible = /^(inbox|archive|corbeille)$/.test(d) || d.indexOf('f') === 0 && d.indexOf('f_') === 0;
    return '<button type="button" data-m-dossier="' + esc(d) + '"' + (cible ? ' data-m-drop="' + esc(d) + '"' : '') + ' style="' + FF + 'display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:7px 12px;border:0;cursor:pointer;font-size:13.5px;background:' + (on ? '#E6F1F5' : 'transparent') + ';color:#14202B;box-shadow:' + (on ? 'inset 3px 0 0 ' + COL : 'none') + ';font-weight:' + (on || n ? 600 : 400) + '">'
      + (couleur ? '<span style="width:10px;height:10px;background:' + couleur + ';flex:none;margin:0 3px"></span>' : ico(icone)) + '<span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(lab) + '</span>'
      + (n ? '<span style="font-size:12px;font-weight:700;color:' + COL + '">' + n + '</span>' : (d === 'corbeille' || d === 'archive' || d.indexOf('f_') === 0 ? '<span style="font-size:12px;color:#8A9BA8">' + (tot || '') + '</span>' : '')) + '</button>';
  }
  function volDossiers() {
    var T = function (x) { return '<div style="font-size:11px;font-weight:700;color:#5B6B78;text-transform:uppercase;letter-spacing:.06em;padding:14px 12px 4px">' + x + '</div>'; };
    var h = '<div style="padding:10px 10px 4px"><button type="button" data-m-nouveau style="' + BT + ';width:100%;height:42px;background:' + COL + ';border-color:' + COL + ';color:#fff;font-weight:600">+ Nouveau message</button></div>';
    h += ligneDossier('inbox', 'Boîte de réception', 'inbox') + ligneDossier('nonlus', 'Non lus', 'nonlus') + ligneDossier('suivi', 'Avec suivi', 'suivi') + ligneDossier('envoyes', 'Envoyés', 'envoyes') + ligneDossier('archive', 'Archives', 'archive') + ligneDossier('corbeille', 'Corbeille', 'corbeille');
    h += T('Mes dossiers') + mesDossiers().map(function (f) { return ligneDossier(f.id, f.nom, 'dossier'); }).join('')
      + '<div data-m-nvdossier-zone style="padding:4px 12px"><button type="button" data-m-nvdossier style="' + FF + 'background:none;border:0;padding:4px 0;font-size:13px;color:' + COL + ';font-weight:600;cursor:pointer">+ Nouveau dossier</button></div>';
    if (ADMIN) { var cl = []; visibles().forEach(function (t) { if (cl.indexOf(t.client) < 0) cl.push(t.client); }); cl.sort(); h += T('Par client') + cl.map(function (c) { return ligneDossier('client:' + c, c, 'client'); }).join(''); }
    h += T('Catégories') + Object.keys(CATS).map(function (k) { return ligneDossier('cat:' + k, CATS[k][0], null, CATS[k][1]); }).join('');
    return h + '<div style="height:12px"></div>';
  }
  function puceCats(t) { return org(t).cats.map(function (k) { var c = CATS[k]; return c ? '<span style="display:inline-block;font-size:10.5px;font-weight:700;padding:1px 6px;background:' + c[1] + '1A;color:' + c[1] + ';border:1px solid ' + c[1] + '55;margin-right:4px">' + esc(c[0]) + '</span>' : ''; }).join(''); }
  function itemListe(t) {
    var m = dernier(t), u = nonLu(t), on = sel === t.id, o = org(t), ck = !!coches[t.id];
    return '<div data-m-item="' + t.id + '" draggable="' + (!mobile) + '" style="position:relative;overflow:hidden;border-bottom:1px solid #EEF1F4">' + couchesSwipe(t) + '<div data-m-slide style="position:relative;z-index:1;display:grid;grid-template:auto / 22px 36px 1fr;gap:8px;align-items:start;padding:10px 12px;cursor:pointer;color:#14202B;will-change:transform;background:' + (on ? '#E6F1F5' : (ck ? '#FFF7EE' : (u ? '#F7FAFB' : '#fff'))) + ';box-shadow:' + (on ? 'inset 3px 0 0 ' + COL : 'none') + '">'
      + '<input type="checkbox" data-m-coche="' + t.id + '"' + (ck ? ' checked' : '') + ' aria-label="Sélectionner" style="width:16px;height:16px;margin:10px 0 0;cursor:pointer;accent-color:' + COL + '">'
      + '<span style="width:36px;height:36px;border-radius:18px;background:' + (ADMIN ? '#2A3B49' : (TECHS[t.tech] || COL)) + ';color:#fff;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center">' + initiales(ADMIN ? t.contact : (t.tech || 'Équipe')) + '</span>'
      + '<span style="min-width:0;display:flex;flex-direction:column;gap:2px"><span style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px"><span style="font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(ADMIN ? t.client + ' · ' + t.contact : nomAffiche(t)) + '</span><span style="font-size:12px;color:' + (u ? COL : '#5B6B78') + ';font-weight:' + (u ? 700 : 400) + ';flex:none;display:flex;gap:5px;align-items:center">' + (o.drapeau ? '<span title="Suivi" style="color:#9B1C1C">⚑</span>' : '') + quand(m.date) + '</span></span>'
      + '<span style="font-size:13px;font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u ? '<span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:' + COL + ';margin-right:6px"></span>' : '') + esc(t.sujet) + '</span>'
      + '<span style="font-size:12.5px;color:#5B6B78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.de === (ADMIN ? 'equipe' : 'client') ? 'Vous : ' : esc(m.auteur.split(' ')[0]) + ' : ') + esc(m.texte) + '</span>'
      + ((o.cats.length || (ADMIN) || recherche) ? '<span style="font-size:11.5px;color:#5B6B78;display:flex;flex-wrap:wrap;gap:2px 6px;align-items:center">' + puceCats(t) + (ADMIN ? (t.tech ? 'Assigné à ' + esc(t.tech) : '<span style="color:#9B1C1C;font-weight:600">Non assigné</span>') : '') + (recherche ? ' · ' + esc(nomDossier(o.dossier)) : '') + '</span>' : '') + '</span></div></div>';
  }
  // ---------- balayage (iPhone / tactile) : gauche = archiver / supprimer, droite = suivi / lu ----------
  var LARG = 84;
  function couchesSwipe(t) {
    var o = org(t), u = nonLu(t);
    var droite = o.dossier === 'corbeille' ? [['restaurer', 'Restaurer', '#1B6B3A', '↩'], ['detruire', 'Supprimer', '#9B1C1C', '✕']]
      : o.dossier === 'archive' ? [['desarchiver', 'Boîte', '#0F6E8C', '↩'], ['supprimer', 'Supprimer', '#9B1C1C', '🗑']]
      : [['archiver', 'Archiver', '#0F6E8C', '▣'], ['supprimer', 'Supprimer', '#9B1C1C', '🗑']];
    var gauche = [['drapeau', o.drapeau ? 'Retirer' : 'Suivi', '#B4540A', '⚑'], [u ? 'lu' : 'nonlu', u ? 'Lu' : 'Non lu', '#2A3B49', u ? '✓' : '●']];
    var btn = function (a) { return '<button type="button" data-m-swipe-act="' + a[0] + '" style="' + FF + 'width:' + LARG + 'px;height:100%;border:0;background:' + a[2] + ';color:#fff;font-size:12.5px;font-weight:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer"><span style="font-size:18px;line-height:1">' + a[3] + '</span>' + a[1] + '</button>'; };
    return '<div data-m-sw-g style="position:absolute;inset:0 auto 0 0;display:flex;background:' + gauche[0][2] + '">' + gauche.map(btn).join('') + '</div>'
      + '<div data-m-sw-d style="position:absolute;inset:0 0 0 auto;display:flex;justify-content:flex-end;background:' + droite[1][2] + '">' + droite.map(btn).join('') + '</div>';
  }
  var sw = null, swOuvert = null;
  function poser(slide, x, anim) { slide.style.transition = anim ? 'transform .22s ease' : 'none'; slide.style.transform = x ? 'translateX(' + x + 'px)' : ''; }
  function fermerSwipe(sauf) { if (swOuvert && swOuvert !== sauf) { var s0 = swOuvert.querySelector('[data-m-slide]'); if (s0) poser(s0, 0, true); swOuvert = null; } }
  function actionSwipe(item, act) {
    var id = item.getAttribute('data-m-item');
    if (/archiver|supprimer|detruire|restaurer|desarchiver/.test(act)) {
      var sl = item.querySelector('[data-m-slide]'); poser(sl, act === 'archiver' || act === 'desarchiver' || act === 'restaurer' ? -item.offsetWidth : -item.offsetWidth, true);
      item.style.transition = 'height .2s ease .15s'; item.style.height = item.offsetHeight + 'px';
      setTimeout(function () { item.style.height = '0px'; }, 20);
      setTimeout(function () { swOuvert = null; agir(act, [id]); }, 360);
    } else { swOuvert = null; agir(act, [id]); }
  }
  if (B) {
    B.addEventListener('touchstart', function (e) {
      var it = e.target.closest('[data-m-item]'); if (!it || e.target.closest('[data-m-swipe-act]') || e.touches.length > 1) return;
      fermerSwipe(it);
      var sl = it.querySelector('[data-m-slide]'), cur = (swOuvert === it) ? (parseFloat((sl.style.transform.match(/-?[\d.]+/) || [0])[0]) || 0) : 0;
      sw = { it: it, sl: sl, x0: e.touches[0].clientX, y0: e.touches[0].clientY, base: cur, dx: 0, dir: null, seuil: false };
    }, { passive: true });
    B.addEventListener('touchmove', function (e) {
      if (!sw) return;
      var dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
      if (!sw.dir) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; sw.dir = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v'; }
      if (sw.dir !== 'h') return;
      e.preventDefault();
      var x = sw.base + dx, max = sw.it.offsetWidth;
      x = Math.max(-max, Math.min(max, x)); sw.dx = x;
      sw.it.querySelector('[data-m-sw-g]').style.visibility = x > 0 ? 'visible' : 'hidden';
      sw.it.querySelector('[data-m-sw-d]').style.visibility = x < 0 ? 'visible' : 'hidden';
      var plein = Math.abs(x) > max * 0.55;
      if (plein !== sw.seuil) { sw.seuil = plein; if (plein && navigator.vibrate) navigator.vibrate(8); var cote = sw.it.querySelector(x < 0 ? '[data-m-sw-d]' : '[data-m-sw-g]'), bts = cote.querySelectorAll('button'); bts[x < 0 ? 1 : 1].style.display = plein ? 'none' : 'flex'; bts[0].style.width = plein ? '100%' : LARG + 'px'; }
      poser(sw.sl, x, false);
    }, { passive: false });
    B.addEventListener('touchend', function () {
      if (!sw) return; var s2 = sw; sw = null;
      if (s2.dir !== 'h') return;
      var x = s2.dx, max = s2.it.offsetWidth;
      ['[data-m-sw-g]', '[data-m-sw-d]'].forEach(function (q) { var bts = s2.it.querySelector(q).querySelectorAll('button'); bts[1].style.display = 'flex'; bts[0].style.width = LARG + 'px'; });
      if (x < -max * 0.55) { actionSwipe(s2.it, s2.it.querySelector('[data-m-sw-d] button').getAttribute('data-m-swipe-act')); return; }
      if (x > max * 0.55) { poser(s2.sl, 0, true); actionSwipe(s2.it, s2.it.querySelector('[data-m-sw-g] button').getAttribute('data-m-swipe-act')); return; }
      if (x < -50) { poser(s2.sl, -LARG * 2, true); swOuvert = s2.it; }
      else if (x > 50) { poser(s2.sl, LARG * 2, true); swOuvert = s2.it; }
      else { poser(s2.sl, 0, true); if (swOuvert === s2.it) swOuvert = null; }
      s2.it._swipe = Date.now();
    });
    B.addEventListener('click', function (e) {
      var b = e.target.closest('[data-m-swipe-act]'); if (b) { e.stopPropagation(); actionSwipe(b.closest('[data-m-item]'), b.getAttribute('data-m-swipe-act')); return; }
      var it = e.target.closest('[data-m-item]');
      if (it && (it._swipe && Date.now() - it._swipe < 350)) { e.stopPropagation(); return; }
      if (swOuvert) { e.stopPropagation(); fermerSwipe(); }
    }, true);
  }

  function barreActions(ids, ctx) {
    var poub = ids.length && ids.every(function (id) { return org(th(id)).dossier === 'corbeille'; }), arch = ids.length && ids.every(function (id) { return org(th(id)).dossier === 'archive'; });
    var b = function (act, lab, titre, danger) { return '<button type="button" data-m-act="' + act + '" title="' + (titre || lab) + '" style="' + FF + 'height:32px;padding:0 10px;font-size:13px;cursor:pointer;border:1px solid #D5DCE2;background:#fff;color:' + (danger ? '#9B1C1C' : '#14202B') + ';white-space:nowrap">' + lab + '</button>'; };
    return '<div data-m-actions="' + ctx + '" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
      + (poub ? b('restaurer', '↩ Restaurer') + b('detruire', 'Supprimer définitivement', '', true)
        : (arch ? b('desarchiver', '↩ Boîte de réception', 'Remettre dans la boîte de réception') : b('archiver', 'Archiver')) + b('supprimer', 'Supprimer', 'Déplacer vers la corbeille', true) + b('deplacer', 'Déplacer ▾') + b('categoriser', 'Catégoriser ▾') + b('drapeau', '⚑ Suivi', 'Marquer pour suivi') + b('lu', 'Lu') + b('nonlu', 'Non lu'))
      + '</div>';
  }
  function listeFiltree() {
    var L = visibles().filter(function (t) {
      if (recherche) { var q = recherche.toLowerCase(); if (org(t).dossier === 'corbeille') return false; return (t.sujet + ' ' + t.client + ' ' + t.contact + ' ' + t.messages.map(function (m) { return m.texte; }).join(' ')).toLowerCase().indexOf(q) > -1; }
      return dans(t, dossier);
    });
    return L;
  }
  function rendre() {
    if (!B) return;
    var L = listeFiltree(), ids = Object.keys(coches).filter(function (k) { return coches[k] && L.some(function (t) { return t.id === k; }); });
    var titre = recherche ? 'Résultats pour « ' + recherche + ' »' : nomDossier(dossier);
    var perso = dossier.indexOf('f_') === 0;
    var tete = '<div style="padding:10px 12px;border-bottom:1px solid #D5DCE2;display:flex;flex-direction:column;gap:8px;background:#fff">'
      + '<div style="display:flex;gap:8px;align-items:center">' + (mobile ? '<button type="button" data-m-tiroir style="' + BT + ';height:40px;padding:0 10px;display:inline-flex;align-items:center;gap:6px">' + ico('dossier') + 'Dossiers</button>' : '') + '<input data-m-rech type="search" value="' + esc(recherche) + '" placeholder="Rechercher partout…" style="' + IN + ';height:40px;font-size:15px"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:8px;min-width:0"><input type="checkbox" data-m-tout aria-label="Tout sélectionner"' + (ids.length && ids.length === L.length ? ' checked' : '') + ' style="width:16px;height:16px;margin:0;accent-color:' + COL + '"><strong style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(titre) + '</strong><span style="font-size:12.5px;color:#5B6B78">' + L.length + '</span></div>'
      + '<div style="display:flex;gap:10px;align-items:center">' + (ADMIN ? '<label style="font-size:12.5px;display:flex;gap:5px;align-items:center;cursor:pointer;color:#5B6B78"><input type="checkbox" data-m-grouper' + (grouper ? ' checked' : '') + ' style="margin:0;accent-color:' + COL + '">Par client</label>' : '') + (perso ? '<button type="button" data-m-renommer style="' + FF + 'background:none;border:0;padding:0;font-size:12.5px;color:' + COL + ';cursor:pointer">Renommer</button><button type="button" data-m-supdossier style="' + FF + 'background:none;border:0;padding:0;font-size:12.5px;color:#9B1C1C;cursor:pointer">Supprimer le dossier</button>' : '') + (dossier === 'corbeille' && L.length ? '<button type="button" data-m-vider style="' + FF + 'background:none;border:0;padding:0;font-size:12.5px;color:#9B1C1C;cursor:pointer;font-weight:600">Vider la corbeille</button>' : '') + '</div></div>'
      + (ids.length ? '<div style="display:flex;flex-direction:column;gap:6px;padding:8px;background:#FFF7EE;border:1px solid #F1C68E"><span style="font-size:12.5px;font-weight:600;color:#8A4306">' + ids.length + ' sélectionnée(s) <button type="button" data-m-decocher style="' + FF + 'background:none;border:0;padding:0 0 0 6px;font-size:12.5px;color:#8A4306;text-decoration:underline;cursor:pointer">annuler</button></span>' + barreActions(ids, 'liste') + '</div>' : '')
      + '</div>';
    var corps;
    if (!L.length) corps = '<div style="padding:40px 16px;text-align:center;color:#5B6B78;font-size:13.5px">' + (dossier === 'corbeille' ? 'La corbeille est vide.' : 'Aucune conversation ici.') + (dossier.indexOf('f_') === 0 ? '<br><span style="font-size:12.5px">Glissez une conversation sur ce dossier ou utilisez « Déplacer ».</span>' : '') + '</div>';
    else if (grouper && ADMIN && dossier.indexOf('client:') !== 0) {
      var par = {}; L.forEach(function (t) { (par[t.client] = par[t.client] || []).push(t); });
      corps = Object.keys(par).sort().map(function (c) { var nl = par[c].filter(nonLu).length; return '<div style="position:sticky;top:0;z-index:1;padding:6px 12px;background:#EEF1F4;font-size:12px;font-weight:700;color:#2A3B49;display:flex;justify-content:space-between;border-bottom:1px solid #D5DCE2"><span>' + esc(c) + '</span><span style="color:' + (nl ? COL : '#5B6B78') + '">' + (nl ? nl + ' non lu' + (nl > 1 ? 's' : '') : par[c].length) + '</span></div>' + par[c].map(itemListe).join(''); }).join('');
    } else corps = L.map(itemListe).join('');
    var H = mobile ? 'auto' : 'calc(100vh - 150px)';
    var colD = '<nav aria-label="Dossiers" style="border-right:1px solid #D5DCE2;overflow:auto;background:#FAFBFC;' + (mobile ? (tiroir ? 'position:fixed;inset:0 25% 0 0;z-index:10004;box-shadow:0 0 0 100vmax rgba(20,32,43,.45);background:#fff' : 'display:none') : '') + '">' + (mobile ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px"><strong>Dossiers</strong><button type="button" data-m-tiroir style="' + FF + 'background:none;border:0;font-size:24px;cursor:pointer">×</button></div>' : '') + volDossiers() + '</nav>';
    var colL = '<section style="display:flex;flex-direction:column;min-width:0;border-right:1px solid #D5DCE2;' + (mobile && sel ? 'display:none' : '') + '">' + tete + '<div data-m-liste style="overflow:auto;flex:1">' + corps + '</div></section>';
    B.innerHTML = '<div style="display:grid;grid-template:' + (mobile ? 'auto / 1fr' : 'minmax(0,1fr) / 220px 360px minmax(0,1fr)') + ';background:#fff;border:1px solid #D5DCE2;height:' + H + ';min-height:' + (mobile ? '0' : '600px') + ';' + FF + '">' + colD + colL + fil() + '</div>';
    if (dossier.indexOf('f_') === 0 && !mesDossiers().some(function (f) { return f.id === dossier; })) { dossier = 'inbox'; rendre(); }
  }

  // ---------- actions ----------
  function cibles(ctx) { if (ctx === 'liste') return Object.keys(coches).filter(function (k) { return coches[k]; }); return sel ? [sel] : []; }
  function agir(act, ids, val) {
    var n = ids.length; if (!n) return;
    ids.forEach(function (id) {
      var t = th(id), o = org(t);
      if (act === 'archiver') o.dossier = 'archive';
      else if (act === 'desarchiver' || act === 'restaurer') o.dossier = 'inbox';
      else if (act === 'supprimer') o.dossier = 'corbeille';
      else if (act === 'detruire') o.supprime = true;
      else if (act === 'deplacer') o.dossier = val;
      else if (act === 'cat') { var i = o.cats.indexOf(val); if (i > -1) o.cats.splice(i, 1); else o.cats.push(val); }
      else if (act === 'drapeau') o.drapeau = !o.drapeau;
      else if (act === 'lu') marquerLu(t);
      else if (act === 'nonlu') { if (ADMIN) t.luEquipe = '2000-01-01T00:00:00'; else t.luClient = '2000-01-01T00:00:00'; }
    });
    ecrire();
    var msg = { archiver: 'archivée(s)', desarchiver: 'remise(s) dans la boîte de réception', restaurer: 'restaurée(s)', supprimer: 'déplacée(s) vers la corbeille', detruire: 'supprimée(s) définitivement', deplacer: 'déplacée(s) vers « ' + nomDossier(val || '') + ' »', drapeau: 'suivi mis à jour', lu: 'marquée(s) comme lue(s)', nonlu: 'marquée(s) comme non lue(s)', cat: 'catégorie mise à jour' }[act];
    if (/archiver|supprimer|detruire|deplacer|restaurer|desarchiver/.test(act) && ids.indexOf(sel) > -1 && !dans(th(sel), dossier)) sel = null;
    if (act === 'nonlu' && ids.indexOf(sel) > -1) sel = null;
    coches = {}; rendre(); badge();
    toast(n + ' conversation' + (n > 1 ? 's ' : ' ') + msg, true);
  }
  function menu(bouton, items) {
    fermerMenu();
    var r = bouton.getBoundingClientRect(), m = document.createElement('div'); m.setAttribute('data-m-menu', '');
    m.style.cssText = FF + 'position:fixed;z-index:10005;background:#fff;border:1px solid #D5DCE2;box-shadow:0 12px 30px rgba(20,32,43,.18);min-width:210px;max-height:60vh;overflow:auto;padding:4px 0;top:' + Math.min(r.bottom + 4, innerHeight - 220) + 'px;left:' + Math.max(8, Math.min(r.left, innerWidth - 230)) + 'px';
    m.innerHTML = items.map(function (it) { return it.sep ? '<div style="height:1px;background:#EEF1F4;margin:4px 0"></div>' : '<button type="button" data-v="' + esc(it.v) + '" style="' + FF + 'display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:8px 12px;border:0;background:#fff;font-size:13.5px;cursor:pointer;color:' + (it.c || '#14202B') + '">' + (it.pastille ? '<span style="width:10px;height:10px;background:' + it.pastille + '"></span>' : '') + (it.coche != null ? '<span style="width:14px">' + (it.coche ? '✓' : '') + '</span>' : '') + esc(it.l) + '</button>'; }).join('');
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) { fermerMenu(); items.filter(function (i) { return i.v === b.getAttribute('data-v'); })[0].f(); } });
    setTimeout(function () { document.addEventListener('click', fermerMenu, { once: true }); }, 0);
  }
  function fermerMenu() { var m = document.querySelector('[data-m-menu]'); if (m) m.remove(); }
  function nouveauDossier(apres) {
    var z = B.querySelector('[data-m-nvdossier-zone]'); if (!z) { var nom = (window.prompt && prompt('Nom du dossier')) || ''; if (nom.trim()) creerDossier(nom.trim(), apres); return; }
    z.innerHTML = '<form data-m-fdossier style="display:flex;gap:4px"><input name="nom" placeholder="Nom du dossier" style="' + IN + ';height:34px;font-size:14px;padding:0 8px"><button type="submit" style="' + BT + ';height:34px;padding:0 10px;background:' + COL + ';border-color:' + COL + ';color:#fff">OK</button></form>';
    var f = z.querySelector('form'); f.nom.focus();
    f.onsubmit = function (e) { e.preventDefault(); var nom = f.nom.value.trim(); if (nom) creerDossier(nom, apres); else rendre(); };
  }
  function creerDossier(nom, apres) { var d = { id: 'f_' + Date.now(), nom: nom }; mesDossiers().push(d); ecrire(); toast('Dossier « ' + nom + ' » créé', true); if (apres) apres(d.id); else rendre(); }

  function fil() {
    var t = S.threads.filter(function (x) { return x.id === sel; })[0];
    if (!t) return mobile ? '' : '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#5B6B78;padding:40px;text-align:center"><span style="color:#B8C4CE">' + ENV.replace('width="20" height="20"', 'width="44" height="44"') + '</span><strong style="color:#14202B">Sélectionnez une conversation</strong><span style="font-size:13.5px">' + (ADMIN ? 'Les messages de vos clients arrivent ici. Seuls vous et vos techniciens les voyez.' : 'Écrivez directement à votre équipe TI. Réponse en heures ouvrables.') + '</span></div>';
    var lien = t.lien ? '<a href="' + esc(ADMIN ? t.lien : (t.lien.indexOf('admin') === 0 || t.lien === 'billet.html' ? 'mes-billets.html' : t.lien)) + '" style="font-size:12.5px;color:' + COL + ';font-weight:600;text-decoration:none">Voir l’élément lié →</a>' : '';
    var h = '<div style="display:flex;flex-direction:column;min-width:0;min-height:0;' + (mobile ? 'min-height:70vh' : '') + '">'
      + '<div style="padding:12px 16px;border-bottom:1px solid #D5DCE2;display:flex;flex-direction:column;gap:6px">'
      + (mobile ? '<button type="button" data-m-retour style="' + FF + 'align-self:flex-start;background:none;border:0;padding:0;font-size:14px;color:' + COL + ';font-weight:600;cursor:pointer">‹ ' + esc(nomDossier(dossier)) + '</button>' : '')
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:0"><h2 style="margin:0;font-size:17px;font-weight:600">' + esc(t.sujet) + '</h2><span style="font-size:13px;color:#5B6B78">' + esc(ADMIN ? t.client + ' · ' + t.contact : 'Avec l’équipe [ENTREPRISE]' + (t.tech ? ' · suivi par ' + t.tech : '')) + '</span></div>' + lien + '</div>'
      + barreActions([t.id], 'fil') + (puceCats(t) ? '<div>' + puceCats(t) + '</div>' : '')
      + (ADMIN ? '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label style="display:flex;align-items:center;gap:6px;font-size:13px">Assigné à <select data-m-assigner style="' + IN + ';height:32px;width:auto;font-size:13.5px;padding-right:12px"><option value="">—</option>' + Object.keys(TECHS).map(function (n) { return '<option' + (n === t.tech ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><a href="admin-nouveau-billet.html" data-m-billet style="' + BT + ';height:32px;font-size:13px;display:inline-flex;align-items:center;text-decoration:none">Créer un billet</a></div>' : '')
      + '</div><div data-m-fil style="flex:1;min-height:120px;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#F5F7F9">';
    t.messages.forEach(function (m) {
      var moi = m.de === (ADMIN ? 'equipe' : 'client');
      var coul = m.de === 'equipe' ? (TECHS[m.auteur] || COL) : '#2A3B49';
      h += '<div style="display:flex;gap:8px;align-items:flex-end;' + (moi ? 'flex-direction:row-reverse' : '') + '"><span style="width:30px;height:30px;border-radius:15px;background:' + coul + ';color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">' + initiales(m.auteur) + '</span>'
        + '<div style="max-width:78%;display:flex;flex-direction:column;gap:3px;' + (moi ? 'align-items:flex-end' : '') + '"><span style="font-size:11.5px;color:#5B6B78">' + esc(m.de === 'equipe' && !ADMIN ? m.auteur + ' · [ENTREPRISE]' : m.auteur) + ' · ' + quand(m.date, true) + '</span>'
        + '<div style="padding:10px 12px;font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;' + (moi ? 'background:' + COL + ';color:#fff' : 'background:#fff;border:1px solid #D5DCE2;color:#14202B') + '">' + esc(m.texte) + '</div></div></div>';
    });
    h += '</div><form data-m-repondre style="display:flex;flex-direction:column;gap:8px;padding:12px 16px;border-top:1px solid #D5DCE2;background:#fff">' + barreIA() + '<textarea name="texte" rows="3" placeholder="Écrire une réponse…" style="' + IN + ';height:auto;min-height:76px;padding:10px 12px;line-height:1.4;resize:vertical"></textarea>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:12px;color:#5B6B78">' + (ADMIN ? 'Le client est avisé par courriel.' : 'Votre équipe est avisée immédiatement.') + '</span><button type="submit" style="' + BT + ';background:' + COL + ';border-color:' + COL + ';color:#fff;font-weight:600;min-width:120px">Envoyer</button></div></form></div>';
    return h;
  }

  var SPARK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="flex:none"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z"></path></svg>';
  function barreIA() {
    return '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><button type="button" data-m-ia="repondre" style="' + FF + 'display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ' + COL + ';background:#fff;color:' + COL + '">' + SPARK + 'Suggérer une réponse</button><button type="button" data-m-ia="ameliorer" style="' + FF + 'display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;font-size:13px;cursor:pointer;border:1px solid #B8C4CE;background:#fff;color:#14202B">Améliorer mon brouillon</button><span style="font-size:11.5px;color:#5B6B78">Claude lit le fil et les données du portail · rien n’est envoyé sans vous</span></div><div data-m-sugg></div>';
  }
  function suggestions(zone, opts, cible) {
    if (!window.__IA || !window.__IA.suggerer) { zone.innerHTML = '<div style="font-size:13px;color:#9B1C1C;padding:6px 0">Assistant IA indisponible sur cette page.</div>'; return; }
    if (opts.intention === 'ameliorer' && !opts.brouillon) { zone.innerHTML = '<div style="font-size:13px;color:#8A4306;padding:6px 0">Écrivez d’abord un brouillon, puis cliquez « Améliorer mon brouillon ».</div>'; return; }
    zone.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#5B6B78;padding:8px 10px;background:#F5F7F9;border-left:3px solid ' + COL + '"><span data-m-spin style="width:14px;height:14px;border:2px solid #D5DCE2;border-top-color:' + COL + ';border-radius:50%;display:inline-block;animation:mspin .8s linear infinite"></span>Claude lit la conversation, l’inventaire et l’historique de ' + esc(opts.client) + '…</div>';
    if (!document.getElementById('mspin-css')) { var st = document.createElement('style'); st.id = 'mspin-css'; st.textContent = '@keyframes mspin{to{transform:rotate(360deg)}}'; document.head.appendChild(st); }
    window.__IA.suggerer(opts).then(function (r) {
      var cartes = r.suggestions.slice(0, 3).map(function (x, i) {
        return '<div style="display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#F7FAFB;border:1px solid #D5DCE2;border-left:3px solid ' + COL + ';min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong style="font-size:12.5px;color:' + COL + ';display:inline-flex;align-items:center;gap:5px">' + SPARK + esc(x.titre || 'Suggestion') + '</strong><button type="button" data-m-utiliser="' + i + '" style="' + FF + 'height:30px;padding:0 12px;font-size:12.5px;font-weight:600;cursor:pointer;border:0;background:' + COL + ';color:#fff">Utiliser</button></div><div style="font-size:13.5px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;color:#14202B;max-height:180px;overflow:auto">' + esc(x.texte) + '</div></div>';
      }).join('');
      var infos = (r.infos || []).length ? '<details style="font-size:12.5px;color:#5B6B78"><summary style="cursor:pointer">Contexte utilisé (' + r.infos.length + ')</summary><ul style="margin:6px 0 0;padding-left:18px">' + r.infos.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul></details>' : '';
      zone.innerHTML = '<div style="display:grid;grid-template:auto / repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:2px 0">' + cartes + '</div><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' + infos + '<button type="button" data-m-ia-regen style="' + FF + 'background:none;border:0;padding:4px 0;font-size:12.5px;color:' + COL + ';font-weight:600;cursor:pointer">↻ Autres suggestions</button></div>';
      zone.querySelectorAll('[data-m-utiliser]').forEach(function (b) { b.onclick = function () { cible.value = r.suggestions[+b.getAttribute('data-m-utiliser')].texte; cible.focus(); cible.style.minHeight = '140px'; zone.innerHTML = '<div style="font-size:12.5px;color:#1B6B3A;padding:4px 0">✓ Suggestion insérée — relisez et modifiez avant d’envoyer.</div>'; }; });
      zone.querySelector('[data-m-ia-regen]').onclick = function () { suggestions(zone, opts, cible); };
    }).catch(function (e) {
      zone.innerHTML = '<div style="font-size:13px;color:#9B1C1C;padding:6px 0">' + esc(e.status === 429 ? 'Trop de demandes, réessayez dans une minute.' : (e.message || 'Impossible d’obtenir des suggestions.')) + '</div>';
    });
  }

  function ouvrir(id) {
    sel = id; var t = th(id); if (t && !dans(t, dossier) && !recherche) { var o = org(t); dossier = o.supprime ? 'inbox' : o.dossier; }
    if (t && nonLu(t)) marquerLu(t);
    rendre(); badge();
    var f = B.querySelector('[data-m-fil]'); if (f) f.scrollTop = f.scrollHeight;
    if (mobile) B.scrollIntoView({ block: 'start' });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }

  function nouveau() {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(20,32,43,.45);z-index:10003;display:flex;align-items:' + (mobile ? 'flex-end' : 'center') + ';justify-content:center;padding:' + (mobile ? '0' : '12px') + ';box-sizing:border-box';
    var clients = ['Clinique Dentaire Ste-Rose', 'Garderie Les Lucioles', 'Studio Nord Design', 'Comptabilité Marchand', 'Groupe Auto Laurentides', 'Physio Rive-Nord', 'Notaires Lacasse & Fils', 'Atelier Mécanique Dubé'];
    var CONTACTS = { 'Clinique Dentaire Ste-Rose': 'Marie Tremblay', 'Garderie Les Lucioles': 'Sophie Côté', 'Studio Nord Design': 'Julie D.', 'Comptabilité Marchand': 'Pierre Marchand', 'Groupe Auto Laurentides': 'Martin Lévesque', 'Physio Rive-Nord': 'Nadia K.', 'Notaires Lacasse & Fils': 'Me Lacasse', 'Atelier Mécanique Dubé': 'Éric Dubé' };
    var L = function (lab, c) { return '<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:12px;font-weight:600;color:#5B6B78;text-transform:uppercase;letter-spacing:.04em">' + lab + '</span>' + c + '</label>'; };
    ov.innerHTML = '<form style="' + FF + 'background:#fff;width:' + (mobile ? '100%' : 'min(520px,100%)') + ';max-height:92vh;overflow:auto;display:flex;flex-direction:column;color:#14202B;box-shadow:0 18px 40px rgba(0,0,0,.25)"><div style="height:6px;background:' + COL + '"></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px 4px"><h3 style="margin:0;font-size:19px;font-weight:600">Nouveau message</h3><button type="button" data-x aria-label="Fermer" style="width:40px;height:40px;background:none;border:0;font-size:26px;cursor:pointer;color:#5B6B78">×</button></div>'
      + '<div style="padding:8px 18px 16px;display:flex;flex-direction:column;gap:12px">'
      + (ADMIN ? L('À (client)', '<select name="client" style="' + IN + '">' + clients.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>') : '<div style="font-size:13.5px;color:#5B6B78">À : <strong style="color:#14202B">Équipe [ENTREPRISE]</strong> — seulement vous et nos techniciens voyez ces messages.</div>')
      + L('Sujet', '<input name="sujet" required placeholder="Ex. : Accès pour un nouvel employé" style="' + IN + '">')
      + (ADMIN ? '' : L('Concerne', '<select name="lien" style="' + IN + '"><option value="">Rien en particulier</option><option value="mon-billet.html">Billet #4418 — imprimante salle 2</option><option value="ma-commande.html">Commande C-117 — écran salle 3</option><option value="facture.html">Facture F-2026-0198</option><option value="mon-inventaire.html">Un appareil de mon inventaire</option></select>'))
      + L('Message', '<textarea name="texte" required rows="5" placeholder="Votre message… (ou quelques idées, puis « Aider à rédiger »)" style="' + IN + ';height:auto;min-height:120px;padding:10px 12px;line-height:1.4"></textarea>')
      + '<div style="display:flex;flex-direction:column;gap:6px"><button type="button" data-m-rediger style="' + FF + 'align-self:flex-start;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid ' + COL + ';background:#fff;color:' + COL + '">' + SPARK + 'Aider à rédiger</button><div data-m-sugg2></div></div>'
      + '<div data-err style="display:none;color:#9B1C1C;font-size:14px;background:#FBE1E1;padding:8px 10px"></div></div>'
      + '<div style="position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #EEF1F4;background:#fff"><button type="button" data-x style="' + BT + ';height:44px">Annuler</button><button type="submit" style="' + BT + ';height:44px;background:' + COL + ';border-color:' + COL + ';color:#fff;font-weight:600;min-width:120px">Envoyer</button></div></form>';
    document.body.appendChild(ov);
    var f = ov.querySelector('form'), fermer = function () { ov.remove(); };
    ov.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = fermer; });
    ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
    if (!mobile) f.sujet.focus();
    ov.querySelector('[data-m-rediger]').onclick = function () {
      var client = ADMIN ? f.client.value : MOI_CLIENT;
      if (!f.sujet.value.trim()) { ov.querySelector('[data-m-sugg2]').innerHTML = '<div style="font-size:13px;color:#8A4306">Indiquez d’abord le sujet.</div>'; return; }
      suggestions(ov.querySelector('[data-m-sugg2]'), { id: '', client: client, contact: ADMIN ? CONTACTS[client] : MOI, sujet: f.sujet.value.trim() + (!ADMIN && f.lien.value ? ' (concerne : ' + f.lien.options[f.lien.selectedIndex].text + ')' : ''), tech: '', fil: [], moi: MOI, brouillon: f.texte.value.trim(), intention: 'rediger' }, f.texte);
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var sujet = f.sujet.value.trim(), texte = f.texte.value.trim();
      if (!sujet || !texte) { var er = ov.querySelector('[data-err]'); er.textContent = 'Ajoutez un sujet et un message.'; er.style.display = 'block'; return; }
      var client = ADMIN ? f.client.value : MOI_CLIENT, t = { id: 'm' + Date.now(), client: client, contact: ADMIN ? CONTACTS[client] : MOI, sujet: sujet, tech: ADMIN ? MOI : '', lien: ADMIN ? '' : f.lien.value, luClient: ADMIN ? '2000-01-01T00:00:00' : now(), luEquipe: ADMIN ? now() : '2000-01-01T00:00:00', messages: [{ de: ADMIN ? 'equipe' : 'client', auteur: MOI, date: now(), texte: texte }] };
      S.threads.push(t); ecrire(); fermer(); if (B) { dossier = 'inbox'; recherche = ''; }
      toast(ADMIN ? 'Message envoyé à ' + client : 'Message envoyé à votre équipe TI', true);
      if (B) ouvrir(t.id); else location.href = PAGE + '#' + t.id;
    };
  }

  if (B) {
    B.addEventListener('click', function (e) {
      if (e.target.matches('[data-m-coche]')) { e.stopPropagation(); coches[e.target.getAttribute('data-m-coche')] = e.target.checked; rendre(); return; }
      if (e.target.matches('[data-m-tout]')) { var L0 = listeFiltree(); coches = {}; if (e.target.checked) L0.forEach(function (t) { coches[t.id] = true; }); rendre(); return; }
      if (e.target.matches('[data-m-grouper]')) { grouper = e.target.checked; rendre(); return; }
      var it = e.target.closest('[data-m-item]'); if (it && !e.target.closest('button,input')) { ouvrir(it.getAttribute('data-m-item')); return; }
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-m-dossier')) { dossier = t.getAttribute('data-m-dossier'); recherche = ''; coches = {}; tiroir = false; if (mobile) sel = null; rendre(); return; }
      if (t.hasAttribute('data-m-tiroir')) { tiroir = !tiroir; rendre(); return; }
      if (t.hasAttribute('data-m-nouveau')) { tiroir = false; nouveau(); return; }
      if (t.hasAttribute('data-m-nvdossier')) { nouveauDossier(); return; }
      if (t.hasAttribute('data-m-decocher')) { coches = {}; rendre(); return; }
      if (t.hasAttribute('data-m-renommer')) { var f = mesDossiers().filter(function (x) { return x.id === dossier; })[0]; var nom = prompt('Nouveau nom du dossier', f.nom); if (nom && nom.trim()) { f.nom = nom.trim(); ecrire(); rendre(); } return; }
      if (t.hasAttribute('data-m-supdossier')) { var f2 = mesDossiers().filter(function (x) { return x.id === dossier; })[0]; if (t.dataset.ok) { S.threads.forEach(function (x) { var o = org(x); if (o.dossier === f2.id) o.dossier = 'inbox'; }); S.dossiers[COTE] = mesDossiers().filter(function (x) { return x.id !== f2.id; }); ecrire(); dossier = 'inbox'; rendre(); toast('Dossier supprimé — ses conversations sont revenues dans la boîte de réception', true); } else { t.dataset.ok = 1; t.textContent = 'Confirmer la suppression'; t.style.fontWeight = '700'; } return; }
      if (t.hasAttribute('data-m-vider')) { if (t.dataset.ok) { agir('detruire', listeFiltree().map(function (x) { return x.id; })); } else { t.dataset.ok = 1; t.textContent = 'Confirmer : vider la corbeille'; } return; }
      if (t.hasAttribute('data-m-act')) {
        var ctx = t.closest('[data-m-actions]').getAttribute('data-m-actions'), ids = cibles(ctx), act = t.getAttribute('data-m-act');
        if (act === 'deplacer') {
          var items = [{ v: 'inbox', l: 'Boîte de réception', f: function () { agir('deplacer', ids, 'inbox'); } }, { v: 'archive', l: 'Archives', f: function () { agir('deplacer', ids, 'archive'); } }, { sep: 1 }]
            .concat(mesDossiers().map(function (d) { return { v: d.id, l: d.nom, f: function () { agir('deplacer', ids, d.id); } }; }))
            .concat([{ sep: 1 }, { v: '_nv', l: '+ Nouveau dossier…', c: COL, f: function () { var nom = prompt('Nom du nouveau dossier'); if (nom && nom.trim()) creerDossier(nom.trim(), function (id) { agir('deplacer', ids, id); }); } }]);
          menu(t, items); e.stopPropagation(); return;
        }
        if (act === 'categoriser') {
          menu(t, Object.keys(CATS).map(function (k) { var tous = ids.every(function (id) { return org(th(id)).cats.indexOf(k) > -1; }); return { v: k, l: CATS[k][0], pastille: CATS[k][1], coche: tous, f: function () { ids.forEach(function (id) { var o = org(th(id)), i = o.cats.indexOf(k); if (tous && i > -1) o.cats.splice(i, 1); if (!tous && i < 0) o.cats.push(k); }); ecrire(); rendre(); toast((tous ? 'Catégorie retirée : ' : 'Catégorisé : ') + CATS[k][0], true); } }; }));
          e.stopPropagation(); return;
        }
        agir(act, ids); return;
      }
      if (t.hasAttribute('data-m-ia')) { var th0 = th(sel), fm = t.closest('form'); suggestions(fm.querySelector('[data-m-sugg]'), { id: th0.id, client: th0.client, contact: th0.contact, sujet: th0.sujet, tech: th0.tech, fil: th0.messages, moi: MOI, brouillon: fm.texte.value.trim(), intention: t.getAttribute('data-m-ia') }, fm.texte); return; }
      if (t.hasAttribute('data-m-retour')) { sel = null; rendre(); try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {} }
    });
    B.addEventListener('input', function (e) { if (e.target.hasAttribute('data-m-rech')) { recherche = e.target.value; var pos = e.target.selectionStart; rendre(); var r = B.querySelector('[data-m-rech]'); r.focus(); try { r.setSelectionRange(pos, pos); } catch (x) {} } });
    B.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-m-assigner')) { var t = th(sel); t.tech = e.target.value; ecrire(); rendre(); toast(t.tech ? 'Conversation assignée à ' + t.tech : 'Conversation non assignée', true); }
    });
    // glisser-déposer vers un dossier (ordinateur)
    B.addEventListener('dragstart', function (e) { var it = e.target.closest && e.target.closest('[data-m-item]'); if (!it) return; var id = it.getAttribute('data-m-item'); var ids = coches[id] ? Object.keys(coches).filter(function (k) { return coches[k]; }) : [id]; e.dataTransfer.setData('text/plain', ids.join(',')); e.dataTransfer.effectAllowed = 'move'; });
    B.addEventListener('dragover', function (e) { var d = e.target.closest && e.target.closest('[data-m-drop]'); if (d) { e.preventDefault(); d.style.outline = '2px dashed ' + COL; } });
    B.addEventListener('dragleave', function (e) { var d = e.target.closest && e.target.closest('[data-m-drop]'); if (d) d.style.outline = ''; });
    B.addEventListener('drop', function (e) { var d = e.target.closest && e.target.closest('[data-m-drop]'); if (!d) return; e.preventDefault(); var ids = (e.dataTransfer.getData('text/plain') || '').split(',').filter(Boolean), v = d.getAttribute('data-m-drop'); agir(v === 'corbeille' ? 'supprimer' : 'deplacer', ids, v); });
    B.addEventListener('submit', function (e) {
      if (!e.target.hasAttribute('data-m-repondre')) return; e.preventDefault();
      var tx = e.target.texte.value.trim(); if (!tx) return;
      var t = th(sel);
      t.messages.push({ de: ADMIN ? 'equipe' : 'client', auteur: MOI, date: now(), texte: tx });
      if (ADMIN) { t.luEquipe = now(); if (!t.tech) t.tech = MOI; } else t.luClient = now();
      var oa = org(t, AUTRE); if (oa.dossier === 'archive' || oa.dossier === 'corbeille' || oa.supprime) { oa.dossier = 'inbox'; oa.supprime = false; } // une nouvelle réponse revient dans la boîte de l'autre
      ecrire(); ouvrir(t.id); toast('Message envoyé', true);
    });
    B.addEventListener('keydown', function (e) { if (e.target.name === 'texte' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.target.form.requestSubmit(); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fermerMenu(); if (tiroir) { tiroir = false; rendre(); } } });
  }

  window.addEventListener('storage', function (e) {
    if (e.key !== K) return;
    var avant = mes().filter(nonLu).length; S = lire(); badge();
    if (B) { rendre(); if (sel) { var f = B.querySelector('[data-m-fil]'); if (f) f.scrollTop = f.scrollHeight; } }
    if (mes().filter(nonLu).length > avant) toast('Nouveau message reçu', true);
  });

  entete();
  badge();
  if (B) { var fl = document.querySelector('section[data-floating]'); if (fl) fl.style.display = 'none'; } // l'assistant reste disponible via le bouton rond
  if (B) {
    var h = location.hash.slice(1);
    if (h === 'nouveau') { rendre(); nouveau(); }
    else if (h && S.threads.some(function (t) { return t.id === h; })) ouvrir(h);
    else { if (!mobile) { var premier = visibles().filter(function (t) { return dans(t, 'inbox'); })[0]; if (premier) { sel = premier.id; if (nonLu(premier)) marquerLu(premier); } } rendre(); badge(); }
  }
  window.addEventListener('hashchange', function () { if (!B) return; var h = location.hash.slice(1); if (h === 'nouveau') nouveau(); else if (h && th(h)) ouvrir(h); });
  window.__MSG = { lire: function () { return S; } };
})();
