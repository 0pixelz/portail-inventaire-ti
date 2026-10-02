/* Calendrier de l'équipe (admin) — vues Jour / Semaine / Mois / Liste, glisser-déposer,
   création et modification, filtres, conflits, charge par technicien, export .ics.
   Données de base : attribut data-events de [data-cal]. Changements : localStorage 'agenda-v1'. */
(function () {
  var R = document.querySelector('[data-cal]'); if (!R) return;
  var D = JSON.parse(R.getAttribute('data-events'));
  var TYPES = {}, TECHS = {}; D.types.forEach(function (t) { TYPES[t[0]] = { lab: t[1], col: t[2] }; }); D.techs.forEach(function (t) { TECHS[t[0]] = t[1]; });
  var K = 'agenda-v1', H = 48, H0 = 7, H1 = 20;
  var JC = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], JL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'], ML = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var CLIENTS = ['', 'Clinique Dentaire Ste-Rose', 'Garderie Les Lucioles', 'Studio Nord Design', 'Comptabilité Marchand', 'Groupe Auto Laurentides', 'Physio Rive-Nord', 'Notaires Lacasse & Fils', 'Atelier Mécanique Dubé', 'Pharmacie du Boisé'];

  function lire() { try { var o = JSON.parse(localStorage.getItem(K)); if (o && o.ajouts) return o; } catch (e) {} return { ajouts: [], modifs: {}, suppr: [], planifies: [] }; }
  function ecrire() { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  var S = lire();
  function toast(m, ok) { if (window.__toast) window.__toast(m, ok); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addJ(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function lundi(d) { var x = new Date(d); var k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x; }
  function min(h) { if (!h) return 0; var p = h.split(':'); return +p[0] * 60 + (+p[1]); }
  function hh(m) { m = Math.max(0, Math.min(24 * 60 - 1, m)); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function hfr(h) { return h ? h.replace(/^0/, '').replace(':', ' h ').replace(' h 00', ' h') : ''; }

  function evenements() {
    var out = [];
    D.events.forEach(function (e) { if (S.suppr.indexOf(e.id) < 0) out.push(Object.assign({}, e, S.modifs[e.id] || {})); });
    S.ajouts.forEach(function (e) { if (S.suppr.indexOf(e.id) < 0) out.push(Object.assign({}, e)); });
    return out;
  }
  function majEvenement(id, champs) {
    var a = S.ajouts.filter(function (e) { return e.id === id; })[0];
    if (a) Object.assign(a, champs); else S.modifs[id] = Object.assign(S.modifs[id] || {}, champs);
    ecrire();
  }
  function visible(e) {
    var ft = R.querySelector('[data-cal-ftype="' + e.type + '"]'); if (ft && !ft.checked) return false;
    if (e.tech === 'Tous') return true;
    var fk = R.querySelector('[data-cal-ftech="' + e.tech + '"]'); return !fk || fk.checked;
  }

  // ---------- état d'affichage ----------
  var mobile = window.innerWidth < 820;
  var vue = mobile ? 'jour' : 'semaine';
  var cur = new Date(); cur.setHours(0, 0, 0, 0);
  var zone = R.querySelector('[data-cal-zone]'), titre = R.querySelector('[data-cal-titre]');

  function plage() {
    if (vue === 'jour') return [cur, cur];
    if (vue === 'semaine') { var l = lundi(cur); return [l, addJ(l, 6)]; }
    if (vue === 'mois') { var p = new Date(cur.getFullYear(), cur.getMonth(), 1); return [p, new Date(cur.getFullYear(), cur.getMonth() + 1, 0)]; }
    return [cur, addJ(cur, 30)];
  }
  function dansPlage(e, a, b) { return e.date >= iso(a) && e.date <= iso(b); }

  // ---------- conflits ----------
  function conflits(liste) {
    var c = {}, msgs = [];
    var parTech = {};
    liste.forEach(function (e) { if (e.journee || e.tech === 'Tous' || !e.debut) return; (parTech[e.tech + '|' + e.date] = parTech[e.tech + '|' + e.date] || []).push(e); });
    Object.keys(parTech).forEach(function (k) {
      var L = parTech[k].sort(function (a, b) { return min(a.debut) - min(b.debut); });
      for (var i = 0; i < L.length; i++) for (var j = i + 1; j < L.length; j++) {
        if (min(L[j].debut) < min(L[i].fin)) { c[L[i].id] = c[L[j].id] = 1; msgs.push(L[i].tech + ' le ' + parse(L[i].date).getDate() + ' ' + MC[parse(L[i].date).getMonth()] + ' : « ' + L[i].titre + ' » et « ' + L[j].titre + ' »'); }
      }
    });
    var al = R.querySelector('[data-cal-alerte]');
    if (msgs.length) { al.style.display = 'block'; al.innerHTML = '<strong>Conflit d’horaire</strong> — ' + msgs.map(esc).join(' · '); } else al.style.display = 'none';
    return c;
  }

  // ---------- rendu ----------
  function rendre() {
    R.querySelectorAll('[data-cal-vue]').forEach(function (b) { var on = b.getAttribute('data-cal-vue') === vue; b.style.background = on ? '#14202B' : '#FFFFFF'; b.style.color = on ? '#FFFFFF' : '#14202B'; b.setAttribute('aria-pressed', on); });
    var p = plage(), tous = evenements(), liste = tous.filter(function (e) { return visible(e) && dansPlage(e, p[0], p[1]); });
    var conf = conflits(liste);
    if (vue === 'jour' || vue === 'semaine') grille(p, liste, conf);
    else if (vue === 'mois') mois(liste, conf);
    else agenda(p, liste, conf);
    titre.textContent = vue === 'jour' ? JL[cur.getDay()] + ' ' + cur.getDate() + ' ' + ML[cur.getMonth()] + ' ' + cur.getFullYear()
      : vue === 'semaine' ? p[0].getDate() + ' ' + MC[p[0].getMonth()] + ' – ' + p[1].getDate() + ' ' + MC[p[1].getMonth()] + ' ' + p[1].getFullYear()
      : vue === 'mois' ? ML[cur.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + cur.getFullYear()
      : 'À partir du ' + cur.getDate() + ' ' + MC[cur.getMonth()] + ' ' + cur.getFullYear();
    mini(tous); charge(liste, p); aPlanifier();
  }

  function bloc(e, conf) {
    var t = TYPES[e.type] || { col: '#5B6B78' };
    return 'background:' + t.col + ';color:#fff;border-left:4px solid rgba(0,0,0,.25);' + (conf[e.id] ? 'outline:2px solid #9B1C1C;outline-offset:1px;' : '');
  }

  function grille(p, liste, conf) {
    var jours = []; for (var d = new Date(p[0]); d <= p[1]; d = addJ(d, 1)) jours.push(new Date(d));
    var auj = iso(new Date()), n = jours.length, larg = vue === 'semaine' && mobile ? 'min-width:760px;' : '';
    var h = '<div style="overflow-x:auto"><div style="' + larg + '">';
    // en-tête des jours
    h += '<div style="display:grid;grid-template:auto / 56px repeat(' + n + ',minmax(0,1fr));border-bottom:1px solid #D5DCE2;position:sticky;top:0;background:#fff;z-index:3">';
    h += '<div></div>' + jours.map(function (j) { var a = iso(j) === auj; return '<button type="button" data-cal-goto="' + iso(j) + '" style="background:none;border:0;padding:8px 4px;font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;color:#14202B"><span style="font-size:11.5px;text-transform:uppercase;color:' + (a ? '#B4540A' : '#5B6B78') + '">' + JC[j.getDay()] + '</span><span style="font-size:20px;font-weight:600;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:17px;' + (a ? 'background:#B4540A;color:#fff' : '') + '">' + j.getDate() + '</span></button>'; }).join('') + '</div>';
    // journée entière
    h += '<div style="display:grid;grid-template:auto / 56px repeat(' + n + ',minmax(0,1fr));border-bottom:1px solid #D5DCE2;min-height:28px"><div style="font-size:10.5px;color:#5B6B78;padding:6px 4px;text-align:right">jour</div>';
    h += jours.map(function (j) { return '<div style="border-left:1px solid #EEF1F4;padding:3px;display:flex;flex-direction:column;gap:2px">' + liste.filter(function (e) { return e.journee && e.date === iso(j); }).map(function (e) { return '<button type="button" data-cal-ev="' + e.id + '" style="' + bloc(e, conf) + 'font:inherit;font-size:12px;text-align:left;padding:2px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border-top:0;border-right:0;border-bottom:0">' + esc(e.titre) + '</button>'; }).join('') + '</div>'; }).join('') + '</div>';
    // grille horaire
    h += '<div data-cal-grille style="display:grid;grid-template:auto / 56px repeat(' + n + ',minmax(0,1fr));position:relative;height:' + ((H1 - H0) * H) + 'px">';
    h += '<div style="position:relative">' + Array.apply(null, Array(H1 - H0)).map(function (_, i) { return '<div style="position:absolute;top:' + (i * H - 6) + 'px;right:6px;font-size:10.5px;color:#5B6B78">' + (i ? (H0 + i) + ' h' : '') + '</div>'; }).join('') + '</div>';
    jours.forEach(function (j, ci) {
      var es = liste.filter(function (e) { return !e.journee && e.date === iso(j); }).sort(function (a, b) { return min(a.debut) - min(b.debut); });
      // couloirs pour les chevauchements
      var fins = [], grp = [], gEnd = -1, groupes = [];
      es.forEach(function (e) {
        var s = min(e.debut), f = Math.max(min(e.fin), s + 15);
        if (s >= gEnd && grp.length) { groupes.push(grp); grp = []; fins = []; }
        var l = 0; while (fins[l] > s) l++; fins[l] = f; e._l = l; grp.push(e); gEnd = Math.max(gEnd, f);
      });
      if (grp.length) groupes.push(grp);
      groupes.forEach(function (g) { var nb = Math.max.apply(null, g.map(function (e) { return e._l; })) + 1; g.forEach(function (e) { e._n = nb; }); });
      h += '<div data-cal-col="' + iso(j) + '" data-ci="' + ci + '" style="position:relative;border-left:1px solid #EEF1F4;background:repeating-linear-gradient(to bottom,#fff 0,#fff ' + (H - 1) + 'px,#EEF1F4 ' + (H - 1) + 'px,#EEF1F4 ' + H + 'px);cursor:copy">';
      if (iso(j) === iso(new Date())) { var now = new Date(), nm = now.getHours() * 60 + now.getMinutes(); if (nm >= H0 * 60 && nm <= H1 * 60) h += '<div style="position:absolute;left:0;right:0;top:' + ((nm - H0 * 60) / 60 * H) + 'px;height:2px;background:#9B1C1C;z-index:2"><span style="position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:5px;background:#9B1C1C"></span></div>'; }
      es.forEach(function (e) {
        var s = Math.max(min(e.debut), H0 * 60), f = Math.min(Math.max(min(e.fin), s + 20), H1 * 60);
        var top = (s - H0 * 60) / 60 * H, hgt = Math.max((f - s) / 60 * H - 2, 18), w = 100 / e._n;
        h += '<div data-cal-ev="' + e.id + '" role="button" tabindex="0" style="position:absolute;top:' + top + 'px;height:' + hgt + 'px;left:calc(' + (e._l * w) + '% + 2px);width:calc(' + w + '% - 4px);' + bloc(e, conf) + 'padding:3px 6px;font-size:12px;line-height:1.25;overflow:hidden;cursor:pointer;box-sizing:border-box;z-index:1;user-select:none">'
          + '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(e.titre) + '</div>'
          + (hgt > 30 ? '<div style="opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + hfr(e.debut) + ' – ' + hfr(e.fin) + ' · ' + esc(e.tech) + '</div>' : '')
          + (hgt > 46 && e.client ? '<div style="opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(e.client) + '</div>' : '') + '</div>';
      });
      h += '</div>';
    });
    h += '</div></div></div>';
    zone.innerHTML = h;
    var g = zone.querySelector('[data-cal-grille]').parentNode.parentNode;
    var cible = vue === 'jour' || iso(lundi(new Date())) === iso(p[0]) ? Math.max(0, (new Date().getHours() - H0 - 1) * H) : H;
    zone.scrollTop = 0; g.scrollTop = cible;
  }

  function mois(liste, conf) {
    var p = new Date(cur.getFullYear(), cur.getMonth(), 1), d0 = lundi(p), auj = iso(new Date());
    var h = '<div style="display:grid;grid-template:auto / repeat(7,minmax(0,1fr));border-bottom:1px solid #D5DCE2">' + ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'].map(function (j) { return '<div style="padding:8px;font-size:11.5px;text-transform:uppercase;color:#5B6B78;text-align:center">' + j + '</div>'; }).join('') + '</div>';
    h += '<div style="display:grid;grid-template:auto / repeat(7,minmax(0,1fr))">';
    for (var i = 0; i < 42; i++) {
      var d = addJ(d0, i), ds = iso(d), dehors = d.getMonth() !== cur.getMonth();
      var es = liste.filter(function (e) { return e.date === ds; }).sort(function (a, b) { return (a.journee ? -1 : min(a.debut)) - (b.journee ? -1 : min(b.debut)); });
      h += '<div data-cal-jour="' + ds + '" style="min-height:' + (mobile ? 64 : 104) + 'px;border-right:1px solid #EEF1F4;border-bottom:1px solid #EEF1F4;padding:4px;display:flex;flex-direction:column;gap:2px;cursor:pointer;background:' + (dehors ? '#F7F9FA' : '#fff') + ';min-width:0">';
      h += '<span style="align-self:flex-start;font-size:12.5px;font-weight:600;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:12px;' + (ds === auj ? 'background:#B4540A;color:#fff' : (dehors ? 'color:#8A9BA8' : '')) + '">' + d.getDate() + '</span>';
      var max = mobile ? 1 : 3;
      es.slice(0, max).forEach(function (e) { h += '<button type="button" data-cal-ev="' + e.id + '" style="' + bloc(e, conf) + 'font:inherit;font-size:11.5px;text-align:left;padding:1px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;border-top:0;border-right:0;border-bottom:0;min-width:0">' + (e.journee ? '' : hfr(e.debut) + ' ') + esc(e.titre) + '</button>'; });
      if (es.length > max) h += '<span style="font-size:11.5px;color:#5B6B78;padding-left:4px">+ ' + (es.length - max) + ' autre(s)</span>';
      h += '</div>';
    }
    zone.innerHTML = h + '</div>';
  }

  function agenda(p, liste, conf) {
    var par = {}; liste.forEach(function (e) { (par[e.date] = par[e.date] || []).push(e); });
    var jours = Object.keys(par).sort();
    if (!jours.length) { zone.innerHTML = '<div style="padding:40px 16px;text-align:center;color:#5B6B78">Aucun événement dans les 30 prochains jours avec ces filtres.</div>'; return; }
    zone.innerHTML = jours.map(function (ds) {
      var d = parse(ds);
      return '<div style="padding:10px 16px"><div style="font-weight:600;font-size:14px">' + JL[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + d.getDate() + ' ' + MC[d.getMonth()] + ' ' + d.getFullYear() + '</div>'
        + par[ds].sort(function (a, b) { return (a.journee ? -1 : min(a.debut)) - (b.journee ? -1 : min(b.debut)); }).map(function (e) {
          var t = TYPES[e.type] || { col: '#5B6B78', lab: '' };
          return '<button type="button" data-cal-ev="' + e.id + '" style="display:grid;grid-template:auto / 110px 1fr;gap:10px;width:100%;text-align:left;padding:8px 0;border:0;border-top:1px solid #EEF1F4;background:none;font:inherit;font-size:13.5px;cursor:pointer;color:#14202B' + (conf[e.id] ? ';box-shadow:inset 3px 0 0 #9B1C1C' : '') + '"><span style="color:#5B6B78">' + (e.journee ? 'Toute la journée' : hfr(e.debut) + ' – ' + hfr(e.fin)) + '</span><span><span style="display:inline-block;width:8px;height:8px;background:' + t.col + ';margin-right:6px"></span><strong>' + esc(e.titre) + '</strong><span style="color:#5B6B78"> · ' + esc(t.lab) + ' · ' + esc(e.tech) + (e.client ? ' · ' + esc(e.client) : '') + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</span></span></button>';
        }).join('') + '</div>';
    }).join('');
  }

  function mini(tous) {
    var el = R.querySelector('[data-cal-mini]'), m = new Date(cur.getFullYear(), cur.getMonth(), 1), d0 = lundi(m), auj = iso(new Date());
    var avec = {}; tous.forEach(function (e) { if (visible(e)) avec[e.date] = 1; });
    var p = plage(), a = iso(p[0]), b = iso(p[1]);
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><strong style="font-size:13.5px">' + ML[m.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + m.getFullYear() + '</strong><span><button type="button" data-cal-mm="-1" aria-label="Mois précédent" style="background:none;border:0;font-size:16px;cursor:pointer;padding:2px 6px">‹</button><button type="button" data-cal-mm="1" aria-label="Mois suivant" style="background:none;border:0;font-size:16px;cursor:pointer;padding:2px 6px">›</button></span></div>';
    h += '<div style="display:grid;grid-template:auto / repeat(7,1fr);gap:2px;text-align:center;font-size:11px;color:#5B6B78">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(function (x) { return '<span>' + x + '</span>'; }).join('');
    for (var i = 0; i < 42; i++) {
      var d = addJ(d0, i), ds = iso(d), sel = ds >= a && ds <= b && vue !== 'liste';
      h += '<button type="button" data-cal-goto="' + ds + '" style="border:0;padding:3px 0;font:inherit;font-size:12px;cursor:pointer;position:relative;border-radius:12px;background:' + (ds === auj ? '#B4540A' : (sel ? '#FDEBD3' : 'transparent')) + ';color:' + (ds === auj ? '#fff' : (d.getMonth() !== m.getMonth() ? '#B8C4CE' : '#14202B')) + '">' + d.getDate() + (avec[ds] ? '<span style="position:absolute;left:50%;bottom:0;width:4px;height:4px;margin-left:-2px;border-radius:2px;background:' + (ds === auj ? '#fff' : '#0F6E8C') + '"></span>' : '') + '</button>';
    }
    el.innerHTML = h + '</div>';
  }

  function charge(liste, p) {
    var jours = 0; for (var d = new Date(p[0]); d <= p[1]; d = addJ(d, 1)) if (d.getDay() > 0 && d.getDay() < 6) jours++;
    var cap = Math.max(jours, 1) * 8, h = {};
    Object.keys(TECHS).forEach(function (t) { h[t] = 0; });
    liste.forEach(function (e) { if (e.journee || !e.debut) return; var dur = (min(e.fin) - min(e.debut)) / 60; if (e.tech === 'Tous') Object.keys(h).forEach(function (t) { h[t] += dur; }); else if (h[e.tech] != null) h[e.tech] += dur; });
    R.querySelector('[data-cal-charge]').innerHTML = Object.keys(h).map(function (t) {
      var pc = Math.min(100, Math.round(h[t] / cap * 100)), col = pc > 85 ? '#9B1C1C' : (pc > 60 ? '#B4540A' : '#1B6B3A');
      return '<div><div style="display:flex;justify-content:space-between"><span>' + t + '</span><span style="color:#5B6B78">' + (Math.round(h[t] * 10) / 10).toString().replace('.', ',') + ' h / ' + cap + ' h</span></div><div style="height:6px;background:#EEF1F4;margin-top:4px"><div style="height:6px;width:' + pc + '%;background:' + col + '"></div></div></div>';
    }).join('');
  }

  function aPlanifier() {
    R.querySelectorAll('[data-cal-ap]').forEach(function (el) { el.style.display = S.planifies.indexOf(+el.getAttribute('data-cal-ap')) > -1 ? 'none' : 'flex'; });
  }

  // ---------- fenêtre de détail / formulaire ----------
  var ov = document.createElement('div'); ov.setAttribute('data-cal-modal', '');
  ov.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(20,32,43,.45);z-index:10003;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;font-family:inherit';
  document.body.appendChild(ov);
  function fermer() { ov.style.display = 'none'; ov.innerHTML = ''; }
  ov.addEventListener('click', function (e) { if (e.target === ov) fermer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.style.display !== 'none') fermer(); });
  var BOX = 'background:#fff;width:min(460px,100%);max-height:calc(100vh - 24px);overflow:auto;box-shadow:0 18px 40px rgba(0,0,0,.25);font-family:"IBM Plex Sans",system-ui,sans-serif;color:#14202B';
  var IN = 'height:38px;padding:0 10px;border:1px solid #B8C4CE;font:inherit;font-size:14px;width:100%;box-sizing:border-box;background:#fff';
  var BT = 'height:38px;padding:0 14px;font:inherit;font-size:14px;cursor:pointer;border:1px solid #B8C4CE;background:#fff;color:#14202B';

  function detail(id) {
    var e = evenements().filter(function (x) { return x.id === id; })[0]; if (!e) return;
    var t = TYPES[e.type] || { col: '#5B6B78', lab: '' }, d = parse(e.date);
    var maps = e.lieu && !/Téléphone|distance|Bureau|Entrepôt/.test(e.lieu) ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((e.client ? e.client + ', ' : '') + e.lieu + ', QC') : '';
    ov.innerHTML = '<div role="dialog" aria-label="Détail de l’événement" style="' + BOX + '"><div style="height:8px;background:' + t.col + '"></div><div style="padding:16px 18px;display:flex;flex-direction:column;gap:10px">'
      + '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h3 style="margin:0;font-size:18px">' + esc(e.titre) + '</h3><button type="button" data-x aria-label="Fermer" style="background:none;border:0;font-size:24px;line-height:1;cursor:pointer;padding:0 4px">×</button></div>'
      + '<div style="font-size:14px">' + JL[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + d.getDate() + ' ' + ML[d.getMonth()] + ' · ' + (e.journee ? 'toute la journée' : hfr(e.debut) + ' – ' + hfr(e.fin)) + '</div>'
      + '<div style="display:grid;grid-template:auto / 100px 1fr;gap:6px 10px;font-size:13.5px"><span style="color:#5B6B78">Type</span><span><span style="display:inline-block;width:9px;height:9px;background:' + t.col + ';margin-right:6px"></span>' + esc(t.lab) + '</span><span style="color:#5B6B78">Technicien</span><span>' + esc(e.tech) + '</span>'
      + (e.client ? '<span style="color:#5B6B78">Client</span><span>' + esc(e.client) + '</span>' : '') + (e.lieu ? '<span style="color:#5B6B78">Lieu</span><span>' + esc(e.lieu) + '</span>' : '') + (e.notes ? '<span style="color:#5B6B78">Notes</span><span>' + esc(e.notes) + '</span>' : '') + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">' + (e.lien ? '<a href="' + esc(e.lien) + '" style="' + BT + ';display:inline-flex;align-items:center;text-decoration:none">Ouvrir la fiche</a>' : '') + (maps ? '<a href="' + maps + '" target="_blank" rel="noopener" style="' + BT + ';display:inline-flex;align-items:center;text-decoration:none">Itinéraire</a>' : '')
      + '<button type="button" data-mod style="' + BT + '">Modifier</button><button type="button" data-sup style="' + BT + ';color:#9B1C1C">Supprimer</button></div></div></div>';
    ov.style.display = 'flex';
    ov.querySelector('[data-x]').onclick = fermer;
    ov.querySelector('[data-mod]').onclick = function () { formulaire(e); };
    var sup = ov.querySelector('[data-sup]');
    sup.onclick = function () { if (sup.dataset.ok) { S.suppr.push(e.id); ecrire(); fermer(); rendre(); toast('Événement supprimé', true); } else { sup.dataset.ok = 1; sup.textContent = 'Confirmer la suppression'; sup.style.background = '#9B1C1C'; sup.style.color = '#fff'; } };
  }

  function formulaire(e, apIndex) {
    var neuf = !e || !e.id; e = Object.assign({ titre: '', type: 'intervention', tech: 'Jonathan', date: iso(cur), debut: '09:00', fin: '10:00', client: '', lieu: '', notes: '', journee: false, lien: '' }, e || {});
    var opt = function (arr, v) { return arr.map(function (x) { var val = Array.isArray(x) ? x[0] : x, lab = Array.isArray(x) ? x[1] : (x || '—'); return '<option value="' + esc(val) + '"' + (val === v ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join(''); };
    var L = function (lab, champ) { return '<label style="display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600">' + lab + champ + '</label>'; };
    ov.innerHTML = '<form data-f style="' + BOX + ';padding:16px 18px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:18px">' + (neuf ? 'Nouvel événement' : 'Modifier l’événement') + '</h3><button type="button" data-x aria-label="Fermer" style="background:none;border:0;font-size:24px;cursor:pointer">×</button></div>'
      + L('Titre', '<input name="titre" required value="' + esc(e.titre) + '" placeholder="Ex. : Installation poste — salle 2" style="' + IN + '">')
      + '<div style="display:grid;grid-template:auto / 1fr 1fr;gap:10px">' + L('Type', '<select name="type" style="' + IN + '">' + opt(Object.keys(TYPES).map(function (k) { return [k, TYPES[k].lab]; }), e.type) + '</select>') + L('Technicien', '<select name="tech" style="' + IN + '">' + opt(Object.keys(TECHS).concat(['Tous']), e.tech) + '</select>') + '</div>'
      + '<div style="display:grid;grid-template:auto / 1.3fr 1fr 1fr;gap:10px">' + L('Date', '<input type="date" name="date" required value="' + e.date + '" style="' + IN + '">') + L('Début', '<input type="time" name="debut" step="900" value="' + (e.debut || '09:00') + '" style="' + IN + '">') + L('Fin', '<input type="time" name="fin" step="900" value="' + (e.fin || '10:00') + '" style="' + IN + '">') + '</div>'
      + '<label style="display:flex;align-items:center;gap:8px;font-size:13.5px"><input type="checkbox" name="journee"' + (e.journee ? ' checked' : '') + ' style="width:16px;height:16px;margin:0"> Toute la journée</label>'
      + '<div style="display:grid;grid-template:auto / 1fr 1fr;gap:10px">' + L('Client', '<select name="client" style="' + IN + '">' + opt(CLIENTS.indexOf(e.client) > -1 ? CLIENTS : CLIENTS.concat([e.client]), e.client) + '</select>') + L('Lieu', '<input name="lieu" value="' + esc(e.lieu) + '" placeholder="Ville, à distance…" style="' + IN + '">') + '</div>'
      + L('Notes', '<textarea name="notes" rows="3" style="' + IN + ';height:auto;padding:8px 10px">' + esc(e.notes) + '</textarea>')
      + '<div data-err style="display:none;color:#9B1C1C;font-size:13px"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button type="button" data-x style="' + BT + '">Annuler</button><button type="submit" style="' + BT + ';background:#B4540A;border-color:#B4540A;color:#fff;font-weight:600">Enregistrer</button></div></form>';
    ov.style.display = 'flex';
    var f = ov.querySelector('[data-f]');
    ov.querySelectorAll('[data-x]').forEach(function (b) { b.onclick = fermer; });
    f.titre.focus();
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var v = { titre: f.titre.value.trim(), type: f.type.value, tech: f.tech.value, date: f.date.value, debut: f.journee.checked ? '' : f.debut.value, fin: f.journee.checked ? '' : f.fin.value, journee: f.journee.checked, client: f.client.value, lieu: f.lieu.value.trim(), notes: f.notes.value.trim() };
      var err = !v.titre ? 'Le titre est requis.' : (!v.date ? 'La date est requise.' : (!v.journee && min(v.fin) <= min(v.debut) ? 'L’heure de fin doit suivre l’heure de début.' : ''));
      if (err) { var el = ov.querySelector('[data-err]'); el.textContent = err; el.style.display = 'block'; return; }
      if (neuf) { v.id = 'n' + Date.now(); v.lien = e.lien || ''; S.ajouts.push(v); if (apIndex != null) S.planifies.push(apIndex); ecrire(); }
      else majEvenement(e.id, v);
      fermer(); cur = parse(v.date); rendre();
      toast((neuf ? 'Événement ajouté : ' : 'Événement modifié : ') + v.titre, true);
    };
  }

  // ---------- interactions ----------
  R.addEventListener('click', function (ev) {
    var t = ev.target.closest('button, [data-cal-ev], [data-cal-jour]'); if (!t || !R.contains(t)) return;
    if (t.hasAttribute('data-cal-vue')) { vue = t.getAttribute('data-cal-vue'); rendre(); return; }
    if (t.hasAttribute('data-cal-auj')) { cur = new Date(); cur.setHours(0, 0, 0, 0); rendre(); return; }
    if (t.hasAttribute('data-cal-prec') || t.hasAttribute('data-cal-suiv')) {
      var s = t.hasAttribute('data-cal-suiv') ? 1 : -1;
      cur = vue === 'jour' ? addJ(cur, s) : vue === 'semaine' ? addJ(cur, 7 * s) : vue === 'mois' ? new Date(cur.getFullYear(), cur.getMonth() + s, 1) : addJ(cur, 30 * s);
      rendre(); return;
    }
    if (t.hasAttribute('data-cal-mm')) { cur = new Date(cur.getFullYear(), cur.getMonth() + (+t.getAttribute('data-cal-mm')), 1); rendre(); return; }
    if (t.hasAttribute('data-cal-goto')) { cur = parse(t.getAttribute('data-cal-goto')); if (vue === 'mois' || vue === 'liste') vue = 'jour'; rendre(); return; }
    if (t.hasAttribute('data-cal-planifier')) { var i = +t.getAttribute('data-cal-planifier'), a = D.aPlanifier[i]; var d = iso(cur) < iso(new Date()) ? iso(new Date()) : iso(cur); formulaire({ titre: a.titre, type: a.type, client: a.client, lien: a.lien, date: d, debut: '09:00', fin: hh(9 * 60 + a.duree), notes: a.note, tech: 'Samuel' }, i); return; }
    if (t.hasAttribute('data-cal-ev')) { if (!glisse) detail(t.getAttribute('data-cal-ev')); return; }
    if (t.hasAttribute('data-cal-jour') && vue === 'mois') { cur = parse(t.getAttribute('data-cal-jour')); vue = 'jour'; rendre(); }
  });
  R.addEventListener('change', function (ev) { if (ev.target.matches('[data-cal-ftype],[data-cal-ftech]')) rendre(); });
  document.querySelectorAll('[data-cal-nouveau]').forEach(function (b) { b.addEventListener('click', function () { var d = iso(cur) < iso(new Date()) ? new Date() : cur; formulaire({ date: iso(d) }); }); });

  // clic dans une case vide → nouvel événement à cette heure ; glisser un événement (souris) → déplacer
  var glisse = false, drag = null;
  zone.addEventListener('pointerdown', function (ev) {
    var el = ev.target.closest('[data-cal-ev]');
    if (el && el.closest('[data-cal-col]') && ev.pointerType === 'mouse') {
      var col = el.closest('[data-cal-col]'), cols = [].slice.call(zone.querySelectorAll('[data-cal-col]'));
      drag = { el: el, id: el.getAttribute('data-cal-ev'), x: ev.clientX, y: ev.clientY, ci: +col.getAttribute('data-ci'), cols: cols, w: col.getBoundingClientRect().width, top: parseFloat(el.style.top), moved: false };
      glisse = false; el.setPointerCapture(ev.pointerId);
    }
  });
  zone.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    drag.moved = glisse = true;
    var dc = Math.max(-drag.ci, Math.min(drag.cols.length - 1 - drag.ci, Math.round(dx / drag.w)));
    var dm = Math.round(dy / H * 60 / 15) * 15;
    drag.dc = dc; drag.dm = dm;
    drag.el.style.transform = 'translate(' + (dc * drag.w) + 'px,' + (dm / 60 * H) + 'px)'; drag.el.style.opacity = '.85'; drag.el.style.zIndex = 5; drag.el.style.cursor = 'grabbing';
  });
  zone.addEventListener('pointerup', function (ev) {
    if (drag) {
      if (drag.moved) {
        var e = evenements().filter(function (x) { return x.id === drag.id; })[0];
        var s = min(e.debut) + (drag.dm || 0), dur = min(e.fin) - min(e.debut);
        s = Math.max(0, Math.min(24 * 60 - dur, s));
        var nd = drag.cols[drag.ci + (drag.dc || 0)].getAttribute('data-cal-col');
        majEvenement(e.id, { date: nd, debut: hh(s), fin: hh(s + dur) });
        rendre(); toast('Déplacé : ' + e.titre + ' → ' + parse(nd).getDate() + ' ' + MC[parse(nd).getMonth()] + ', ' + hfr(hh(s)), true);
        setTimeout(function () { glisse = false; }, 50);
      }
      drag = null; return;
    }
    var col = ev.target.closest('[data-cal-col]');
    if (col && ev.target === col) {
      var y = ev.clientY - col.getBoundingClientRect().top, m = H0 * 60 + Math.floor(y / H * 2) * 30;
      formulaire({ date: col.getAttribute('data-cal-col'), debut: hh(m), fin: hh(m + 60) });
    }
  });

  // export .ics (Google Agenda, Outlook, Apple)
  document.querySelectorAll('[data-cal-ics]').forEach(function (b) {
    b.addEventListener('click', function () {
      var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//[ENTREPRISE]//Calendrier equipe//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:[ENTREPRISE] — équipe'];
      var st = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      var ics = function (t) { return String(t || '').replace(/[\\,;]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
      var n = 0;
      evenements().filter(visible).forEach(function (e) {
        var d = e.date.replace(/-/g, ''); n++;
        L.push('BEGIN:VEVENT', 'UID:' + e.id + '@portail-inventaire', 'DTSTAMP:' + st);
        if (e.journee) { var f = iso(addJ(parse(e.date), 1)).replace(/-/g, ''); L.push('DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + f); }
        else L.push('DTSTART;TZID=America/Toronto:' + d + 'T' + e.debut.replace(':', '') + '00', 'DTEND;TZID=America/Toronto:' + d + 'T' + e.fin.replace(':', '') + '00');
        L.push('SUMMARY:' + ics(e.titre + (e.tech && e.tech !== 'Tous' ? ' (' + e.tech + ')' : '')), 'LOCATION:' + ics([e.client, e.lieu].filter(Boolean).join(', ')), 'DESCRIPTION:' + ics((TYPES[e.type] || {}).lab + (e.notes ? ' — ' + e.notes : '')), 'CATEGORIES:' + ics((TYPES[e.type] || {}).lab), 'END:VEVENT');
      });
      L.push('END:VCALENDAR');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/calendar' })); a.download = 'calendrier-equipe.ics';
      document.body.appendChild(a); a.click(); a.remove();
      toast(n + ' événement(s) exporté(s) — importez le fichier .ics dans Google Agenda ou Outlook', true);
    });
  });

  window.__CAL = { rafraichir: function () { S = lire(); rendre(); }, evenements: evenements };
  rendre();
})();
