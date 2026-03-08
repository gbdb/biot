/**
 * Overlay UI : top bar, badges, warnings, panneau droit (recherche, filtres, liste), popup, toolbar, légende, boussole
 */
(function () {
  'use strict';

  var GARDEN_DATA = window.GARDEN_DATA || {};
  var terrainStats = GARDEN_DATA.terrain_stats || null;
  var specimens = [];
  var warnings = { overdue_reminders: [], missing_pollinators: [], phenology_alerts: [] };
  var selectedSpecimenId = null;
  var panelRoot, popupEl, toolbarEl, legendEl, compassEl;

  function byId(id) { return document.getElementById(id); }
  function el(tag, cls, content) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (content) e.innerHTML = content;
    return e;
  }

  function renderTopBar() {
    var top = el('div', 'terrain-topbar');
    top.innerHTML =
      '<span class="terrain-logo">Jardin <span>bIOT</span></span>' +
      '<span class="terrain-address">' + (GARDEN_DATA.adresse || GARDEN_DATA.nom || '') + (GARDEN_DATA.zone_rusticite ? ' · Zone ' + GARDEN_DATA.zone_rusticite : '') + '</span>' +
      '<div class="terrain-view-pills">' +
      '<button class="terrain-pill" disabled>2D</button>' +
      '<button class="terrain-pill active">3D LiDAR</button>' +
      '<button class="terrain-pill" disabled>Drone</button>' +
      '<button class="terrain-pill" disabled>LiDAR+Drone</button>' +
      '</div>';
    document.body.appendChild(top);
  }

  function renderBadges(hasLidar, hasDrone, gcpCount) {
    var wrap = el('div', 'terrain-badges');
    if (hasLidar) wrap.appendChild(el('span', 'terrain-badge lidar', 'LiDAR actif'));
    if (hasDrone) wrap.appendChild(el('span', 'terrain-badge drone', 'Imagerie drone'));
    if (gcpCount > 0) wrap.appendChild(el('span', 'terrain-badge gcp', gcpCount + ' GCP'));
    if (wrap.children.length) document.body.appendChild(wrap);
  }

  function renderWarnings() {
    var wrap = el('div', 'terrain-warnings');
    var list = [];
    (warnings.overdue_reminders || []).slice(0, 2).forEach(function (w) {
      list.push({ type: 'red', text: 'Rappel en retard: ' + (w.specimen_nom || ''), specimenId: w.specimen_id });
    });
    (warnings.missing_pollinators || []).slice(0, 2).forEach(function (w) {
      list.push({ type: 'amber', text: 'Pollinisateur manquant: ' + (w.specimen_nom || ''), specimenId: w.specimen_id });
    });
    (warnings.phenology_alerts || []).slice(0, 2).forEach(function (w) {
      list.push({ type: 'green', text: 'Phénologie: ' + (w.specimen_nom || ''), specimenId: w.specimen_id });
    });
    list.slice(0, 3).forEach(function (w) {
      var d = el('div', 'terrain-warning ' + w.type');
      d.innerHTML = '<span>' + w.text + '</span><span class="terrain-warning-dismiss">✕</span>';
      d.dataset.specimenId = w.specimenId || '';
      wrap.appendChild(d);
    });
    if (list.length > 3) {
      var more = el('div', 'terrain-warning amber');
      more.textContent = '+ ' + (list.length - 3) + ' autres →';
      wrap.appendChild(more);
    }
    document.body.appendChild(wrap);
  }

  function renderPanel() {
    panelRoot = el('div', 'terrain-panel');
    panelRoot.innerHTML =
      '<div class="terrain-panel-header">' +
      '<h2>' + (GARDEN_DATA.nom || 'Jardin') + '</h2>' +
      '<div class="terrain-panel-zone">' + (GARDEN_DATA.adresse || '') + (GARDEN_DATA.zone_rusticite ? ' · Zone ' + GARDEN_DATA.zone_rusticite : '') + '</div>' +
      '</div>' +
      '<div class="terrain-panel-tabs">' +
      '<button class="terrain-panel-tab active" data-tab="specimens">Spécimens</button>' +
      '<button class="terrain-panel-tab" data-tab="journal">Journal</button>' +
      '<button class="terrain-panel-tab" data-tab="rappels">Rappels</button>' +
      '</div>' +
      '<div class="terrain-panel-search"><input type="text" placeholder="Rechercher (nom, espèce…)" id="terrain-search-input"/></div>' +
      '<div class="terrain-panel-filters" id="terrain-filters"></div>' +
      '<div class="terrain-panel-list" id="terrain-specimen-list"></div>' +
      '<div class="terrain-panel-footer" id="terrain-panel-footer">Total: 0 · Établis: 0 · En alerte: 0 · Planifiés: 0</div>';
    document.body.appendChild(panelRoot);

    var searchInput = byId('terrain-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(applySearchAndFilters, 300));
    }
    panelRoot.querySelectorAll('.terrain-panel-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        panelRoot.querySelectorAll('.terrain-panel-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function applySearchAndFilters() {
    var q = (byId('terrain-search-input') && byId('terrain-search-input').value) || '';
    q = q.trim().toLowerCase();
    var ids = null;
    if (q) {
      ids = specimens.filter(function (s) {
        var nom = (s.nom || '').toLowerCase();
        var org = (s.organisme_nom || '').toLowerCase();
        return nom.indexOf(q) >= 0 || org.indexOf(q) >= 0;
      }).map(function (s) { return s.id; });
    }
    if (typeof window.terrainCesiumSetVisibleSpecimens === 'function') window.terrainCesiumSetVisibleSpecimens(ids);
    updateSpecimenList(ids);
  }

  function updateSpecimenList(visibleIds) {
    var listEl = byId('terrain-specimen-list');
    if (!listEl) return;
    var toShow = visibleIds ? specimens.filter(function (s) { return visibleIds.indexOf(s.id) >= 0; }) : specimens;
    listEl.innerHTML = '';
    toShow.forEach(function (s) {
      var item = el('div', 'terrain-specimen-item' + (selectedSpecimenId === s.id ? ' selected' : ''));
      item.dataset.specimenId = s.id;
      item.innerHTML = '<span class="terrain-specimen-emoji">' + (s.emoji || '🌱') + '</span>' +
        '<span class="terrain-specimen-name">' + (s.nom || '') + '</span>' +
        '<span class="terrain-specimen-badge">' + (s.statut || '') + '</span>';
      item.addEventListener('click', function () {
        selectedSpecimenId = s.id;
        if (window.terrainCesiumViewer && window.terrainCesiumFlyToSpecimen) {
          window.terrainCesiumFlyToSpecimen({ lng: s.longitude, lat: s.latitude, specimenId: s.id });
        }
        showPopup(s);
        panelRoot.querySelectorAll('.terrain-specimen-item').forEach(function (e) { e.classList.remove('selected'); });
        item.classList.add('selected');
      });
      listEl.appendChild(item);
    });
    var footer = byId('terrain-panel-footer');
    if (footer) {
      var etabli = specimens.filter(function (s) { return s.statut === 'etabli' || s.statut === 'mature'; }).length;
      var planifie = specimens.filter(function (s) { return s.statut === 'planifie'; }).length;
      footer.textContent = 'Total: ' + specimens.length + ' · Établis: ' + etabli + ' · En alerte: — · Planifiés: ' + planifie;
    }
  }

  function showPopup(s) {
    if (!popupEl) return;
    popupEl.innerHTML =
      '<div class="terrain-popup-title">' + (s.emoji || '🌱') + ' ' + (s.nom || '') + '</div>' +
      '<div class="terrain-popup-latin">' + (s.organisme_nom_latin || 'Non renseigné') + '</div>' +
      '<div class="terrain-popup-grid">' +
      '<span class="label">Cultivar</span><span class="value unset">Non renseigné</span>' +
      '<span class="label">Porte-greffe</span><span class="value unset">Non renseigné</span>' +
      '<span class="label">Plantation</span><span class="value unset">Non renseigné</span>' +
      '<span class="label">Santé</span><span class="value">' + (s.sante != null ? s.sante + '/10' : '—') + '</span>' +
      '</div>' +
      '<div class="terrain-popup-actions"><button type="button" id="terrain-popup-open-fiche">Ouvrir la fiche complète</button></div>';
    popupEl.style.display = 'block';
    byId('terrain-popup-open-fiche').addEventListener('click', function () {
      window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: s.id } });
    });
  }

  function renderPopup() {
    popupEl = el('div', 'terrain-popup');
    popupEl.style.display = 'none';
    popupEl.id = 'terrain-popup';
    document.body.appendChild(popupEl);
  }

  function renderToolbar() {
    toolbarEl = el('div', 'terrain-toolbar');
    var metricsClass = terrainStats ? '' : ' null';
    toolbarEl.innerHTML =
      '<button class="terrain-toolbar-btn" id="terrain-btn-home" title="Accueil">🏠</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-circles" title="Rayons adultes">⭕</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-gcps" title="GCP">📍</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-new-gcp" title="Nouveau GCP">➕</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-export-gcp" title="Exporter CSV OpenDroneMap">📤</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-drone" title="Vol drone">🚁</button>' +
      '<div class="terrain-toolbar-metrics' + metricsClass + '" id="terrain-metrics">' +
      (terrainStats ? ('Alt. ' + (terrainStats.altitude_min != null ? terrainStats.altitude_min + '–' + (terrainStats.altitude_max != null ? terrainStats.altitude_max : '—') : '—') + ' m · Pente ' + (terrainStats.pente_moyenne != null ? terrainStats.pente_moyenne : '—') + ' · Eau ' + (terrainStats.nb_cours_eau != null ? terrainStats.nb_cours_eau : '—') + ' · ' + (terrainStats.surface_ha != null ? terrainStats.surface_ha + ' ha' : '—')) : '—') +
      '</div>';
    document.body.appendChild(toolbarEl);

    byId('terrain-btn-home').addEventListener('click', function () {
      if (window.terrainCesiumFlyHome) window.terrainCesiumFlyHome();
    });
    byId('terrain-btn-circles').addEventListener('click', function () {
      var btn = byId('terrain-btn-circles');
      var next = !btn.classList.contains('active');
      btn.classList.toggle('active', next);
      window.postToRN(JSON.stringify({ type: 'TOGGLE_CIRCLES', payload: { visible: next } }));
      if (window.receiveFromRN) window.receiveFromRN(JSON.stringify({ type: 'TOGGLE_CIRCLES', payload: { visible: next } }));
    });
    byId('terrain-btn-gcps').addEventListener('click', function () {
      var btn = byId('terrain-btn-gcps');
      var next = !btn.classList.contains('active');
      btn.classList.toggle('active', next);
      window.postToRN(JSON.stringify({ type: 'TOGGLE_GCPs', payload: { visible: next } }));
      if (window.receiveFromRN) window.receiveFromRN(JSON.stringify({ type: 'TOGGLE_GCPs', payload: { visible: next } }));
    });
    byId('terrain-btn-new-gcp').addEventListener('click', function () {
      window.postToRN({ type: 'OPEN_GCP_CREATE' });
    });
    byId('terrain-btn-export-gcp').addEventListener('click', function () {
      window.postToRN({ type: 'OPEN_GCP_EXPORT', payload: { gardenId: GARDEN_DATA.id } });
    });
  }

  function renderLegend() {
    legendEl = el('div', 'terrain-legend');
    legendEl.innerHTML = '<div class="terrain-legend-title">Altitude</div><div class="terrain-legend-entries">' +
      (terrainStats && terrainStats.altitude_min != null ? ('Bas: ' + terrainStats.altitude_min + ' m<br>Haut: ' + (terrainStats.altitude_max != null ? terrainStats.altitude_max + ' m' : '—')) : '—') +
      '</div>';
    document.body.appendChild(legendEl);
  }

  function renderCompass() {
    compassEl = el('div', 'terrain-compass');
    compassEl.textContent = '🧭';
    compassEl.title = 'Réorienter vers le nord';
    compassEl.addEventListener('click', function () {
      if (window.terrainCesiumViewer) {
        window.terrainCesiumViewer.camera.flyTo({
          orientation: { heading: 0, pitch: window.terrainCesiumViewer.camera.pitch, roll: 0 },
          duration: 0.8
        });
      }
    });
    document.body.appendChild(compassEl);
  }

  function renderFog() {
    document.body.appendChild(el('div', 'terrain-fog'));
  }

  window.terrainOnMessage(function (msg) {
    var type = msg.type;
    var payload = msg.payload || {};
    if (type === 'LOAD_SPECIMENS') {
      specimens = payload.specimens || [];
      updateSpecimenList(null);
    }
    if (type === 'LOAD_WARNINGS') {
      warnings = payload;
      document.querySelectorAll('.terrain-warnings').forEach(function (e) { e.remove(); });
      renderWarnings();
    }
  });

  renderTopBar();
  renderBadges(!!window.LIDAR_ASSET_ID, false, 0);
  renderPanel();
  renderPopup();
  renderToolbar();
  renderLegend();
  renderCompass();
  renderFog();
})();
