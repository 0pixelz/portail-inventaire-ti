/* Messagerie interne client ↔ équipe (sans IA).
   - Icône enveloppe dans l'en-tête (à côté de la cloche) : non lus + aperçu des conversations
   - Page boîte de réception [data-messagerie] : liste, fil, réponse, nouveau message
   Mode : window.__MSG_MODE = 'client' (Clinique Dentaire Ste-Rose, Marie Tremblay) ou 'admin' (toutes les conversations).
   Données : localStorage 'messagerie-v1' (prototype; en production : API + table messages avec RLS). */
(function () {
  var MODE = window.__MSG_MODE || 'client', ADMIN = MODE === 'admin';
  var MOI_CLIENT = 'Clinique Dentaire Ste-Rose', MOI = ADMIN ? 'Jonathan' : 'Marie Tremblay';
  var PAGE = ADMIN ? 'admin-messages.html' : 'messages.html';
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
    p.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { p.style.display = 'none'; });
    badge();
  }
  function panneau(p) {
    var L = mes(), n = L.filter(nonLu).length;
    p.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #D5DCE2"><span style="font-size:14px;font-weight:600">Messages <span style="font-weight:400;color:#5B6B78;font-size:12.5px">' + (n ? n + ' non lu' + (n > 1 ? 's' : '') : 'tout est lu') + '</span></span><a href="' + PAGE + '#nouveau" style="font-size:12.5px;font-weight:600;color:' + COL + ';text-decoration:none">+ Nouveau</a></div>'
      + '<div style="overflow:auto">' + (L.length ? L.slice(0, 6).map(function (t) {
        var m = dernier(t), u = nonLu(t);
        return '<a href="' + PAGE + '#' + t.id + '" style="display:grid;grid-template:auto / 34px 1fr;gap:10px;padding:10px 14px;border-bottom:1px solid #EEF1F4;text-decoration:none;color:#14202B;background:' + (u ? '#F2F8FA' : '#FFFFFF') + '"><span style="width:34px;height:34px;border-radius:17px;background:' + (ADMIN ? '#2A3B49' : (TECHS[t.tech] || COL)) + ';color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">' + initiales(ADMIN ? t.contact : (t.tech || 'Équipe')) + '</span><span style="min-width:0;display:flex;flex-direction:column;gap:1px"><span style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><span style="font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(nomAffiche(t)) + '</span><span style="color:#5B6B78;font-size:12px;flex:none">' + quand(m.date) + '</span></span><span style="font-size:12.5px;font-weight:' + (u ? 600 : 400) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u ? '<span style="display:inline-block;width:7px;height:7px;border-radius:4px;background:' + COL + ';margin-right:6px"></span>' : '') + esc(t.sujet) + '</span><span style="font-size:12px;color:#5B6B78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.de === (ADMIN ? 'equipe' : 'client') ? 'Vous : ' : '') + esc(m.texte) + '</span></span></a>';
      }).join('') : '<div style="padding:20px;text-align:center;color:#5B6B78;font-size:13px">Aucune conversation</div>') + '</div>'
      + '<a href="' + PAGE + '" style="display:block;padding:11px 14px;border-top:1px solid #EEF1F4;text-align:center;font-size:13px;font-weight:600;color:' + COL + ';text-decoration:none">Ouvrir la messagerie</a>';
  }
  function badge() {
    var n = mes().filter(nonLu).length;
    document.querySelectorAll('[data-msg-count]').forEach(function (c) { c.textContent = n; c.style.display = n ? 'inline-flex' : 'none'; });
    document.querySelectorAll('[data-msg-nav-count]').forEach(function (c) { c.textContent = n; c.style.display = n ? '' : 'none'; });
  }

  // ================= page boîte de réception =================
  var B = document.querySelector('[data-messagerie]'), sel = null, filtre = 'tous', recherche = '', filtreClient = '';
  var mobile = window.innerWidth < 820;
  var BT = FF + 'height:38px;padding:0 14px;font-size:14px;cursor:pointer;border:1px solid #B8C4CE;background:#fff;color:#14202B;border-radius:0;-webkit-appearance:none';
  var IN = FF + '-webkit-appearance:none;appearance:none;border-radius:0;height:44px;padding:0 12px;border:1px solid #B8C4CE;font-size:16px;width:100%;box-sizing:border-box;background:#fff;color:#14202B';

  function rendre() {
    if (!B) return;
    var L = mes().filter(function (t) {
      if (filtre === 'nonlus' && !nonLu(t)) return false;
      if (filtre === 'moi' && t.tech !== MOI) return false;
      if (filtreClient && t.client !== filtreClient) return false;
      if (recherche) { var q = recherche.toLowerCase(); if ((t.sujet + ' ' + t.client + ' ' + t.contact + ' ' + t.messages.map(function (m) { return m.texte; }).join(' ')).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });
    var nb = mes().filter(nonLu).length;
    var clients = []; mes().forEach(function (t) { if (clients.indexOf(t.client) < 0) clients.push(t.client); });
    var liste = '<div style="display:flex;flex-direction:column;min-width:0;border-right:1px solid #D5DCE2;' + (mobile && sel ? 'display:none' : '') + '">'
      + '<div style="padding:12px;display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #D5DCE2">'
      + '<button type="button" data-m-nouveau style="' + BT + ';background:' + COL + ';border-color:' + COL + ';color:#fff;font-weight:600;height:42px">+ Nouveau message</button>'
      + '<input data-m-rech type="search" value="' + esc(recherche) + '" placeholder="Rechercher dans les messages…" style="' + IN + ';height:40px">'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap">' + [['tous', 'Tous'], ['nonlus', 'Non lus' + (nb ? ' · ' + nb : '')]].concat(ADMIN ? [['moi', 'Assignés à moi']] : []).map(function (f) { var on = filtre === f[0]; return '<button type="button" data-m-filtre="' + f[0] + '" style="' + FF + 'height:30px;padding:0 10px;font-size:12.5px;cursor:pointer;border:1px solid ' + (on ? '#14202B' : '#B8C4CE') + ';background:' + (on ? '#14202B' : '#fff') + ';color:' + (on ? '#fff' : '#14202B') + '">' + f[1] + '</button>'; }).join('') + '</div>'
      + (ADMIN ? '<select data-m-client style="' + IN + ';height:38px;font-size:14px"><option value="">Tous les clients</option>' + clients.map(function (c) { return '<option' + (c === filtreClient ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' : '')
      + '</div><div style="overflow:auto;max-height:' + (mobile ? 'none' : '620px') + '">'
      + (L.length ? L.map(function (t) {
        var m = dernier(t), u = nonLu(t), on = sel === t.id;
        return '<button type="button" data-m-ouvrir="' + t.id + '" style="' + FF + 'display:grid;grid-template:auto / 38px 1fr;gap:10px;width:100%;text-align:left;padding:12px;border:0;border-bottom:1px solid #EEF1F4;cursor:pointer;color:#14202B;background:' + (on ? '#E6F1F5' : (u ? '#F7FAFB' : '#fff')) + ';box-shadow:' + (on ? 'inset 3px 0 0 ' + COL : 'none') + '">'
          + '<span style="width:38px;height:38px;border-radius:19px;background:' + (ADMIN ? '#2A3B49' : (TECHS[t.tech] || COL)) + ';color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center">' + initiales(ADMIN ? t.contact : (t.tech || 'Équipe')) + '</span>'
          + '<span style="min-width:0;display:flex;flex-direction:column;gap:2px"><span style="display:flex;justify-content:space-between;gap:8px;font-size:13.5px"><span style="font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(ADMIN ? t.client + ' · ' + t.contact : nomAffiche(t)) + '</span><span style="font-size:12px;color:' + (u ? COL : '#5B6B78') + ';font-weight:' + (u ? 700 : 400) + ';flex:none">' + quand(m.date) + '</span></span>'
          + '<span style="font-size:13px;font-weight:' + (u ? 700 : 500) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (u ? '<span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:' + COL + ';margin-right:6px"></span>' : '') + esc(t.sujet) + '</span>'
          + '<span style="font-size:12.5px;color:#5B6B78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (m.de === (ADMIN ? 'equipe' : 'client') ? 'Vous : ' : esc(m.auteur.split(' ')[0]) + ' : ') + esc(m.texte) + '</span>'
          + (ADMIN ? '<span style="font-size:11.5px;color:#5B6B78">' + (t.tech ? 'Assigné à ' + esc(t.tech) : '<span style="color:#9B1C1C;font-weight:600">Non assigné</span>') + '</span>' : '') + '</span></button>';
      }).join('') : '<div style="padding:28px 16px;text-align:center;color:#5B6B78;font-size:13.5px">Aucune conversation.</div>')
      + '</div></div>';
    B.innerHTML = '<div style="display:grid;grid-template:auto / ' + (mobile ? '1fr' : '340px minmax(0,1fr)') + ';background:#fff;border:1px solid #D5DCE2;min-height:560px;' + FF + '">' + liste + fil() + '</div>';
  }

  function fil() {
    var t = S.threads.filter(function (x) { return x.id === sel; })[0];
    if (!t) return mobile ? '' : '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#5B6B78;padding:40px;text-align:center"><span style="color:#B8C4CE">' + ENV.replace('width="20" height="20"', 'width="44" height="44"') + '</span><strong style="color:#14202B">Sélectionnez une conversation</strong><span style="font-size:13.5px">' + (ADMIN ? 'Les messages de vos clients arrivent ici. Seuls vous et vos techniciens les voyez.' : 'Écrivez directement à votre équipe TI. Réponse en heures ouvrables.') + '</span></div>';
    var lien = t.lien ? '<a href="' + esc(ADMIN ? t.lien : (t.lien.indexOf('admin') === 0 || t.lien === 'billet.html' ? 'mes-billets.html' : t.lien)) + '" style="font-size:12.5px;color:' + COL + ';font-weight:600;text-decoration:none">Voir l’élément lié →</a>' : '';
    var h = '<div style="display:flex;flex-direction:column;min-width:0;' + (mobile ? 'min-height:70vh' : '') + '">'
      + '<div style="padding:12px 16px;border-bottom:1px solid #D5DCE2;display:flex;flex-direction:column;gap:6px">'
      + (mobile ? '<button type="button" data-m-retour style="' + FF + 'align-self:flex-start;background:none;border:0;padding:0;font-size:14px;color:' + COL + ';font-weight:600;cursor:pointer">‹ Tous les messages</button>' : '')
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div style="min-width:0"><h2 style="margin:0;font-size:17px;font-weight:600">' + esc(t.sujet) + '</h2><span style="font-size:13px;color:#5B6B78">' + esc(ADMIN ? t.client + ' · ' + t.contact : 'Avec l’équipe [ENTREPRISE]' + (t.tech ? ' · suivi par ' + t.tech : '')) + '</span></div>' + lien + '</div>'
      + (ADMIN ? '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><label style="display:flex;align-items:center;gap:6px;font-size:13px">Assigné à <select data-m-assigner style="' + IN + ';height:34px;width:auto;font-size:13.5px;padding-right:12px"><option value="">—</option>' + Object.keys(TECHS).map(function (n) { return '<option' + (n === t.tech ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><button type="button" data-m-nonlu style="' + BT + ';height:34px;font-size:13px">Marquer non lu</button><a href="admin-nouveau-billet.html" data-m-billet style="' + BT + ';height:34px;font-size:13px;display:inline-flex;align-items:center;text-decoration:none">Créer un billet</a></div>' : '')
      + '</div><div data-m-fil style="flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#F5F7F9;max-height:' + (mobile ? 'none' : '470px') + '">';
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
    sel = id; var t = S.threads.filter(function (x) { return x.id === id; })[0];
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
      S.threads.push(t); ecrire(); fermer();
      toast(ADMIN ? 'Message envoyé à ' + client : 'Message envoyé à votre équipe TI', true);
      if (B) { filtre = 'tous'; ouvrir(t.id); } else location.href = PAGE + '#' + t.id;
    };
  }

  if (B) {
    B.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.hasAttribute('data-m-ouvrir')) ouvrir(t.getAttribute('data-m-ouvrir'));
      else if (t.hasAttribute('data-m-filtre')) { filtre = t.getAttribute('data-m-filtre'); rendre(); }
      else if (t.hasAttribute('data-m-nouveau')) nouveau();
      else if (t.hasAttribute('data-m-ia')) { var th0 = S.threads.filter(function (x) { return x.id === sel; })[0], fm = t.closest('form'); suggestions(fm.querySelector('[data-m-sugg]'), { id: th0.id, client: th0.client, contact: th0.contact, sujet: th0.sujet, tech: th0.tech, fil: th0.messages, moi: MOI, brouillon: fm.texte.value.trim(), intention: t.getAttribute('data-m-ia') }, fm.texte); }
      else if (t.hasAttribute('data-m-retour')) { sel = null; rendre(); try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {} }
      else if (t.hasAttribute('data-m-nonlu')) { var th = S.threads.filter(function (x) { return x.id === sel; })[0]; th.luEquipe = '2000-01-01T00:00:00'; ecrire(); sel = null; rendre(); badge(); toast('Marqué comme non lu', true); }
    });
    B.addEventListener('input', function (e) { if (e.target.hasAttribute('data-m-rech')) { recherche = e.target.value; var pos = e.target.selectionStart; rendre(); var r = B.querySelector('[data-m-rech]'); r.focus(); try { r.setSelectionRange(pos, pos); } catch (x) {} } });
    B.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-m-client')) { filtreClient = e.target.value; rendre(); }
      if (e.target.hasAttribute('data-m-assigner')) { var th = S.threads.filter(function (x) { return x.id === sel; })[0]; th.tech = e.target.value; ecrire(); rendre(); toast(th.tech ? 'Conversation assignée à ' + th.tech : 'Conversation non assignée', true); }
    });
    B.addEventListener('submit', function (e) {
      if (!e.target.hasAttribute('data-m-repondre')) return; e.preventDefault();
      var tx = e.target.texte.value.trim(); if (!tx) return;
      var th = S.threads.filter(function (x) { return x.id === sel; })[0];
      th.messages.push({ de: ADMIN ? 'equipe' : 'client', auteur: MOI, date: now(), texte: tx });
      if (ADMIN) { th.luEquipe = now(); if (!th.tech) th.tech = MOI; } else th.luClient = now();
      ecrire(); ouvrir(th.id); toast('Message envoyé', true);
    });
    B.addEventListener('keydown', function (e) { if (e.target.name === 'texte' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.target.form.requestSubmit(); } });
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
    else { if (!mobile) { var premier = mes()[0]; if (premier) { sel = premier.id; if (nonLu(premier)) marquerLu(premier); } } rendre(); badge(); }
  }
  window.__MSG = { lire: function () { return S; } };
})();
