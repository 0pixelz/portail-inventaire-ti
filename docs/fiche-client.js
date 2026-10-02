/* Fiche client (admin) : ajouter / retirer des emplacements et des contacts.
   Prototype : enregistré dans le navigateur (localStorage « fiche-client-v1 »). En production : tables emplacements / contacts. */
(function () {
  var KEY = 'fiche-client-v1', ACC = '#0F6E8C';
  var h1 = document.querySelector('main h1, h1'); var CLIENT = h1 ? h1.textContent.trim() : 'client';
  var secEmp = document.querySelector('[data-fc="emp"]'), secCon = document.querySelector('[data-fc="contact"]');
  if (!secEmp && !secCon) return;
  function lire() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function donnees() { var A = lire(), d = A[CLIENT] || {}; d.emp = d.emp || []; d.contacts = d.contacts || []; return d; }
  function ecrire(d) { var A = lire(); A[CLIENT] = d; try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m, ok) { window.__toast ? window.__toast(m, ok !== false) : null; }
  var ZONES = ['Bureaux', 'Réception', 'Atelier', 'Salle d’exposition', 'Comptoir pièces', 'F&I', 'Cour (Wi-Fi)', 'Entrepôt', 'Salle serveur', 'Salle de formation'];

  // liens « Inventaire → » / « Planifier une visite → » repris de la première carte
  var modeleLiens = secEmp && secEmp.querySelector('[data-fc-liste] > div a') ? [].map.call(secEmp.querySelectorAll('[data-fc-liste] > div:first-child a'), function (a) { return { href: a.getAttribute('href'), txt: a.textContent, style: a.getAttribute('style') || '' }; }) : [];
  var modeleBtn = secCon && secCon.querySelector('[data-fc-liste] a[href^="tel:"]'); var styleBtn = modeleBtn ? modeleBtn.getAttribute('style') : '';

  function nomsEmplacements() {
    return secEmp ? [].map.call(secEmp.querySelectorAll('[data-fc-liste] > div'), function (d) { var s = d.querySelector('strong'); return s ? s.textContent.trim() : ''; }).filter(Boolean) : [];
  }
  function nomsContacts() {
    return secCon ? [].map.call(secCon.querySelectorAll('[data-fc-liste] > div strong'), function (s) { return s.textContent.trim(); }) : [];
  }
  function retirerBtn(id, type) { return '<button type="button" data-fc-retirer="' + type + ':' + id + '" style="background:none;border:none;padding:0;font:inherit;font-size:12.5px;color:#9B1C1C;cursor:pointer;text-decoration:underline">Retirer</button>'; }

  function rendre() {
    var d = donnees();
    if (secEmp) {
      var L = secEmp.querySelector('[data-fc-liste]');
      [].slice.call(L.querySelectorAll('[data-fc-ajoute]')).forEach(function (n) { n.remove(); });
      d.emp.forEach(function (e) {
        var div = document.createElement('div'); div.setAttribute('data-fc-ajoute', e.id);
        div.style.cssText = 'border:1px solid #D5DCE2;padding:12px 14px;display:flex;flex-direction:column;gap:4px;font-size:13.5px';
        var adr = [e.adresse, e.ville].filter(Boolean).join(', ');
        div.innerHTML = '<span style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><strong>' + esc(e.nom) + '</strong><span style="font-size:11px;font-weight:600;color:' + ACC + ';border:1px solid ' + ACC + '55;padding:1px 6px;white-space:nowrap">Nouveau</span></span>' +
          (adr ? '<a href="https://maps.google.com/?q=' + encodeURIComponent(adr) + '" target="_blank" rel="noopener" style="color:#5B6B78;text-decoration:underline dotted">' + esc(adr) + '</a>' : '') +
          '<span>0 appareil' + (e.zones && e.zones.length ? ' · ' + esc(e.zones.join(', ')) : '') + '</span>' +
          (e.contact ? '<span style="color:#5B6B78">Contact sur place : ' + esc(e.contact) + '</span>' : '') +
          (e.notes ? '<span style="color:#5B6B78;font-size:12.5px">Accès : ' + esc(e.notes) + '</span>' : '') +
          '<div style="display:flex;gap:10px;margin-top:4px;flex-wrap:wrap;align-items:center">' + modeleLiens.map(function (a) { return '<a href="' + esc(a.href) + '" style="' + esc(a.style) + '">' + esc(a.txt) + '</a>'; }).join('') + '<span style="flex:1"></span>' + retirerBtn(e.id, 'emp') + '</div>';
        L.appendChild(div);
      });
    }
    if (secCon) {
      var C = secCon.querySelector('[data-fc-liste]');
      [].slice.call(C.querySelectorAll('[data-fc-ajoute]')).forEach(function (n) { n.remove(); });
      d.contacts.forEach(function (c) {
        var div = document.createElement('div'); div.setAttribute('data-fc-ajoute', c.id);
        div.style.cssText = 'display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #EEF1F4;padding-bottom:8px;flex-wrap:wrap';
        var role = [c.role, c.emplacement].concat(c.tags || []).filter(Boolean).join(' · ');
        div.innerHTML = '<span style="display:flex;flex-direction:column"><strong>' + esc(c.nom) + '</strong><span style="color:#5B6B78">' + esc(role) + '</span></span><span style="display:flex;gap:6px;align-items:center">' +
          (c.tel ? '<a href="tel:' + esc(c.tel.replace(/[^\d+]/g, '')) + '" style="' + esc(styleBtn) + '">Appeler</a>' : '') +
          (c.courriel ? '<a href="mailto:' + esc(c.courriel) + '" style="' + esc(styleBtn) + '">Courriel</a>' : '') + retirerBtn(c.id, 'contact') + '</span>';
        C.appendChild(div);
      });
    }
  }

  // ---------- Formulaire (feuille du bas sur mobile, fenêtre au centre sur ordinateur) ----------
  var CH = 'width:100%;box-sizing:border-box;height:42px;padding:0 12px;border:1px solid #B8C4CE;background:#fff;font-family:inherit;font-size:16px;color:#14202B';
  function champ(lbl, html) { return '<label style="display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600;color:#14202B">' + lbl + html + '</label>'; }
  function chips(nom, liste) { return '<div style="display:flex;flex-wrap:wrap;gap:6px">' + liste.map(function (z) { return '<button type="button" data-fc-chip="' + nom + '" data-val="' + esc(z) + '" aria-pressed="false" style="min-height:34px;padding:0 12px;border:1px solid #B8C4CE;background:#fff;font-family:inherit;font-size:13.5px;color:#14202B;cursor:pointer;border-radius:17px">' + esc(z) + '</button>'; }).join('') + '</div>'; }
  function ouvrir(type) {
    var mobile = innerWidth < 700;
    var ov = document.createElement('div'); ov.setAttribute('data-fc', 'form');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;font-family:\'IBM Plex Sans\',system-ui,sans-serif;color:#14202B;background:rgba(20,32,43,.45);display:flex;align-items:' + (mobile ? 'flex-end' : 'center') + ';justify-content:center';
    var corps;
    if (type === 'emp') {
      corps = champ('Nom de l’emplacement *', '<input data-f="nom" placeholder="ex. Succursale Mirabel" style="' + CH + '">') +
        champ('Adresse *', '<input data-f="adresse" placeholder="ex. 13000 boul. du Curé-Labelle" autocomplete="street-address" style="' + CH + '">') +
        champ('Ville', '<input data-f="ville" placeholder="ex. Mirabel" style="' + CH + '">') +
        '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:13px;font-weight:600">Zones</span>' + chips('zones', ZONES) + '</div>' +
        champ('Contact sur place', '<select data-f="contact" style="' + CH + '"><option value="">— Aucun —</option>' + nomsContacts().map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select>') +
        champ('Notes d’accès', '<input data-f="notes" placeholder="ex. entrée par l’atelier, code porte 4521" style="' + CH + '">');
    } else {
      corps = champ('Nom complet *', '<input data-f="nom" autocomplete="name" style="' + CH + '">') +
        champ('Rôle', '<input data-f="role" placeholder="ex. Directeur des ventes" style="' + CH + '">') +
        champ('Emplacement', '<select data-f="emplacement" style="' + CH + '"><option value="">— Tous —</option>' + nomsEmplacements().map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select>') +
        champ('Téléphone', '<input data-f="tel" type="tel" inputmode="tel" style="' + CH + '">') +
        champ('Courriel', '<input data-f="courriel" type="email" inputmode="email" autocapitalize="off" style="' + CH + '">') +
        '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:13px;font-weight:600">Responsabilités</span>' + chips('tags', ['admin du portail', 'facturation', 'urgence', 'approbation des achats']) + '</div>';
    }
    ov.innerHTML = '<div role="dialog" aria-modal="true" style="background:#fff;width:' + (mobile ? '100%' : '480px') + ';max-height:' + (mobile ? '88dvh' : '86vh') + ';display:flex;flex-direction:column;border-top:3px solid ' + ACC + ';' + (mobile ? 'padding-bottom:env(safe-area-inset-bottom)' : '') + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #EEF1F4"><strong style="font-size:16px">' + (type === 'emp' ? 'Nouvel emplacement' : 'Nouveau contact') + ' — ' + esc(CLIENT) + '</strong><button type="button" data-fc-fermer aria-label="Fermer le formulaire" style="width:40px;height:40px;border:none;background:none;font-size:22px;cursor:pointer;color:#5B6B78">×</button></div>' +
      '<div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px;overflow:auto">' + corps + '<span data-fc-err style="color:#9B1C1C;font-size:13px;display:none"></span></div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid #EEF1F4"><button type="button" data-fc-fermer style="height:42px;padding:0 16px;border:1px solid #B8C4CE;background:#fff;font-family:inherit;font-size:14px;cursor:pointer">Annuler</button><button type="button" data-fc-ok style="height:42px;padding:0 18px;border:none;background:' + ACC + ';color:#fff;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">Ajouter</button></div></div>';
    document.body.appendChild(ov);
    var defOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    function fermer() { ov.remove(); document.body.style.overflow = defOverflow; }
    setTimeout(function () { if (!mobile) { var f = ov.querySelector('[data-f="nom"]'); f && f.focus(); } }, 50);
    ov.addEventListener('click', function (e) {
      var t = e.target;
      if (t === ov || t.closest('[data-fc-fermer]')) return fermer();
      var ch = t.closest('[data-fc-chip]');
      if (ch) { var on = ch.getAttribute('aria-pressed') !== 'true'; ch.setAttribute('aria-pressed', on); ch.style.background = on ? ACC : '#fff'; ch.style.color = on ? '#fff' : '#14202B'; ch.style.borderColor = on ? ACC : '#B8C4CE'; return; }
      if (t.closest('[data-fc-ok]')) {
        var v = function (k) { var el = ov.querySelector('[data-f="' + k + '"]'); return el ? el.value.trim() : ''; };
        var sel = function (n) { return [].map.call(ov.querySelectorAll('[data-fc-chip="' + n + '"][aria-pressed="true"]'), function (b) { return b.getAttribute('data-val'); }); };
        var err = ov.querySelector('[data-fc-err]'), d = donnees(), id = 'x' + Date.now().toString(36);
        if (type === 'emp') {
          if (!v('nom') || !v('adresse')) { err.textContent = 'Le nom et l’adresse sont requis.'; err.style.display = ''; return; }
          if (nomsEmplacements().some(function (n) { return n.toLowerCase() === v('nom').toLowerCase(); })) { err.textContent = 'Un emplacement porte déjà ce nom.'; err.style.display = ''; return; }
          d.emp.push({ id: id, nom: v('nom'), adresse: v('adresse'), ville: v('ville'), zones: sel('zones'), contact: v('contact'), notes: v('notes') });
        } else {
          if (!v('nom')) { err.textContent = 'Le nom est requis.'; err.style.display = ''; return; }
          if (v('courriel') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('courriel'))) { err.textContent = 'Courriel invalide.'; err.style.display = ''; return; }
          d.contacts.push({ id: id, nom: v('nom'), role: v('role'), emplacement: v('emplacement'), tel: v('tel'), courriel: v('courriel'), tags: sel('tags') });
        }
        ecrire(d); rendre(); fermer();
        toast(type === 'emp' ? 'Emplacement « ' + v('nom') + ' » ajouté' : 'Contact ' + v('nom') + ' ajouté');
      }
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); if (e.key === 'Enter' && e.target.tagName === 'INPUT') ov.querySelector('[data-fc-ok]').click(); });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-fc-ajouter]');
    if (a) { e.preventDefault(); e.stopPropagation(); ouvrir(a.closest('[data-fc]').getAttribute('data-fc')); return; }
    var r = e.target.closest('[data-fc-retirer]');
    if (r) {
      var p = r.getAttribute('data-fc-retirer').split(':'), d = donnees(), k = p[0] === 'emp' ? 'emp' : 'contacts';
      var it = d[k].filter(function (x) { return x.id === p[1]; })[0]; if (!it) return;
      if (r.getAttribute('data-confirme') !== '1') { r.setAttribute('data-confirme', '1'); r.textContent = 'Confirmer le retrait'; setTimeout(function () { if (r.isConnected) { r.removeAttribute('data-confirme'); r.textContent = 'Retirer'; } }, 3000); return; }
      d[k] = d[k].filter(function (x) { return x.id !== p[1]; }); ecrire(d); rendre(); toast('« ' + it.nom + ' » retiré', false);
    }
  }, true);
  addEventListener('storage', function (e) { if (e.key === KEY) rendre(); });
  rendre();
})();
