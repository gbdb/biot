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
  var LIDAR_ASSET_ID = 4510919;
  var QUEBEC_TMS_ORTHOS_URL = 'https://geoegl.msp.gouv.qc.ca/apis/carto/tms/1.0.0/orthos@EPSG_3857/{z}/{x}/{reverseY}.jpeg';
  var specimenEntities = {};
  var boundaryEntity = null;
  var sunRayEntity = null;
  var sunShadowEntity = null;
  var viewer;

  var BOUNDARY_OFFSET_M = 10;
  var BOUNDARY_COLOR = '#c4832a';
  var BOUNDARY_WIDTH = 3;
  var SUN_RAY_LENGTH_M = 50000;
  var SUN_SHADOW_LENGTH_M = 200;
  var SUN_RAY_COLOR = '#f5a623';
  var SUN_SHADOW_COLOR = '#c0392b';
  var SUN_RAY_WIDTH = 4;
  var SUN_SHADOW_WIDTH = 2;
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

  function addSpecimenMarkers(specimens) {
    if (!viewer || !Array.isArray(specimens)) return;
    Object.keys(specimenEntities).forEach(function (id) {
      viewer.entities.remove(specimenEntities[id]);
    });
    specimenEntities = {};
    var valid = specimens.filter(function (s) { return s.latitude != null && s.longitude != null; });
    if (valid.length === 0) return;

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
      });
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
    Cesium.createWorldTerrainAsync().then(function (provider) {
      viewer.terrainProvider = provider;
    }).catch(function (e) { console.warn('[terrain_cesium] World Terrain:', e.message); });
  }

  function setTerrainLidar() {
    if (!viewer) return;
    Cesium.CesiumTerrainProvider.fromIonAssetId(LIDAR_ASSET_ID).then(function (provider) {
      viewer.terrainProvider = provider;
    }).catch(function (e) { console.warn('[terrain_cesium] LiDAR terrain:', e.message); });
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
  window.terrainCesiumFlyHome = function () {
    if (!viewer || !viewer.camera) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, FLY_HEIGHT_M),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
      duration: 1
    });
  };

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
        var now = new Date();
        var noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(noon);
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
    if (next) {
      if (viewer.clock) {
        var now = new Date();
        var noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(noon);
      }
      addSunRays();
    } else {
      removeSunRays();
    }
    return viewer.scene.globe.enableLighting;
  }
  window.terrainCesiumToggleSun = toggleSunLighting;
  window.terrainCesiumSunEnabled = function () {
    return viewer && viewer.scene && viewer.scene.globe ? viewer.scene.globe.enableLighting : false;
  };

  /** Joue une journée solaire en ~20 s (minuit → minuit, éclairage + rayons activés). */
  function playSunDay() {
    if (!viewer || !viewer.clock || !viewer.scene || !viewer.scene.globe) return;
    viewer.scene.globe.enableLighting = true;
    if (viewer.scene.sun) viewer.scene.sun.show = false;
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

  (async function init() {
    var worldTerrain = await Cesium.createWorldTerrainAsync();
    viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: worldTerrain,
      imageryProvider: false,
      useDefaultRenderLoop: true
    });

    viewer.scene.screenSpaceCameraController.enableZoom = true;
    viewer.scene.globe.enableLighting = false;
    if (viewer.scene.sun) viewer.scene.sun.show = false;

    viewer.imageryLayers.removeAll();
    try {
      viewer.imageryLayers.addImageryProvider(createQuebecOrthosProvider());
    } catch (e) {
      console.warn('[terrain_cesium] Ortho Québec:', e.message);
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, FLY_HEIGHT_M),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });

    window.viewer = viewer;
    window.terrainCesiumViewer = viewer;

    var gardenData = window.GARDEN_DATA || {};
    if (gardenData.boundary) {
      addBoundaryPolyline(viewer, gardenData.boundary);
    }

    if (window.INITIAL_SPECIMENS && Array.isArray(window.INITIAL_SPECIMENS) && window.INITIAL_SPECIMENS.length > 0) {
      addSpecimenMarkers(window.INITIAL_SPECIMENS);
    }
  })().catch(function (err) {
    console.error('[terrain_cesium] Init:', err);
  });
})();
