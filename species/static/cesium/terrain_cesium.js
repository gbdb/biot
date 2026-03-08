/**
 * Vue terrain Cesium : viewer, terrain, boundary, contours, OSM eau, markers, cercles, GCP, overlaps
 */
(function () {
  'use strict';

  var Cesium = window.Cesium;
  if (!Cesium) return;

  var GARDEN_DATA = window.GARDEN_DATA || {};
  var LIDAR_ASSET_ID = window.LIDAR_ASSET_ID;
  var viewer;
  var specimenEntities = {};
  var circleEntities = {};
  var gcpEntities = {};
  var circlesVisible = true;
  var gcpsVisible = true;
  var allSpecimens = [];
  var visibleSpecimenIds = null; /* null = tous visibles */
  var placementMode = false;

  function healthColor(h) {
    if (h == null) return '#888888';
    if (h >= 7) return '#6b9463';
    if (h >= 4) return '#c97d2e';
    return '#b84040';
  }

  function buildPinCanvas(emoji, health, statut) {
    var canvas = document.createElement('canvas');
    canvas.width = 52;
    canvas.height = 60;
    var ctx = canvas.getContext('2d');
    var dim = statut === 'planifie';
    ctx.beginPath();
    ctx.arc(26, 26, 22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(18,12,6,0.92)';
    ctx.fill();
    ctx.strokeStyle = dim ? 'rgba(255,255,255,0.25)' : healthColor(health);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(21, 46);
    ctx.lineTo(31, 46);
    ctx.lineTo(26, 57);
    ctx.fillStyle = 'rgba(18,12,6,0.92)';
    ctx.fill();
    ctx.font = dim ? '18px serif' : '20px serif';
    ctx.globalAlpha = dim ? 0.45 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '🌱', 26, 25);
    return canvas.toDataURL();
  }

  function haversineMeters(lat1, lng1, lat2, lng2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function detectOverlaps(specimens) {
    var overlaps = [];
    for (var i = 0; i < specimens.length; i++) {
      for (var j = i + 1; j < specimens.length; j++) {
        var a = specimens[i];
        var b = specimens[j];
        var dist = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
        var minDist = (a.rayon_adulte_m + b.rayon_adulte_m) * 0.85;
        if (dist < minDist) {
          overlaps.push({
            a: a.id,
            b: b.id,
            distance_m: Math.round(dist),
            min_recommended: Math.round(minDist)
          });
        }
      }
    }
    return overlaps;
  }

  var DEFAULT_GARDEN_LAT = 45.8899;
  var DEFAULT_GARDEN_LNG = -74.2715;

  function getCentroid(specimens) {
    var withCoords = (specimens || []).filter(function (s) { return s.latitude != null && s.longitude != null; });
    if (withCoords.length === 0) return { lat: DEFAULT_GARDEN_LAT, lng: DEFAULT_GARDEN_LNG };
    var lat = withCoords.reduce(function (s, p) { return s + p.latitude; }, 0) / withCoords.length;
    var lng = withCoords.reduce(function (s, p) { return s + p.longitude; }, 0) / withCoords.length;
    return { lat: lat, lng: lng };
  }

  function addBoundary(viewer, boundary) {
    if (!boundary || !boundary.coordinates) return;
    var coords = boundary.coordinates[0];
    if (!coords || coords.length < 2) return;
    var positions = coords.map(function (c) {
      return Cesium.Cartesian3.fromDegrees(c[0], c[1]);
    });
    viewer.entities.add({
      polyline: {
        positions: positions,
        width: 2,
        material: Cesium.Color.ORANGE.withAlpha(0.8),
        arcType: Cesium.ArcType.GEODESIC
      }
    });
  }

  function addContours(viewer, contoursGeojson) {
    if (!contoursGeojson || !contoursGeojson.features) return;
    contoursGeojson.features.forEach(function (f) {
      var coords = f.geometry && f.geometry.coordinates;
      if (!coords || coords.length < 2) return;
      var positions = coords.map(function (c) {
        return Cesium.Cartesian3.fromDegrees(c[0], c[1]);
      });
      viewer.entities.add({
        polyline: {
          positions: positions,
          width: 1,
          material: Cesium.Color.GREEN.withAlpha(0.5),
          arcType: Cesium.ArcType.GEODESIC
        }
      });
    });
  }

  function fetchOSMWater(boundary, timeoutMs) {
    if (!boundary || !boundary.coordinates) return Promise.resolve([]);
    var coords = boundary.coordinates[0];
    if (!coords.length) return Promise.resolve([]);
    var lons = coords.map(function (c) { return c[0]; });
    var lats = coords.map(function (c) { return c[1]; });
    var minLon = Math.min.apply(null, lons);
    var maxLon = Math.max.apply(null, lons);
    var minLat = Math.min.apply(null, lats);
    var maxLat = Math.max.apply(null, lats);
    var bbox = minLat + ',' + minLon + ',' + maxLat + ',' + maxLon;
    var query = '[out:json][bbox:' + bbox + '];way["waterway"];out geom;';
    var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    var controller = new AbortController();
    var id = setTimeout(function () { controller.abort(); }, timeoutMs || 5000);
    return fetch(url, { signal: controller.signal })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearTimeout(id);
        return data.elements || [];
      })
      .catch(function () {
        clearTimeout(id);
        return [];
      });
  }

  function addOSMWater(viewer, elements) {
    (elements || []).forEach(function (el) {
      var geom = el.geometry;
      if (!geom || geom.length < 2) return;
      var positions = geom.map(function (p) {
        return Cesium.Cartesian3.fromDegrees(p.lon, p.lat);
      });
      viewer.entities.add({
        polyline: {
          positions: positions,
          width: 2,
          material: Cesium.Color.CYAN.withAlpha(0.6),
          arcType: Cesium.ArcType.GEODESIC
        }
      });
    });
  }

  function setSpecimenVisibility(visibleIds) {
    visibleSpecimenIds = visibleIds;
    var ids = visibleIds ? visibleIds.reduce(function (o, id) { o[id] = true; return o; }, {}) : null;
    Object.keys(specimenEntities).forEach(function (id) {
      var ent = specimenEntities[id];
      if (ent) ent.show = !ids || ids[id];
    });
    Object.keys(circleEntities).forEach(function (id) {
      var ent = circleEntities[id];
      if (ent) ent.show = (!ids || ids[id]) && circlesVisible;
    });
  }

  function loadSpecimens(specimens) {
    Object.keys(specimenEntities).forEach(function (k) { viewer.entities.remove(specimenEntities[k]); });
    Object.keys(circleEntities).forEach(function (k) { viewer.entities.remove(circleEntities[k]); });
    specimenEntities = {};
    circleEntities = {};
    allSpecimens = specimens || [];

    if (!allSpecimens.length) {
      window.postToRN({ type: 'OVERLAPS_DETECTED', payload: { overlaps: [] } });
      flyHome(getCentroid(allSpecimens));
      return;
    }

    allSpecimens.forEach(function (s) {
      if (!s.latitude || !s.longitude) return;
      specimenEntities[s.id] = viewer.entities.add({
        id: 'specimen-' + s.id,
        position: Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude, 0),
        billboard: {
          image: buildPinCanvas(s.emoji, s.health, s.statut),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0
        }
      });
      if (s.rayon_adulte_m && s.rayon_adulte_m > 0) {
        circleEntities[s.id] = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude),
          ellipse: {
            semiMajorAxis: s.rayon_adulte_m,
            semiMinorAxis: s.rayon_adulte_m,
            material: Cesium.Color.fromCssColorString(healthColor(s.health)).withAlpha(0.14),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(healthColor(s.health)).withAlpha(0.5),
            outlineWidth: 1,
            classificationType: Cesium.ClassificationType.TERRAIN
          },
          show: circlesVisible
        });
      }
    });

    if (visibleSpecimenIds) setSpecimenVisibility(visibleSpecimenIds);

    var withCoords = allSpecimens.filter(function (s) { return s.latitude && s.rayon_adulte_m; });
    var overlaps = detectOverlaps(withCoords);
    window.postToRN({ type: 'OVERLAPS_DETECTED', payload: { overlaps: overlaps } });

    flyHome(getCentroid(allSpecimens));
  }

  function loadGCPs(gcps) {
    Object.keys(gcpEntities).forEach(function (k) { viewer.entities.remove(gcpEntities[k]); });
    gcpEntities = {};
    if (!gcps || !gcps.length) return;
    gcps.forEach(function (g) {
      var id = 'gcp-' + g.id;
      gcpEntities[g.id] = viewer.entities.add({
        id: id,
        position: Cesium.Cartesian3.fromDegrees(g.longitude, g.latitude),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 2,
          material: Cesium.Color.ORANGE.withAlpha(0.5),
          outline: true,
          outlineColor: Cesium.Color.ORANGE,
          outlineWidth: 1
        },
        label: {
          text: g.label,
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -12)
        },
        show: gcpsVisible
      });
    });
  }

  function toggleCircles(visible) {
    circlesVisible = visible;
    Object.keys(circleEntities).forEach(function (k) {
      circleEntities[k].show = visible && (!visibleSpecimenIds || visibleSpecimenIds.indexOf(parseInt(k, 10)) >= 0);
    });
  }

  function toggleGCPs(visible) {
    gcpsVisible = visible;
    Object.keys(gcpEntities).forEach(function (k) { gcpEntities[k].show = visible; });
  }

  var FLY_HOME_HEIGHT_M = 120;

  function flyHome(payload) {
    if (!viewer || !viewer.camera) return;
    var p = (payload && payload.lat != null && payload.lng != null)
      ? { lat: payload.lat, lng: payload.lng }
      : getCentroid(allSpecimens);
    console.log('[terrain_cesium] FLY_HOME received, flying to', p.lat, p.lng, 'height', FLY_HOME_HEIGHT_M + 'm');
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, FLY_HOME_HEIGHT_M),
      orientation: { heading: Cesium.Math.toRadians(10), pitch: Cesium.Math.toRadians(-38) },
      duration: 1.5
    });
  }

  function flyToSpecimen(payload) {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(payload.lng, payload.lat, 80),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-35) },
      duration: 1.5
    });
    window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: payload.specimenId } });
  }

  function setViewMode(mode) {
    viewer.imageryLayers.removeAll();
    var assetId = (mode === 'satellite') ? 3 : 4;
    return Cesium.IonImageryProvider.fromAssetId(assetId).then(function (provider) {
      viewer.imageryLayers.addImageryProvider(provider);
    });
  }

  function onMessage(msg) {
    var type = msg.type;
    var payload = msg.payload || {};
    if (type === 'LOAD_SPECIMENS') loadSpecimens(payload.specimens);
    if (type === 'LOAD_GCPs') loadGCPs(payload.gcps);
    if (type === 'SET_VISIBLE_SPECIMENS') setSpecimenVisibility(payload.ids || null);
    if (type === 'FLY_HOME') flyHome(payload);
    if (type === 'FLY_TO_SPECIMEN') flyToSpecimen(payload);
    if (type === 'TOGGLE_CIRCLES') toggleCircles(payload.visible !== false);
    if (type === 'TOGGLE_GCPs') toggleGCPs(payload.visible !== false);
    if (type === 'SET_VIEW_MODE') setViewMode(payload.mode).catch(function (e) { console.error(e); });
    if (type === 'SET_PLACEMENT_MODE') placementMode = payload.active !== false;
  }

  window.terrainOnMessage(onMessage);

  function waitForContainerSize(container, minSize, maxWaitMs) {
    minSize = minSize || 50;
    maxWaitMs = maxWaitMs || 5000;
    return new Promise(function (resolve) {
      var start = Date.now();
      function check() {
        var w = container.clientWidth;
        var h = container.clientHeight;
        if (w >= minSize && h >= minSize) {
          resolve();
          return;
        }
        if (Date.now() - start >= maxWaitMs) resolve();
        else setTimeout(check, 80);
      }
      check();
    });
  }

  async function initViewer() {
    var container = document.getElementById('cesiumContainer');
    if (container) await waitForContainerSize(container, 50, 5000);

    var extent = Cesium.Rectangle.fromDegrees(
      DEFAULT_GARDEN_LNG - 0.002,
      DEFAULT_GARDEN_LAT - 0.002,
      DEFAULT_GARDEN_LNG + 0.002,
      DEFAULT_GARDEN_LAT + 0.002
    );
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;
    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;

    var terrainProvider;
    if (LIDAR_ASSET_ID) {
      terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(LIDAR_ASSET_ID);
    } else {
      terrainProvider = await Cesium.createWorldTerrainAsync();
    }

    viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: terrainProvider,
      imageryProvider: await Cesium.IonImageryProvider.fromAssetId(3),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      geocoder: false,
      homeButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false
    });

    viewer.scene.globe.enableLighting = false;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0002;

    function applyInitialView() {
      if (!viewer || !viewer.camera) return;
      try {
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(DEFAULT_GARDEN_LNG, DEFAULT_GARDEN_LAT, FLY_HOME_HEIGHT_M),
          orientation: { heading: Cesium.Math.toRadians(10), pitch: Cesium.Math.toRadians(-38) }
        });
      } catch (e) {
        console.warn('[terrain_cesium] applyInitialView', e);
      }
    }
    applyInitialView();
    var removeAfterRender = viewer.scene.afterRender.addEventListener(function () {
      removeAfterRender();
      applyInitialView();
    });
    setTimeout(applyInitialView, 100);
    setTimeout(applyInitialView, 400);
    setTimeout(applyInitialView, 800);
    var appliedOnResize = false;
    function onContainerResize() {
      if (appliedOnResize || !viewer) return;
      appliedOnResize = true;
      applyInitialView();
      setTimeout(function () { appliedOnResize = false; }, 1500);
    }
    if (typeof ResizeObserver !== 'undefined' && container) {
      var ro = new ResizeObserver(function () { onContainerResize(); });
      ro.observe(container);
    }

    if (GARDEN_DATA.boundary) addBoundary(viewer, GARDEN_DATA.boundary);
    if (GARDEN_DATA.contours_geojson) addContours(viewer, GARDEN_DATA.contours_geojson);
    fetchOSMWater(GARDEN_DATA.boundary, 5000).then(function (elements) {
      addOSMWater(viewer, elements);
    });

    viewer.screenSpaceEventHandler.setInputAction(function (click) {
      var picked = viewer.scene.pick(click.position);
      if (placementMode) {
        if (picked && picked.id && picked.id.id && picked.id.id.indexOf('specimen-') === 0) {
          var specimenId = parseInt(picked.id.id.replace('specimen-', ''), 10);
          window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: specimenId } });
        } else {
          var ray = viewer.camera.getPickRay(click.position);
          var position = viewer.scene.globe.pick(ray, viewer.scene);
          if (position) {
            var carto = Cesium.Cartographic.fromCartesian(position);
            var lat = Cesium.Math.toDegrees(carto.latitude);
            var lng = Cesium.Math.toDegrees(carto.longitude);
            window.postToRN({ type: 'PLACEMENT_TAP', payload: { lat: lat, lng: lng } });
          }
        }
      } else if (picked && picked.id && picked.id.id) {
        var id = picked.id.id;
        if (id.indexOf('specimen-') === 0) {
          var specimenId = parseInt(id.replace('specimen-', ''), 10);
          window.postToRN({ type: 'SPECIMEN_OPEN_FICHE', payload: { specimenId: specimenId } });
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    window.terrainCesiumViewer = viewer;
    window.terrainCesiumGetCentroid = getCentroid;
    window.terrainCesiumAllSpecimens = function () { return allSpecimens; };
    window.terrainCesiumFlyHome = flyHome;
    window.terrainCesiumFlyToSpecimen = flyToSpecimen;
    window.terrainCesiumSetVisibleSpecimens = setSpecimenVisibility;

    window.postToRN({ type: 'CESIUM_READY' });
  }

  initViewer().catch(console.error);
})();
