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
    leaf: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 2 5.5a7 7 0 1 1-10 12.5Z"/></svg>',
    bookOpen: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mapPinned: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/></svg>',
    circleDot: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>',
    pentagon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    minus: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>',
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    xIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    panelLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>',
    arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>'
  };

  var TAB_TITLES = {
    accueil: 'Home',
    recherche: 'Recherche',
    especes: 'Espèces',
    vue: 'Vue',
    jardin: 'Spécimens',
    rappels: 'Calendrier',
    admin: 'Configuration',
    meteo: 'Météo',
    partenaires: 'Radix'
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
  var panelMode = 'closed'; /* 'closed' | 'open' | 'detail' — contenu du panneau principal */
  var radixSyncRunning = false;
  var sidebarExpanded = false; /* rail icônes : false = 44px, true = 180px */
  var currentTab = 'jardin';
  var RECENTS_KEY = 'terrain_recents';
  var RECENTS_MAX = 10;
  var especesWired = false;
  var especesScrollRaf = null;
  var especesState = { page: 1, hasMore: true, loading: false, loadingMore: false, organisms: [] };

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
    setPanelTitle(TAB_TITLES[tabId] || tabId);
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
    if (tabId === 'especes') loadEspecesContent();
    if (tabId === 'rappels') loadRappelsContent();
    if (tabId === 'admin') loadAdminContent();
    if (tabId === 'meteo') loadMeteoContent();
  }

  function syncLayoutMetrics() {
    var sidebarW = sidebarExpanded ? 180 : 44;
    var panelW = (panelMode === 'open' || panelMode === 'detail') ? 320 : 0;
    var detailExtra = (panelMode === 'detail') ? Math.min(360, Math.max(0, window.innerWidth * 0.4)) : 0;
    var total = 8 + sidebarW + panelW + detailExtra;
    document.documentElement.style.setProperty('--terrain-ui-offset', total + 'px');
  }

  function syncLayoutClasses() {
    if (!panelRoot) return;
    panelRoot.classList.remove('terrain-sidebar-collapsed', 'terrain-sidebar-expanded', 'terrain-panel-content-open', 'terrain-panel-content-hidden', 'terrain-panel-detail-visible');
    panelRoot.classList.add(sidebarExpanded ? 'terrain-sidebar-expanded' : 'terrain-sidebar-collapsed');
    if (panelMode === 'closed') {
      panelRoot.classList.add('terrain-panel-content-hidden');
    } else {
      panelRoot.classList.add('terrain-panel-content-open');
    }
    if (panelMode === 'detail') panelRoot.classList.add('terrain-panel-detail-visible');

    document.body.classList.remove('terrain-sidebar-collapsed', 'terrain-sidebar-expanded', 'terrain-panel-content-open', 'terrain-panel-content-hidden');
    document.body.classList.add(sidebarExpanded ? 'terrain-sidebar-expanded' : 'terrain-sidebar-collapsed');
    document.body.classList.toggle('terrain-panel-content-open', panelMode !== 'closed');
    document.body.classList.toggle('terrain-panel-content-hidden', panelMode === 'closed');
    document.body.classList.toggle('terrain-panel-detail-visible', panelMode === 'detail');

    syncLayoutMetrics();
  }

  function updateSidebarChevron() {
    var btn = byId('terrain-sidebar-toggle');
    if (!btn) return;
    btn.innerHTML = IC.panelLeft;
    btn.title = sidebarExpanded ? 'Replier la barre latérale' : 'Développer la barre latérale';
    btn.setAttribute('aria-expanded', sidebarExpanded ? 'true' : 'false');
  }

  function setPanelTitle(title, showBack) {
    var titleEl = byId('terrain-panel-main-title');
    if (titleEl) titleEl.textContent = title || '';
    var backBtn = byId('terrain-panel-back');
    if (backBtn) backBtn.style.display = showBack ? 'flex' : 'none';
  }

  function setPanelMode(mode) {
    panelMode = mode;
    if (!panelRoot) return;
    syncLayoutClasses();
  }

  function renderPanel() {
    panelRoot = el('div', 'terrain-panel terrain-sidebar-collapsed terrain-panel-content-hidden');
    panelRoot.innerHTML =
      '<div class="terrain-panel-icons">' +
      '<div class="terrain-panel-header">' +
      '<button type="button" class="terrain-sidebar-toggle" id="terrain-sidebar-toggle" title="Développer la barre latérale" aria-expanded="false">' + IC.panelLeft + '</button>' +
      '</div>' +
      '<span class="terrain-panel-logo" aria-hidden="true">Jardin <strong>bIOT</strong></span>' +
      '<nav class="terrain-panel-tabs" role="tablist">' +
      '<button type="button" class="terrain-panel-tab" data-tab="accueil" title="Accueil"><span class="terrain-panel-tab-icon">' + IC.home + '</span><span class="terrain-panel-tab-label">Home</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="recherche" title="Recherche"><span class="terrain-panel-tab-icon">' + IC.search + '</span><span class="terrain-panel-tab-label">Recherche</span></button>' +
      '<button type="button" class="terrain-panel-tab" data-tab="especes" title="Bibliothèque d’espèces (Radix)"><span class="terrain-panel-tab-icon">' + IC.leaf + '</span><span class="terrain-panel-tab-label">Espèces</span></button>' +
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
      '<div class="terrain-panel-main-header">' +
      '<button type="button" class="terrain-panel-back" id="terrain-panel-back" title="Retour" style="display:none">' + IC.arrowLeft + '</button>' +
      '<span id="terrain-panel-main-title" class="terrain-panel-main-title">Spécimens</span>' +
      '<button type="button" class="terrain-panel-close" id="terrain-panel-close" title="Fermer le panneau">' + IC.xIcon + '</button>' +
      '</div>' +
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
    updateSidebarChevron();
    window.addEventListener('resize', function () { syncLayoutMetrics(); });

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

    var contentEspeces =
      '<div id="terrain-content-especes" class="terrain-panel-tab-content" style="display:none">' +
      '<label class="terrain-search-label" for="terrain-especes-search">Rechercher</label>' +
      '<div class="terrain-search-wrap">' +
      '<span class="terrain-search-icon" aria-hidden="true">' + IC.search + '</span>' +
      '<input type="search" class="terrain-search-input" id="terrain-especes-search" placeholder="Nom commun ou latin…" autocomplete="off"/>' +
      '</div>' +
      '<button type="button" class="terrain-panel-btn terrain-especes-filter-toggle" id="terrain-especes-filter-toggle">Filtres</button>' +
      '<div class="terrain-especes-filters" id="terrain-especes-filters" hidden>' +
      '<div class="terrain-especes-filter-row"><label for="terrain-especes-type">Type</label>' +
      '<select id="terrain-especes-type" class="terrain-especes-select">' +
      '<option value="">Tous</option>' +
      '<option value="arbre_fruitier">Arbre fruitier</option><option value="arbre_noix">Arbre à noix</option>' +
      '<option value="arbre_ornement">Arbre d’ornement</option><option value="arbuste_fruitier">Arbuste fruitier</option>' +
      '<option value="arbuste_baies">Arbuste à baies</option><option value="arbuste">Arbuste</option>' +
      '<option value="vivace">Vivace</option><option value="annuelle">Annuelle</option>' +
      '<option value="legume">Légume</option><option value="herbe_aromatique">Herbe aromatique</option>' +
      '<option value="grimpante">Grimpante</option><option value="couvre_sol">Couvre-sol</option>' +
      '</select></div>' +
      '<div class="terrain-especes-filter-row"><label for="terrain-especes-soleil">Soleil</label>' +
      '<select id="terrain-especes-soleil" class="terrain-especes-select">' +
      '<option value="">Indifférent</option>' +
      '<option value="plein_soleil">Plein soleil</option><option value="soleil_partiel">Soleil partiel</option>' +
      '<option value="mi_ombre">Mi-ombre</option><option value="ombre">Ombre</option><option value="ombre_complete">Ombre complète</option>' +
      '</select></div>' +
      '<div class="terrain-especes-filter-row"><label for="terrain-especes-zone">Zone USDA max</label>' +
      '<select id="terrain-especes-zone" class="terrain-especes-select">' +
      '<option value="">Indifférent</option>' +
      '<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option>' +
      '<option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option>' +
      '<option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option>' +
      '</select></div>' +
      '<div class="terrain-especes-filter-row"><label for="terrain-especes-vigueur">Vigueur (porte-greffe)</label>' +
      '<select id="terrain-especes-vigueur" class="terrain-especes-select">' +
      '<option value="">Indifférent</option>' +
      '<option value="nain">Nain</option><option value="semi_nain">Semi-nain</option><option value="semi_vigoureux">Semi-vigoureux</option>' +
      '<option value="vigoureux">Vigoureux</option><option value="standard">Standard</option>' +
      '</select></div>' +
      '<div class="terrain-especes-filter-checks">' +
      '<label class="terrain-especes-check"><input type="checkbox" id="terrain-especes-favoris"/> Favoris seulement</label>' +
      '<label class="terrain-especes-check"><input type="checkbox" id="terrain-especes-fruits"/> Fruitiers / baies</label>' +
      '<label class="terrain-especes-check"><input type="checkbox" id="terrain-especes-noix"/> Noix</label>' +
      '<label class="terrain-especes-check"><input type="checkbox" id="terrain-especes-has-specimen"/> Déjà un spécimen dans ce jardin</label>' +
      '</div>' +
      '<button type="button" class="terrain-panel-btn terrain-especes-clear" id="terrain-especes-clear">Réinitialiser les filtres</button>' +
      '</div>' +
      '<p class="terrain-especes-meta" id="terrain-especes-meta"></p>' +
      '<div class="terrain-especes-list terrain-panel-list" id="terrain-especes-list"></div>' +
      '<p class="terrain-especes-loading-more" id="terrain-especes-loading-more" style="display:none" aria-live="polite">Chargement…</p>' +
      '</div>';

    var contentJardin =
      '<div id="terrain-content-jardin" class="terrain-panel-tab-content">' +
      '<div class="terrain-panel-filters" id="terrain-filters"></div>' +
      '<div class="terrain-jardin-toolbar">' +
      '<button type="button" class="terrain-panel-btn terrain-jardin-add-specimen" id="terrain-jardin-add-specimen">+ Ajouter un spécimen</button>' +
      '</div>' +
      '<div class="terrain-panel-list" id="terrain-specimen-list"></div>' +
      '<div class="terrain-panel-footer" id="terrain-panel-footer">Total: 0 · Établis: 0 · Planifiés: 0</div>' +
      '</div>';

    var contentRappels =
      '<div id="terrain-content-rappels" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-rappels-list" id="terrain-rappels-list">Chargement…</div>' +
      '<button type="button" class="terrain-panel-btn" id="terrain-rappels-gantt">Vue Gantt</button>' +
      '</div>';

    var terrainStaff = window.TERRAIN_USER_IS_STAFF === true;
    var radixAdminHtml = terrainStaff
      ? (
        '<div class="terrain-admin-field" id="terrain-admin-radix-block">' +
        '<label>Catalogue espèces (Radix)</label>' +
        '<p class="terrain-admin-hint">Met à jour le cache local depuis l’API Radix Sylva (même commande que la gestion des données).</p>' +
        '<div class="terrain-admin-buttons-row terrain-admin-radix-row">' +
        '<button type="button" class="terrain-panel-btn terrain-admin-radix-btn" id="terrain-admin-radix-delta">Sync Radix (delta)</button>' +
        '<button type="button" class="terrain-panel-btn terrain-admin-radix-btn" id="terrain-admin-radix-full">Sync complet</button>' +
        '<button type="button" class="terrain-panel-btn terrain-admin-radix-btn" id="terrain-admin-radix-dry">Simulation</button>' +
        '</div>' +
        '<pre class="terrain-admin-radix-status" id="terrain-admin-radix-status" aria-live="polite"></pre>' +
        '</div>'
      )
      : (
        '<div class="terrain-admin-field"><label>Catalogue espèces (Radix)</label>' +
        '<p class="terrain-admin-hint">Synchronisation réservée aux comptes administrateur.</p></div>'
      );

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
      radixAdminHtml +
      '<div class="terrain-admin-field terrain-admin-field--advanced">' +
      '<label>Mode avancé</label>' +
      '<p class="terrain-admin-hint">Accès à l\'interface d\'administration complète — gestion des espèces, spécimens et réglages avancés. S\'ouvre dans un nouvel onglet.</p>' +
      '<div class="terrain-admin-buttons-row">' +
      '<a class="terrain-panel-btn" href="/admin/species/specimen/" target="_blank" rel="noopener">Spécimens ↗</a>' +
      '<a class="terrain-panel-btn" href="/admin/species/organism/" target="_blank" rel="noopener">Espèces ↗</a>' +
      '<a class="terrain-panel-btn" href="/admin/" target="_blank" rel="noopener">Administration ↗</a>' +
      '</div>' +
      '</div>' +
      '</div>';

    var contentMeteo =
      '<div id="terrain-content-meteo" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-meteo-placeholder" id="terrain-meteo-content">Historique et prévisions à venir.</div>' +
      '</div>';

    var contentPartenaires =
      '<div id="terrain-content-partenaires" class="terrain-panel-tab-content" style="display:none">' +
      '<div class="terrain-partenaires-list" id="terrain-partenaires-list">Chargement…</div>' +
      '</div>';

    panelContentRoot.innerHTML = contentAccueil + contentRecherche + contentVue + contentEspeces + contentJardin + contentRappels + contentAdmin + contentMeteo + contentPartenaires;

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

    var radixDelta = byId('terrain-admin-radix-delta');
    var radixFull = byId('terrain-admin-radix-full');
    var radixDry = byId('terrain-admin-radix-dry');
    if (radixDelta) {
      radixDelta.addEventListener('click', function () {
        runTerrainRadixSync({});
      });
    }
    if (radixFull) {
      radixFull.addEventListener('click', function () {
        if (window.confirm('Retélécharger tout le cache depuis Radix (plus long). Continuer ?')) {
          runTerrainRadixSync({ full: true });
        }
      });
    }
    if (radixDry) {
      radixDry.addEventListener('click', function () {
        runTerrainRadixSync({ dry_run: true });
      });
    }

    var searchInput = byId('terrain-search-input');
    if (searchInput) searchInput.addEventListener('input', debounce(applySearchAndFilters, 300));

    if (panelContentRoot) {
      panelContentRoot.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#terrain-jardin-add-specimen') || t.closest('#terrain-specimen-add-open')) {
          e.preventDefault();
          openSpecimenCreateForm();
        }
      });
    }

    panelRoot.querySelectorAll('.terrain-panel-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (panelMode === 'closed') setPanelMode('open');
        switchTab(btn.dataset.tab);
      });
    });

    var sidebarToggle = byId('terrain-sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function () {
        sidebarExpanded = !sidebarExpanded;
        updateSidebarChevron();
        syncLayoutClasses();
      });
    }

    var panelBackBtn = byId('terrain-panel-back');
    if (panelBackBtn) {
      panelBackBtn.addEventListener('click', function () {
        closeSpecimenCreateForm();
      });
    }

    var panelCloseBtn = byId('terrain-panel-close');
    if (panelCloseBtn) {
      panelCloseBtn.addEventListener('click', function () {
        if (panelMode === 'detail') {
          if (panelDetailEl) panelDetailEl.innerHTML = '';
          var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
          if (detailTitleEl) detailTitleEl.textContent = 'Détail';
        }
        setPanelMode('closed');
      });
    }

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
    if (toShow.length === 0) {
      var isEmptyGarden = specimens.length === 0;
      var msg = isEmptyGarden
        ? 'Aucun spécimen dans ce jardin pour l’instant.'
        : 'Aucun spécimen ne correspond à la vue ou aux filtres actuels.';
      var hint = isEmptyGarden
        ? 'Ajoutez un spécimen pour le voir sur la carte et ouvrir sa fiche depuis la liste.'
        : 'Modifiez les filtres ou ajoutez un nouveau spécimen.';
      listEl.innerHTML =
        '<div class="terrain-specimen-empty-state">' +
        '<p class="terrain-specimen-empty-title">' + esc(msg) + '</p>' +
        '<p class="terrain-specimen-empty-hint">' + esc(hint) + '</p>' +
        '<button type="button" class="terrain-panel-btn terrain-specimen-add-first" id="terrain-specimen-add-open">Ajouter un spécimen</button>' +
        '</div>';
      var footer = byId('terrain-panel-footer');
      if (footer) {
        var etabli = specimens.filter(function (s) { return s.statut === 'etabli' || s.statut === 'mature'; }).length;
        var planifie = specimens.filter(function (s) { return s.statut === 'planifie'; }).length;
        footer.textContent = 'Total: ' + specimens.length + ' · Établis: ' + etabli + ' · Planifiés: ' + planifie;
      }
      return;
    }
    toShow.forEach(function (s) {
      var item = el('div', 'terrain-specimen-item');
      item.className = 'terrain-specimen-item terrain-specimen-item--' + (s.statut || 'planifie') +
        (selectedSpecimenId === s.id ? ' selected' : '');
      item.dataset.specimenId = s.id;
      var orgNom = s.organisme_nom_commun || s.organisme_nom || '';
      var statutLabel = SPECIMEN_STATUT_LABELS[s.statut] || s.statut || '';
      item.innerHTML =
        '<div class="terrain-specimen-item-body">' +
        '<span class="terrain-specimen-name">' + esc(s.nom || '') + '</span>' +
        (orgNom ? '<span class="terrain-specimen-species">' + esc(orgNom) + '</span>' : '') +
        '</div>' +
        '<span class="terrain-specimen-badge terrain-specimen-badge--' + esc(s.statut || 'planifie') + '">' + esc(statutLabel) + '</span>';
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

  /** Libellés alignés sur mobile/types/api.ts */
  var SPECIMEN_STATUT_LABELS = {
    planifie: 'Planifié',
    commande: 'Commandé',
    transplanter: 'À transplanter',
    jeune: 'Jeune plant',
    etabli: 'Établi',
    mature: 'Mature/Production',
    declin: 'En déclin',
    mort: 'Mort',
    enleve: 'Enlevé',
  };
  var EVENT_TYPE_LABELS = {
    plantation: 'Plantation',
    arrosage: 'Arrosage',
    fertilisation: 'Fertilisation',
    amendement: 'Amendement sol',
    taille: 'Taille/Élagage',
    paillage: 'Paillage',
    observation: 'Observation',
    floraison: 'Floraison',
    fructification: 'Fructification',
    recolte: 'Récolte',
    maladie: 'Maladie/Problème',
    traitement: 'Traitement',
    transplantation: 'Transplantation',
    protection: 'Protection (hiver, animaux)',
    autre: 'Autre',
    mort: 'Mort',
    enlever: 'Enlevé',
  };
  var REMINDER_TYPE_LABELS = {
    arrosage: 'Arrosage',
    suivi_maladie: 'Suivi de maladie',
    taille: 'Taille',
    suivi_general: 'Suivi général',
    cueillette: 'Cueillette',
  };
  var REMINDER_ALERTE_LABELS = { email: 'Email', popup: 'Popup', son: 'Son' };

  function apiUrl(path) {
    var p = String(path || '').replace(/^\//, '');
    return (window.location.origin || '') + (window.API_BASE_PATH || '/api/') + p;
  }

  function fetchApi(path, opts) {
    opts = opts || {};
    opts.credentials = opts.credentials || 'include';
    var headers = opts.headers ? Object.assign({}, opts.headers) : {};
    var m = (opts.method || 'GET').toUpperCase();
    if (m !== 'GET' && m !== 'HEAD') {
      var tok = getCsrfToken();
      if (tok) headers['X-CSRFToken'] = tok;
    }
    if (!headers.Authorization) {
      var jwt = (window.location.search.match(/access_token=([^&]+)/) || [])[1];
      if (jwt) headers.Authorization = 'Bearer ' + decodeURIComponent(jwt);
    }
    if (opts.body instanceof FormData) {
      delete headers['Content-Type'];
    } else if (!headers.Accept) {
      headers.Accept = 'application/json';
    }
    opts.headers = headers;
    return fetch(apiUrl(path), opts);
  }

  function runTerrainRadixSync(options) {
    var statusEl = byId('terrain-admin-radix-status');
    var btns = document.querySelectorAll('.terrain-admin-radix-btn');
    if (radixSyncRunning) return;
    radixSyncRunning = true;
    btns.forEach(function (b) { b.disabled = true; });
    if (statusEl) statusEl.textContent = 'Synchronisation…';
    fetchApi('admin/run-command/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'sync_radixsylva', options: options || {} })
    })
      .then(function (r) {
        return r.text().then(function (text) {
          var j = {};
          try {
            j = text ? JSON.parse(text) : {};
          } catch (e) {
            j = { detail: text || 'Réponse invalide' };
          }
          return { r: r, j: j };
        });
      })
      .then(function (x) {
        if (!statusEl) return;
        if (!x.r.ok) {
          statusEl.textContent = (x.j.detail || x.j.output || 'Erreur HTTP ' + x.r.status).trim();
          return;
        }
        if (x.j.success === false) {
          statusEl.textContent = (x.j.output || x.j.detail || 'Échec').trim();
          return;
        }
        statusEl.textContent = (x.j.output || 'Commande exécutée.').trim();
      })
      .catch(function () {
        if (statusEl) statusEl.textContent = 'Erreur réseau.';
      })
      .finally(function () {
        radixSyncRunning = false;
        btns.forEach(function (b) { b.disabled = false; });
      });
  }

  function labelStatut(k) {
    return SPECIMEN_STATUT_LABELS[k] || k || '';
  }

  function labelEventType(k) {
    return EVENT_TYPE_LABELS[k] || k || '';
  }

  function labelReminderType(k) {
    return REMINDER_TYPE_LABELS[k] || k || '';
  }

  function labelAlerte(k) {
    return REMINDER_ALERTE_LABELS[k] || k || '';
  }

  function phenoIconForType(t) {
    if (t === 'floraison') return 'F';
    if (t === 'fructification') return 'Fr';
    if (t === 'recolte') return 'R';
    return '•';
  }

  function adminSpecimenChange(id) {
    return '/admin/species/specimen/' + id + '/change/';
  }

  function adminOrganismChange(id) {
    return '/admin/species/organism/' + id + '/change/';
  }

  function adminEventChange(id) {
    return '/admin/species/event/' + id + '/change/';
  }

  function fetchSpecimenDetailBundle(specimenId, done) {
    var base = 'specimens/' + specimenId + '/';
    function parseJson(r) {
      return r.json().then(function (j) { return { ok: r.ok, data: j }; }).catch(function () { return { ok: r.ok, data: null }; });
    }
    Promise.all([
      fetchApi(base).then(parseJson),
      fetchApi(base + 'events/').then(parseJson),
      fetchApi(base + 'reminders/').then(parseJson),
      fetchApi(base + 'photos/').then(parseJson),
      fetchApi(base + 'companions/').then(parseJson),
    ])
      .then(function (results) {
        if (!results[0].ok || !results[0].data) {
          done(new Error('detail'), null);
          return;
        }
        var detail = results[0].data;
        var events = results[1].ok && Array.isArray(results[1].data) ? results[1].data : [];
        var reminders = results[2].ok && Array.isArray(results[2].data) ? results[2].data : [];
        var photos = results[3].ok && Array.isArray(results[3].data) ? results[3].data : [];
        var companions = results[4].ok ? results[4].data : null;
        done(null, { detail: detail, events: events, reminders: reminders, photos: photos, companions: companions });
      })
      .catch(function (e) {
        done(e || new Error('fetch'), null);
      });
  }

  function mergeListIntoDetail(listS, detail) {
    if (!detail) return listS || {};
    if (!listS) return detail;
    var out = Object.assign({}, listS, detail);
    if (!out.organisme_nom && listS.organisme_nom) out.organisme_nom = listS.organisme_nom;
    if (!out.organisme_nom_latin && listS.organisme_nom_latin) out.organisme_nom_latin = listS.organisme_nom_latin;
    if (!out.garden_nom && listS.garden_nom) out.garden_nom = listS.garden_nom;
    return out;
  }

  function parseSpecimenApiErrorBody(j) {
    if (!j || typeof j !== 'object') return 'Erreur';
    if (j.detail) {
      if (typeof j.detail === 'string') return j.detail;
      if (Array.isArray(j.detail)) {
        return j.detail.map(function (x) { return typeof x === 'string' ? x : JSON.stringify(x); }).join(' ');
      }
    }
    if (j.non_field_errors) {
      var n = j.non_field_errors;
      return Array.isArray(n) ? n.join(', ') : String(n);
    }
    var parts = [];
    Object.keys(j).forEach(function (k) {
      var v = j[k];
      if (Array.isArray(v)) parts.push(k + ': ' + v.join(', '));
      else if (typeof v === 'string') parts.push(k + ': ' + v);
    });
    return parts.length ? parts.join(' ') : 'Erreur';
  }

  function reloadSpecimensFromApi(done) {
    var gid = GARDEN_DATA && GARDEN_DATA.id;
    if (!gid) {
      if (done) done();
      return;
    }
    fetchApi('specimens/?garden=' + encodeURIComponent(gid) + '&page_size=200')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.results != null ? data.results : (Array.isArray(data) ? data : []);
        specimens = list.map(function (row) {
          var o = Object.assign({}, row);
          if (row.organisme_nom && !o.organisme_nom_commun) o.organisme_nom_commun = row.organisme_nom;
          if (o.emoji == null) o.emoji = '🌱';
          return o;
        });
        if (typeof window.terrainCesiumRefreshSpecimens === 'function') {
          window.terrainCesiumRefreshSpecimens(specimens);
        }
        updateSpecimenList(null);
        if (done) done();
      })
      .catch(function () { if (done) done(); });
  }

  function buildStatutSelectOptionsHtml() {
    var out = '';
    Object.keys(SPECIMEN_STATUT_LABELS).forEach(function (k) {
      out += '<option value="' + esc(k) + '"' + (k === 'planifie' ? ' selected' : '') + '>' + esc(SPECIMEN_STATUT_LABELS[k]) + '</option>';
    });
    return out;
  }

  function buildSpecimenCreateFormHtml() {
    return '<div class="terrain-specimen-create">' +
      '<p class="terrain-specimen-create-intro">Choisissez l’espèce, donnez un nom au plant : il apparaîtra sur la carte après positionnement GPS.</p>' +
      '<label class="terrain-specimen-create-label" for="terrain-create-org-search">Espèce *</label>' +
      '<input type="search" class="terrain-specimen-create-input" id="terrain-create-org-search" placeholder="Rechercher (nom commun ou latin)…" autocomplete="off" />' +
      '<input type="hidden" id="terrain-create-org-id" value="" />' +
      '<div class="terrain-specimen-create-picked" id="terrain-create-org-picked" hidden></div>' +
      '<div class="terrain-specimen-create-results" id="terrain-create-org-results"></div>' +
      '<label class="terrain-specimen-create-label" for="terrain-create-nom">Nom du spécimen *</label>' +
      '<input type="text" class="terrain-specimen-create-input" id="terrain-create-nom" placeholder="Ex. Pommier Dolgo #1" maxlength="200" />' +
      '<label class="terrain-specimen-create-label" for="terrain-create-statut">Statut</label>' +
      '<select class="terrain-specimen-create-input" id="terrain-create-statut">' + buildStatutSelectOptionsHtml() + '</select>' +
      '<label class="terrain-specimen-create-label" for="terrain-create-zone">Zone (optionnel)</label>' +
      '<input type="text" class="terrain-specimen-create-input" id="terrain-create-zone" placeholder="Ex. Verger nord" />' +
      '<label class="terrain-specimen-create-label" for="terrain-create-date">Date plantation (optionnel)</label>' +
      '<input type="date" class="terrain-specimen-create-input" id="terrain-create-date" />' +
      '<p class="terrain-specimen-create-error" id="terrain-create-error" style="display:none"></p>' +
      '<button type="button" class="terrain-panel-btn terrain-specimen-create-submit" id="terrain-create-submit">Créer le spécimen</button>' +
      '</div>';
  }

  var specimenCreateSearchTimer = null;

  function wireSpecimenCreateForm() {
    var listEl = byId('terrain-specimen-list');
    if (!listEl) return;
    var lastOrgResultsById = {};
    var cancel = byId('terrain-specimen-create-cancel');
    var sub = byId('terrain-create-submit');
    var searchIn = byId('terrain-create-org-search');
    var resultsEl = byId('terrain-create-org-results');
    var pickedEl = byId('terrain-create-org-picked');
    var orgIdIn = byId('terrain-create-org-id');
    var errEl = byId('terrain-create-error');

    function showErr(t) {
      if (!errEl) return;
      errEl.style.display = t ? 'block' : 'none';
      errEl.textContent = t || '';
    }

    function clearOrg() {
      if (orgIdIn) orgIdIn.value = '';
      if (pickedEl) { pickedEl.hidden = true; pickedEl.textContent = ''; }
      if (searchIn) { searchIn.value = ''; searchIn.style.display = ''; }
    }

    function pickOrg(org) {
      if (!org || !org.id) return;
      if (orgIdIn) orgIdIn.value = String(org.id);
      if (searchIn) searchIn.style.display = 'none';
      if (pickedEl) {
        pickedEl.hidden = false;
        pickedEl.innerHTML = '<span class="terrain-create-picked-name">' + esc(org.nom_commun || '') + '</span>' +
          (org.nom_latin ? '<span class="terrain-create-picked-latin">' + esc(org.nom_latin) + '</span>' : '') +
          '<button type="button" class="terrain-create-picked-clear" aria-label="Changer d’espèce">✕</button>';
        var clr = pickedEl.querySelector('.terrain-create-picked-clear');
        if (clr) {
          clr.addEventListener('click', function () {
            clearOrg();
            if (resultsEl) resultsEl.innerHTML = '';
          });
        }
      }
      if (searchIn) searchIn.value = '';
      if (resultsEl) resultsEl.innerHTML = '';
    }

    if (cancel) cancel.addEventListener('click', function () { closeSpecimenCreateForm(); });

    if (searchIn) {
      searchIn.addEventListener('input', function () {
        if (orgIdIn && orgIdIn.value) return;
        var q = searchIn.value.trim();
        if (specimenCreateSearchTimer) clearTimeout(specimenCreateSearchTimer);
        if (!q || q.length < 2) {
          if (resultsEl) resultsEl.innerHTML = '';
          return;
        }
        specimenCreateSearchTimer = setTimeout(function () {
          fetchApi('organisms/?search=' + encodeURIComponent(q) + '&page_size=40')
            .then(function (r) { return r.json(); })
            .then(function (data) {
              var arr = data.results != null ? data.results : (Array.isArray(data) ? data : []);
              lastOrgResultsById = {};
              arr.forEach(function (o) { lastOrgResultsById[o.id] = o; });
              if (!resultsEl) return;
              resultsEl.innerHTML = arr.map(function (o) {
                return '<button type="button" class="terrain-create-org-item" data-org-id="' + esc(String(o.id)) + '">' +
                  '<span class="terrain-create-org-item-name">' + esc(o.nom_commun || '') + '</span>' +
                  '<span class="terrain-create-org-item-lat">' + esc(o.nom_latin || '') + '</span></button>';
              }).join('');
            });
        }, 320);
      });
    }

    if (resultsEl) {
      resultsEl.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('.terrain-create-org-item');
        if (!btn) return;
        var id = parseInt(btn.getAttribute('data-org-id'), 10);
        var o = lastOrgResultsById[id];
        if (o) pickOrg(o);
      });
    }

    if (sub) {
      sub.addEventListener('click', function () {
        showErr('');
        var gid = GARDEN_DATA && GARDEN_DATA.id;
        if (!gid) {
          showErr('Jardin introuvable.');
          return;
        }
        var oid = orgIdIn && orgIdIn.value ? parseInt(orgIdIn.value, 10) : NaN;
        if (!oid) {
          showErr('Choisissez une espèce.');
          return;
        }
        var nom = byId('terrain-create-nom');
        var nomVal = nom && nom.value ? String(nom.value).trim() : '';
        if (!nomVal) {
          showErr('Indiquez un nom pour le spécimen.');
          return;
        }
        var statut = byId('terrain-create-statut');
        var zone = byId('terrain-create-zone');
        var dateIn = byId('terrain-create-date');
        var body = {
          organisme: oid,
          garden: gid,
          nom: nomVal,
          statut: statut && statut.value ? statut.value : 'planifie',
        };
        if (zone && zone.value && String(zone.value).trim()) body.zone_jardin = String(zone.value).trim();
        if (dateIn && dateIn.value) body.date_plantation = dateIn.value;

        sub.disabled = true;
        fetchApi('specimens/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then(function (r) {
            if (!r.ok) {
              return r.text().then(function (txt) {
                var j = {};
                try {
                  if (txt) j = JSON.parse(txt);
                } catch (e) {
                  throw new Error((txt && txt.length < 200) ? txt : 'Erreur serveur');
                }
                throw new Error(parseSpecimenApiErrorBody(j));
              });
            }
            return r.json();
          })
          .then(function () {
            sub.disabled = false;
            reloadSpecimensFromApi(function () {
              switchTab('jardin');
            });
          })
          .catch(function (e) {
            sub.disabled = false;
            showErr(e.message || 'Création impossible.');
          });
      });
    }
  }

  function applyPresetOrganismToCreateForm(org) {
    if (!org || !org.id) return;
    var orgIdIn = byId('terrain-create-org-id');
    var pickedEl = byId('terrain-create-org-picked');
    var searchIn = byId('terrain-create-org-search');
    if (orgIdIn) orgIdIn.value = String(org.id);
    if (searchIn) { searchIn.style.display = 'none'; searchIn.value = ''; }
    if (pickedEl) {
      pickedEl.hidden = false;
      pickedEl.innerHTML = '<span class="terrain-create-picked-name">' + esc(org.nom_commun || '') + '</span>' +
        (org.nom_latin ? '<span class="terrain-create-picked-latin">' + esc(org.nom_latin) + '</span>' : '') +
        '<button type="button" class="terrain-create-picked-clear" aria-label="Changer d’espèce">✕</button>';
      var clr = pickedEl.querySelector('.terrain-create-picked-clear');
      if (clr) {
        clr.addEventListener('click', function () {
          if (orgIdIn) orgIdIn.value = '';
          pickedEl.hidden = true;
          pickedEl.textContent = '';
          if (searchIn) { searchIn.style.display = ''; searchIn.value = ''; }
        });
      }
    }
  }

  function openSpecimenCreateForm(presetOrg) {
    var listEl = byId('terrain-specimen-list');
    if (!listEl) return;
    var gid = GARDEN_DATA && GARDEN_DATA.id;
    if (!gid) {
      alert('Aucun jardin associé à cette vue.');
      return;
    }
    setPanelMode('open');
    switchTab('jardin');
    setPanelTitle('Nouveau spécimen', true);
    listEl.innerHTML = buildSpecimenCreateFormHtml();
    wireSpecimenCreateForm();
    if (presetOrg && presetOrg.id) applyPresetOrganismToCreateForm(presetOrg);
  }

  function closeSpecimenCreateForm() {
    setPanelTitle(TAB_TITLES[currentTab] || currentTab);
    updateSpecimenList(null);
  }

  var ORGANISM_TYPE_LABELS = {
    arbre_fruitier: 'Arbre fruitier',
    arbre_noix: 'Arbre à noix',
    arbre_ornement: 'Arbre d’ornement',
    arbre_bois: 'Arbre forestier',
    arbuste_fruitier: 'Arbuste fruitier',
    arbuste_baies: 'Arbuste à baies',
    arbuste: 'Arbuste',
    vivace: 'Vivace',
    annuelle: 'Annuelle',
    bisannuelle: 'Bisannuelle',
    herbe_aromatique: 'Herbe aromatique',
    legume: 'Légume',
    grimpante: 'Grimpante',
    couvre_sol: 'Couvre-sol',
    champignon_comestible: 'Champignon comestible',
    champignon_mycorhize: 'Champignon mycorhizien',
    mousse: 'Mousse',
  };

  var BESOIN_SOLEIL_LABELS = {
    ombre_complete: 'Ombre complète',
    ombre: 'Ombre',
    mi_ombre: 'Mi-ombre',
    soleil_partiel: 'Soleil partiel',
    plein_soleil: 'Plein soleil',
  };

  var BESOIN_EAU_LABELS = {
    tres_faible: 'Très faible',
    faible: 'Faible',
    moyen: 'Moyen',
    eleve: 'Élevé',
    tres_eleve: 'Très élevé',
  };

  function labelOrganismType(k) {
    return ORGANISM_TYPE_LABELS[k] || k || '—';
  }

  function formatOrganismZones(z) {
    if (!z) return '—';
    if (typeof z === 'string') {
      try {
        var parsed = JSON.parse(z);
        return formatOrganismZones(parsed);
      } catch (e) {
        return z;
      }
    }
    if (!Array.isArray(z)) return '—';
    var parts = z.map(function (item) {
      if (item && typeof item === 'object' && item.zone) return String(item.zone);
      return null;
    }).filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  function getEspecesFilterParams() {
    var p = new URLSearchParams();
    var search = byId('terrain-especes-search');
    if (search && search.value.trim()) p.set('search', search.value.trim());
    var typeEl = byId('terrain-especes-type');
    if (typeEl && typeEl.value) p.set('type', typeEl.value);
    var sol = byId('terrain-especes-soleil');
    if (sol && sol.value) p.set('soleil', sol.value);
    var zone = byId('terrain-especes-zone');
    if (zone && zone.value) p.set('zone_usda', zone.value);
    var vig = byId('terrain-especes-vigueur');
    if (vig && vig.value) p.set('vigueur', vig.value);
    if (byId('terrain-especes-favoris') && byId('terrain-especes-favoris').checked) p.set('favoris', '1');
    if (byId('terrain-especes-fruits') && byId('terrain-especes-fruits').checked) p.set('fruits', '1');
    if (byId('terrain-especes-noix') && byId('terrain-especes-noix').checked) p.set('noix', '1');
    var gid = GARDEN_DATA && GARDEN_DATA.id;
    if (byId('terrain-especes-has-specimen') && byId('terrain-especes-has-specimen').checked && gid) {
      p.set('has_specimen', '1');
      p.set('garden', String(gid));
    }
    return p;
  }

  function tryEspecesFillViewport() {
    if (currentTab !== 'especes') return;
    if (especesState.loading || especesState.loadingMore) return;
    if (!especesState.hasMore) return;
    var el = byId('terrain-content-especes');
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 12) {
      fetchEspecesList(false);
    }
  }

  function onEspecesTabScroll() {
    if (especesScrollRaf) return;
    especesScrollRaf = requestAnimationFrame(function () {
      especesScrollRaf = null;
      if (currentTab !== 'especes') return;
      if (especesState.loading || especesState.loadingMore) return;
      if (!especesState.hasMore) return;
      var el = byId('terrain-content-especes');
      if (!el) return;
      var threshold = 100;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < threshold) {
        fetchEspecesList(false);
      }
    });
  }

  function buildMissingSpeciesEmptyHtml(searchVal) {
    return '<div class="terrain-especes-empty terrain-missing-species">' +
      '<p class="terrain-especes-empty-title">Aucune espèce ne correspond à « ' + esc(searchVal) + ' ».</p>' +
      '<p class="terrain-missing-species-hint">Proposez une espèce absente du catalogue. Après envoi, elle est ajoutée au catalogue (copie depuis Radix Sylva) ; la fiche peut encore s’enrichir (VASCAN, etc.).</p>' +
      '<div class="terrain-missing-species-fields">' +
      '<label class="terrain-missing-label">Nom latin <span class="req">*</span>' +
      '<input type="text" id="terrain-missing-nom-latin" class="terrain-missing-input" value="' + esc(searchVal) + '" autocomplete="off"/></label>' +
      '<label class="terrain-missing-label">Nom commun' +
      '<input type="text" id="terrain-missing-nom-commun" class="terrain-missing-input" value="" autocomplete="off"/></label>' +
      '<button type="button" class="terrain-panel-btn terrain-missing-submit" id="terrain-missing-submit">Envoyer la demande</button>' +
      '</div>' +
      '<p id="terrain-missing-msg" class="terrain-missing-msg" style="display:none" aria-live="polite"></p>' +
      '</div>';
  }

  function wireMissingSpeciesFormOnce() {
    var btn = byId('terrain-missing-submit');
    if (!btn || btn.dataset.wired === '1') return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', function () {
      var latin = byId('terrain-missing-nom-latin');
      var commun = byId('terrain-missing-nom-commun');
      var searchEl = byId('terrain-especes-search');
      var msg = byId('terrain-missing-msg');
      var latinVal = latin && latin.value ? latin.value.trim() : '';
      if (!latinVal) {
        if (msg) {
          msg.style.display = 'block';
          msg.textContent = 'Le nom latin est requis.';
          msg.className = 'terrain-missing-msg terrain-missing-msg--err';
        }
        return;
      }
      btn.disabled = true;
      fetchApi('organisms/missing-species-request/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_latin: latinVal,
          nom_commun: commun && commun.value ? commun.value.trim() : '',
          search_query: searchEl && searchEl.value ? searchEl.value.trim() : '',
        }),
      })
        .then(function (r) {
          return r.text().then(function (txt) {
            var j = {};
            try {
              if (txt) j = JSON.parse(txt);
            } catch (e) {}
            if (!r.ok) {
              var parts = [];
              if (j.detail) parts.push(String(j.detail));
              if (j.radix_detail != null && j.radix_detail !== '') {
                var rd = j.radix_detail;
                if (typeof rd === 'object') {
                  try {
                    rd = JSON.stringify(rd);
                  } catch (e) {
                    rd = String(rd);
                  }
                }
                parts.push(String(rd));
              }
              if (j.hint) parts.push(String(j.hint));
              if (j.http_status != null) {
                parts.push('(réponse Radix HTTP ' + j.http_status + ')');
              }
              var errMsg = parts.length
                ? parts.join(' ')
                : String(j.error || txt || 'Erreur').slice(0, 800);
              throw new Error(errMsg.slice(0, 1200));
            }
            return j;
          });
        })
        .then(function (j) {
          if (msg) {
            msg.style.display = 'block';
            msg.className = 'terrain-missing-msg terrain-missing-msg--ok';
            var parts = [];
            if (j.organism && j.organism.nom_latin) {
              parts.push('« ' + j.organism.nom_latin + ' » a été ajouté au catalogue.');
            }
            if (j.message) {
              parts.push(j.message);
            }
            msg.textContent = parts.length ? parts.join(' ') : 'Demande enregistrée.';

            // Bouton "Créer un spécimen" si l'organisme est dispo immédiatement
            var oldCta = byId('terrain-missing-cta-specimen');
            if (oldCta) oldCta.parentNode.removeChild(oldCta);
            if (j.organism && j.organism.id && !j.sync_error) {
              var ctaBtn = document.createElement('button');
              ctaBtn.type = 'button';
              ctaBtn.id = 'terrain-missing-cta-specimen';
              ctaBtn.className = 'terrain-panel-btn terrain-missing-cta';
              ctaBtn.textContent = '+ Créer un spécimen';
              var capturedOrg = { id: j.organism.id, nom_commun: j.organism.nom_commun || j.organism.nom_latin, nom_latin: j.organism.nom_latin };
              ctaBtn.addEventListener('click', function () {
                // On ouvre le formulaire sans preset, puis on applique l'organisme
                // dans le prochain cycle de rendu pour être sûr que les éléments
                // terrain-create-org-* sont dans le DOM.
                openSpecimenCreateForm();
                requestAnimationFrame(function () {
                  applyPresetOrganismToCreateForm(capturedOrg);
                });
              });
              msg.parentNode.insertBefore(ctaBtn, msg.nextSibling);
            }
          }
        })
        .catch(function (e) {
          if (msg) {
            msg.style.display = 'block';
            msg.className = 'terrain-missing-msg terrain-missing-msg--err';
            msg.textContent = e.message || 'Échec.';
          }
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  function fetchEspecesList(reset) {
    if (especesState.loading || especesState.loadingMore) return;
    if (reset) {
      especesState.page = 1;
      especesState.organisms = [];
      especesState.hasMore = true;
    }
    if (!reset && !especesState.hasMore) return;

    var first = especesState.page === 1;
    if (first) especesState.loading = true;
    else especesState.loadingMore = true;

    var listEl = byId('terrain-especes-list');
    var pList = getEspecesFilterParams();
    pList.set('page', String(especesState.page));
    var qsList = pList.toString();

    var pCount = getEspecesFilterParams();
    var qsCount = pCount.toString();

    if (first && listEl) listEl.innerHTML = '<p class="terrain-especes-loading">Chargement…</p>';
    var loadingMoreEl = byId('terrain-especes-loading-more');
    if (loadingMoreEl) loadingMoreEl.style.display = first ? 'none' : 'block';

    Promise.all([
      fetchApi('organisms/?' + qsList).then(function (r) { return r.json(); }),
      fetchApi('organisms/count/' + (qsCount ? '?' + qsCount : ''))
        .then(function (r) { return r.json(); })
        .catch(function () { return { count: null }; }),
    ])
      .then(function (results) {
        var data = results[0];
        var countPayload = results[1];
        var rows = data.results != null ? data.results : (Array.isArray(data) ? data : []);
        var count = typeof countPayload.count === 'number' ? countPayload.count : rows.length;
        var isFirstPage = especesState.page === 1;
        var searchInEl = byId('terrain-especes-search');
        var searchValTrim = searchInEl && searchInEl.value ? searchInEl.value.trim() : '';
        if (especesState.page === 1) {
          especesState.organisms = rows;
        } else {
          especesState.organisms = especesState.organisms.concat(rows);
        }
        especesState.hasMore = !!data.next;
        especesState.page += 1;
        var meta = byId('terrain-especes-meta');
        if (meta) {
          meta.textContent = especesState.organisms.length + ' affichée(s) · ' + count + ' au total (filtres Radix)';
        }
        if (listEl) {
          if (rows.length === 0 && count === 0 && isFirstPage && searchValTrim.length >= 2) {
            listEl.innerHTML = buildMissingSpeciesEmptyHtml(searchValTrim);
            wireMissingSpeciesFormOnce();
          } else if (rows.length === 0 && count === 0 && isFirstPage) {
            listEl.innerHTML = '<p class="terrain-especes-empty terrain-especes-empty-title">Aucun résultat.</p>';
          } else {
          listEl.innerHTML = especesState.organisms.map(function (o) {
            var thumb = o.photo_principale_url
              ? '<img class="terrain-especes-thumb" src="' + esc(o.photo_principale_url) + '" alt=""/>'
              : '<div class="terrain-especes-thumb terrain-especes-thumb--ph" aria-hidden="true">🌿</div>';
            var fav = o.is_favori ? '★' : '☆';
            return '<div class="terrain-especes-card" data-organism-id="' + esc(String(o.id)) + '">' +
              '<button type="button" class="terrain-especes-card-main">' +
              thumb +
              '<span class="terrain-especes-card-text">' +
              '<span class="terrain-especes-name">' + esc(o.nom_commun || '') + '</span>' +
              '<span class="terrain-especes-latin">' + esc(o.nom_latin || '') + '</span>' +
              '<span class="terrain-especes-type">' + esc(labelOrganismType(o.type_organisme)) + '</span>' +
              '</span></button>' +
              '<div class="terrain-especes-card-actions">' +
              '<button type="button" class="terrain-especes-fav" data-organism-id="' + esc(String(o.id)) + '" data-favori="' + (o.is_favori ? '1' : '0') + '" title="Favori">' + fav + '</button>' +
              '<button type="button" class="terrain-panel-btn terrain-especes-quick-add" data-organism-id="' + esc(String(o.id)) + '" title="Nouveau spécimen">+ Spécimen</button>' +
              '</div></div>';
          }).join('');
          }
        }
        var loadingMoreElAfter = byId('terrain-especes-loading-more');
        if (loadingMoreElAfter) loadingMoreElAfter.style.display = 'none';
        requestAnimationFrame(function () {
          tryEspecesFillViewport();
        });
      })
      .catch(function () {
        if (listEl) listEl.innerHTML = '<p class="terrain-especes-error">Impossible de charger le catalogue. Êtes-vous connecté ?</p>';
        var loadingMoreErr = byId('terrain-especes-loading-more');
        if (loadingMoreErr) loadingMoreErr.style.display = 'none';
      })
      .finally(function () {
        especesState.loading = false;
        especesState.loadingMore = false;
        var loadingMoreFin = byId('terrain-especes-loading-more');
        if (loadingMoreFin) loadingMoreFin.style.display = 'none';
      });
  }

  function wireEspecesPanelOnce() {
    var search = byId('terrain-especes-search');
    var toggle = byId('terrain-especes-filter-toggle');
    var filters = byId('terrain-especes-filters');
    var clearBtn = byId('terrain-especes-clear');
    var listEl = byId('terrain-especes-list');
    var especesTab = byId('terrain-content-especes');
    if (especesTab && !especesTab.dataset.especesScrollBound) {
      especesTab.dataset.especesScrollBound = '1';
      especesTab.addEventListener('scroll', onEspecesTabScroll, { passive: true });
    }

    if (toggle && filters) {
      toggle.addEventListener('click', function () {
        var open = !filters.hidden;
        filters.hidden = open;
        toggle.classList.toggle('active', !open);
      });
    }

    if (search) {
      search.addEventListener('input', debounce(function () {
        fetchEspecesList(true);
      }, 350));
    }

    ['terrain-especes-type', 'terrain-especes-soleil', 'terrain-especes-zone', 'terrain-especes-vigueur'].forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener('change', function () { fetchEspecesList(true); });
    });
    ['terrain-especes-favoris', 'terrain-especes-fruits', 'terrain-especes-noix', 'terrain-especes-has-specimen'].forEach(function (id) {
      var el = byId(id);
      if (el) el.addEventListener('change', function () { fetchEspecesList(true); });
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (search) search.value = '';
        var t = byId('terrain-especes-type');
        if (t) t.value = '';
        var s = byId('terrain-especes-soleil');
        if (s) s.value = '';
        var z = byId('terrain-especes-zone');
        if (z) z.value = '';
        var v = byId('terrain-especes-vigueur');
        if (v) v.value = '';
        ['terrain-especes-favoris', 'terrain-especes-fruits', 'terrain-especes-noix', 'terrain-especes-has-specimen'].forEach(function (cid) {
          var c = byId(cid);
          if (c) c.checked = false;
        });
        fetchEspecesList(true);
      });
    }

    if (listEl) {
      listEl.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        var quick = t.closest('.terrain-especes-quick-add');
        if (quick) {
          e.preventDefault();
          e.stopPropagation();
          var oid = quick.getAttribute('data-organism-id');
          var row = especesState.organisms.filter(function (x) { return String(x.id) === String(oid); })[0];
          if (row) openSpecimenCreateForm({ id: row.id, nom_commun: row.nom_commun, nom_latin: row.nom_latin });
          return;
        }
        var favBtn = t.closest('.terrain-especes-fav');
        if (favBtn) {
          e.preventDefault();
          e.stopPropagation();
          var id = parseInt(favBtn.getAttribute('data-organism-id'), 10);
          var was = favBtn.getAttribute('data-favori') === '1';
          var method = was ? 'DELETE' : 'POST';
          var favOpts = was
            ? { method: 'DELETE' }
            : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
          fetchApi('organisms/' + id + '/favoris/', favOpts)
            .then(function (r) {
              if (!r.ok) throw new Error();
              var next = !was;
              favBtn.setAttribute('data-favori', next ? '1' : '0');
              favBtn.textContent = next ? '★' : '☆';
              especesState.organisms.forEach(function (o) {
                if (o.id === id) o.is_favori = next;
              });
            })
            .catch(function () {});
          return;
        }
        var main = t.closest('.terrain-especes-card-main');
        if (main) {
          var card = main.closest('.terrain-especes-card');
          if (card && card.dataset.organismId) openOrganismDetailDrawer(parseInt(card.dataset.organismId, 10));
        }
      });
    }
  }

  function loadEspecesContent() {
    if (!especesWired) {
      especesWired = true;
      wireEspecesPanelOnce();
    }
    fetchEspecesList(true);
  }

  function buildOrganismDetailSheetHtml(d) {
    if (!d || !d.id) return '<div class="terrain-specimen-sheet terrain-specimen-sheet--error"><p>Espèce introuvable.</p></div>';
    var photo = d.photo_principale_url
      ? '<img class="terrain-organism-hero" src="' + esc(d.photo_principale_url) + '" alt=""/>'
      : '';
    var desc = (d.description && String(d.description).trim()) ? '<div class="terrain-organism-desc">' + esc(String(d.description).slice(0, 1200)) + (String(d.description).length > 1200 ? '…' : '') + '</div>' : '';
    var favStar = d.is_favori ? '★ Retirer des favoris' : '☆ Ajouter aux favoris';
    return '<div class="terrain-organism-sheet terrain-specimen-sheet">' +
      '<div class="terrain-organism-cta-top">' +
      '<button type="button" class="terrain-panel-btn terrain-organism-new-specimen" id="terrain-organism-new-specimen">+ Nouveau spécimen</button>' +
      '<button type="button" class="terrain-panel-btn terrain-panel-btn--secondary terrain-organism-fav-toggle" id="terrain-organism-fav-toggle" data-favori="' + (d.is_favori ? '1' : '0') + '">' + esc(favStar) + '</button>' +
      '</div>' +
      (photo ? '<div class="terrain-organism-hero-wrap">' + photo + '</div>' : '') +
      '<header class="terrain-fiche-header terrain-organism-header">' +
      '<h2 class="terrain-fiche-title">' + esc(d.nom_commun || '') + '</h2>' +
      '<p class="terrain-fiche-latin">' + esc(d.nom_latin || '') + '</p>' +
      '<p class="terrain-organism-type-pill">' + esc(labelOrganismType(d.type_organisme)) + '</p>' +
      '</header>' +
      desc +
      '<div class="terrain-fiche-body">' +
      '<div class="terrain-fiche-card">' +
      '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Famille</span><span class="terrain-fiche-val">' + esc(d.famille || '—') + '</span></div>' +
      '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Règne</span><span class="terrain-fiche-val">' + esc(d.regne || '—') + '</span></div>' +
      '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Soleil</span><span class="terrain-fiche-val">' + esc(BESOIN_SOLEIL_LABELS[d.besoin_soleil] || d.besoin_soleil || '—') + '</span></div>' +
      '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Eau</span><span class="terrain-fiche-val">' + esc(BESOIN_EAU_LABELS[d.besoin_eau] || d.besoin_eau || '—') + '</span></div>' +
      '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Rusticité (zones)</span><span class="terrain-fiche-val">' + esc(formatOrganismZones(d.zone_rusticite)) + '</span></div>' +
      '</div>' +
      '<div class="terrain-fiche-card" id="terrain-organism-specimens-in-garden"><p class="terrain-especes-loading">Spécimens dans ce jardin…</p></div>' +
      '</div></div>';
  }

  function wireOrganismDetailSheet(rootEl, d) {
    var addBtn = rootEl.querySelector('#terrain-organism-new-specimen');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        openSpecimenCreateForm({ id: d.id, nom_commun: d.nom_commun, nom_latin: d.nom_latin });
      });
    }
    var favBtn = rootEl.querySelector('#terrain-organism-fav-toggle');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        var was = favBtn.getAttribute('data-favori') === '1';
        var favOpts = was
          ? { method: 'DELETE' }
          : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };
        fetchApi('organisms/' + d.id + '/favoris/', favOpts)
          .then(function (r) {
            if (!r.ok) throw new Error();
            var next = !was;
            favBtn.setAttribute('data-favori', next ? '1' : '0');
            favBtn.textContent = next ? '★ Retirer des favoris' : '☆ Ajouter aux favoris';
            d.is_favori = next;
          })
          .catch(function () {});
      });
    }
    var box = rootEl.querySelector('#terrain-organism-specimens-in-garden');
    var gid = GARDEN_DATA && GARDEN_DATA.id;
    if (box && gid) {
      fetchApi('specimens/?organisme=' + d.id + '&garden=' + gid + '&page_size=40')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var list = data.results != null ? data.results : [];
          if (list.length === 0) {
            box.innerHTML = '<p class="terrain-organism-specimens-empty">Aucun spécimen de cette espèce dans ce jardin pour l’instant.</p>';
            return;
          }
          box.innerHTML = '<div class="terrain-fiche-section-title">Dans ce jardin</div>' +
            list.map(function (s) {
              return '<button type="button" class="terrain-organism-specimen-link" data-specimen-id="' + esc(String(s.id)) + '">' +
                esc(s.nom || 'Spécimen') + ' · ' + esc(s.statut || '') + '</button>';
            }).join('');
          box.querySelectorAll('.terrain-organism-specimen-link').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var sid = parseInt(btn.getAttribute('data-specimen-id'), 10);
              if (!sid) return;
              setPanelMode('open');
              switchTab('jardin');
              openSpecimenOverlay({ id: sid });
            });
          });
        })
        .catch(function () {
          box.innerHTML = '<p class="terrain-organism-specimens-empty">Impossible de charger les spécimens.</p>';
        });
    } else if (box) {
      box.innerHTML = '<p class="terrain-organism-specimens-empty">Associez un jardin à la vue pour lister les spécimens.</p>';
    }
  }

  function openOrganismDetailDrawer(orgId) {
    if (!panelDetailEl || !orgId) return;
    setPanelMode('detail');
    var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
    if (detailTitleEl) detailTitleEl.textContent = 'Espèce';
    panelDetailEl.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--loading"><p>Chargement…</p></div>';
    fetchApi('organisms/' + orgId + '/')
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(function (d) {
        if (detailTitleEl) detailTitleEl.textContent = d.nom_commun || 'Espèce';
        panelDetailEl.innerHTML = buildOrganismDetailSheetHtml(d);
        wireOrganismDetailSheet(panelDetailEl, d);
      })
      .catch(function () {
        panelDetailEl.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--error"><p>Impossible de charger l’espèce.</p></div>';
      });
  }

  function buildSpecimenMobileSheetHtml(bundle) {
    var d = bundle.detail;
    if (!d || !d.id) return '<div class="terrain-specimen-sheet terrain-specimen-sheet--error"><p>Impossible de charger le spécimen.</p></div>';

    var events = bundle.events || [];
    var reminders = bundle.reminders || [];
    var photos = bundle.photos || [];
    var companions = bundle.companions;

    var org = d.organisme || {};
    var orgId = org.id != null ? org.id : null;
    var orgCommun = org.nom_commun || d.organisme_nom || '';
    var orgLatin = org.nom_latin || d.organisme_nom_latin || '';
    var orgLine = '';
    if (orgCommun || orgLatin) {
      orgLine = '<p class="terrain-specimen-org">' + esc(orgCommun) + (orgLatin ? ' (' + esc(orgLatin) + ')' : '') + '</p>';
    }

    var statutKey = d.statut || '';
    var statutLine = '<p class="terrain-specimen-statut">' + esc(labelStatut(statutKey)) + '</p>';

    var gardenNom = (d.garden && d.garden.nom) ? d.garden.nom : (d.garden_nom || '');
    var infosHtml = '';
    infosHtml += '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Jardin</span><span class="terrain-fiche-val">' + esc(gardenNom || 'Non assigné') + '</span></div>';
    if (d.zone_jardin) {
      infosHtml += '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Zone</span><span class="terrain-fiche-val">' + esc(d.zone_jardin) + '</span></div>';
    }
    if (d.date_plantation) {
      infosHtml += '<div class="terrain-fiche-row"><span class="terrain-fiche-label">Planté le</span><span class="terrain-fiche-val">' + esc(String(d.date_plantation)) + '</span></div>';
    }
    var gps = (d.latitude != null && d.longitude != null) ? (Number(d.latitude).toFixed(5) + ', ' + Number(d.longitude).toFixed(5)) : 'Non renseigné';
    infosHtml += '<div class="terrain-fiche-row"><span class="terrain-fiche-label">GPS</span><span class="terrain-fiche-val">' + esc(gps) + '</span></div>';
    if (d.notes != null && String(d.notes).trim() !== '') {
      infosHtml += '<p class="terrain-specimen-notes">' + esc(String(d.notes)) + '</p>';
    }

    var cal = d.organism_calendrier || [];
    var phenoHtml = '';
    if (cal.length > 0) {
      var rows = '';
      cal.forEach(function (c) {
        var disp = c.type_periode_display || c.type_periode || '';
        var mois = c.mois_debut != null && c.mois_fin != null ? 'Mois ' + c.mois_debut + '–' + c.mois_fin : '—';
        rows += '<div class="terrain-specimen-pheno-row"><span class="terrain-specimen-pheno-icon">' + esc(phenoIconForType(c.type_periode)) + '</span>' +
          '<span class="terrain-specimen-pheno-txt">' + esc(disp) + ' — ' + esc(mois) + '</span></div>';
      });
      var y = new Date().getFullYear();
      var yStr = String(y);
      var obsRows = '';
      ['floraison', 'fructification', 'recolte'].forEach(function (typeEv) {
        var ev = events.filter(function (e) { return e.type_event === typeEv && String(e.date || '').indexOf(yStr) === 0; })[0];
        var txt = ev ? String(ev.date) : 'Pas encore enregistré';
        obsRows += '<div class="terrain-specimen-pheno-row"><span class="terrain-specimen-pheno-txt">' + esc(labelEventType(typeEv)) + ' : ' + esc(txt) + '</span></div>';
      });
      phenoHtml = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Stade phénologique</h3>' +
        '<p class="terrain-specimen-subtitle">Calendrier de référence</p>' + rows +
        '<p class="terrain-specimen-subtitle terrain-specimen-subtitle--spaced">Observations confirmées (cette année)</p>' + obsRows +
        '<button type="button" class="terrain-specimen-btn terrain-specimen-btn--primary" id="terrain-specimen-pheno-cta">Confirmer un stade (floraison, fructification, récolte)</button></section>';
    }

    var pollHtml = '';
    var pas = d.pollination_associations;
    if (pas && pas.length) {
      var blocks = '';
      pas.forEach(function (assoc) {
        var gtype = assoc.type_groupe === 'male_female' ? 'Mâle / femelle' : 'Pollinisation croisée';
        var ghead = gtype + (assoc.role != null && assoc.role !== '' ? ' — Rôle : ' + assoc.role : '');
        blocks += '<p class="terrain-specimen-pollin-head">' + esc(String(ghead)) + '</p>';
        (assoc.other_members || []).forEach(function (m) {
          var alertCls = m.alerte_distance ? ' terrain-specimen-pollin-row--alert' : '';
          blocks += '<button type="button" class="terrain-specimen-pollin-row' + alertCls + '" data-open-specimen-id="' + esc(String(m.specimen_id)) + '">' +
            '<span class="terrain-specimen-pollin-main">' + esc(m.nom || '') + '</span>' +
            (m.organisme_nom ? '<span class="terrain-specimen-pollin-sub">' + esc(m.organisme_nom) + '</span>' : '') +
            (m.distance_metres != null ? '<span class="terrain-specimen-pollin-dist">' + esc(String(m.distance_metres)) + ' m</span>' : '') +
            (m.alerte_distance ? '<span class="terrain-specimen-pollin-warn">Zone trop loin</span>' : '') +
            '<span class="terrain-specimen-pollin-chev">›</span></button>';
        });
      });
      pollHtml = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Associé à (pollinisation)</h3>' + blocks + '</section>';
    }

    var compHtml = '';
    if (companions) {
      var bd = companions.benefices_de || { actifs: [], manquants: [] };
      var aa = companions.aide_a || { actifs: [], manquants: [] };
      var hasB = (bd.actifs && bd.actifs.length) + (bd.manquants && bd.manquants.length) > 0;
      var hasA = (aa.actifs && aa.actifs.length) + (aa.manquants && aa.manquants.length) > 0;
      if (hasB || hasA) {
        compHtml = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Compagnonnage</h3>';
        if (d.latitude == null || d.longitude == null) {
          compHtml += '<p class="terrain-specimen-gps-note">Ajoutez les coordonnées GPS pour calculer les distances.</p>';
        }
        function companionRow(e, isActive) {
          var line = (e.specimen_nom || e.organisme_nom || '') +
            (e.distance_metres != null ? ' à ' + e.distance_metres + ' m' : '') +
            ' — ' + (e.type_relation_display || e.type_relation) + ' (' + (e.force != null ? e.force : '') + ')';
          if (isActive && e.specimen_id != null) {
            return '<div class="terrain-specimen-comp-row"><span>' + esc(line) + '</span>' +
              '<button type="button" class="terrain-specimen-link-btn" data-open-specimen-id="' + esc(String(e.specimen_id)) + '">›</button></div>';
          }
          if (!isActive) {
            return '<div class="terrain-specimen-comp-row terrain-specimen-comp-row--missing"><span>' +
              esc('Aucun ' + (e.organisme_nom || '') + (e.distance_optimale != null ? ' dans un rayon de ' + e.distance_optimale + ' m' : ' dans le jardin')) +
              '</span><a class="terrain-specimen-inline-link" href="/admin/species/organism/">Voir les espèces compatibles →</a></div>';
          }
          return '<div class="terrain-specimen-comp-row"><span>' + esc(line) + '</span></div>';
        }
        if (hasB) {
          compHtml += '<p class="terrain-specimen-subtitle">Ce spécimen bénéficie de</p>';
          (bd.actifs || []).forEach(function (e) { compHtml += companionRow(e, true); });
          (bd.manquants || []).forEach(function (e) { compHtml += companionRow(e, false); });
        }
        if (hasA) {
          compHtml += '<p class="terrain-specimen-subtitle' + (hasB ? ' terrain-specimen-subtitle--spaced' : '') + '">Ce spécimen aide</p>';
          (aa.actifs || []).forEach(function (e) { compHtml += companionRow(e, true); });
          (aa.manquants || []).forEach(function (e) { compHtml += companionRow(e, false); });
        }
        compHtml += '</section>';
      }
    }

    var photosHtml = '';
    if (photos.length) {
      photosHtml += '<div class="terrain-specimen-photo-strip">';
      photos.forEach(function (p) {
        var u = p.image_url || '';
        if (u) {
          photosHtml += '<a class="terrain-specimen-photo-thumb" href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt=""/></a>';
        }
      });
      photosHtml += '</div>';
    }
    photosHtml = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Photos</h3>' +
      '<div class="terrain-specimen-photo-actions">' +
      '<label class="terrain-specimen-btn terrain-specimen-btn--secondary terrain-specimen-file-label">' +
      '<input type="file" accept="image/*" class="terrain-specimen-photo-input" id="terrain-specimen-photo-file"/>' +
      'Ajouter une photo</label></div>' + photosHtml + '</section>';

    var remHtml = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Rappels</h3>';
    if (!reminders.length) {
      remHtml += '<p class="terrain-specimen-empty">Aucun rappel</p>';
    } else {
      reminders.forEach(function (r) {
        remHtml += '<div class="terrain-specimen-list-row">' +
          '<span class="terrain-specimen-ev-type">' + esc(labelReminderType(r.type_rappel)) + '</span>' +
          '<span class="terrain-specimen-ev-date">' + esc(r.date_rappel) + ' • ' + esc(labelAlerte(r.type_alerte)) + '</span>' +
          (r.titre ? '<span class="terrain-specimen-ev-titre">' + esc(r.titre) + '</span>' : '') +
          '</div>';
      });
    }
    remHtml += '</section>';

    var evList = '';
    events.slice(0, 10).forEach(function (ev) {
      evList += '<a class="terrain-specimen-list-row terrain-specimen-list-row--link" href="' + esc(adminEventChange(ev.id)) + '" target="_blank" rel="noopener">' +
        '<span class="terrain-specimen-ev-type">' + esc(labelEventType(ev.type_event)) + '</span>' +
        '<span class="terrain-specimen-ev-date">' + esc(String(ev.date)) + '</span>' +
        (ev.titre ? '<span class="terrain-specimen-ev-titre">' + esc(ev.titre) + '</span>' : '') +
        '</a>';
    });
    var eventsWithPhoto = events.slice(0, 10).map(function (ev) {
      var ph = photos.filter(function (p) { return p.event_id === ev.id; })[0];
      return ph ? { ev: ev, ph: ph } : null;
    }).filter(Boolean);
    var evStrip = '';
    eventsWithPhoto.forEach(function (o) {
      var u = o.ph.image_url || '';
      if (!u) return;
      evStrip += '<a class="terrain-specimen-ev-thumb" href="' + esc(adminEventChange(o.ev.id)) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(u) + '" alt=""/>' +
        '<span class="terrain-specimen-ev-thumb-cap">' + esc(labelEventType(o.ev.type_event)) + ' — ' + esc(String(o.ev.date)) + '</span></a>';
    });

    var eventsSection = '<section class="terrain-specimen-section terrain-specimen-events" id="terrain-specimen-events-wrap">' +
      '<div class="terrain-specimen-events-head">' +
      '<h3 class="terrain-specimen-section-title">Événements récents</h3>' +
      '<div class="terrain-specimen-view-toggle">' +
      '<button type="button" class="terrain-specimen-icon-btn' + (!bundle.eventsImageMode ? ' is-active' : '') + '" id="terrain-specimen-ev-mode-list" title="Liste">≡</button>' +
      '<button type="button" class="terrain-specimen-icon-btn' + (bundle.eventsImageMode ? ' is-active' : '') + '" id="terrain-specimen-ev-mode-img" title="Images">▦</button>' +
      '</div></div>';
    if (!events.length) {
      eventsSection += '<p class="terrain-specimen-empty">Aucun événement</p>';
    } else {
      eventsSection += '<div class="terrain-specimen-ev-panel" id="terrain-specimen-ev-list"' + (bundle.eventsImageMode ? ' style="display:none"' : '') + '>' + evList + '</div>';
      eventsSection += '<div class="terrain-specimen-ev-strip-wrap" id="terrain-specimen-ev-strip"' + (!bundle.eventsImageMode ? ' style="display:none"' : '') + '>';
      if (!evStrip && bundle.eventsImageMode) {
        eventsSection += '<p class="terrain-specimen-empty">Aucune photo dans les événements récents</p>';
      } else {
        eventsSection += evStrip;
      }
      eventsSection += '</div>';
    }
    eventsSection += '<form class="terrain-specimen-add-ev" id="terrain-specimen-add-ev-form">' +
      '<label class="terrain-specimen-sr-only" for="terrain-specimen-ev-type">Type</label>' +
      '<select id="terrain-specimen-ev-type" name="type_event" required>' +
      '<option value="">Type d’événement</option>' +
      '<option value="observation">Observation</option><option value="arrosage">Arrosage</option><option value="taille">Taille</option>' +
      '<option value="floraison">Floraison</option><option value="fructification">Fructification</option><option value="recolte">Récolte</option>' +
      '<option value="plantation">Plantation</option><option value="autre">Autre</option></select>' +
      '<input type="date" name="date" id="terrain-specimen-ev-date" required />' +
      '<button type="submit" class="terrain-specimen-btn terrain-specimen-btn--primary terrain-specimen-btn--compact">Ajouter</button></form>';
    eventsSection += '</section>';

    var fav = d.is_favori ? ' is-favori' : '';
    var header = '<header class="terrain-specimen-header">' +
      '<div class="terrain-specimen-title-row">' +
      '<h2 class="terrain-fiche-title terrain-specimen-title">' + esc(d.nom || 'Spécimen') + '</h2>' +
      '<div class="terrain-specimen-header-actions">' +
      '<button type="button" class="terrain-specimen-icon-btn" id="terrain-specimen-edit-btn" title="Modifier">✎</button>' +
      '<button type="button" class="terrain-specimen-fav-btn' + fav + '" id="terrain-specimen-fav-btn" title="Favori">★</button>' +
      '</div></div>' + orgLine +
      (orgId != null ? '<button type="button" class="terrain-specimen-species-link" id="terrain-specimen-back-org">← Retour à la fiche espèce</button>' : '') +
      statutLine + '</header>';

    var infosSection = '<section class="terrain-specimen-section"><h3 class="terrain-specimen-section-title">Infos</h3><div class="terrain-specimen-infos">' + infosHtml + '</div></section>';

    var dup = '<button type="button" class="terrain-specimen-btn terrain-specimen-btn--dup" id="terrain-specimen-dup-btn">Dupliquer ce spécimen</button>';
    var del = '<button type="button" class="terrain-specimen-btn terrain-specimen-btn--danger" id="terrain-specimen-delete-btn">Supprimer ce spécimen…</button>';

    return '<div class="terrain-panel-detail-fiche terrain-specimen-sheet" data-specimen-id="' + esc(String(d.id)) + '">' +
      header + '<div class="terrain-specimen-sheet-body">' +
      infosSection + phenoHtml + pollHtml + compHtml + photosHtml + remHtml + eventsSection + dup + del +
      '</div></div>';
  }

  function openSpecimenDeleteDialog(d, rootEl) {
    var nom = esc(d.nom || 'ce spécimen');
    var dlg = document.createElement('div');
    dlg.className = 'terrain-delete-dialog-backdrop';
    dlg.innerHTML =
      '<div class="terrain-delete-dialog" role="dialog" aria-modal="true">' +
      '<h3 class="terrain-delete-dialog-title">Supprimer ' + nom + ' ?</h3>' +
      '<p class="terrain-delete-dialog-desc">Choisissez comment retirer ce spécimen :</p>' +
      '<button type="button" class="terrain-panel-btn terrain-panel-btn--secondary terrain-delete-dialog-btn" id="terrain-del-retire">Marquer comme Enlevé <span class="terrain-delete-dialog-sub">Conserve l\'historique, retire de la carte</span></button>' +
      '<button type="button" class="terrain-panel-btn terrain-delete-btn--hard terrain-delete-dialog-btn" id="terrain-del-hard">Supprimer définitivement <span class="terrain-delete-dialog-sub">Irréversible — efface toutes les données</span></button>' +
      '<p class="terrain-delete-dialog-error" id="terrain-del-error" hidden></p>' +
      '<button type="button" class="terrain-panel-btn terrain-panel-btn--secondary" id="terrain-del-cancel">Annuler</button>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { document.body.removeChild(dlg); }

    dlg.querySelector('#terrain-del-cancel').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

    var errEl = dlg.querySelector('#terrain-del-error');

    dlg.querySelector('#terrain-del-retire').addEventListener('click', function () {
      var btn = dlg.querySelector('#terrain-del-retire');
      btn.disabled = true;
      fetchApi('specimens/' + d.id + '/retire/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (r) {
          if (!r.ok) throw new Error();
          close();
          reloadSpecimensFromApi(function () { setPanelMode('open'); });
        })
        .catch(function () {
          btn.disabled = false;
          if (errEl) { errEl.textContent = 'Erreur — veuillez réessayer.'; errEl.hidden = false; }
        });
    });

    var hardBtn = dlg.querySelector('#terrain-del-hard');
    var confirmed = false;
    hardBtn.addEventListener('click', function () {
      if (!confirmed) {
        confirmed = true;
        hardBtn.textContent = '⚠ Confirmer la suppression définitive';
        hardBtn.classList.add('terrain-delete-btn--hard--confirm');
        return;
      }
      hardBtn.disabled = true;
      fetchApi('specimens/' + d.id + '/', { method: 'DELETE' })
        .then(function (r) {
          if (!r.ok && r.status !== 204) throw new Error();
          close();
          reloadSpecimensFromApi(function () { setPanelMode('open'); });
        })
        .catch(function () {
          hardBtn.disabled = false;
          if (errEl) { errEl.textContent = 'Erreur lors de la suppression — veuillez réessayer.'; errEl.hidden = false; }
        });
    });
  }

  function buildSpecimenEditFormHtml(d) {
    var statutOptions = '';
    Object.keys(SPECIMEN_STATUT_LABELS).forEach(function (k) {
      statutOptions += '<option value="' + esc(k) + '"' + (k === d.statut ? ' selected' : '') + '>' + esc(SPECIMEN_STATUT_LABELS[k]) + '</option>';
    });
    return '<div class="terrain-specimen-sheet terrain-specimen-edit">' +
      '<header class="terrain-specimen-header">' +
      '<h2 class="terrain-fiche-title terrain-specimen-title">Modifier le spécimen</h2>' +
      '</header>' +
      '<form class="terrain-specimen-edit-form" id="terrain-specimen-edit-form">' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-nom">Nom</label>' +
      '<input class="terrain-edit-input" id="terrain-edit-nom" name="nom" type="text" value="' + esc(d.nom || '') + '" required /></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-statut">Statut</label>' +
      '<select class="terrain-edit-input terrain-edit-select" id="terrain-edit-statut" name="statut">' + statutOptions + '</select></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-sante">Santé (0–10)</label>' +
      '<input class="terrain-edit-input" id="terrain-edit-sante" name="sante" type="number" min="0" max="10" step="0.5" value="' + esc(d.sante != null ? String(d.sante) : '') + '" /></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-date">Date plantation</label>' +
      '<input class="terrain-edit-input" id="terrain-edit-date" name="date_plantation" type="date" value="' + esc(d.date_plantation || '') + '" /></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-hauteur">Hauteur actuelle (m)</label>' +
      '<input class="terrain-edit-input" id="terrain-edit-hauteur" name="hauteur_actuelle" type="number" min="0" step="0.1" value="' + esc(d.hauteur_actuelle != null ? String(d.hauteur_actuelle) : '') + '" /></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-zone">Zone jardin</label>' +
      '<input class="terrain-edit-input" id="terrain-edit-zone" name="zone_jardin" type="text" value="' + esc(d.zone_jardin || '') + '" /></div>' +
      '<div class="terrain-edit-row"><label class="terrain-fiche-label" for="terrain-edit-notes">Notes</label>' +
      '<textarea class="terrain-edit-input terrain-edit-textarea" id="terrain-edit-notes" name="notes" rows="4">' + esc(d.notes || '') + '</textarea></div>' +
      '<p class="terrain-edit-error" id="terrain-edit-error" hidden></p>' +
      '<div class="terrain-specimen-edit-actions">' +
      '<button type="submit" class="terrain-panel-btn terrain-panel-btn--primary" id="terrain-edit-submit">Enregistrer</button>' +
      '<button type="button" class="terrain-panel-btn terrain-panel-btn--secondary" id="terrain-edit-cancel">Annuler</button>' +
      '</div>' +
      '</form></div>';
  }

  function openSpecimenEditForm(bundle, rootEl) {
    var d = bundle.detail;
    if (!d || !rootEl) return;
    rootEl.innerHTML = buildSpecimenEditFormHtml(d);
    var cancelBtn = rootEl.querySelector('#terrain-edit-cancel');
    var errEl = rootEl.querySelector('#terrain-edit-error');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        rootEl.innerHTML = buildSpecimenMobileSheetHtml(bundle);
        wireSpecimenSheetActions(rootEl, bundle);
      });
    }
    var form = rootEl.querySelector('#terrain-specimen-edit-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var payload = {};
        fd.forEach(function (v, k) { if (String(v).trim() !== '') payload[k] = v; });
        var submitBtn = rootEl.querySelector('#terrain-edit-submit');
        if (submitBtn) submitBtn.disabled = true;
        if (errEl) errEl.hidden = true;
        fetchApi('specimens/' + d.id + '/', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(function (r) {
            if (!r.ok) throw new Error();
            reloadSpecimensFromApi(null);
            fetchSpecimenDetailBundle(String(d.id), function (err2, b2) {
              if (err2 || !b2) {
                if (submitBtn) submitBtn.disabled = false;
                return;
              }
              rootEl.innerHTML = buildSpecimenMobileSheetHtml(b2);
              wireSpecimenSheetActions(rootEl, b2);
            });
          })
          .catch(function () {
            if (submitBtn) submitBtn.disabled = false;
            if (errEl) { errEl.textContent = 'Erreur lors de l\'enregistrement. Vérifiez vos données.'; errEl.hidden = false; }
          });
      });
    }
  }

  function wireSpecimenSheetActions(rootEl, bundle) {
    var d = bundle.detail;
    if (!d || !rootEl) return;
    var sid = d.id;
    var org = d.organisme || {};
    var orgId = org.id != null ? org.id : null;

    var favBtn = rootEl.querySelector('#terrain-specimen-fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', function () {
        var del = favBtn.classList.contains('is-favori');
        fetchApi('specimens/' + sid + '/favoris/', { method: del ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          .then(function (r) {
            if (r.status === 200 || r.status === 201 || r.status === 204) {
              favBtn.classList.toggle('is-favori', !del);
            }
          });
      });
    }

    var backOrgBtn = rootEl.querySelector('#terrain-specimen-back-org');
    if (backOrgBtn && orgId != null) {
      backOrgBtn.addEventListener('click', function () {
        openOrganismDetailDrawer(orgId);
      });
    }

    var editBtn = rootEl.querySelector('#terrain-specimen-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        openSpecimenEditForm(bundle, rootEl);
      });
    }

    var phenoBtn = rootEl.querySelector('#terrain-specimen-pheno-cta');
    if (phenoBtn) {
      phenoBtn.addEventListener('click', function () {
        var form = rootEl.querySelector('#terrain-specimen-add-ev-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });
        var sel = rootEl.querySelector('#terrain-specimen-ev-type');
        if (sel) { sel.focus(); }
      });
    }

    rootEl.querySelectorAll('[data-open-specimen-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var oid = btn.getAttribute('data-open-specimen-id');
        var sp = specimens.filter(function (x) { return String(x.id) === String(oid); })[0];
        if (sp) {
          if (window.terrainCesiumFlyToSpecimen && sp.longitude != null && sp.latitude != null) {
            window.terrainCesiumFlyToSpecimen({ lng: sp.longitude, lat: sp.latitude, specimenId: sp.id });
          }
          openSpecimenOverlay(sp);
        } else {
          fetchSpecimenDetailBundle(oid, function (err, b) {
            if (!err && b && b.detail) {
              openSpecimenOverlay(
                { id: b.detail.id, nom: b.detail.nom, longitude: b.detail.longitude, latitude: b.detail.latitude, statut: b.detail.statut },
                b
              );
            }
          });
        }
      });
    });

    var modeList = rootEl.querySelector('#terrain-specimen-ev-mode-list');
    var modeImg = rootEl.querySelector('#terrain-specimen-ev-mode-img');
    var panelList = rootEl.querySelector('#terrain-specimen-ev-list');
    var panelStrip = rootEl.querySelector('#terrain-specimen-ev-strip');
    function setEvMode(img) {
      if (panelList) panelList.style.display = img ? 'none' : 'block';
      if (panelStrip) panelStrip.style.display = img ? 'block' : 'none';
      if (modeList) modeList.classList.toggle('is-active', !img);
      if (modeImg) modeImg.classList.toggle('is-active', !!img);
    }
    if (modeList) modeList.addEventListener('click', function () { setEvMode(false); });
    if (modeImg) modeImg.addEventListener('click', function () { setEvMode(true); });

    var form = rootEl.querySelector('#terrain-specimen-add-ev-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var typeEvent = fd.get('type_event');
        var date = fd.get('date');
        if (!typeEvent || !date) return;
        fetchApi('specimens/' + sid + '/events/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type_event: typeEvent, date: date }),
        })
          .then(function (r) {
            if (!r.ok) return;
            fetchSpecimenDetailBundle(sid, function (err2, b2) {
              if (err2 || !b2) return;
              b2.eventsImageMode = modeImg && modeImg.classList.contains('is-active');
              rootEl.innerHTML = buildSpecimenMobileSheetHtml(b2);
              wireSpecimenSheetActions(rootEl, b2);
            });
          });
      });
    }

    var dup = rootEl.querySelector('#terrain-specimen-dup-btn');
    if (dup) {
      dup.addEventListener('click', function () {
        dup.disabled = true;
        fetchApi('specimens/' + sid + '/duplicate/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (x) {
            dup.disabled = false;
            if (x.ok && x.j && x.j.id) {
              reloadSpecimensFromApi(function () {
                openSpecimenOverlay({ id: x.j.id, nom: x.j.nom, statut: x.j.statut });
              });
            }
          })
          .catch(function () { dup.disabled = false; });
      });
    }

    var delBtn = rootEl.querySelector('#terrain-specimen-delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        openSpecimenDeleteDialog(d, rootEl);
      });
    }

    var fileIn = rootEl.querySelector('#terrain-specimen-photo-file');
    if (fileIn) {
      fileIn.addEventListener('change', function () {
        var f = fileIn.files && fileIn.files[0];
        if (!f) return;
        var fd = new FormData();
        fd.append('image', f);
        fd.append('type_photo', 'autre');
        fd.append('titre', 'Photo du spécimen');
        fetchApi('specimens/' + sid + '/photos/', { method: 'POST', body: fd, headers: {} })
          .then(function (r) {
            fileIn.value = '';
            if (!r.ok) return;
            fetchSpecimenDetailBundle(sid, function (err2, b2) {
              if (err2 || !b2) return;
              b2.eventsImageMode = modeImg && modeImg.classList.contains('is-active');
              rootEl.innerHTML = buildSpecimenMobileSheetHtml(b2);
              wireSpecimenSheetActions(rootEl, b2);
            });
          });
      });
    }
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

  function buildSpecimenPopupMiniHtml(s) {
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

  function wireSpecimenPopupActions(s, rootEl) {
    var openFullBtn = rootEl.querySelector('#terrain-panel-detail-open-full');
    if (openFullBtn) {
      openFullBtn.addEventListener('click', function () {
        if (window.postToRN) {
          window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: s.id } });
        } else {
          openSpecimenOverlay(s);
        }
      });
    }
  }

  function showPopup(s) {
    if (!popupEl) return;
    var mini = buildSpecimenPopupMiniHtml(s);
    popupEl.innerHTML = '<div class="terrain-popup-inner">' + mini + '</div>';
    popupEl.style.display = 'block';
    wireSpecimenPopupActions(s, popupEl);
  }

  function openSpecimenOverlay(s, preloadedBundle) {
    addToRecents(s);
    selectedSpecimenId = s.id;

    function applyBundle(bundle, rootEl) {
      if (!bundle || !bundle.detail) return;
      bundle.detail = mergeListIntoDetail(s, bundle.detail);
      if (bundle.eventsImageMode !== true) bundle.eventsImageMode = false;
      rootEl.innerHTML = buildSpecimenMobileSheetHtml(bundle);
      wireSpecimenSheetActions(rootEl, bundle);
    }

    if (panelDetailEl) {
      setPanelMode('detail');
      var detailTitleEl = panelRoot && panelRoot.querySelector('.terrain-panel-detail-title');
      if (detailTitleEl) detailTitleEl.textContent = s.nom || 'Spécimen';
      if (preloadedBundle && preloadedBundle.detail) {
        applyBundle(preloadedBundle, panelDetailEl);
        return;
      }
      panelDetailEl.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--loading"><p>Chargement…</p></div>';
      fetchSpecimenDetailBundle(String(s.id), function (err, bundle) {
        if (err || !bundle) {
          panelDetailEl.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--error"><p>Impossible de charger le détail. Êtes-vous connecté ?</p></div>';
          return;
        }
        applyBundle(bundle, panelDetailEl);
      });
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
      if (preloadedBundle && preloadedBundle.detail) {
        applyBundle(preloadedBundle, body);
      } else {
        body.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--loading"><p>Chargement…</p></div>';
        fetchSpecimenDetailBundle(String(s.id), function (err, bundle) {
          if (err || !bundle) {
            body.innerHTML = '<div class="terrain-specimen-sheet terrain-specimen-sheet--error"><p>Impossible de charger le détail.</p></div>';
            return;
          }
          applyBundle(bundle, body);
        });
      }
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

  if (window.INITIAL_SPECIMENS && Array.isArray(window.INITIAL_SPECIMENS)) {
    specimens = window.INITIAL_SPECIMENS;
    updateSpecimenList(null);
  }
})();
