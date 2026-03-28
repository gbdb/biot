/**
 * Overlay UI : panneau latéral (style Apple Maps), recherche, badges, warnings,
 * contrôles droite (calques + terrain, zoom, boussole), fiche spécimen.
 */
(function () {
  'use strict';

  /** Icônes Lucide en SVG inline (24×24, tracé 2) */
  var IC = {
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    layers: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    sprout: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2.8.9-4.3 3.6-3.8 6.3"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.7-.6 5.1-1.4-1.1 2.1-2.2 3.6-3.3 4.6"/></svg>',
    calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    cloudSun: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 15.948a6 6 0 1 1-7.799-7.8"/><path d="M19.364 18.364a9 9 0 0 0-12.728-12.728"/></svg>',
    bookOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mapPinned: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/></svg>',
    circleDot: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>',
    pentagon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    minus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>'
  };

  function initTheme() {
    var mql = window.matchMedia('(prefers-color-scheme: light)');
    function effectiveTheme() {
      var o = localStorage.getItem('terrain_color_mode');
      if (o === 'light' || o === 'dark') return o;
      return mql.matches ? 'light' : 'dark';
    }
    function apply() {
      document.documentElement.setAttribute('data-theme', effectiveTheme());
    }
    apply();
    mql.addEventListener('change', function () {
      var o = localStorage.getItem('terrain_color_mode');
      if (o !== 'light' && o !== 'dark') apply();
    });
    window.terrainApplyTheme = apply;
  }
  initTheme();

  var GARDEN_DATA = window.GARDEN_DATA || {};
  var terrainStats = GARDEN_DATA.terrain_stats || null;
  var specimens = [];
  var warnings = { overdue_reminders: [], missing_pollinators: [], phenology_alerts: [] };
  var selectedSpecimenId = null;
  var panelRoot, panelContentRoot, panelDetailEl, popupEl, toolbarEl, legendEl, windRoseEl, overlayEl;
  var panelMode = 'closed'; /* 'closed' | 'open' | 'detail' */
  var currentTab = 'jardin';
  var RECENTS_KEY = 'terrain_recents';
  var RECENTS_MAX = 10;

  function byId(id) { return document.getElementById(id); }

  function addToRecents(s) {
    if (!s || s.id == null) return;
    try {
      var raw = localStorage.getItem(RECENTS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      list = list.filter(function (r) { return r.id !== s.id; });
      list.unshift({ id: s.id, nom: s.nom || ('Spécimen ' + s.id) });
      list = list.slice(0, RECENTS_MAX);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
      refreshAccueilRecents();
    } catch (e) {}
  }

  function refreshAccueilRecents() {
    var elRecents = byId('terrain-accueil-recents-list');
    if (!elRecents) return;
    try {
      var raw = localStorage.getItem(RECENTS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (list.length === 0) {
        elRecents.innerHTML = '';
        elRecents.textContent = 'Aucun spécimen récent';
        return;
      }
      elRecents.innerHTML = list.map(function (r) {
        return '<div class="terrain-accueil-item" data-specimen-id="' + r.id + '">' + (r.nom || 'Spécimen ' + r.id) + '</div>';
      }).join('');
      elRecents.querySelectorAll('.terrain-accueil-item').forEach(function (item) {
        item.addEventListener('click', function () {
          var id = item.dataset.specimenId;
          var s = specimens.filter(function (sp) { return String(sp.id) === String(id); })[0];
          if (s) {
            selectedSpecimenId = s.id;
            if (window.terrainCesiumFlyToSpecimen) window.terrainCesiumFlyToSpecimen({ lng: s.longitude, lat: s.latitude, specimenId: s.id });
            openSpecimenOverlay(s);
          }
        });
      });
    } catch (e) {
      elRecents.textContent = 'Aucun spécimen récent';
    }
  }

  function getCsrfToken() {
    var m = document.cookie.match(/\bcsrftoken=([^;]*)/);
    return m ? m[1] : '';
  }

  function el(tag, cls, content) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (content) e.innerHTML = content;
    return e;
  }

  function renderTopBar() {
    /* Barre supérieure retirée : titre, recherche et compte sont dans le panneau latéral. */
  }

  function wireGardenDropdown(gardenBtn, gardenDropdown, gardenId) {
    if (!gardenBtn || !gardenDropdown) return;
    function closeGardenDropdown() {
      gardenDropdown.setAttribute('aria-hidden', 'true');
      gardenDropdown.classList.remove('terrain-topbar-garden-dropdown-visible');
      document.removeEventListener('click', closeOnClickOutside);
    }
    function closeOnClickOutside(e) {
      if (gardenDropdown.contains(e.target) || gardenBtn.contains(e.target)) return;
      closeGardenDropdown();
    }
    gardenBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = gardenDropdown.classList.contains('terrain-topbar-garden-dropdown-visible');
      if (isOpen) {
        closeGardenDropdown();
        return;
      }
      if (gardenDropdown.dataset.loaded !== '1') {
        gardenDropdown.innerHTML = '<span class="terrain-topbar-garden-dropdown-loading">Chargement…</span>';
        gardenDropdown.dataset.loaded = '1';
        loadGardensForDropdown(gardenDropdown, gardenId, function () {
          gardenDropdown.classList.add('terrain-topbar-garden-dropdown-visible');
          gardenDropdown.setAttribute('aria-hidden', 'false');
          document.addEventListener('click', closeOnClickOutside);
        });
      } else {
        gardenDropdown.classList.add('terrain-topbar-garden-dropdown-visible');
        gardenDropdown.setAttribute('aria-hidden', 'false');
        document.addEventListener('click', closeOnClickOutside);
      }
    });
  }

  function wireGardenerButton(btn) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (window.postToRN) {
        window.postToRN({ type: 'OPEN_SETTINGS', payload: {} });
      } else {
        window.location.href = '/choose-garden/';
      }
    });
  }

  function loadGardensForDropdown(containerEl, currentGardenId, onDone) {
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + 'gardens/');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.withCredentials = true;
    xhr.onload = function () {
      containerEl.innerHTML = '';
      if (xhr.status !== 200) {
        containerEl.innerHTML = '<span class="terrain-topbar-garden-dropdown-error">Erreur</span>';
        if (onDone) onDone();
        return;
      }
      try {
        var list = JSON.parse(xhr.responseText);
        if (Array.isArray(list) && list.length > 0) {
          list.forEach(function (g) {
            var item = document.createElement('div');
            item.className = 'terrain-topbar-garden-dropdown-item' + (String(g.id) === String(currentGardenId) ? ' terrain-topbar-garden-dropdown-item-current' : '');
            item.setAttribute('role', 'option');
            item.textContent = g.nom || 'Jardin ' + g.id;
            item.dataset.gardenId = g.id;
            item.addEventListener('click', function () {
              var val = this.dataset.gardenId;
              if (val && val !== currentGardenId) {
                var base = window.location.pathname;
                var params = new URLSearchParams(window.location.search);
                params.set('garden_id', val);
                window.location.href = base + '?' + params.toString();
              }
            });
            containerEl.appendChild(item);
          });
        } else {
          containerEl.innerHTML = '<span class="terrain-topbar-garden-dropdown-empty">Aucun jardin</span>';
        }
      } catch (e) {
        containerEl.innerHTML = '<span class="terrain-topbar-garden-dropdown-error">Erreur</span>';
      }
      if (onDone) onDone();
    };
    xhr.onerror = function () {
      containerEl.innerHTML = '<span class="terrain-topbar-garden-dropdown-error">Erreur</span>';
      if (onDone) onDone();
    };
    xhr.send();
  }

  function loadGardensForSelect(selectEl) {
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + 'gardens/');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.withCredentials = true;
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      try {
        var list = JSON.parse(xhr.responseText);
        if (Array.isArray(list)) {
          list.forEach(function (g) {
            if (String(g.id) === String(GARDEN_DATA.id)) return;
            var opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.nom || 'Jardin ' + g.id;
            selectEl.appendChild(opt);
          });
        }
      } catch (e) {}
    };
    xhr.send();
  }

  function renderBadges(hasLidar, hasDrone, gcpCount) {
    var wrap = el('div', 'terrain-badges');
    var isLidarMode = hasLidar && typeof window !== 'undefined' && window.location && window.location.search.indexOf('terrain=lidar') !== -1;
    if (hasLidar) {
      if (isLidarMode) {
        wrap.appendChild(el('span', 'terrain-badge lidar', 'LiDAR 31G16'));
        var worldLink = el('a', 'terrain-badge terrain-badge-link');
        var p = new URLSearchParams(window.location.search);
        p.delete('terrain');
        worldLink.href = window.location.pathname + (p.toString() ? '?' + p.toString() : '');
        worldLink.textContent = 'Vue mondiale';
        worldLink.title = 'Passer au relief mondial (stable)';
        worldLink.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.terrainCesiumSetTerrainWorld) window.terrainCesiumSetTerrainWorld();
        });
        wrap.appendChild(worldLink);
      } else {
        wrap.appendChild(el('span', 'terrain-badge', 'Vue mondiale'));
        var lidarLink = el('a', 'terrain-badge terrain-badge-link');
        var p2 = new URLSearchParams(window.location.search);
        p2.set('terrain', 'lidar');
        lidarLink.href = window.location.pathname + '?' + p2.toString();
        lidarLink.textContent = '3D LiDAR';
        lidarLink.title = 'Relief LiDAR (zone limitée)';
        lidarLink.addEventListener('click', function (e) {
          e.preventDefault();
          if (window.terrainCesiumSetTerrainLidar) window.terrainCesiumSetTerrainLidar();
        });
        wrap.appendChild(lidarLink);
      }
    }
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
      var d = el('div', 'terrain-warning ' + w.type);
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

  function switchTab(tabId) {
    currentTab = tabId;
    if (panelMode === 'detail') {
      setPanelMode('open');
      if (panelDetailEl) panelDetailEl.innerHTML = '';
      var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
      if (detailTitleEl) detailTitleEl.textContent = 'Détail';
    }
    if (!panelContentRoot) return;
    panelContentRoot.querySelectorAll('.terrain-panel-tab-content').forEach(function (block) {
      block.style.display = block.id === 'terrain-content-' + tabId ? 'block' : 'none';
    });
    panelRoot.querySelectorAll('.terrain-panel-tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    if (tabId === 'accueil') loadAccueilContent();
    if (tabId === 'recherche') {
      var si = byId('terrain-search-input');
      if (si) setTimeout(function () { si.focus(); }, 50);
    }
    if (tabId === 'vue') loadVueZonesContent();
    if (tabId === 'partenaires') loadPartnersContent();
    if (tabId === 'rappels') loadRappelsContent();
    if (tabId === 'admin') loadAdminContent();
    if (tabId === 'meteo') loadMeteoContent();
  }

  function setPanelMode(mode) {
    panelMode = mode;
    if (!panelRoot) return;
    panelRoot.classList.remove('terrain-panel-closed', 'terrain-panel-open', 'terrain-panel-detail-visible');
    panelRoot.classList.add('terrain-panel-' + (mode === 'closed' ? 'closed' : 'open'));
    if (mode === 'detail') panelRoot.classList.add('terrain-panel-detail-visible');
    document.body.classList.toggle('terrain-panel-collapsed', mode === 'closed');
    document.body.classList.toggle('terrain-panel-detail-visible', mode === 'detail');
    var toggleBtn = byId('terrain-panel-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = mode === 'closed' ? '›' : '‹';
      toggleBtn.title = mode === 'closed' ? 'Développer le panneau' : 'Replier le panneau';
    }
  }

  function renderPanel() {
    panelRoot = el('div', 'terrain-panel terrain-panel-closed');
    panelRoot.innerHTML =
      '<div class="terrain-panel-icons">' +
      '<div class="terrain-panel-header">' +
      '<span class="terrain-panel-logo" aria-hidden="true">Jardin <strong>bIOT</strong></span>' +
      '<button type="button" class="terrain-panel-toggle" id="terrain-panel-toggle" title="Replier le panneau">‹</button>' +
      '</div>' +
      '<nav class="terrain-panel-tabs" role="tablist">' +
      '<button type="button" class="terrain-panel-tab" data-tab="accueil" title="Accueil"><span class="terrain-panel-tab-icon">' + IC.home + '</span><span class="terrain-panel-tab-label">Home</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="recherche" title="Recherche"><span class="terrain-panel-tab-icon">' + IC.search + '</span><span class="terrain-panel-tab-label">Recherche</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="vue" title="Calques, dessin, soleil"><span class="terrain-panel-tab-icon">' + IC.layers + '</span><span class="terrain-panel-tab-label">Vue</span></button>' +
      '<button type="button" class="terrain-panel-tab active" data-tab="jardin" title="Spécimens"><span class="terrain-panel-tab-icon">' + IC.sprout + '</span><span class="terrain-panel-tab-label">Spécimens</span></button>' +
      '<div class="terrain-panel-nav-sep" role="presentation"></div>' +
      '<button type="button" class="terrain-panel-tab" data-tab="rappels" title="Calendrier"><span class="terrain-panel-tab-icon">' + IC.calendar + '</span><span class="terrain-panel-tab-label">Calendrier</span></button>' +
      '<div class="terrain-panel-nav-sep" role="presentation"></div>' +
      '<button type="button" class="terrain-panel-tab" data-tab="admin" title="Configuration"><span class="terrain-panel-tab-icon">' + IC.settings + '</span><span class="terrain-panel-tab-label">Config</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="meteo" title="Météo"><span class="terrain-panel-tab-icon">' + IC.cloudSun + '</span><span class="terrain-panel-tab-label">Météo</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="partenaires" title="Radix"><span class="terrain-panel-tab-icon">' + IC.bookOpen + '</span><span class="terrain-panel-tab-label">Radix</span></button>' +
      '</nav>' +
      '<div class="terrain-panel-sidebar-footer">' +
      '<button type="button" class="terrain-sidebar-user" id="terrain-sidebar-gardener" title="Compte / paramètres">' + IC.user + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="terrain-panel-body">' +
      '<div class="terrain-panel-content" id="terrain-panel-content"></div>' +
      '</div>' +
      '<div class="terrain-panel-detail" id="terrain-panel-detail">' +
      '<div class="terrain-panel-detail-header">' +
      '<span class="terrain-panel-detail-title">Détail</span>' +
      '<button type="button" class="terrain-panel-detail-close" id="terrain-panel-detail-close" title="Fermer">×</button>' +
      '</div>' +
      '<div class="terrain-panel-detail-body" id="terrain-panel-detail-body"></div>' +
      '</div>';
    document.body.appendChild(panelRoot);
    panelDetailEl = byId('terrain-panel-detail-body');
    setPanelMode('closed');

    panelContentRoot = byId('terrain-panel-content');
    if (!panelContentRoot) return;

    var gardenIdStr = GARDEN_DATA.id ? String(GARDEN_DATA.id) : '';
    var contentAccueil =
      '<div id="terrain-content-accueil" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-home-header">' +
      '<h1 class="terrain-home-title" id="terrain-home-garden-name">' + esc(GARDEN_DATA.nom || 'Jardin') + '</h1>' +
      '<p class="terrain-home-address" id="terrain-home-address">' + esc((GARDEN_DATA.adresse || '') + (GARDEN_DATA.zone_rusticite ? ' · Zone ' + GARDEN_DATA.zone_rusticite : '')) + '</p>' +
      (gardenIdStr
        ? '<div class="terrain-home-garden-row">' +
          '<button type="button" class="terrain-panel-btn terrain-home-garden-btn" id="terrain-home-garden-btn" title="Choisir un autre jardin">Changer de jardin</button>' +
          '<div class="terrain-topbar-garden-dropdown" id="terrain-home-garden-dropdown" role="listbox" aria-hidden="true"></div></div>'
        : '') +
      '</div>' +
      '<div class="terrain-accueil-section"><div class="terrain-accueil-title">Favoris</div><div id="terrain-accueil-favoris-list" class="terrain-accueil-list">Chargement…</div></div>' +
      '<div class="terrain-accueil-section"><div class="terrain-accueil-title">Récents</div><div id="terrain-accueil-recents-list" class="terrain-accueil-list">Chargement…</div></div>' +
      '<div class="terrain-accueil-section"><div class="terrain-accueil-title">Derniers événements</div><div id="terrain-accueil-events-list" class="terrain-accueil-list">Chargement…</div></div>' +
      '</div>';

    var contentRecherche =
      '<div id="terrain-content-recherche" class="terrain-panel-tab-content" style="display:none">' +
      '<label class="terrain-search-label" for="terrain-search-input">Rechercher dans le jardin</label>' +
      '<div class="terrain-search-wrap">' +
      '<span class="terrain-search-icon" aria-hidden="true">' + IC.search + '</span>' +
      '<input type="search" class="terrain-search-input" id="terrain-search-input" placeholder="Nom, espèce…" autocomplete="off"/>' +
      '</div>' +
      '<p class="terrain-search-hint">Les résultats filtrent la liste Spécimens et les marqueurs sur la carte.</p>' +
      '</div>';

    var contentVue =
      '<div id="terrain-content-vue" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-vue-section"><label>Affichage soleil</label>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-vue-btn-sun" title="Rayons soleil + ombre">Soleil</button>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-vue-btn-play-sun" title="Journée solaire animée">Journée</button></div>' +
      '<div class="terrain-vue-sun-box terrain-vue-mes-zones" id="terrain-vue-sun-box" style="display:none;">' +
      '<div class="terrain-vue-mes-zones-title">&lt; Soleil &gt;</div>' +
      '<label class="terrain-vue-sun-slider-label">Heure du jour</label>' +
      '<div class="terrain-vue-sun-slider-row">' +
      '<input type="range" id="terrain-vue-sun-time" class="terrain-vue-sun-slider" min="0" max="24" step="0.5" value="12"/>' +
      '<span id="terrain-vue-sun-time-value" class="terrain-vue-opacity-value">12:00</span></div>' +
      '<div class="terrain-vue-sun-times" id="terrain-vue-sun-times"></div></div>' +
      '<div class="terrain-vue-section"><label>Dessin</label>' +
      '<div class="terrain-vue-buttons-row">' +
      '<button type="button" class="terrain-panel-btn" id="terrain-vue-btn-new-zone" ' + (GARDEN_DATA.id ? '' : ' disabled') + ' title="Nouvelle zone (polygone)">Nouvelle zone</button>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-vue-btn-toggle-zones" title="Afficher ou masquer les zones du jardin">Zones</button>' +
      '</div></div>' +
      '<div class="terrain-vue-section"><label>Opacité du fond des zones</label>' +
      '<input type="range" id="terrain-vue-zone-opacity" min="0.05" max="1" step="0.05" value="0.3" class="terrain-vue-opacity-slider"/>' +
      '<span id="terrain-vue-zone-opacity-value" class="terrain-vue-opacity-value">30%</span></div>' +
      '<div class="terrain-vue-section terrain-vue-mes-zones"><div class="terrain-vue-mes-zones-title">&lt; Mes Zones &gt;</div>' +
      '<div class="terrain-vue-zones-list" id="terrain-vue-zones-list">Chargement…</div></div>' +
      '</div>';

    var contentJardin =
      '<div id="terrain-content-jardin" class="terrain-panel-tab-content">' +
      '<div class="terrain-panel-filters" id="terrain-filters"></div>' +
      '<div class="terrain-panel-list" id="terrain-specimen-list"></div>' +
      '<div class="terrain-panel-footer" id="terrain-panel-footer">Total: 0 · Établis: 0 · Planifiés: 0</div>' +
      '</div>';

    var contentRappels =
      '<div id="terrain-content-rappels" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-rappels-list" id="terrain-rappels-list">Chargement…</div>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-rappels-gantt">Vue Gantt</button>' +
      '</div>';

    var contentAdmin =
      '<div id="terrain-content-admin" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-admin-field"><label for="terrain-admin-theme">Apparence</label>' +
      '<select id="terrain-admin-theme" class="terrain-admin-select" title="Thème d\'affichage">' +
      '<option value="auto">Automatique (système)</option>' +
      '<option value="light">Clair</option>' +
      '<option value="dark">Sombre</option>' +
      '</select></div>' +
      '<div class="terrain-admin-field"><label>Vue 3D</label>' +
      '<div class="terrain-admin-buttons-row">' +
      '<button type="button" class="terrain-panel-btn" id="terrain-admin-capture-view" title="Enregistrer la vue actuelle comme vue par défaut (lancement et accueil)">Capturer la vue actuelle</button>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-admin-standard-view" title="Revenir à la vue terrain complète (dessus)">Vue standard</button>' +
      '</div>' +
      '<p class="terrain-admin-hint">La vue capturée sera utilisée au lancement et pour le contrôle d’accueil. « Vue standard » recentre le terrain en vue du dessus.</p></div>' +
      '<div class="terrain-admin-field"><label>Jardin</label><span id="terrain-admin-nom">' + (GARDEN_DATA.nom || '') + '</span></div>' +
      '<div class="terrain-admin-field"><label>Adresse</label><span id="terrain-admin-adresse">' + (GARDEN_DATA.adresse || '—') + '</span></div>' +
      '<div class="terrain-admin-field"><label>Unité</label><span id="terrain-admin-unite">' + (GARDEN_DATA.distance_unit === 'ft' ? 'Pieds' : 'Mètres') + '</span> <em>(défaut jardin)</em></div>' +
      '<div class="terrain-admin-field"><label>Cesium</label><span id="terrain-admin-cesium">Token et asset en lecture seule (config serveur)</span></div>' +
      '<a href="/admin/" target="_blank" rel="noopener" class="terrain-panel-btn">Ouvrir l’administration</a>' +
      '</div>';

    var contentMeteo =
      '<div id="terrain-content-meteo" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-meteo-placeholder" id="terrain-meteo-content">Historique et prévisions à venir.</div>' +
      '</div>';

    var contentPartenaires =
      '<div id="terrain-content-partenaires" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-partenaires-list" id="terrain-partenaires-list">Chargement…</div>' +
      '</div>';

    panelContentRoot.innerHTML = contentAccueil + contentRecherche + contentVue + contentJardin + contentRappels + contentAdmin + contentMeteo + contentPartenaires;

    wireGardenDropdown(byId('terrain-home-garden-btn'), byId('terrain-home-garden-dropdown'), gardenIdStr);
    wireGardenerButton(byId('terrain-sidebar-gardener'));

    var themeSel = byId('terrain-admin-theme');
    if (themeSel) {
      var tm = localStorage.getItem('terrain_color_mode');
      themeSel.value = (tm === 'light' || tm === 'dark') ? tm : 'auto';
      themeSel.addEventListener('change', function () {
        if (themeSel.value === 'auto') {
          localStorage.removeItem('terrain_color_mode');
        } else {
          localStorage.setItem('terrain_color_mode', themeSel.value);
        }
        if (typeof window.terrainApplyTheme === 'function') window.terrainApplyTheme();
      });
    }

    var captureViewBtn = byId('terrain-admin-capture-view');
    if (captureViewBtn) {
      captureViewBtn.addEventListener('click', function () {
        if (window.terrainCesiumCaptureCurrentViewAsDefault && window.terrainCesiumCaptureCurrentViewAsDefault()) {
          captureViewBtn.textContent = '✓ Vue enregistrée';
          setTimeout(function () { captureViewBtn.textContent = 'Capturer la vue actuelle'; }, 2000);
        }
      });
    }
    var standardViewBtn = byId('terrain-admin-standard-view');
    if (standardViewBtn) {
      standardViewBtn.addEventListener('click', function () {
        if (window.terrainCesiumFlyStandardView) window.terrainCesiumFlyStandardView();
      });
    }

    var searchInput = byId('terrain-search-input');
    if (searchInput) searchInput.addEventListener('input', debounce(applySearchAndFilters, 300));

    panelRoot.querySelectorAll('.terrain-panel-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (panelMode === 'closed') setPanelMode('open');
        switchTab(btn.dataset.tab);
      });
    });

    byId('terrain-panel-toggle').addEventListener('click', function () {
      if (panelMode === 'closed') {
        setPanelMode('open');
      } else if (panelMode === 'detail') {
        setPanelMode('open');
        if (panelDetailEl) panelDetailEl.innerHTML = '';
      } else {
        setPanelMode('closed');
      }
    });

    var detailCloseBtn = byId('terrain-panel-detail-close');
    if (detailCloseBtn) {
      detailCloseBtn.addEventListener('click', function () {
        setPanelMode('open');
        if (panelDetailEl) panelDetailEl.innerHTML = '';
        var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
        if (detailTitleEl) detailTitleEl.textContent = 'Détail';
      });
    }

    var sunBtn = byId('terrain-vue-btn-sun');
    var sunBox = byId('terrain-vue-sun-box');
    if (sunBtn) {
      sunBtn.addEventListener('click', function () {
        if (window.terrainCesiumToggleSun) {
          var enabled = window.terrainCesiumToggleSun();
          sunBtn.classList.toggle('active', !!enabled);
          if (sunBox) sunBox.style.display = enabled ? '' : 'none';
          if (enabled) refreshSunBox();
        }
      });
    }
    var playSunBtn = byId('terrain-vue-btn-play-sun');
    if (playSunBtn) {
      playSunBtn.addEventListener('click', function () {
        if (window.terrainCesiumPlaySunDay) window.terrainCesiumPlaySunDay();
        if (sunBtn) sunBtn.classList.add('active');
        if (sunBox) sunBox.style.display = '';
        refreshSunBox();
      });
    }

    function formatTimeHhmm(d) {
      if (!d || !(d instanceof Date)) return '—';
      var h = d.getHours();
      var m = d.getMinutes();
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }

    function refreshSunBox() {
      var timesEl = byId('terrain-vue-sun-times');
      var timeInput = byId('terrain-vue-sun-time');
      var timeValueEl = byId('terrain-vue-sun-time-value');
      if (!timesEl || typeof window.SunCalc === 'undefined') return;
      var loc = typeof window.terrainCesiumGetSunLocation === 'function' ? window.terrainCesiumGetSunLocation() : { lat: 45.89, lng: -74.27 };
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var sunTimes;
      try {
        sunTimes = window.SunCalc.getTimes(today, loc.lat, loc.lng);
      } catch (e) {
        timesEl.innerHTML = '<p class="terrain-vue-zones-empty">Calcul indisponible.</p>';
        return;
      }
      var dawn = sunTimes.dawn;
      var sunrise = sunTimes.sunrise;
      var solarNoon = sunTimes.solarNoon;
      var sunset = sunTimes.sunset;
      var dusk = sunTimes.dusk;
      var dayDurationMs = sunset && sunrise ? (sunset.getTime() - sunrise.getTime()) : 0;
      var dayDurationStr = dayDurationMs ? Math.floor(dayDurationMs / 3600000) + ' h ' + Math.round((dayDurationMs % 3600000) / 60000) + ' min' : '—';
      timesEl.innerHTML =
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Aube</span><span class="terrain-vue-sun-time-val">' + formatTimeHhmm(dawn) + '</span></div>' +
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Lever</span><span class="terrain-vue-sun-time-val">' + formatTimeHhmm(sunrise) + '</span></div>' +
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Culmination</span><span class="terrain-vue-sun-time-val">' + formatTimeHhmm(solarNoon) + '</span></div>' +
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Coucher</span><span class="terrain-vue-sun-time-val">' + formatTimeHhmm(sunset) + '</span></div>' +
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Crépuscule</span><span class="terrain-vue-sun-time-val">' + formatTimeHhmm(dusk) + '</span></div>' +
        '<div class="terrain-vue-sun-time-row"><span class="terrain-vue-sun-time-label">Durée du jour</span><span class="terrain-vue-sun-time-val">' + dayDurationStr + '</span></div>';
      if (timeInput && timeValueEl) {
        var currentHour = 12;
        if (window.terrainCesiumViewer && window.terrainCesiumViewer.clock && window.terrainCesiumViewer.clock.currentTime) {
          var jd = window.terrainCesiumViewer.clock.currentTime;
          var cesiumDate = window.Cesium && window.Cesium.JulianDate ? window.Cesium.JulianDate.toDate(jd) : null;
          if (cesiumDate) currentHour = cesiumDate.getHours() + cesiumDate.getMinutes() / 60;
        }
        timeInput.value = Math.min(24, Math.max(0, currentHour));
        var h = Math.floor(Number(timeInput.value));
        var m = Math.round((Number(timeInput.value) - h) * 60);
        timeValueEl.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      }
    }

    var sunTimeSlider = byId('terrain-vue-sun-time');
    var sunTimeValueEl = byId('terrain-vue-sun-time-value');
    if (sunTimeSlider) {
      sunTimeSlider.addEventListener('input', function () {
        var v = parseFloat(sunTimeSlider.value);
        var today = new Date();
        var h = Math.floor(v);
        var m = Math.round((v - h) * 60);
        today.setHours(h, m, 0, 0);
        if (window.terrainCesiumSetSunTime) window.terrainCesiumSetSunTime(today);
        if (sunTimeValueEl) sunTimeValueEl.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
      });
    }
    var newZoneBtn = byId('terrain-vue-btn-new-zone');
    if (newZoneBtn) {
      newZoneBtn.addEventListener('click', function () {
        if (window.terrainCesiumStartDrawZone) window.terrainCesiumStartDrawZone();
      });
    }
    var toggleZonesBtn = byId('terrain-vue-btn-toggle-zones');
    if (toggleZonesBtn) {
      function updateZonesButtonLabel() {
        var visible = typeof window.terrainCesiumZonesVisible === 'function' && window.terrainCesiumZonesVisible();
        toggleZonesBtn.textContent = visible ? 'Masquer les zones' : 'Afficher les zones';
        toggleZonesBtn.classList.toggle('active', visible);
      }
      updateZonesButtonLabel();
      toggleZonesBtn.addEventListener('click', function () {
        if (typeof console !== 'undefined' && console.log) console.log('[terrain_ui] Clic bouton Zones (Masquer/Afficher)');
        if (typeof window.terrainCesiumSetZonesVisible === 'function') {
          var next = !(typeof window.terrainCesiumZonesVisible === 'function' && window.terrainCesiumZonesVisible());
          if (typeof console !== 'undefined' && console.log) console.log('[terrain_ui] setZonesVisible(', next, ')');
          window.terrainCesiumSetZonesVisible(next);
          updateZonesButtonLabel();
          if (typeof window.refreshTerrainLayerPills === 'function') window.refreshTerrainLayerPills();
          if (currentTab === 'vue') refreshVueZonesList();
        } else {
          if (typeof console !== 'undefined' && console.warn) console.warn('[terrain_ui] terrainCesiumSetZonesVisible non disponible');
        }
      });
    }

    var opacitySlider = byId('terrain-vue-zone-opacity');
    var opacityValueEl = byId('terrain-vue-zone-opacity-value');
    if (opacitySlider) {
      opacitySlider.addEventListener('input', function () {
        var val = parseFloat(opacitySlider.value);
        if (typeof window.terrainCesiumSetZoneOpacity === 'function') window.terrainCesiumSetZoneOpacity(val);
        if (opacityValueEl) opacityValueEl.textContent = Math.round(val * 100) + '%';
      });
      var initialOpacity = (typeof window.terrainCesiumGetZoneOpacity === 'function' && window.terrainCesiumGetZoneOpacity()) || 0.3;
      opacitySlider.value = initialOpacity;
      if (opacityValueEl) opacityValueEl.textContent = Math.round(initialOpacity * 100) + '%';
    }

    var ganttBtn = byId('terrain-rappels-gantt');
    if (ganttBtn) ganttBtn.addEventListener('click', function () {
      if (window.terrainOpenGantt) window.terrainOpenGantt(); else alert('Vue Gantt à venir.');
    });

    refreshAccueilRecents();
    switchTab('jardin');
  }

  function loadPartnersContent() {
    var listEl = byId('terrain-partenaires-list');
    if (!listEl || listEl.dataset.loaded === '1') return;
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    listEl.textContent = 'Chargement…';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + 'partners/');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.withCredentials = true;
    xhr.onload = function () {
      listEl.dataset.loaded = '1';
      if (xhr.status !== 200) { listEl.textContent = 'Erreur chargement.'; return; }
      try {
        var list = JSON.parse(xhr.responseText);
        if (!Array.isArray(list) || list.length === 0) { listEl.innerHTML = '<p>Aucun partenaire.</p>'; return; }
        listEl.innerHTML = list.map(function (p) {
          return '<a class="terrain-partner-link" href="' + (p.url || '#') + '" target="_blank" rel="noopener">' + (p.nom || '') + '</a>';
        }).join('');
      } catch (e) { listEl.textContent = 'Erreur.'; }
    };
    xhr.onerror = function () { listEl.dataset.loaded = '1'; listEl.textContent = 'Erreur réseau.'; };
    xhr.send();
  }

  var vueZonesListCache = [];

  window.addEventListener('terrain-zone-added', function (e) {
    var zone = e.detail && e.detail.zone;
    if (!zone || !zone.id) return;
    if (!vueZonesListCache.some(function (z) { return z.id === zone.id; })) {
      vueZonesListCache.push(zone);
      refreshVueZonesList();
    }
  });

  function formatSurface(surface_m2) {
    if (surface_m2 == null || isNaN(surface_m2)) return '—';
    if (surface_m2 >= 10000) return (surface_m2 / 10000).toFixed(2) + ' ha';
    if (surface_m2 >= 1) return surface_m2.toFixed(1) + ' m²';
    return (surface_m2 * 10000).toFixed(0) + ' cm²';
  }

  function refreshVueZonesList() {
    var listEl = byId('terrain-vue-zones-list');
    if (!listEl) return;
    var visible = typeof window.terrainCesiumZonesVisible === 'function' && window.terrainCesiumZonesVisible();
    listEl.innerHTML = vueZonesListCache.map(function (z) {
      var zoneVisible = typeof window.terrainCesiumGetZoneVisible === 'function' ? window.terrainCesiumGetZoneVisible(z.id) : true;
      return '<div class="terrain-vue-zone-row" data-zone-id="' + z.id + '">' +
        '<button type="button" class="terrain-vue-zone-eye ' + (zoneVisible ? 'on' : 'off') + '" title="' + (zoneVisible ? 'Masquer' : 'Afficher') + ' la zone">' + (zoneVisible ? '👁' : '👁‍🗨') + '</button>' +
        '<span class="terrain-vue-zone-name">' + (z.nom || 'Sans nom') + '</span>' +
        '<button type="button" class="terrain-vue-zone-edit" title="Modifier la zone">✏️</button>' +
        '<span class="terrain-vue-zone-surface">' + formatSurface(z.surface_m2) + '</span>' +
        '</div>';
    }).join('');
    listEl.querySelectorAll('.terrain-vue-zone-eye').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var row = btn.closest('.terrain-vue-zone-row');
        var id = row && row.getAttribute('data-zone-id');
        if (id === null || id === undefined) return;
        id = parseInt(id, 10);
        if (isNaN(id)) return;
        var next = !btn.classList.contains('on');
        if (typeof console !== 'undefined' && console.log) console.log('[terrain_ui] Clic œil zone id=', id, ' afficher=', next);
        if (typeof window.terrainCesiumSetZoneVisible === 'function') {
          window.terrainCesiumSetZoneVisible(id, next);
        } else {
          if (typeof console !== 'undefined' && console.warn) console.warn('[terrain_ui] terrainCesiumSetZoneVisible non disponible');
        }
        btn.classList.toggle('on', next);
        btn.classList.toggle('off', !next);
        btn.textContent = next ? '👁' : '👁‍🗨';
        btn.title = next ? 'Masquer la zone' : 'Afficher la zone';
      });
    });
    listEl.querySelectorAll('.terrain-vue-zone-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.terrain-vue-zone-row');
        var id = row && parseInt(row.dataset.zoneId, 10);
        if (isNaN(id)) return;
        var z = vueZonesListCache.filter(function (x) { return x.id === id; })[0];
        if (z) openZoneEditPopup(z);
      });
    });
  }

  var zoneEditColorOptions = [
    { value: '#3d5c2e', label: 'Vert foncé' },
    { value: '#5a8a3f', label: 'Vert' },
    { value: '#2a6e8a', label: 'Bleu' },
    { value: '#6b7280', label: 'Gris' },
    { value: '#c2410c', label: 'Rouge' },
    { value: '#dc2626', label: 'Rouge vif' },
    { value: '#ea580c', label: 'Orange' },
    { value: '#c4832a', label: 'Orange doré' },
    { value: '#f97316', label: 'Orange clair' },
    { value: '#e11d48', label: 'Rose' },
    { value: '#ec4899', label: 'Rose vif' },
    { value: '#f9a8d4', label: 'Rose clair' },
    { value: 'hachure', label: 'Hachuré' }
  ];

  function openZoneEditPopup(zone) {
    var types = [
      ['stationnement', 'Stationnement'],
      ['culture', 'Culture'],
      ['boise', 'Boisé'],
      ['eau', 'Eau'],
      ['batiment', 'Bâtiment'],
      ['autre', 'Autre']
    ];
    var overlay = document.getElementById('terrain-zone-edit-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'terrain-zone-edit-overlay';
      overlay.className = 'terrain-zone-edit-overlay';
      overlay.innerHTML =
        '<div class="terrain-zone-edit-backdrop"></div>' +
        '<div class="terrain-zone-edit-panel">' +
        '<div class="terrain-zone-edit-title">Modifier la zone</div>' +
        '<label>Nom</label><input type="text" id="terrain-zone-edit-nom"/>' +
        '<label>Type</label><select id="terrain-zone-edit-type"></select>' +
        '<div class="terrain-zone-edit-hauteur-wrap" style="display:none;"><label>Hauteur du bâtiment (m)</label><input type="number" id="terrain-zone-edit-hauteur" min="1" max="50" step="0.5" placeholder="3"/></div>' +
        '<label>Couleur</label><div class="terrain-zone-edit-colors" id="terrain-zone-edit-colors"></div>' +
        '<div class="terrain-zone-edit-actions">' +
        '<button type="button" id="terrain-zone-edit-delete" class="terrain-zone-edit-delete" title="Supprimer la zone">🗑️</button>' +
        '<span class="terrain-zone-edit-actions-right">' +
        '<button type="button" id="terrain-zone-edit-cancel">Annuler</button>' +
        '<button type="button" id="terrain-zone-edit-save">Enregistrer</button></span></div></div>';
      document.body.appendChild(overlay);
      var typeSelect = overlay.querySelector('#terrain-zone-edit-type');
      var hauteurWrapEdit = overlay.querySelector('.terrain-zone-edit-hauteur-wrap');
      types.forEach(function (t) {
        var opt = document.createElement('option');
        opt.value = t[0];
        opt.textContent = t[1];
        typeSelect.appendChild(opt);
      });
      if (typeSelect && hauteurWrapEdit) {
        typeSelect.addEventListener('change', function () {
          hauteurWrapEdit.style.display = (typeSelect.value === 'batiment') ? 'block' : 'none';
        });
      }
      var colorsEl = overlay.querySelector('#terrain-zone-edit-colors');
      zoneEditColorOptions.forEach(function (o) {
        var swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'terrain-zone-edit-swatch';
        swatch.dataset.value = o.value;
        swatch.title = o.label;
        if (o.value === 'hachure') {
          swatch.classList.add('terrain-zone-edit-swatch-hachure');
        } else {
          swatch.style.backgroundColor = o.value;
        }
        swatch.addEventListener('click', function () {
          overlay.querySelectorAll('.terrain-zone-edit-swatch').forEach(function (s) { s.classList.remove('selected'); });
          swatch.classList.add('selected');
        });
        colorsEl.appendChild(swatch);
      });
      overlay.querySelector('.terrain-zone-edit-backdrop').addEventListener('click', function () { overlay.style.display = 'none'; });
      overlay.querySelector('#terrain-zone-edit-cancel').addEventListener('click', function () { overlay.style.display = 'none'; });
      overlay.querySelector('#terrain-zone-edit-save').addEventListener('click', function () {
        var id = overlay.dataset.zoneId;
        if (!id) return;
        var nom = overlay.querySelector('#terrain-zone-edit-nom').value.trim() || 'Sans nom';
        var typeVal = overlay.querySelector('#terrain-zone-edit-type').value;
        var sel = overlay.querySelector('.terrain-zone-edit-swatch.selected');
        var couleur = (sel && sel.dataset.value) ? sel.dataset.value : (zone.couleur || '#3d5c2e');
        var hauteurInput = overlay.querySelector('#terrain-zone-edit-hauteur');
        var batimentHauteur = (typeVal === 'batiment' && hauteurInput) ? parseFloat(hauteurInput.value, 10) : null;
        if (typeVal === 'batiment' && (batimentHauteur == null || isNaN(batimentHauteur) || batimentHauteur < 0.5)) batimentHauteur = 3;
        var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
        var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
        var xhr = new XMLHttpRequest();
        xhr.open('PATCH', apiBase + 'zones/' + id + '/');
        xhr.setRequestHeader('Content-Type', 'application/json');
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        var csrf = getCsrfToken();
        if (csrf) xhr.setRequestHeader('X-CSRFToken', csrf);
        xhr.withCredentials = true;
        xhr.onload = function () {
          overlay.style.display = 'none';
          if (xhr.status >= 200 && xhr.status < 300) {
            var updated = JSON.parse(xhr.responseText);
            updated.couleur = updated.couleur || couleur;
            if (typeVal === 'batiment' && batimentHauteur != null) updated.batiment_hauteur_m = batimentHauteur;
            else if (typeVal !== 'batiment') updated.batiment_hauteur_m = null;
            var idx = vueZonesListCache.findIndex(function (z) { return z.id === updated.id; });
            if (idx >= 0) vueZonesListCache[idx] = updated;
            if (window.terrainCesiumUpdateZoneEntity) window.terrainCesiumUpdateZoneEntity(updated);
            refreshVueZonesList();
          }
        };
        var payload = { nom: nom, type: typeVal, couleur: couleur };
        if (typeVal === 'batiment' && batimentHauteur != null) payload.batiment_hauteur_m = batimentHauteur;
        else if (typeVal !== 'batiment') payload.batiment_hauteur_m = null;
        xhr.send(JSON.stringify(payload));
      });
      overlay.querySelector('#terrain-zone-edit-delete').addEventListener('click', function () {
        var id = overlay.dataset.zoneId;
        if (!id) return;
        if (!confirm('Supprimer cette zone ?')) return;
        var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
        var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
        var xhr = new XMLHttpRequest();
        xhr.open('DELETE', apiBase + 'zones/' + id + '/');
        if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        var csrf = getCsrfToken();
        if (csrf) xhr.setRequestHeader('X-CSRFToken', csrf);
        xhr.withCredentials = true;
        xhr.onload = function () {
          overlay.style.display = 'none';
          if (xhr.status >= 200 && xhr.status < 300) {
            vueZonesListCache = vueZonesListCache.filter(function (z) { return z.id !== parseInt(id, 10); });
            if (window.terrainCesiumRemoveZoneEntity) window.terrainCesiumRemoveZoneEntity(parseInt(id, 10));
            refreshVueZonesList();
          } else {
            alert('Erreur lors de la suppression.');
          }
        };
        xhr.onerror = function () { alert('Erreur réseau.'); };
        xhr.send();
      });
    }
    overlay.dataset.zoneId = zone.id;
    overlay.querySelector('#terrain-zone-edit-nom').value = zone.nom || '';
    overlay.querySelector('#terrain-zone-edit-type').value = zone.type || 'autre';
    var hauteurWrapEdit = overlay.querySelector('.terrain-zone-edit-hauteur-wrap');
    var hauteurInputEdit = overlay.querySelector('#terrain-zone-edit-hauteur');
    if (hauteurWrapEdit) hauteurWrapEdit.style.display = (zone.type === 'batiment') ? 'block' : 'none';
    if (hauteurInputEdit) hauteurInputEdit.value = (zone.batiment_hauteur_m != null && !isNaN(zone.batiment_hauteur_m)) ? zone.batiment_hauteur_m : '3';
    var currentCouleur = zone.couleur || '#3d5c2e';
    overlay.querySelectorAll('.terrain-zone-edit-swatch').forEach(function (s) {
      s.classList.toggle('selected', s.dataset.value === currentCouleur);
    });
    overlay.style.display = 'flex';
  }

  function loadVueZonesContent() {
    var listEl = byId('terrain-vue-zones-list');
    if (!listEl) return;
    var gardenId = GARDEN_DATA.id;
    if (!gardenId) {
      listEl.innerHTML = '<p class="terrain-vue-zones-empty">Aucun jardin.</p>';
      return;
    }
    listEl.textContent = 'Chargement…';
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + 'zones/?garden_id=' + encodeURIComponent(gardenId));
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.withCredentials = true;
    xhr.onload = function () {
      listEl.dataset.loaded = '1';
      if (xhr.status !== 200) {
        listEl.innerHTML = '<p class="terrain-vue-zones-empty">Erreur chargement.</p>';
        return;
      }
      try {
        var list = JSON.parse(xhr.responseText);
        if (!Array.isArray(list)) list = list.results || [];
        vueZonesListCache = list;
        if (list.length === 0) {
          listEl.innerHTML = '<p class="terrain-vue-zones-empty">Aucune zone. Dessinez une nouvelle zone.</p>';
          return;
        }
        refreshVueZonesList();
      } catch (e) {
        listEl.innerHTML = '<p class="terrain-vue-zones-empty">Erreur.</p>';
      }
    };
    xhr.onerror = function () {
      listEl.dataset.loaded = '0';
      listEl.innerHTML = '<p class="terrain-vue-zones-empty">Erreur réseau.</p>';
    };
    xhr.send();
  }

  function loadAccueilContent() {
    var favorisEl = byId('terrain-accueil-favoris-list');
    var recentsEl = byId('terrain-accueil-recents-list');
    var eventsEl = byId('terrain-accueil-events-list');
    if (!favorisEl || !eventsEl) return;
    refreshAccueilRecents();
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var gardenId = (GARDEN_DATA && GARDEN_DATA.id) ? String(GARDEN_DATA.id) : '';
    var qsGarden = gardenId ? '&garden=' + encodeURIComponent(gardenId) : '';
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    function setAuth(xhr) {
      if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.withCredentials = true;
    }
    favorisEl.textContent = 'Chargement…';
    var xhrFavoris = new XMLHttpRequest();
    xhrFavoris.open('GET', apiBase + 'specimens/?favoris=1' + qsGarden);
    setAuth(xhrFavoris);
    xhrFavoris.onload = function () {
      if (xhrFavoris.status !== 200) {
        favorisEl.textContent = 'Non connecté ou erreur.';
        return;
      }
      try {
        var list = JSON.parse(xhrFavoris.responseText);
        if (!Array.isArray(list) || list.length === 0) {
          favorisEl.textContent = 'Aucun favori.';
          return;
        }
        favorisEl.innerHTML = list.map(function (s) {
          return '<div class="terrain-accueil-item" data-specimen-id="' + s.id + '" data-lat="' + (s.latitude != null ? s.latitude : '') + '" data-lng="' + (s.longitude != null ? s.longitude : '') + '">' + (s.nom || 'Spécimen ' + s.id) + '</div>';
        }).join('');
        favorisEl.querySelectorAll('.terrain-accueil-item').forEach(function (item) {
          item.addEventListener('click', function () {
            var id = item.dataset.specimenId;
            var lat = item.dataset.lat;
            var lng = item.dataset.lng;
            var s = specimens.filter(function (sp) { return String(sp.id) === String(id); })[0];
            if (!s && id && (lat !== '' && lng !== '')) {
              s = { id: id, nom: item.textContent.trim(), latitude: parseFloat(lat), longitude: parseFloat(lng) };
            }
            if (s) {
              selectedSpecimenId = s.id;
              if (window.terrainCesiumFlyToSpecimen && s.latitude != null && s.longitude != null) {
                window.terrainCesiumFlyToSpecimen({ lng: s.longitude, lat: s.latitude, specimenId: s.id });
              }
              openSpecimenOverlay(s);
            }
          });
        });
      } catch (e) {
        favorisEl.textContent = 'Erreur.';
      }
    };
    xhrFavoris.onerror = function () { favorisEl.textContent = 'Erreur réseau.'; };
    xhrFavoris.send();

    eventsEl.textContent = 'Chargement…';
    var xhrEvents = new XMLHttpRequest();
    xhrEvents.open('GET', apiBase + 'specimens/recent_events/?limit=6' + (gardenId ? '&garden=' + encodeURIComponent(gardenId) : ''));
    setAuth(xhrEvents);
    xhrEvents.onload = function () {
      if (xhrEvents.status !== 200) {
        eventsEl.textContent = 'Non connecté ou erreur.';
        return;
      }
      try {
        var list = JSON.parse(xhrEvents.responseText);
        if (!Array.isArray(list) || list.length === 0) {
          eventsEl.textContent = 'Aucun événement récent.';
          return;
        }
        var typeLabels = { plantation: 'Plantation', taille: 'Taille', floraison: 'Floraison', recolte: 'Récolte', maladie: 'Maladie', traitement: 'Traitement', autre: 'Autre' };
        eventsEl.innerHTML = list.map(function (ev) {
          var typeLabel = typeLabels[ev.type_event] || ev.type_event || 'Événement';
          return '<div class="terrain-accueil-item terrain-accueil-event" data-specimen-id="' + (ev.specimen_id || '') + '">' +
            '<span class="terrain-accueil-event-meta">' + typeLabel + ' — ' + (ev.date || '') + '</span>' +
            '<span class="terrain-accueil-event-nom">' + (ev.specimen_nom || '') + '</span></div>';
        }).join('');
        eventsEl.querySelectorAll('.terrain-accueil-item').forEach(function (item) {
          item.addEventListener('click', function () {
            var id = item.dataset.specimenId;
            if (!id) return;
            var s = specimens.filter(function (sp) { return String(sp.id) === String(id); })[0];
            if (s) {
              selectedSpecimenId = s.id;
              if (window.terrainCesiumFlyToSpecimen) window.terrainCesiumFlyToSpecimen({ lng: s.longitude, lat: s.latitude, specimenId: s.id });
              openSpecimenOverlay(s);
            }
          });
        });
      } catch (e) {
        eventsEl.textContent = 'Erreur.';
      }
    };
    xhrEvents.onerror = function () { eventsEl.textContent = 'Erreur réseau.'; };
    xhrEvents.send();
  }

  function loadRappelsContent() {
    var listEl = byId('terrain-rappels-list');
    if (!listEl || listEl.dataset.loaded === '1') return;
    listEl.dataset.loaded = '1';
    listEl.textContent = 'Chargement…';
    var apiBase = (window.location.origin || '') + (window.API_BASE_PATH || '/api/');
    var token = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBase + 'reminders/upcoming/');
    if (token) xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.withCredentials = true;
    xhr.onload = function () {
      if (xhr.status !== 200) {
        listEl.innerHTML = '<p>Erreur chargement rappels.</p>';
        return;
      }
      try {
        var list = JSON.parse(xhr.responseText);
        if (!Array.isArray(list) || list.length === 0) {
          listEl.innerHTML = '<p>Aucun rappel à venir.</p>';
          return;
        }
        listEl.innerHTML = list.slice(0, 20).map(function (r) {
          var overdue = r.is_overdue ? ' <span class="terrain-rappels-overdue">(en retard)</span>' : '';
          var specimenNom = (r.specimen && r.specimen.nom) ? r.specimen.nom : (r.specimen_nom || '');
          return '<div class="terrain-rappels-item">' +
            '<span class="terrain-rappels-date">' + (r.date_rappel || '') + '</span> ' +
            '<span class="terrain-rappels-titre">' + (r.titre || 'Rappel') + '</span> — ' + specimenNom + overdue + '</div>';
        }).join('');
      } catch (e) {
        listEl.innerHTML = '<p>Erreur.</p>';
      }
    };
    xhr.onerror = function () {
      listEl.dataset.loaded = '0';
      listEl.innerHTML = '<p>Erreur réseau.</p>';
    };
    xhr.send();
  }

  function loadAdminContent() {
    var nomEl = byId('terrain-admin-nom');
    var adresseEl = byId('terrain-admin-adresse');
    if (nomEl) nomEl.textContent = GARDEN_DATA.nom || '—';
    if (adresseEl) adresseEl.textContent = GARDEN_DATA.adresse || '—';
    var themeSel = byId('terrain-admin-theme');
    if (themeSel) {
      var tm = localStorage.getItem('terrain_color_mode');
      themeSel.value = (tm === 'light' || tm === 'dark') ? tm : 'auto';
    }
  }

  function loadMeteoContent() {
    var el = byId('terrain-meteo-content');
    if (!el || el.dataset.loaded === '1') return;
    el.dataset.loaded = '1';
    el.textContent = 'Historique et prévisions météo (à connecter à l’API météo jardin).';
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
    if (typeof window.terrainCesiumSetVisibleSpecimens === 'function') {
      window.terrainCesiumSetVisibleSpecimens(ids);
    }
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
      item.innerHTML =
        '<span class="terrain-specimen-name">' + esc(s.nom || '') + '</span>' +
        '<span class="terrain-specimen-badge">' + esc(s.statut || '') + '</span>';
      item.addEventListener('click', function () {
        selectedSpecimenId = s.id;
        if (window.terrainCesiumViewer && window.terrainCesiumFlyToSpecimen) {
          window.terrainCesiumFlyToSpecimen({ lng: s.longitude, lat: s.latitude, specimenId: s.id });
        }
        openSpecimenOverlay(s);
        if (panelRoot) panelRoot.querySelectorAll('.terrain-specimen-item').forEach(function (e) { e.classList.remove('selected'); });
        item.classList.add('selected');
      });
      listEl.appendChild(item);
    });
    var footer = byId('terrain-panel-footer');
    if (footer) {
      var etabli = specimens.filter(function (s) { return s.statut === 'etabli' || s.statut === 'mature'; }).length;
      var planifie = specimens.filter(function (s) { return s.statut === 'planifie'; }).length;
      footer.textContent = 'Total: ' + specimens.length + ' · Établis: ' + etabli + ' · Planifiés: ' + planifie;
    }
  }

  function esc(v) {
    if (v == null || v === '') return '';
    var t = String(v);
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ficheRow(label, value) {
    if (value == null || value === '') return '';
    return '<div class="terrain-fiche-row"><span class="terrain-fiche-label">' + esc(label) + '</span><span class="terrain-fiche-val">' + esc(value) + '</span></div>';
  }

  function ficheSection(title, inner) {
    if (!inner || !String(inner).trim()) return '';
    return '<div class="terrain-fiche-card"><h3 class="terrain-fiche-section-title">' + esc(title) + '</h3>' + inner + '</div>';
  }

  function statutBadgeClass(st) {
    var x = (st || '').toLowerCase();
    if (x.indexOf('planif') >= 0) return 'terrain-badge-statut terrain-badge-statut--planifie';
    if (x.indexOf('retir') >= 0) return 'terrain-badge-statut terrain-badge-statut--retire';
    return 'terrain-badge-statut terrain-badge-statut--etabli';
  }

  function buildSpecimenDetailHtml(s) {
    var latin = s.organisme_nom_latin ? '<p class="terrain-fiche-latin">' + esc(s.organisme_nom_latin) + '</p>' : '';
    var statutLabel = s.statut_display || s.statut || '';
    var badgeParts = '';
    if (statutLabel) {
      badgeParts += '<span class="' + statutBadgeClass(statutLabel) + '">' + esc(statutLabel) + '</span>';
    }
    if (s.sante != null && !isNaN(Number(s.sante))) {
      var pct = Math.min(100, Math.max(0, Number(s.sante) * 10));
      badgeParts += '<span class="terrain-fiche-sante-wrap" title="Santé ' + esc(String(s.sante)) + '/10">' +
        '<span class="terrain-fiche-sante-label">Santé</span>' +
        '<span class="terrain-fiche-sante-bar"><span class="terrain-fiche-sante-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="terrain-fiche-sante-num">' + esc(String(s.sante)) + '/10</span></span>';
    }
    var badges = badgeParts ? '<div class="terrain-fiche-badges">' + badgeParts + '</div>' : '';

    var identite = ficheRow('Cultivar', s.cultivar_nom) + ficheRow('Porte-greffe', s.porte_greffe_nom);
    var loc = ficheRow('Zone', s.zone_nom || s.zone_jardin) + ficheRow('Code NFC', s.code_identification);
    var hauteurStr = (s.hauteur_actuelle != null && s.hauteur_actuelle !== '') ? String(s.hauteur_actuelle) + ' m' : '';
    var rayonStr = (s.rayon_adulte_m != null && s.rayon_adulte_m !== '') ? String(s.rayon_adulte_m) + ' m' : '';
    var croissance = ficheRow('Date plantation', s.date_plantation) +
      ficheRow('Hauteur actuelle', hauteurStr) +
      ficheRow('Rayon adulte', rayonStr) +
      ficheRow('1re fructification', s.premiere_fructification) +
      ficheRow('Âge à la plantation', s.age_plantation);

    var approInner = ficheRow('Source', s.source_display || s.source) + ficheRow('Fournisseur', s.pepiniere_fournisseur);
    var approBlock = '';
    if (approInner.trim()) {
      approBlock = '<details class="terrain-fiche-details"><summary>Approvisionnement</summary><div class="terrain-fiche-details-body">' + approInner + '</div></details>';
    }

    var notesBlock = '';
    if (s.notes != null && String(s.notes).trim() !== '') {
      notesBlock = ficheSection('Notes', '<div class="terrain-fiche-notes">' + esc(String(s.notes)) + '</div>');
    }

    var cards = ficheSection('Identité', identite) +
      ficheSection('Localisation', loc) +
      ficheSection('Croissance', croissance) +
      (approBlock ? '<div class="terrain-fiche-card terrain-fiche-card--flat">' + approBlock + '</div>' : '') +
      notesBlock;

    return '<div class="terrain-panel-detail-fiche">' +
      '<header class="terrain-fiche-header">' +
      '<h2 class="terrain-fiche-title">' + esc(s.nom || 'Spécimen') + '</h2>' +
      latin +
      badges +
      '<div class="terrain-fiche-cta">' +
      '<button type="button" class="terrain-panel-btn" id="terrain-panel-detail-open-full">Voir la fiche complète</button>' +
      '</div></header>' +
      '<div class="terrain-fiche-body">' + cards + '</div></div>';
  }

  function wireFicheActions(s, rootEl) {
    var openFullBtn = rootEl.querySelector('#terrain-panel-detail-open-full');
    if (openFullBtn) {
      openFullBtn.addEventListener('click', function () {
        if (window.postToRN) {
          window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: s.id } });
        } else {
          window.location.href = '/species/specimen/' + s.id + '/';
        }
      });
    }
  }

  function showPopup(s) {
    if (!popupEl) return;
    var mini = buildSpecimenDetailHtml(s);
    popupEl.innerHTML = '<div class="terrain-popup-inner">' + mini + '</div>';
    popupEl.style.display = 'block';
    wireFicheActions(s, popupEl);
  }

  function openSpecimenOverlay(s) {
    addToRecents(s);
    var ficheHtml = buildSpecimenDetailHtml(s);

    if (panelDetailEl) {
      setPanelMode('detail');
      var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
      if (detailTitleEl) detailTitleEl.textContent = s.nom || 'Spécimen';
      panelDetailEl.innerHTML = ficheHtml;
      wireFicheActions(s, panelDetailEl);
      return;
    }

    if (!overlayEl) {
      overlayEl = el('div', 'terrain-overlay');
      overlayEl.innerHTML = '<div class="terrain-overlay-backdrop"></div><div class="terrain-overlay-panel">' +
        '<button type="button" class="terrain-overlay-close" id="terrain-overlay-close" title="Fermer">×</button>' +
        '<div class="terrain-overlay-body" id="terrain-overlay-body"></div></div>';
      document.body.appendChild(overlayEl);
      overlayEl.querySelector('.terrain-overlay-backdrop').addEventListener('click', closeSpecimenOverlay);
      byId('terrain-overlay-close').addEventListener('click', closeSpecimenOverlay);
      document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { closeSpecimenOverlay(); document.removeEventListener('keydown', onEsc); }
      });
    }
    var body = byId('terrain-overlay-body');
    if (body) {
      body.innerHTML = ficheHtml;
      wireFicheActions(s, body);
    }
    overlayEl.classList.add('terrain-overlay-visible');
  }

  function closeSpecimenOverlay() {
    if (overlayEl) overlayEl.classList.remove('terrain-overlay-visible');
  }

  window.terrainOpenSpecimenOverlay = openSpecimenOverlay;
  window.terrainCloseSpecimenOverlay = closeSpecimenOverlay;

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
      '<span class="terrain-toolbar-hint" title="Navigation">Molette = zoom · Clic droit + glisser = déplacer</span>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-circles" title="Rayons adultes">⭕</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-gcps" title="GCP">📍</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-new-gcp" title="Nouveau GCP">➕</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-export-gcp" title="Exporter CSV OpenDroneMap">📤</button>' +
      '<button class="terrain-toolbar-btn" id="terrain-btn-drone" title="Vol drone">🚁</button>' +
      '<div class="terrain-toolbar-metrics' + metricsClass + '" id="terrain-metrics">' +
      (terrainStats ? ('Alt. ' + (terrainStats.altitude_min != null ? terrainStats.altitude_min + '–' + (terrainStats.altitude_max != null ? terrainStats.altitude_max : '—') : '—') + ' m · Pente ' + (terrainStats.pente_moyenne != null ? terrainStats.pente_moyenne : '—') + ' · Eau ' + (terrainStats.nb_cours_eau != null ? terrainStats.nb_cours_eau : '—') + ' · ' + (terrainStats.surface_ha != null ? terrainStats.surface_ha + ' ha' : '—')) : '—') +
      '</div>';
    document.body.appendChild(toolbarEl);

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
      (terrainStats && terrainStats.altitude_min != null ? ('Bas: ' + terrainStats.altitude_min + ' m<br>Haut: ' + (terrainStats.altitude_max != null ? terrainStats.altitude_max : '—') + ' m') : '—') +
      '</div>';
    document.body.appendChild(legendEl);
  }

  function refreshTerrainLayerPills() {
    var z = byId('terrain-layer-zones');
    if (z && typeof window.terrainCesiumZonesVisible === 'function') {
      z.classList.toggle('terrain-pill-toggle--active', window.terrainCesiumZonesVisible());
    }
  }

  function renderControlsRight() {
    var container = el('div', 'terrain-controls-right');

    var pillLayers = el('div', 'terrain-controls-pill terrain-controls-pill--layers');
    function pillBtn(id, title, iconHtml) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'terrain-pill-toggle terrain-pill-toggle--active';
      b.id = id;
      b.title = title;
      b.setAttribute('aria-pressed', 'true');
      b.innerHTML = '<span class="terrain-pill-toggle-icon">' + iconHtml + '</span>';
      return b;
    }
    var btnZones = pillBtn('terrain-layer-zones', 'Zones du jardin', IC.mapPinned);
    var btnSpec = pillBtn('terrain-layer-specimens', 'Spécimens', IC.sprout);
    var btnRay = pillBtn('terrain-layer-rayons', 'Rayons de maturité', IC.circleDot);
    var btnBound = pillBtn('terrain-layer-boundary', 'Périmètre du jardin', IC.pentagon);
    pillLayers.appendChild(btnZones);
    pillLayers.appendChild(btnSpec);
    pillLayers.appendChild(btnRay);
    pillLayers.appendChild(btnBound);
    container.appendChild(pillLayers);

    var hasLidar = !!window.LIDAR_ASSET_ID;
    function getTerrainMode() {
      var q = typeof window !== 'undefined' && window.location ? window.location.search : '';
      if (q.indexOf('terrain=lidar') !== -1) return 'lidar';
      return 'world';
    }
    function applyTerrainMode(mode, terrainSelect) {
      var p = new URLSearchParams(window.location.search);
      if (mode === 'world') {
        if (window.terrainCesiumSetTerrainWorld) window.terrainCesiumSetTerrainWorld();
        p.delete('terrain');
      } else if (mode === 'lidar' && window.terrainCesiumSetTerrainLidar) {
        window.terrainCesiumSetTerrainLidar();
        p.set('terrain', 'lidar');
      }
      window.history.replaceState(null, '', window.location.pathname + (p.toString() ? '?' + p.toString() : ''));
      if (terrainSelect) terrainSelect.value = mode;
    }
    var pillTerrain = el('div', 'terrain-controls-pill terrain-controls-pill--terrain');
    var terrainSelect = el('select', 'terrain-controls-select terrain-controls-select--pill');
    terrainSelect.title = 'Relief';
    terrainSelect.setAttribute('aria-label', 'Choisir le terrain (monde ou LiDAR)');
    terrainSelect.innerHTML =
      '<option value="world">Monde</option>' +
      (hasLidar ? '<option value="lidar">3D LiDAR</option>' : '');
    var currentMode = getTerrainMode();
    if (currentMode === 'lidar' && !hasLidar) currentMode = 'world';
    terrainSelect.value = currentMode;
    terrainSelect.addEventListener('change', function () {
      applyTerrainMode(terrainSelect.value, terrainSelect);
    });
    pillTerrain.appendChild(terrainSelect);
    container.appendChild(pillTerrain);

    var pillZoom = el('div', 'terrain-controls-pill terrain-controls-pill--zoom');
    var btnZoomOut = el('button', 'terrain-controls-btn terrain-controls-btn--icon');
    btnZoomOut.type = 'button';
    btnZoomOut.title = 'Zoom arrière';
    btnZoomOut.innerHTML = IC.minus;
    btnZoomOut.addEventListener('click', function () {
      if (window.terrainCesiumViewer) window.terrainCesiumViewer.camera.zoomOut(59);
    });
    var btnZoomIn = el('button', 'terrain-controls-btn terrain-controls-btn--icon');
    btnZoomIn.type = 'button';
    btnZoomIn.title = 'Zoom avant';
    btnZoomIn.innerHTML = IC.plus;
    btnZoomIn.addEventListener('click', function () {
      if (window.terrainCesiumViewer) window.terrainCesiumViewer.camera.zoomIn(47);
    });
    pillZoom.appendChild(btnZoomOut);
    pillZoom.appendChild(btnZoomIn);
    container.appendChild(pillZoom);

    document.body.appendChild(container);

    function togglePressed(btn, on) {
      btn.classList.toggle('terrain-pill-toggle--active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    btnZones.addEventListener('click', function () {
      var v = typeof window.terrainCesiumZonesVisible === 'function' && window.terrainCesiumZonesVisible();
      var next = !v;
      if (window.terrainCesiumSetZonesVisible) window.terrainCesiumSetZonesVisible(next);
      togglePressed(btnZones, next);
      if (currentTab === 'vue') refreshVueZonesList();
    });
    btnSpec.addEventListener('click', function () {
      var on = btnSpec.classList.contains('terrain-pill-toggle--active');
      var next = !on;
      if (window.terrainCesiumSetSpecimensLayerVisible) window.terrainCesiumSetSpecimensLayerVisible(next);
      togglePressed(btnSpec, next);
    });
    btnRay.addEventListener('click', function () {
      var on = btnRay.classList.contains('terrain-pill-toggle--active');
      var next = !on;
      if (window.terrainCesiumSetMaturityCirclesVisible) window.terrainCesiumSetMaturityCirclesVisible(next);
      togglePressed(btnRay, next);
    });
    btnBound.addEventListener('click', function () {
      var on = btnBound.classList.contains('terrain-pill-toggle--active');
      var next = !on;
      if (window.terrainCesiumSetBoundaryVisible) window.terrainCesiumSetBoundaryVisible(next);
      togglePressed(btnBound, next);
    });

    windRoseEl = el('div', 'terrain-wind-rose terrain-wind-rose--corner');
    windRoseEl.title = 'Nord – cliquer pour réorienter vers le nord';
    windRoseEl.setAttribute('aria-hidden', 'true');
    windRoseEl.style.pointerEvents = 'auto';
    windRoseEl.addEventListener('click', function () {
      var v = window.terrainCesiumViewer;
      if (!v || !v.camera) return;
      var cam = v.camera;
      var pos = cam.position;
      if (pos && pos.x != null) {
        try {
          cam.flyTo({
            destination: (window.Cesium && window.Cesium.Cartesian3) ? window.Cesium.Cartesian3.clone(pos) : pos,
            orientation: { heading: 0, pitch: cam.pitch, roll: 0 },
            duration: 0.8
          });
        } catch (e) {
          cam.setView({ orientation: { heading: 0, pitch: cam.pitch, roll: 0 } });
        }
      } else {
        cam.setView({ orientation: { heading: 0, pitch: cam.pitch, roll: 0 } });
      }
    });
    windRoseEl.innerHTML =
      '<svg viewBox="0 0 64 64" class="terrain-wind-rose-svg" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="32" cy="32" r="30" class="terrain-wind-rose-circle"/>' +
      '<circle cx="32" cy="32" r="26" class="terrain-wind-rose-inner"/>' +
      '<line x1="32" y1="8" x2="32" y2="20" class="terrain-wind-rose-line terrain-wind-rose-n"/>' +
      '<line x1="32" y1="44" x2="32" y2="56" class="terrain-wind-rose-line"/>' +
      '<line x1="8" y1="32" x2="20" y2="32" class="terrain-wind-rose-line"/>' +
      '<line x1="44" y1="32" x2="56" y2="32" class="terrain-wind-rose-line"/>' +
      '<line x1="18" y1="18" x2="24" y2="24" class="terrain-wind-rose-line terrain-wind-rose-minor"/>' +
      '<line x1="46" y1="18" x2="40" y2="24" class="terrain-wind-rose-line terrain-wind-rose-minor"/>' +
      '<line x1="46" y1="46" x2="40" y2="40" class="terrain-wind-rose-line terrain-wind-rose-minor"/>' +
      '<line x1="18" y1="46" x2="24" y2="40" class="terrain-wind-rose-line terrain-wind-rose-minor"/>' +
      '<text x="32" y="16" class="terrain-wind-rose-n-label">N</text>' +
      '<text x="32" y="58" class="terrain-wind-rose-label">S</text>' +
      '<text x="10" y="35" class="terrain-wind-rose-label">O</text>' +
      '<text x="54" y="35" class="terrain-wind-rose-label">E</text>' +
      '</svg>';
    document.body.appendChild(windRoseEl);

    function updateWindRoseHeading() {
      if (!windRoseEl || !window.terrainCesiumViewer || !window.terrainCesiumViewer.camera) {
        requestAnimationFrame(updateWindRoseHeading);
        return;
      }
      var Cesium = window.Cesium;
      var headingRad = window.terrainCesiumViewer.camera.heading;
      var headingDeg = Cesium && Cesium.Math ? Cesium.Math.toDegrees(headingRad) : (headingRad * 180 / Math.PI);
      windRoseEl.style.transform = 'rotate(' + (-headingDeg) + 'deg)';
      requestAnimationFrame(updateWindRoseHeading);
    }
    updateWindRoseHeading();

    window.refreshTerrainLayerPills = refreshTerrainLayerPills;
    setTimeout(function () {
      if (typeof window.refreshTerrainLayerPills === 'function') window.refreshTerrainLayerPills();
    }, 400);
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
  renderPanel();
  renderPopup();
  renderControlsRight();

  if (window.INITIAL_SPECIMENS && Array.isArray(window.INITIAL_SPECIMENS) && window.INITIAL_SPECIMENS.length > 0) {
    specimens = window.INITIAL_SPECIMENS;
    updateSpecimenList(null);
  }
})();
