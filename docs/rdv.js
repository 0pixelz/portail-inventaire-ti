/* Rendez-vous côté client / site public → calendrier admin (localStorage 'agenda-v1', partagé par le prototype).
   - data-rdv="confirmer" : le client accepte le créneau proposé → événement confirmé dans le calendrier admin
   - data-rdv="proposer"  : le client choisit un autre créneau (libre pour le technicien) → événement « à confirmer »
   - data-rdv="demande"   : formulaire public de visite gratuite → ajouté à « À planifier » côté admin
   En production : ces actions passent par l'API (table rendez_vous) et déclenchent un courriel. */
(function () {
  var K = 'agenda-v1';
  var JL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], MC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  function lire() { try { var o = JSON.parse(localStorage.getItem(K)); if (o && o.ajouts) { o.demandes = o.demandes || []; return o; } } catch (e) {} return { ajouts: [], modifs: {}, suppr: [], planifies: [], demandes: [] }; }
  function ecrire(S) { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  function toast(m, ok) { if (window.__toast) window.__toast(m, ok); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function min(h) { if (!h) return 0; var p = h.split(':'); return +p[0] * 60 + (+p[1]); }
  function hh(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function hfr(h) { return h ? h.replace(/^0/, '').replace(':', ' h ').replace(' h 00', ' h') : ''; }
  function quand(e) { var d = parse(e.date); return JL[d.getDay()] + ' ' + d.getDate() + ' ' + MC[d.getMonth()] + ', ' + hfr(e.debut) + ' – ' + hfr(e.fin); }
  function info(b) { var d = b.dataset; return { id: d.rdvId, titre: d.rdvTitre, type: d.rdvType || 'intervention', date: d.rdvDate || '', debut: d.rdvDebut || '', fin: d.rdvFin || '', tech: d.rdvTech || 'Jonathan', client: d.rdvClient || '', lieu: d.rdvLieu || '', lien: d.rdvLien || '', ap: d.rdvAp, duree: +(d.rdvDuree || 0) || (min(d.rdvFin) - min(d.rdvDebut)) || 60 }; }
  function trouver(S, id) { return S.ajouts.filter(function (e) { return e.id === 'rdv-' + id && S.suppr.indexOf(e.id) < 0; })[0]; }

  var BT = 'height:36px;padding:0 14px;font-family:inherit;font-size:13px;cursor:pointer;border:1px solid #B8C4CE;background:#fff;color:#14202B';

  // ---------- état affiché dans chaque zone ----------
  function afficher(zone) {
    var id = zone.getAttribute('data-rdv-zone'), S = lire(), e = trouver(S, id); if (!e) return;
    if (!zone._orig) zone._orig = zone.innerHTML;
    var ok = e.statut !== 'propose';
    zone.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px;width:100%"><div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:' + (ok ? '#DDF3E4' : '#FDEBD3') + ';border:1px solid ' + (ok ? '#A9DDBA' : '#F1C68E') + ';color:' + (ok ? '#1B6B3A' : '#8A4306') + ';font-size:13.5px"><strong style="font-size:15px;line-height:1.2">' + (ok ? '✓' : '⏳') + '</strong><span><strong>' + (ok ? 'Rendez-vous confirmé' : 'Demande envoyée — en attente de confirmation') + '</strong><br>' + esc(quand(e)) + ' · ' + esc(e.tech) + (ok ? '' : ' vous confirme le moment sous peu.') + '</span></div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" data-rdv-ics style="' + BT + '">Ajouter à mon calendrier (.ics)</button><button type="button" data-rdv-changer style="' + BT + '">Changer le moment</button></div></div>';
    zone.querySelector('[data-rdv-ics]').onclick = function () { ics(e); };
    zone.querySelector('[data-rdv-changer]').onclick = function () { var tmp = document.createElement('div'); tmp.innerHTML = zone._orig; var b = tmp.querySelector('[data-rdv="proposer"]') || tmp.querySelector('[data-rdv]'); proposer(info(b), zone); };
  }
  function toutAfficher() { document.querySelectorAll('[data-rdv-zone]').forEach(afficher); }

  function enregistrer(r, date, debut, fin, statut, note) {
    var S = lire(), id = 'rdv-' + r.id, ex = S.ajouts.filter(function (e) { return e.id === id; })[0];
    var e = { id: id, titre: r.titre, type: r.type, date: date, debut: debut, fin: fin, journee: false, tech: r.tech, client: r.client, lieu: r.lieu, lien: r.lien,
      statut: statut, source: 'client', notes: note };
    if (ex) Object.assign(ex, e); else S.ajouts.push(e);
    S.suppr = S.suppr.filter(function (x) { return x !== id; });
    if (r.ap != null && r.ap !== '' && S.planifies.indexOf(+r.ap) < 0) S.planifies.push(+r.ap);
    ecrire(S); return e;
  }

  function ics(e) {
    var d = e.date.replace(/-/g, ''), st = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//[ENTREPRISE]//Portail client//FR', 'BEGIN:VEVENT', 'UID:' + e.id + '@portail-inventaire', 'DTSTAMP:' + st,
      'DTSTART;TZID=America/Toronto:' + d + 'T' + e.debut.replace(':', '') + '00', 'DTEND;TZID=America/Toronto:' + d + 'T' + e.fin.replace(':', '') + '00',
      'SUMMARY:' + e.titre.replace(/[,;]/g, ' ') + ' — [ENTREPRISE]', 'LOCATION:' + (e.lieu || '').replace(/[,;]/g, ' '), 'DESCRIPTION:Technicien : ' + e.tech + (e.statut === 'propose' ? ' (en attente de confirmation)' : ''), 'END:VEVENT', 'END:VCALENDAR'];
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })); a.download = 'rendez-vous.ics';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Invitation téléchargée — ouvrez-la pour l’ajouter à votre calendrier', true);
  }

  // ---------- créneaux libres du technicien (d'après le calendrier de l'équipe) ----------
  function agendaTech(tech) {
    return fetch('admin-calendrier.html').then(function (r) { return r.text(); }).then(function (h) {
      var d = new DOMParser().parseFromString(h, 'text/html').querySelector('[data-cal]'); var base = d ? JSON.parse(d.getAttribute('data-events')).events : [];
      var S = lire(), out = [];
      base.forEach(function (e) { if (S.suppr.indexOf(e.id) < 0) out.push(Object.assign({}, e, S.modifs[e.id] || {})); });
      S.ajouts.forEach(function (e) { if (S.suppr.indexOf(e.id) < 0) out.push(e); });
      return out.filter(function (e) { return e.tech === tech || e.tech === 'Tous'; });
    }).catch(function () { return []; });
  }
  function creneaux(evs, duree, sauf) {
    var res = [], d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    var departs = [9 * 60, 10 * 60 + 30, 13 * 60, 15 * 60];
    for (var n = 0; n < 21 && res.length < 6; n++, d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      var ds = iso(d), jour = evs.filter(function (e) { return e.date === ds && e.id !== sauf; });
      if (jour.some(function (e) { return e.journee; })) continue;
      for (var i = 0; i < departs.length && res.length < 6; i++) {
        var s = departs[i], f = s + duree; if (f > 17 * 60) continue;
        if (!jour.some(function (e) { return min(e.debut) < f && min(e.fin) > s; })) { res.push({ date: ds, debut: hh(s), fin: hh(f) }); break; }
      }
    }
    return res;
  }

  // ---------- fenêtre « Proposer un autre moment » ----------
  var ov = document.createElement('div');
  ov.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(20,32,43,.45);z-index:10003;align-items:center;justify-content:center;padding:12px;box-sizing:border-box';
  document.body.appendChild(ov);
  ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });
  function fermer() { ov.style.display = 'none'; ov.innerHTML = ''; }

  function proposer(r, zone) {
    var IN = '-webkit-appearance:none;appearance:none;border-radius:0;height:44px;padding:0 12px;border:1px solid #B8C4CE;font:inherit;font-size:16px;width:100%;box-sizing:border-box;background:#fff';
    ov.innerHTML = '<div role="dialog" aria-label="Proposer un moment" style="background:#fff;width:min(440px,100%);max-height:calc(100vh - 24px);overflow:auto;padding:16px 18px;display:flex;flex-direction:column;gap:12px;font-family:\'IBM Plex Sans\',system-ui,sans-serif;color:#14202B;box-shadow:0 18px 40px rgba(0,0,0,.25)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h3 style="margin:0;font-size:18px">Choisir un moment</h3><button type="button" data-x aria-label="Fermer" style="background:none;border:0;font-size:24px;cursor:pointer">×</button></div>'
      + '<span style="font-size:13.5px;color:#5B6B78">' + esc(r.titre) + ' · avec ' + esc(r.tech) + ' · environ ' + (r.duree >= 60 ? (r.duree / 60).toString().replace('.', ',') + ' h' : r.duree + ' min') + '</span>'
      + '<strong style="font-size:13.5px">Disponibilités de ' + esc(r.tech) + '</strong><div data-slots style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:#5B6B78">Recherche des disponibilités…</div>'
      + '<details style="font-size:13.5px"><summary style="cursor:pointer;font-weight:600">Aucun ne convient ? Proposer une date</summary><div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8px;margin-top:8px"><input type="date" data-d style="' + IN + '"><input type="time" data-h value="09:00" step="900" style="' + IN + '"></div></details>'
      + '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">Message (facultatif)<input data-m placeholder="Ex. : arrivée par la porte arrière" style="' + IN + '"></label>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" data-x style="' + BT + '">Annuler</button><button type="button" data-ok style="' + BT + ';background:#0F6E8C;border-color:#0F6E8C;color:#fff;font-weight:600">Envoyer la demande</button></div></div>';
    ov.style.display = 'flex';
    ov.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = fermer; });
    var choix = null;
    agendaTech(r.tech).then(function (evs) {
      var L = creneaux(evs, r.duree, 'rdv-' + r.id), box = ov.querySelector('[data-slots]'); if (!box) return;
      if (!L.length) { box.textContent = 'Aucune disponibilité trouvée dans les 3 prochaines semaines — proposez une date ci-dessous.'; return; }
      box.innerHTML = L.map(function (c, i) { return '<label style="display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid #D5DCE2;cursor:pointer;color:#14202B"><input type="radio" name="slot" value="' + i + '"' + (i ? '' : ' checked') + ' style="width:18px;height:18px;margin:0"><span style="text-transform:capitalize">' + esc(quand(c)) + '</span></label>'; }).join('');
      choix = L[0]; box.addEventListener('change', function (e) { choix = L[+e.target.value]; });
    });
    ov.querySelector('[data-ok]').onclick = function () {
      var d = ov.querySelector('[data-d]').value, h = ov.querySelector('[data-h]').value, msg = ov.querySelector('[data-m]').value.trim();
      var c = d ? { date: d, debut: h || '09:00', fin: hh(min(h || '09:00') + r.duree) } : choix;
      if (!c) { toast('Choisissez un moment', false); return; }
      var e = enregistrer(r, c.date, c.debut, c.fin, 'propose', 'Proposé par le client (Marie Tremblay)' + (msg ? ' : « ' + msg + ' »' : '') + '.');
      fermer(); if (zone) afficher(zone);
      toast('Demande envoyée à ' + r.tech + ' : ' + quand(e) + ' — vous recevrez une confirmation', true);
    };
  }

  // ---------- clics ----------
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-rdv]'); if (!b) return;
    ev.preventDefault();
    var mode = b.getAttribute('data-rdv'), zone = b.closest('[data-rdv-zone]');
    if (mode === 'confirmer') {
      var r = info(b), e = enregistrer(r, r.date, r.debut, r.fin, 'confirme', 'Confirmé par le client (Marie Tremblay) depuis le portail.');
      if (zone) afficher(zone);
      toast('Rendez-vous confirmé : ' + quand(e) + ' — ajouté au calendrier de ' + r.tech, true);
    } else if (mode === 'proposer') {
      proposer(info(b), zone);
    } else if (mode === 'demande') {
      var f = b.closest('form') || document, v = function (s) { var x = f.querySelector(s); return x ? x.value.trim() : ''; };
      var ent = v('#ent'), nom = v('#nom'), cour = v('#cour'), nb = v('#nb');
      if (!ent && !nom) { toast('Indiquez au moins votre nom ou votre entreprise', false); return; }
      var S = lire();
      S.demandes.push({ titre: 'Visite d’inventaire gratuite — ' + (ent || nom), type: 'visite', client: ent || nom, duree: 120, lien: '', note: 'Demande du site web · ' + [nom, cour, nb ? nb + ' postes' : ''].filter(Boolean).join(' · '), recu: new Date().toISOString() });
      ecrire(S);
      toast('Merci ! Nous vous rappelons d’ici 1 jour ouvrable pour planifier la visite d’inventaire gratuite.', true);
      b.disabled = true; b.textContent = 'Demande envoyée ✓'; b.style.opacity = '.75';
    }
  });

  window.addEventListener('storage', function (e) { if (e.key === K) toutAfficher(); });
  toutAfficher();
})();
