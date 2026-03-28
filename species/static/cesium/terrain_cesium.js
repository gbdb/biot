/**
 * Vue Cesium : World Terrain + ortho Québec, zoom molette, vues (dessus/45°/horizon), LiDAR optionnel, markers spécimens (billboards emoji).
 */
(function () {
  'use strict';

  var Cesium = window.Cesium;
  if (!Cesium) return;

  var CENTER_LAT = 45.88946;
  var CENTER_LNG = -74.27092;
  var FLY_HEIGHT_M = 500;
  var LIDAR_ASSET_ID = (typeof window !== 'undefined' && window.LIDAR_ASSET_ID != null) ? Number(window.LIDAR_ASSET_ID) : 4510919;
  var QUEBEC_TMS_ORTHOS_URL = 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/orthos@EPSG_3857/{z}/{x}/{reverseY}.jpeg';
  var specimenEntities = {};
  /** Cercles de rayon adulte (m) par id spécimen */
  var specimenCircleEntities = {};
  /** Visibilité calques (UI terrain) */
  var layerSpecimensVisible = true;
  var layerMaturityCirclesVisible = true;
  var layerBoundaryVisible = true;
  /** null = tous ; tableau d'id = filtre recherche */
  var visibleSpecimenFilterIds = null;
  var boundaryEntity = null;
  var sunRayEntity = null;
  var sunShadowEntity = null;
  var buildingShadowEntity = null;
  var osmBuildingsPrimitive = null;
  var viewer;
  var zoneEntities = {};
  var zoneDataById = {};
  var zoneInViewer = {};
  var zonesVisible = true;
  var zoneOpacityAlpha = 0.30;
  var drawZoneState = {
    active: false,
    positions: [],
    entities: [],
    previewLineEntity: null,
    currentMouseCartographic: null,
    currentMousePosition: null,
    coordsLabelEl: null,
    actionsEl: null,
    handler: null,
    overlayEl: null
  };
  var ZONE_HEIGHT_OFFSET_M = 0.5;
  var ZONE_COLOR_OPTIONS = [
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
  var ZONE_TYPE_LABELS = { stationnement: 'Stationnement', culture: 'Culture', boise: 'Boisé', eau: 'Eau', batiment: 'Bâtiment', autre: 'Autre' };

  var BOUNDARY_OFFSET_M = 10;
  var BOUNDARY_COLOR = '#c4832a';
  var BOUNDARY_WIDTH = 3;
  var SUN_RAY_LENGTH_M = 50000;
  var SUN_SHADOW_LENGTH_M = 200;
  var SUN_RAY_COLOR = '#f5a623';
  var SUN_SHADOW_COLOR = '#c0392b';
  var SUN_RAY_WIDTH = 4;
  var SUN_SHADOW_WIDTH = 2;

  /** Options par défaut pour le bâtiment (ombre) : position et dimensions en mètres. */
  var BUILDING_SHADOW_DEFAULTS = {
    longitude: CENTER_LNG + 0.00015,
    latitude: CENTER_LAT + 0.0001,
    length: 12,
    width: 8,
    height: 5,
    headingDeg: 30
  };
  var OBSERVER_HEIGHT_M = 2;

  function getBoundaryCoordinates(boundary) {
    if (!boundary) return null;
    var coords = null;
    if (boundary.features && boundary.features[0]) {
      var geom = boundary.features[0].geometry;
      if (geom && geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        coords = geom.coordinates[0];
      }
    } else if (boundary.type === 'Polygon' && boundary.coordinates && boundary.coordinates[0]) {
      coords = boundary.coordinates[0];
    } else if (boundary.geometry && boundary.geometry.coordinates && boundary.geometry.coordinates[0]) {
      coords = boundary.geometry.coordinates[0];
    }
    return coords;
  }

  function addBoundaryPolyline(viewer, boundary) {
    if (!viewer) return;
    if (boundaryEntity) {
      viewer.entities.remove(boundaryEntity);
      boundaryEntity = null;
    }
    var coords = getBoundaryCoordinates(boundary);
    if (!coords || coords.length < 2) return;
    // GeoJSON: [longitude, latitude]; Cesium fromDegrees(lng, lat, height)
    var cartographics = coords.map(function (c) {
      return Cesium.Cartographic.fromDegrees(c[0], c[1], 0);
    });
    var terrainProvider = viewer.terrainProvider;
    if (!terrainProvider || !terrainProvider.availability) {
      var positions = coords.map(function (c) {
        return Cesium.Cartesian3.fromDegrees(c[0], c[1], BOUNDARY_OFFSET_M);
      });
      boundaryEntity = viewer.entities.add({
        polyline: {
          positions: positions,
          width: BOUNDARY_WIDTH,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString(BOUNDARY_COLOR),
            dashLength: 16
          })
        }
      });
      boundaryEntity.show = layerBoundaryVisible;
      return;
    }
    Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics).then(function (updated) {
      var positions = updated.map(function (carto) {
        var h = (carto.height != null && Number.isFinite(carto.height)) ? carto.height + BOUNDARY_OFFSET_M : BOUNDARY_OFFSET_M;
        return Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, h);
      });
      boundaryEntity = viewer.entities.add({
        polyline: {
          positions: positions,
          width: BOUNDARY_WIDTH,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString(BOUNDARY_COLOR),
            dashLength: 16
          })
        }
      });
      boundaryEntity.show = layerBoundaryVisible;
    }).catch(function () {
      var positions = coords.map(function (c) {
        return Cesium.Cartesian3.fromDegrees(c[0], c[1], BOUNDARY_OFFSET_M);
      });
      boundaryEntity = viewer.entities.add({
        polyline: {
          positions: positions,
          width: BOUNDARY_WIDTH,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString(BOUNDARY_COLOR),
            dashLength: 16
          })
        }
      });
      boundaryEntity.show = layerBoundaryVisible;
    });
  }

  function getSpecimenEmoji(s) {
    if (s.fruits) return '\uD83C\uDF4E'; // 🍎
    if (s.noix) return '\uD83C\uDF30';   // 🌰
    return s.emoji || '\uD83C\uDF31';    // 🌱
  }

  function makeEmojiBillboardImage(emoji) {
    var size = 32;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var r = 14;
    var x = 2, y = 2, w = size - 4, h = size - 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(20, 18, 16, 0.82)';
    ctx.fill();
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);
    return canvas.toDataURL('image/png');
  }

  function applySpecimenLayerVisibility() {
    if (!viewer) return;
    Object.keys(specimenEntities).forEach(function (key) {
      var id = parseInt(key, 10);
      var passFilter = visibleSpecimenFilterIds == null || visibleSpecimenFilterIds.indexOf(id) >= 0;
      var showMarker = layerSpecimensVisible && passFilter;
      var ent = specimenEntities[key];
      if (ent) ent.show = showMarker;
      var cEnt = specimenCircleEntities[key];
      if (cEnt) {
        cEnt.show = showMarker && layerMaturityCirclesVisible;
      }
    });
    if (viewer.scene) viewer.scene.requestRender();
  }

  function addSpecimenMarkers(specimens) {
    if (!viewer || !Array.isArray(specimens)) return;
    Object.keys(specimenEntities).forEach(function (id) {
      viewer.entities.remove(specimenEntities[id]);
    });
    Object.keys(specimenCircleEntities).forEach(function (id) {
      viewer.entities.remove(specimenCircleEntities[id]);
    });
    specimenEntities = {};
    specimenCircleEntities = {};
    var valid = specimens.filter(function (s) { return s.latitude != null && s.longitude != null; });
    if (valid.length === 0) {
      applySpecimenLayerVisibility();
      return;
    }

    var terrainProvider = viewer.terrainProvider;
    var cartographics = valid.map(function (s) {
      return Cesium.Cartographic.fromDegrees(s.longitude, s.latitude, 0);
    });

    function addEntitiesAtHeights(heights) {
      valid.forEach(function (s, i) {
        var h = (heights[i] != null && Number.isFinite(heights[i])) ? heights[i] : 0;
        var position = Cesium.Cartesian3.fromDegrees(s.longitude, s.latitude, h);
        var emoji = getSpecimenEmoji(s);
        var entity = viewer.entities.add({
          position: position,
          billboard: {
            image: makeEmojiBillboardImage(emoji),
            width: 32,
            height: 32,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM
          }
        });
        specimenEntities[s.id] = entity;
        var rayonM = s.rayon_adulte_m != null ? Number(s.rayon_adulte_m) : NaN;
        if (Number.isFinite(rayonM) && rayonM > 0) {
          var circleEnt = viewer.entities.add({
            position: position,
            ellipse: {
              semiMajorAxis: rayonM,
              semiMinorAxis: rayonM,
              material: Cesium.Color.fromCssColorString('#4a7c59').withAlpha(0.22),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString('#6db383'),
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          });
          specimenCircleEntities[s.id] = circleEnt;
        }
      });
      applySpecimenLayerVisibility();
    }

    if (terrainProvider && terrainProvider.availability) {
      Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics).then(function (updated) {
        var heights = updated.map(function (c) { return c.height; });
        addEntitiesAtHeights(heights);
      }).catch(function () {
        addEntitiesAtHeights(valid.map(function () { return 0; }));
      });
    } else {
      addEntitiesAtHeights(valid.map(function () { return 0; }));
    }
  }

  window.terrainCesiumRefreshSpecimens = function (specList) {
    addSpecimenMarkers(specList || []);
  };

  window.terrainCesiumSetVisibleSpecimens = function (ids) {
    visibleSpecimenFilterIds = ids;
    applySpecimenLayerVisibility();
  };

  window.terrainCesiumSetSpecimensLayerVisible = function (visible) {
    layerSpecimensVisible = !!visible;
    applySpecimenLayerVisibility();
  };

  window.terrainCesiumSetMaturityCirclesVisible = function (visible) {
    layerMaturityCirclesVisible = !!visible;
    applySpecimenLayerVisibility();
  };

  window.terrainCesiumSetBoundaryVisible = function (visible) {
    layerBoundaryVisible = !!visible;
    if (boundaryEntity) boundaryEntity.show = layerBoundaryVisible;
    if (viewer && viewer.scene) viewer.scene.requestRender();
  };

  function createQuebecOrthosProvider() {
    return new Cesium.UrlTemplateImageryProvider({
      url: QUEBEC_TMS_ORTHOS_URL,
      tilingScheme: new Cesium.WebMercatorTilingScheme(),
      reverseY: true,
      maximumLevel: 19
    });
  }

  function setTerrainWorld() {
    if (!viewer) return;
    if (osmBuildingsPrimitive) {
      viewer.scene.primitives.remove(osmBuildingsPrimitive);
      osmBuildingsPrimitive = null;
    }
    Cesium.createWorldTerrainAsync().then(function (provider) {
      viewer.terrainProvider = provider;
    }).catch(function (e) { console.warn('[terrain_cesium] World Terrain:', e.message); });
  }

  var MIN_ALTITUDE_LIDAR_M = 200;
  var SAFE_ALTITUDE_LIDAR_M = 300;

  function setTerrainLidar() {
    if (!viewer) return;
    var cam = viewer.camera;
    var pos = cam.positionCartographic;
    var currentHeightM = (pos && Number.isFinite(pos.height)) ? pos.height : 500;
    Cesium.CesiumTerrainProvider.fromIonAssetId(LIDAR_ASSET_ID, { requestVertexNormals: true }).then(function (provider) {
      viewer.terrainProvider = provider;
      if (currentHeightM < MIN_ALTITUDE_LIDAR_M) {
        var lat = pos ? Cesium.Math.toDegrees(pos.latitude) : CENTER_LAT;
        var lng = pos ? Cesium.Math.toDegrees(pos.longitude) : CENTER_LNG;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, SAFE_ALTITUDE_LIDAR_M),
          orientation: {
            heading: cam.heading,
            pitch: cam.pitch,
            roll: cam.roll
          },
          duration: 0.5
        });
      }
    }).catch(function (e) { console.warn('[terrain_cesium] LiDAR terrain:', e.message); });
    if (osmBuildingsPrimitive) return;
    Cesium.createOsmBuildingsAsync().then(function (tileset) {
      viewer.scene.primitives.add(tileset);
      osmBuildingsPrimitive = tileset;
    }).catch(function (e) { console.warn('[terrain_cesium] OSM Buildings:', e.message); });
  }

  function setPitchDeg(pitchDeg) {
    if (!viewer || !viewer.camera) return;
    var cam = viewer.camera;
    var pos = cam.positionCartographic;
    if (!pos) return;
    var lat = Cesium.Math.toDegrees(pos.latitude);
    var lng = Cesium.Math.toDegrees(pos.longitude);
    var height = pos.height;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lng, lat, Math.max(height, 100)),
      orientation: {
        heading: cam.heading,
        pitch: Cesium.Math.toRadians(pitchDeg),
        roll: cam.roll
      },
      duration: 0.4
    });
  }

  if (typeof window.terrainOnMessage === 'function') {
    window.terrainOnMessage(function (msg) {
      if (msg.type === 'LOAD_SPECIMENS' && msg.payload && msg.payload.specimens) {
        addSpecimenMarkers(msg.payload.specimens);
      }
    });
  }

  window.terrainCesiumSetTerrainWorld = setTerrainWorld;
  window.terrainCesiumSetTerrainLidar = setTerrainLidar;
  window.terrainCesiumSetPitchTopDown = function () { setPitchDeg(-90); };
  window.terrainCesiumSetPitch45 = function () { setPitchDeg(-45); };
  window.terrainCesiumSetPitchHorizon = function () { setPitchDeg(0); };

  function getDefaultViewStorageKey() {
    var g = window.GARDEN_DATA;
    return 'cesium_default_view_' + (g && g.id != null ? g.id : 'global');
  }

  function getSavedDefaultView() {
    try {
      var key = getDefaultViewStorageKey();
      var raw = typeof localStorage !== 'undefined' && localStorage.getItem(key);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (v && Number.isFinite(v.lng) && Number.isFinite(v.lat) && Number.isFinite(v.height)) return v;
    } catch (e) { /* ignore */ }
    return null;
  }

  function flyToStandardView() {
    if (!viewer || !viewer.camera) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, FLY_HEIGHT_M),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration: 1
    });
  }

  window.terrainCesiumFlyStandardView = flyToStandardView;

  window.terrainCesiumFlyHome = function () {
    if (!viewer || !viewer.camera) return;
    var saved = getSavedDefaultView();
    if (saved) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(saved.lng, saved.lat, saved.height),
        orientation: {
          heading: saved.heading != null ? saved.heading : 0,
          pitch: saved.pitch != null ? saved.pitch : Cesium.Math.toRadians(-90),
          roll: saved.roll != null ? saved.roll : 0
        },
        duration: 1
      });
    } else {
      flyToStandardView();
    }
  };

  window.terrainCesiumCaptureCurrentViewAsDefault = function () {
    if (!viewer || !viewer.camera) return false;
    try {
      var pos = viewer.camera.positionCartographic;
      var v = {
        lng: Cesium.Math.toDegrees(pos.longitude),
        lat: Cesium.Math.toDegrees(pos.latitude),
        height: pos.height,
        heading: viewer.camera.heading,
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll
      };
      var key = getDefaultViewStorageKey();
      localStorage.setItem(key, JSON.stringify(v));
      return true;
    } catch (e) {
      return false;
    }
  };

  /** Vue 3/4 à 20 m au-dessus du spécimen (cible au niveau du terrain). */
  function flyToSpecimen(opts) {
    if (!viewer || !viewer.camera || !opts || opts.lat == null || opts.lng == null) return;
    var lat = Number(opts.lat);
    var lng = Number(opts.lng);
    var heightOffsetM = 20;
    var pitchDeg = -45;
    var carto = Cesium.Cartographic.fromDegrees(lng, lat, 0);
    var terrainProvider = viewer.terrainProvider;

    function doFly(heightTarget) {
      if (heightTarget == null || !Number.isFinite(heightTarget)) heightTarget = 0;
      var targetCartesian = Cesium.Cartesian3.fromDegrees(lng, lat, heightTarget);
      var enu = Cesium.Transforms.eastNorthUpToFixedFrame(targetCartesian, Cesium.Ellipsoid.WGS84, new Cesium.Matrix4());
      var offsetLocal = new Cesium.Cartesian3(0, -heightOffsetM, heightOffsetM);
      var cameraDest = Cesium.Matrix4.multiplyByPoint(enu, offsetLocal, new Cesium.Cartesian3());
      viewer.camera.flyTo({
        destination: cameraDest,
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(pitchDeg),
          roll: 0
        },
        duration: 0.6
      });
    }

    if (terrainProvider && terrainProvider.availability) {
      Cesium.sampleTerrainMostDetailed(terrainProvider, [carto]).then(function (updated) {
        var h = (updated[0] && updated[0].height != null && Number.isFinite(updated[0].height)) ? updated[0].height : 0;
        doFly(h);
      }).catch(function () { doFly(0); });
    } else {
      doFly(0);
    }
  }
  window.terrainCesiumFlyToSpecimen = flyToSpecimen;

  /** Direction du soleil (vecteur unitaire) et position observateur en ECEF. Utilise l'horloge du viewer. */
  function getSunDirectionAndObserver(julianDate) {
    if (!viewer || !Cesium.Simon1994PlanetaryPositions || !Cesium.Transforms.computeTemeToPseudoFixedMatrix) return null;
    var sunInertial = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(julianDate, new Cesium.Cartesian3());
    var temeToFixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(julianDate, new Cesium.Matrix3());
    var sunFixed = Cesium.Matrix3.multiplyByVector(temeToFixed, sunInertial, new Cesium.Cartesian3());
    var observer = Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, OBSERVER_HEIGHT_M);
    var toSun = Cesium.Cartesian3.subtract(sunFixed, observer, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(toSun, toSun);
    return { sunDirection: toSun, observer: observer };
  }

  function addSunRays() {
    if (!viewer) return;
    removeSunRays();
    var that = { viewer: viewer };
    sunRayEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(function () {
          var def = Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, OBSERVER_HEIGHT_M);
          if (!that.viewer || !that.viewer.clock) return [def, def];
          var data = getSunDirectionAndObserver(that.viewer.clock.currentTime);
          if (!data) return [def, def];
          var obs = data.observer;
          var enu = Cesium.Transforms.eastNorthUpToFixedFrame(obs, Cesium.Ellipsoid.WGS84, new Cesium.Matrix4());
          var inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
          var dirLocal = Cesium.Matrix4.multiplyByPointAsVector(inv, data.sunDirection, new Cesium.Cartesian3());
          var altitudeRad = Math.asin(Cesium.Math.clamp(dirLocal.z, -1, 1));
          if (altitudeRad < 0) return [def, def];
          var rayEnd = Cesium.Cartesian3.add(obs, Cesium.Cartesian3.multiplyByScalar(data.sunDirection, SUN_RAY_LENGTH_M, new Cesium.Cartesian3()), new Cesium.Cartesian3());
          return [obs, rayEnd];
        }, false),
        width: SUN_RAY_WIDTH,
        material: Cesium.Color.fromCssColorString(SUN_RAY_COLOR)
      }
    });
    sunShadowEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(function () {
          var def = Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, OBSERVER_HEIGHT_M);
          if (!that.viewer || !that.viewer.clock) return [def, def];
          var data = getSunDirectionAndObserver(that.viewer.clock.currentTime);
          if (!data) return [def, def];
          var obs = data.observer;
          var enu = Cesium.Transforms.eastNorthUpToFixedFrame(obs, Cesium.Ellipsoid.WGS84, new Cesium.Matrix4());
          var inv = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4());
          var dirLocal = Cesium.Matrix4.multiplyByPointAsVector(inv, data.sunDirection, new Cesium.Cartesian3());
          var altitudeRad = Math.asin(Cesium.Math.clamp(dirLocal.z, -1, 1));
          if (altitudeRad < 0) return [def, def];
          var shadowDirLocal = new Cesium.Cartesian3(-dirLocal.x, -dirLocal.y, 0);
          var len = Cesium.Cartesian3.magnitude(shadowDirLocal);
          if (len < 1e-6) return [obs, obs];
          Cesium.Cartesian3.normalize(shadowDirLocal, shadowDirLocal);
          var shadowOffset = Cesium.Cartesian3.multiplyByScalar(shadowDirLocal, SUN_SHADOW_LENGTH_M, new Cesium.Cartesian3());
          var shadowEnd = Cesium.Matrix4.multiplyByPoint(enu, shadowOffset, new Cesium.Cartesian3());
          return [obs, shadowEnd];
        }, false),
        width: SUN_SHADOW_WIDTH,
        material: Cesium.Color.fromCssColorString(SUN_SHADOW_COLOR)
      }
    });
  }

  function removeSunRays() {
    if (sunRayEntity && viewer) {
      viewer.entities.remove(sunRayEntity);
      sunRayEntity = null;
    }
    if (sunShadowEntity && viewer) {
      viewer.entities.remove(sunShadowEntity);
      sunShadowEntity = null;
    }
  }

  function setSunEnabled(enabled) {
    if (!viewer || !viewer.scene) return;
    if (viewer.scene.globe) viewer.scene.globe.enableLighting = enabled;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (enabled) {
      if (viewer.clock) {
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
      }
      addSunRays();
    } else {
      removeSunRays();
    }
  }

  function toggleSunLighting() {
    if (!viewer || !viewer.scene || !viewer.scene.globe) return false;
    var next = !viewer.scene.globe.enableLighting;
    viewer.scene.globe.enableLighting = next;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.shadowMap) viewer.shadowMap.enabled = next;
    if (next) {
      if (viewer.clock) {
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(new Date());
      }
      addSunRays();
    } else {
      removeSunRays();
      removeBuildingShadow();
    }
    return viewer.scene.globe.enableLighting;
  }
  window.terrainCesiumToggleSun = toggleSunLighting;
  window.terrainCesiumSunEnabled = function () {
    return viewer && viewer.scene && viewer.scene.globe ? viewer.scene.globe.enableLighting : false;
  };

  /** Retourne { lat, lng } pour les calculs solaires (jardin ou centre par défaut). */
  function getSunLocation() {
    var g = typeof window !== 'undefined' && window.GARDEN_DATA;
    if (g && g.latitude != null && g.longitude != null && !isNaN(g.latitude) && !isNaN(g.longitude)) {
      return { lat: Number(g.latitude), lng: Number(g.longitude) };
    }
    if (g && g.boundary && g.boundary.coordinates && g.boundary.coordinates[0] && g.boundary.coordinates[0].length > 0) {
      var coords = g.boundary.coordinates[0];
      var sumLat = 0, sumLng = 0, n = 0;
      coords.forEach(function (c) { sumLng += c[0]; sumLat += c[1]; n++; });
      if (n) return { lat: sumLat / n, lng: sumLng / n };
    }
    return { lat: CENTER_LAT, lng: CENTER_LNG };
  }

  /** Fixe l'heure du soleil (horloge Cesium) pour la date/heure donnée. */
  function setSunTime(date) {
    if (!viewer || !viewer.clock || !(date instanceof Date)) return;
    viewer.clock.currentTime = Cesium.JulianDate.fromDate(date);
    if (viewer.scene && viewer.scene.requestRender) viewer.scene.requestRender();
  }

  window.terrainCesiumGetSunLocation = getSunLocation;
  window.terrainCesiumSetSunTime = setSunTime;

  /**
   * Ajoute un bâtiment (boîte) qui porte ombre sur le terrain.
   * Squelette pour simulation maison ; extensible plus tard (drone / 3D Tiles).
   * options: { longitude, latitude, length, width, height (m), headingDeg }
   * Si options omis, utilise BUILDING_SHADOW_DEFAULTS.
   */
  function addBuildingShadow(options) {
    if (!viewer) return null;
    removeBuildingShadow();
    var opts = options || {};
    var lng = opts.longitude != null ? opts.longitude : BUILDING_SHADOW_DEFAULTS.longitude;
    var lat = opts.latitude != null ? opts.latitude : BUILDING_SHADOW_DEFAULTS.latitude;
    var length = opts.length != null ? opts.length : BUILDING_SHADOW_DEFAULTS.length;
    var width = opts.width != null ? opts.width : BUILDING_SHADOW_DEFAULTS.width;
    var height = opts.height != null ? opts.height : BUILDING_SHADOW_DEFAULTS.height;
    var headingDeg = opts.headingDeg != null ? opts.headingDeg : BUILDING_SHADOW_DEFAULTS.headingDeg;

    var terrainProvider = viewer.terrainProvider;
    var carto = Cesium.Cartographic.fromDegrees(lng, lat, 0);

    function addBoxAtHeight(terrainHeight) {
      var h = (terrainHeight != null && Number.isFinite(terrainHeight)) ? terrainHeight : 0;
      var centerHeight = h + height / 2;
      var position = Cesium.Cartesian3.fromDegrees(lng, lat, centerHeight);
      var headingRad = (headingDeg || 0) * (Math.PI / 180);
      var orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(headingRad, 0, 0)
      );
      var halfWidth = width / 2;
      var halfLength = length / 2;
      var halfHeight = height / 2;
      var dimensions = new Cesium.Cartesian3(halfWidth, halfLength, halfHeight);
      var entity = viewer.entities.add({
        position: position,
        orientation: orientation,
        box: {
          dimensions: dimensions,
          material: Cesium.Color.fromCssColorString('#8b7355').withAlpha(0.9),
          fill: true,
          outline: false,
          shadows: Cesium.ShadowMode.CAST_ONLY
        },
        name: 'Bâtiment (ombre)'
      });
      buildingShadowEntity = entity;
      return entity;
    }

    if (terrainProvider && terrainProvider.availability) {
      Cesium.sampleTerrainMostDetailed(terrainProvider, [carto]).then(function (updated) {
        var terrainHeight = updated[0] && updated[0].height != null ? updated[0].height : 0;
        addBoxAtHeight(terrainHeight);
        if (viewer.scene) viewer.scene.requestRender();
      }).catch(function () {
        addBoxAtHeight(0);
      });
    } else {
      addBoxAtHeight(0);
    }
    return buildingShadowEntity;
  }

  function removeBuildingShadow() {
    if (buildingShadowEntity && viewer) {
      viewer.entities.remove(buildingShadowEntity);
      buildingShadowEntity = null;
      if (viewer.scene) viewer.scene.requestRender();
    }
  }

  window.terrainCesiumAddBuildingShadow = addBuildingShadow;
  window.terrainCesiumRemoveBuildingShadow = removeBuildingShadow;

  /** Joue une journée solaire en ~20 s (minuit → minuit, éclairage + rayons activés). */
  function playSunDay() {
    if (!viewer || !viewer.clock || !viewer.scene || !viewer.scene.globe) return;
    viewer.scene.globe.enableLighting = true;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.shadowMap) viewer.shadowMap.enabled = true;
    addSunRays();
    var now = new Date();
    var startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var startJulian = Cesium.JulianDate.fromDate(startDate);
    var stopJulian = Cesium.JulianDate.addSeconds(startJulian, 86400, new Cesium.JulianDate());
    viewer.clock.startTime = startJulian.clone();
    viewer.clock.stopTime = stopJulian.clone();
    viewer.clock.currentTime = startJulian.clone();
    viewer.clock.multiplier = 86400 / 20;
    viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
    viewer.clock.canAnimate = true;
    viewer.clock.shouldAnimate = true;
  }
  window.terrainCesiumPlaySunDay = playSunDay;

  function getCsrfToken() {
    var m = document.cookie.match(/\bcsrftoken=([^;]*)/);
    return m ? m[1] : '';
  }

  function getApiBase() {
    return (typeof window !== 'undefined' && window.location && window.location.origin) ? '' : '';
  }

  function addZoneToMap(zone) {
    if (!viewer || !zone || !zone.boundary || !zone.boundary.coordinates) return;
    var coords = zone.boundary.coordinates[0];
    if (!coords || coords.length < 3) return;
    var css = (zone.couleur && zone.couleur !== 'hachure') ? zone.couleur : '#3d5c2e';
    var color = Cesium.Color.fromCssColorString(css);
    var cartographics = coords.map(function (c) {
      return Cesium.Cartographic.fromDegrees(c[0], c[1], 0);
    });
    var terrainProvider = viewer.terrainProvider;
    var offset = ZONE_HEIGHT_OFFSET_M || 0.5;
    if (!terrainProvider || !terrainProvider.availability) {
      var positions = coords.map(function (c) {
        return Cesium.Cartesian3.fromDegrees(c[0], c[1], offset);
      });
      addZoneEntity(zone, positions, color);
      return;
    }
    Cesium.sampleTerrainMostDetailed(terrainProvider, cartographics).then(function (updated) {
      var positions = updated.map(function (c) {
        var h = (c.height != null && Number.isFinite(c.height)) ? c.height : 0;
        return Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, h + offset);
      });
      addZoneEntity(zone, positions, color);
    }).catch(function () {
      var positions = coords.map(function (c) {
        return Cesium.Cartesian3.fromDegrees(c[0], c[1], offset);
      });
      addZoneEntity(zone, positions, color);
    });
  }

  function zoneMaterial(zone, color) {
    var coul = zone.couleur || '#3d5c2e';
    if (coul === 'hachure') {
      var base = Cesium.Color.fromCssColorString('#3d5c2e');
      return new Cesium.StripeMaterialProperty({
        orientation: Cesium.StripeOrientation.HORIZONTAL,
        evenColor: base.withAlpha(zoneOpacityAlpha),
        oddColor: base.withAlpha(0.08),
        repeat: 8
      });
    }
    return color.withAlpha(zoneOpacityAlpha);
  }

  function addZoneEntity(zone, positions, color) {
    if (!viewer) return;
    var hex = zone.couleur || '#3d5c2e';
    var isBatiment = zone.type === 'batiment' && zone.batiment_hauteur_m != null && Number(zone.batiment_hauteur_m) > 0;
    var hauteurM = isBatiment ? Number(zone.batiment_hauteur_m) : 0;
    zoneDataById[String(zone.id)] = { couleur: hex, type: zone.type, batiment_hauteur_m: isBatiment ? hauteurM : null };
    var mat = zoneMaterial(zone, color);
    var polygonDef = {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: mat,
      outline: true,
      outlineColor: hex === 'hachure' ? Cesium.Color.fromCssColorString('#3d5c2e') : color,
      outlineWidth: 2,
      perPositionHeight: true
    };
    if (isBatiment) {
      var maxH = -Infinity;
      positions.forEach(function (p) {
        var c = viewer.scene.globe.ellipsoid.cartesianToCartographic(p);
        if (c.height != null && c.height > maxH) maxH = c.height;
      });
      if (maxH === -Infinity) maxH = 0;
      polygonDef.extrudedHeight = maxH + hauteurM;
      polygonDef.shadows = Cesium.ShadowMode.CAST_ONLY;
    }
    var entity = viewer.entities.add({
      polygon: polygonDef,
      name: zone.nom || 'Zone'
    });
    if (zone.nom) {
      var center = Cesium.BoundingSphere.fromPoints(positions).center;
      entity.position = center;
      entity.label = {
        text: zone.nom,
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -8),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      };
    }
    zoneEntities[String(zone.id)] = entity;
    zoneInViewer[String(zone.id)] = zonesVisible;
    if (!zonesVisible) viewer.entities.remove(entity);
  }

  function updateZoneEntity(zone) {
    var ent = zoneEntities[String(zone.id)];
    if (!ent || !ent.polygon) return;
    var hex = zone.couleur || '#3d5c2e';
    var isBatiment = zone.type === 'batiment' && zone.batiment_hauteur_m != null && Number(zone.batiment_hauteur_m) > 0;
    var hauteurM = isBatiment ? Number(zone.batiment_hauteur_m) : 0;
    zoneDataById[String(zone.id)] = { couleur: hex, type: zone.type, batiment_hauteur_m: isBatiment ? hauteurM : null };
    var color = hex === 'hachure' ? Cesium.Color.fromCssColorString('#3d5c2e') : Cesium.Color.fromCssColorString(hex);
    ent.polygon.material = zoneMaterial(zone, color);
    ent.polygon.outlineColor = color;
    if (isBatiment) {
      var hier = ent.polygon.hierarchy && (typeof ent.polygon.hierarchy.getValue === 'function' ? ent.polygon.hierarchy.getValue() : ent.polygon.hierarchy);
      var positions = hier && hier.positions ? hier.positions : [];
      var maxH = -Infinity;
      positions.forEach(function (p) {
        var c = viewer.scene.globe.ellipsoid.cartesianToCartographic(p);
        if (c.height != null && c.height > maxH) maxH = c.height;
      });
      if (maxH === -Infinity) maxH = 0;
      ent.polygon.extrudedHeight = maxH + hauteurM;
      ent.polygon.shadows = Cesium.ShadowMode.CAST_ONLY;
    } else {
      ent.polygon.extrudedHeight = undefined;
      ent.polygon.shadows = undefined;
    }
    ent.name = zone.nom || 'Zone';
    if (ent.label) ent.label.text = zone.nom || 'Zone';
    if (viewer && viewer.scene) viewer.scene.requestRender();
  }

  function removeZoneEntity(zoneId) {
    var key = String(zoneId);
    var ent = zoneEntities[key];
    if (ent && viewer) {
      viewer.entities.remove(ent);
      delete zoneEntities[key];
      delete zoneDataById[key];
      delete zoneInViewer[key];
      if (viewer.scene) viewer.scene.requestRender();
    }
  }

  function loadZones() {
    var gardenId = (window.GARDEN_DATA && window.GARDEN_DATA.id);
    if (!gardenId || !viewer) return;
    var apiBase = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? (window.location.origin + (window.API_BASE_PATH || '/api/'))
      : '/api/';
    var url = apiBase + 'zones/?garden_id=' + encodeURIComponent(gardenId);
    var opts = { credentials: 'same-origin' };
    var token = (typeof window !== 'undefined' && window.location && window.location.search) ? (window.location.search.match(/access_token=([^&]+)/) || [])[1] : null;
    if (token) opts.headers = { Authorization: 'Bearer ' + token };
    fetch(url, opts).then(function (r) { return r.json(); }).then(function (list) {
      var arr = Array.isArray(list) ? list : (list && list.results) || [];
      arr.forEach(function (zone) {
        if (zone.boundary && zone.id) addZoneToMap(zone);
      });
    }).catch(function (e) { console.warn('[terrain_cesium] loadZones:', e); });
  }

  function showCoordsLabel(lat, lng) {
    if (!drawZoneState.coordsLabelEl) {
      var el = document.createElement('div');
      el.className = 'terrain-zone-coords-label';
      el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#ede8dc;padding:8px 14px;border-radius:8px;font-family:monospace;font-size:13px;z-index:9998;pointer-events:none;';
      document.body.appendChild(el);
      drawZoneState.coordsLabelEl = el;
    }
    var latStr = lat != null ? lat.toFixed(6) : '—';
    var lngStr = lng != null ? lng.toFixed(6) : '—';
    drawZoneState.coordsLabelEl.textContent = 'lat: ' + latStr + '  lng: ' + lngStr;
    drawZoneState.coordsLabelEl.style.display = '';
  }

  function hideCoordsLabel() {
    if (drawZoneState.coordsLabelEl) {
      drawZoneState.coordsLabelEl.style.display = 'none';
    }
  }

  function showDrawActions() {
    if (!drawZoneState.actionsEl) {
      var wrap = document.createElement('div');
      wrap.className = 'terrain-zone-actions';
      wrap.style.cssText = 'position:fixed;bottom:56px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:9998;pointer-events:auto;';
      var btnClose = document.createElement('button');
      btnClose.type = 'button';
      btnClose.innerHTML = '✓ Fermer la zone';
      btnClose.style.cssText = 'padding:10px 18px;border-radius:8px;border:none;background:#3d5c2e;color:#fff;cursor:pointer;font-size:14px;';
      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.innerHTML = '✕ Annuler';
      btnCancel.style.cssText = 'padding:10px 18px;border-radius:8px;border:1px solid #666;background:rgba(0,0,0,0.85);color:#ede8dc;cursor:pointer;font-size:14px;';
      btnClose.addEventListener('click', function () {
        if (window.terrainCesiumFinishDrawZone) window.terrainCesiumFinishDrawZone();
      });
      btnCancel.addEventListener('click', function () {
        if (window.terrainCesiumCancelDrawZone) window.terrainCesiumCancelDrawZone();
      });
      wrap.appendChild(btnClose);
      wrap.appendChild(btnCancel);
      document.body.appendChild(wrap);
      drawZoneState.actionsEl = wrap;
    }
    drawZoneState.actionsEl.style.display = 'flex';
  }

  function hideDrawActions() {
    if (drawZoneState.actionsEl) {
      drawZoneState.actionsEl.style.display = 'none';
    }
  }

  function clearDrawEntities() {
    if (!viewer) return;
    drawZoneState.entities.forEach(function (e) {
      try { viewer.entities.remove(e); } catch (err) {}
    });
    drawZoneState.entities = [];
    drawZoneState.positions = [];
    drawZoneState.currentMouseCartographic = null;
    if (drawZoneState.previewLineEntity) {
      try { viewer.entities.remove(drawZoneState.previewLineEntity); } catch (err) {}
      drawZoneState.previewLineEntity = null;
    }
    hideCoordsLabel();
    hideDrawActions();
  }

  function positionsToGeoJSON(positions) {
    if (!viewer || !positions || positions.length < 3) return null;
    var ellipsoid = viewer.scene.globe.ellipsoid;
    var coords = positions.map(function (pos) {
      var carto = ellipsoid.cartesianToCartographic(pos);
      return [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
    });
    coords.push(coords[0].slice());
    return { type: 'Polygon', coordinates: [coords] };
  }

  function cancelDrawZone() {
    drawZoneState.active = false;
    if (viewer && viewer.scene) {
      if (viewer.scene.screenSpaceCameraController) {
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
      }
      if (viewer.scene.globe && drawZoneState.depthTestAgainstTerrainWas !== undefined) {
        viewer.scene.globe.depthTestAgainstTerrain = drawZoneState.depthTestAgainstTerrainWas;
      }
    }
    if (drawZoneState.handler && !drawZoneState.handler.isDestroyed()) {
      drawZoneState.handler.destroy();
      drawZoneState.handler = null;
    }
    clearDrawEntities();
  }

  function finishDrawAndShowOverlay() {
    var positions = drawZoneState.positions;
    if (positions.length < 3) return;
    drawZoneState.active = false;
    drawZoneState.currentMousePosition = null;
    drawZoneState.currentMouseCartographic = null;
    hideCoordsLabel();
    hideDrawActions();
    if (drawZoneState.previewLineEntity && viewer) {
      try { viewer.entities.remove(drawZoneState.previewLineEntity); } catch (err) {}
      drawZoneState.previewLineEntity = null;
    }
    if (viewer && viewer.scene) {
      if (viewer.scene.screenSpaceCameraController) {
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
      }
      if (viewer.scene.globe && drawZoneState.depthTestAgainstTerrainWas !== undefined) {
        viewer.scene.globe.depthTestAgainstTerrain = drawZoneState.depthTestAgainstTerrainWas;
      }
    }
    if (drawZoneState.handler && !drawZoneState.handler.isDestroyed()) {
      drawZoneState.handler.destroy();
      drawZoneState.handler = null;
    }
    var boundary = positionsToGeoJSON(positions);
    if (!boundary) return;
    showZoneOverlay(boundary);
  }

  function showZoneOverlay(boundary) {
    if (drawZoneState.overlayEl) {
      drawZoneState.overlayEl.style.display = '';
      drawZoneState.overlayEl.dataset.boundary = JSON.stringify(boundary);
      var nom = drawZoneState.overlayEl.querySelector('.terrain-zone-form-nom');
      var type = drawZoneState.overlayEl.querySelector('.terrain-zone-form-type');
      var colorInput = drawZoneState.overlayEl.querySelector('.terrain-zone-form-color');
      if (nom) nom.value = '';
      if (type) type.value = 'autre';
      if (colorInput) colorInput.value = ZONE_COLOR_OPTIONS[0].value;
      var hWrap = drawZoneState.overlayEl.querySelector('.terrain-zone-form-hauteur-wrap');
      var hInput = drawZoneState.overlayEl.querySelector('.terrain-zone-form-hauteur');
      if (hWrap) hWrap.style.display = 'none';
      if (hInput) hInput.value = '3';
      drawZoneState.overlayEl.querySelectorAll('.terrain-zone-form-colors .terrain-zone-swatch').forEach(function (s) {
        s.classList.toggle('selected', s.dataset.value === (ZONE_COLOR_OPTIONS[0].value));
      });
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'terrain-zone-overlay';
    overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);color:#ede8dc;padding:20px;border-radius:12px;z-index:9999;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
    overlay.dataset.boundary = JSON.stringify(boundary);
    var html = '<div class="terrain-zone-form-title" style="margin-bottom:14px;font-weight:600;">Nouvelle zone</div>';
    html += '<div style="margin-bottom:10px;"><label style="display:block;margin-bottom:4px;">Nom</label><input type="text" class="terrain-zone-form-nom" placeholder="Ex: Potager Nord" style="width:100%;padding:8px;box-sizing:border-box;border-radius:6px;border:1px solid #555;background:#1a1a1a;color:#ede8dc;"></div>';
    html += '<div style="margin-bottom:10px;"><label style="display:block;margin-bottom:4px;">Type</label><select class="terrain-zone-form-type" style="width:100%;padding:8px;box-sizing:border-box;border-radius:6px;border:1px solid #555;background:#1a1a1a;color:#ede8dc;">';
    ['stationnement', 'culture', 'boise', 'eau', 'batiment', 'autre'].forEach(function (t) {
      html += '<option value="' + t + '">' + (ZONE_TYPE_LABELS[t] || t) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="terrain-zone-form-hauteur-wrap" style="margin-bottom:10px;display:none;"><label style="display:block;margin-bottom:4px;">Hauteur du bâtiment (m)</label><input type="number" class="terrain-zone-form-hauteur" min="1" max="50" step="0.5" value="3" placeholder="3" style="width:100%;padding:8px;box-sizing:border-box;border-radius:6px;border:1px solid #555;background:#1a1a1a;color:#ede8dc;"></div>';
    html += '<div style="margin-bottom:14px;"><label style="display:block;margin-bottom:4px;">Couleur</label>';
    html += '<input type="hidden" class="terrain-zone-form-color" value="#3d5c2e">';
    html += '<div class="terrain-zone-form-colors" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div></div>';
    html += '<div style="display:flex;gap:10px;justify-content:flex-end;">';
    html += '<button type="button" class="terrain-zone-btn-cancel" style="padding:8px 16px;border-radius:6px;border:1px solid #666;background:#333;color:#ede8dc;cursor:pointer;">Annuler</button>';
    html += '<button type="button" class="terrain-zone-btn-save" style="padding:8px 16px;border-radius:6px;border:none;background:#3d5c2e;color:#fff;cursor:pointer;">Sauvegarder</button></div>';
    overlay.innerHTML = html;
    overlay.querySelector('.terrain-zone-btn-cancel').addEventListener('click', function () {
      overlay.style.display = 'none';
      clearDrawEntities();
    });
    var typeSelect = overlay.querySelector('.terrain-zone-form-type');
    var hauteurWrap = overlay.querySelector('.terrain-zone-form-hauteur-wrap');
    function toggleHauteurVisibility() {
      if (hauteurWrap) hauteurWrap.style.display = (typeSelect && typeSelect.value === 'batiment') ? 'block' : 'none';
    }
    if (typeSelect) typeSelect.addEventListener('change', toggleHauteurVisibility);
    overlay.querySelector('.terrain-zone-btn-save').addEventListener('click', function () {
      var nom = overlay.querySelector('.terrain-zone-form-nom').value.trim() || 'Sans nom';
      var typeVal = overlay.querySelector('.terrain-zone-form-type').value;
      var colorInput = overlay.querySelector('.terrain-zone-form-color');
      var couleur = (colorInput && colorInput.value) ? colorInput.value : '#3d5c2e';
      var hauteurInput = overlay.querySelector('.terrain-zone-form-hauteur');
      var batimentHauteur = (typeVal === 'batiment' && hauteurInput) ? parseFloat(hauteurInput.value, 10) : null;
      if (typeVal === 'batiment' && (batimentHauteur == null || isNaN(batimentHauteur) || batimentHauteur < 0.5)) batimentHauteur = 3;
      var boundaryData = JSON.parse(overlay.dataset.boundary || '{}');
      saveZoneAndClose(nom, typeVal, couleur, boundaryData, overlay, batimentHauteur);
    });
    var colorsDiv = overlay.querySelector('.terrain-zone-form-colors');
    if (colorsDiv) {
      ZONE_COLOR_OPTIONS.forEach(function (o, i) {
        var swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'terrain-zone-swatch' + (i === 0 ? ' selected' : '');
        swatch.dataset.value = o.value;
        swatch.title = o.label;
        swatch.style.cssText = 'width:32px;height:32px;border-radius:8px;border:2px solid rgba(255,255,255,0.3);cursor:pointer;padding:0;';
        if (o.value === 'hachure') {
          swatch.style.background = 'repeating-linear-gradient(-45deg,#3d5c2e,#3d5c2e 2px,rgba(61,92,46,0.2) 2px,rgba(61,92,46,0.2) 6px)';
        } else {
          swatch.style.backgroundColor = o.value;
        }
        swatch.addEventListener('click', function () {
          overlay.querySelectorAll('.terrain-zone-swatch').forEach(function (s) { s.classList.remove('selected'); });
          swatch.classList.add('selected');
          var inp = overlay.querySelector('.terrain-zone-form-color');
          if (inp) inp.value = swatch.dataset.value;
        });
        colorsDiv.appendChild(swatch);
      });
    }
    document.body.appendChild(overlay);
    drawZoneState.overlayEl = overlay;
  }

  function saveZoneAndClose(nom, typeVal, couleur, boundary, overlayEl, batimentHauteurM) {
    var gardenId = window.GARDEN_DATA && window.GARDEN_DATA.id;
    if (!gardenId) return;
    var url = getApiBase() + '/api/zones/';
    var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    var csrf = getCsrfToken();
    if (csrf) headers['X-CSRFToken'] = csrf;
    var payload = { garden: gardenId, nom: nom, type: typeVal, couleur: couleur, boundary: boundary };
    if (typeVal === 'batiment' && batimentHauteurM != null && !isNaN(batimentHauteurM)) payload.batiment_hauteur_m = batimentHauteurM;
    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: headers,
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (err) { throw new Error(err.detail || err.nom || JSON.stringify(err)); });
      return r.json();
    }).then(function (zone) {
      if (overlayEl) overlayEl.style.display = 'none';
      clearDrawEntities();
      if (zone && zone.id) {
        addZoneToMap(zone);
        try { window.dispatchEvent(new CustomEvent('terrain-zone-added', { detail: { zone: zone } })); } catch (e) {}
      }
    }).catch(function (e) {
      console.warn('[terrain_cesium] saveZone:', e);
      alert('Erreur lors de la sauvegarde : ' + (e.message || e));
    });
  }

  function startDrawZone() {
    var gardenId = window.GARDEN_DATA && window.GARDEN_DATA.id;
    if (!gardenId || !viewer) return;
    clearDrawEntities();
    drawZoneState.active = true;
    if (viewer.scene.screenSpaceCameraController) {
      viewer.scene.screenSpaceCameraController.enableRotate = false;
      viewer.scene.screenSpaceCameraController.enableTilt = false;
    }
    var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    drawZoneState.handler = handler;

    function getTerrainPickPosition(screenPosition) {
      var ray = viewer.camera.getPickRay(screenPosition);
      if (!ray) return undefined;
      var position = viewer.scene.globe.pick(ray, viewer.scene);
      if (position) return position;
      return viewer.camera.pickEllipsoid(screenPosition);
    }

    function addPoint(position) {
      drawZoneState.positions.push(position);
      var dot = viewer.entities.add({
        position: position,
        point: {
          pixelSize: 8,
          color: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1
        }
      });
      drawZoneState.entities.push(dot);
      if (drawZoneState.positions.length === 1) {
        createPreviewLineEntity();
      }
      if (drawZoneState.positions.length >= 3) {
        showDrawActions();
      }
    }

    function removePreviewLine() {
      if (drawZoneState.previewLineEntity && viewer) {
        try { viewer.entities.remove(drawZoneState.previewLineEntity); } catch (err) {}
        drawZoneState.previewLineEntity = null;
      }
    }

    function createPreviewLineEntity() {
      removePreviewLine();
      drawZoneState.currentMousePosition = null;
      drawZoneState.currentMouseCartographic = null;
      var previewEnt = viewer.entities.add({
        polyline: {
          positions: new Cesium.CallbackProperty(function () {
            var positions = drawZoneState.positions;
            var cur = drawZoneState.currentMousePosition;
            if (positions.length === 0) return [Cesium.Cartesian3.ZERO, Cesium.Cartesian3.ZERO];
            var out = positions.slice();
            if (cur) {
              out.push(cur);
            } else {
              out.push(out[out.length - 1].clone());
            }
            return out;
          }, false),
          width: 2,
          material: Cesium.Color.WHITE.withAlpha(0.5),
          clampToGround: true
        }
      });
      drawZoneState.previewLineEntity = previewEnt;
    }

    drawZoneState.depthTestAgainstTerrainWas = viewer.scene.globe.depthTestAgainstTerrain;
    viewer.scene.globe.depthTestAgainstTerrain = true;

    handler.setInputAction(function (click) {
      if (!drawZoneState.active) return;
      var position = getTerrainPickPosition(click.position);
      if (!position) return;
      addPoint(position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(function (move) {
      if (!drawZoneState.active) return;
      var position = getTerrainPickPosition(move.endPosition);
      if (position) {
        drawZoneState.currentMousePosition = position;
        var carto = viewer.scene.globe.ellipsoid.cartesianToCartographic(position);
        drawZoneState.currentMouseCartographic = carto;
        showCoordsLabel(Cesium.Math.toDegrees(carto.latitude), Cesium.Math.toDegrees(carto.longitude));
      } else {
        drawZoneState.currentMousePosition = null;
        drawZoneState.currentMouseCartographic = null;
        showCoordsLabel(null, null);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction(function (dblClick) {
      if (!drawZoneState.active || drawZoneState.positions.length < 3) return;
      finishDrawAndShowOverlay();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  function setZonesVisible(visible) {
    if (!viewer || !viewer.entities) return zonesVisible;
    zonesVisible = !!visible;
    var keys = Object.keys(zoneEntities);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[terrain_cesium] setZonesVisible(', visible, ') zones count=', keys.length, ' keys=', keys);
    }
    keys.forEach(function (id) {
      var ent = zoneEntities[id];
      if (!ent) return;
      var wasIn = zoneInViewer[id];
      if (zonesVisible) {
        if (!wasIn) { viewer.entities.add(ent); zoneInViewer[id] = true; }
      } else {
        if (wasIn) { viewer.entities.remove(ent); zoneInViewer[id] = false; }
      }
    });
    if (!zonesVisible) {
      hideDrawActions();
      hideCoordsLabel();
      if (drawZoneState.overlayEl) drawZoneState.overlayEl.style.display = 'none';
    }
    if (viewer.scene) viewer.scene.requestRender();
    return zonesVisible;
  }
  function getZonesVisible() {
    return zonesVisible;
  }
  function setZoneVisible(id, visible) {
    if (id == null || id === '') return;
    var key = String(id);
    var ent = zoneEntities[key];
    if (typeof console !== 'undefined' && console.log) {
      console.log('[terrain_cesium] setZoneVisible id=', id, ' key=', key, ' visible=', visible, ' found=', !!ent);
    }
    if (ent && viewer && viewer.entities) {
      var wasIn = zoneInViewer[key];
      if (visible) {
        if (!wasIn) { viewer.entities.add(ent); zoneInViewer[key] = true; }
      } else {
        if (wasIn) { viewer.entities.remove(ent); zoneInViewer[key] = false; }
      }
      if (viewer.scene) viewer.scene.requestRender();
    }
  }
  function getZoneVisible(id) {
    if (id == null || id === '') return true;
    var key = String(id);
    return zoneInViewer[key] !== false;
  }
  function setZoneOpacity(alpha) {
    alpha = Math.max(0.05, Math.min(1, Number(alpha) || 0.3));
    zoneOpacityAlpha = alpha;
    Object.keys(zoneEntities).forEach(function (id) {
      var ent = zoneEntities[id];
      var data = zoneDataById[id];
      if (!data || !ent || !ent.polygon) return;
      var zone = { couleur: data.couleur };
      var css = (data.couleur && data.couleur !== 'hachure') ? data.couleur : '#3d5c2e';
      var color = Cesium.Color.fromCssColorString(css);
      ent.polygon.material = zoneMaterial(zone, color);
    });
    if (viewer && viewer.scene) viewer.scene.requestRender();
    return zoneOpacityAlpha;
  }
  function getZoneOpacity() {
    return zoneOpacityAlpha;
  }

  window.terrainCesiumStartDrawZone = startDrawZone;
  window.terrainCesiumFinishDrawZone = finishDrawAndShowOverlay;
  window.terrainCesiumCancelDrawZone = cancelDrawZone;
  window.terrainCesiumGetGardenId = function () { return window.GARDEN_DATA && window.GARDEN_DATA.id; };
  window.terrainCesiumLoadZones = loadZones;
  window.terrainCesiumSetZonesVisible = setZonesVisible;
  window.terrainCesiumZonesVisible = getZonesVisible;
  window.terrainCesiumSetZoneVisible = setZoneVisible;
  window.terrainCesiumGetZoneVisible = getZoneVisible;
  window.terrainCesiumSetZoneOpacity = setZoneOpacity;
  window.terrainCesiumGetZoneOpacity = getZoneOpacity;
  window.terrainCesiumUpdateZoneEntity = updateZoneEntity;
  window.terrainCesiumRemoveZoneEntity = removeZoneEntity;

  (async function init() {
    var worldTerrain = await Cesium.createWorldTerrainAsync();
    viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: worldTerrain,
      imageryProvider: false,
      useDefaultRenderLoop: true,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      compass: false
    });

    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.globe.enableLighting = false;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
    if (viewer.shadowMap) viewer.shadowMap.enabled = true;

    viewer.imageryLayers.removeAll();
    try {
      viewer.imageryLayers.addImageryProvider(createQuebecOrthosProvider());
    } catch (e) {
      console.warn('[terrain_cesium] Ortho Québec:', e.message);
    }

    var savedView = getSavedDefaultView();
    if (savedView) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(savedView.lng, savedView.lat, savedView.height),
        orientation: {
          heading: savedView.heading != null ? savedView.heading : 0,
          pitch: savedView.pitch != null ? savedView.pitch : Cesium.Math.toRadians(-90),
          roll: savedView.roll != null ? savedView.roll : 0
        }
      });
    } else {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, FLY_HEIGHT_M),
        orientation: {
          heading: 0,
          pitch: Cesium.Math.toRadians(-90),
          roll: 0
        }
      });
    }

    window.viewer = viewer;
    window.terrainCesiumViewer = viewer;

    (function hideCesiumCompass() {
      var container = document.getElementById('cesiumContainer');
      if (!container) return;
      var compass = container.querySelector('.cesium-viewer-compass') || container.querySelector('.cesium-compass') || container.querySelector('[class*="compass"]');
      if (compass) {
        compass.style.setProperty('display', 'none', 'important');
      }
      if (!compass) setTimeout(hideCesiumCompass, 100);
    })();

    var gardenData = window.GARDEN_DATA || {};
    if (gardenData.boundary) {
      addBoundaryPolyline(viewer, gardenData.boundary);
    }

    if (gardenData.id) {
      loadZones();
    }

    if (window.INITIAL_SPECIMENS && Array.isArray(window.INITIAL_SPECIMENS)) {
      addSpecimenMarkers(window.INITIAL_SPECIMENS);
    }

    var search = window.location && window.location.search ? window.location.search : '';
    if (search.indexOf('terrain=lidar') !== -1 && LIDAR_ASSET_ID != null) setTerrainLidar();
  })().catch(function (err) {
    console.error('[terrain_cesium] Init:', err);
  });
})();
