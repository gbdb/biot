/**
 * Bridge postMessage WebView ↔ React Native (vue terrain 3D)
 * Expose receiveFromRN et postToRN pour terrain_cesium.js et terrain_ui.js
 */
(function () {
  'use strict';

  var listeners = [];

  function handleMessage(event) {
    var data = typeof event.data === 'string' ? event.data : (event.data && event.data.data);
    if (!data) return;
    try {
      var msg = JSON.parse(data);
      listeners.forEach(function (fn) { fn(msg); });
    } catch (e) {
      console.warn('Terrain bridge parse error', e);
    }
  }

  window.addEventListener('message', handleMessage);
  if (document.addEventListener) document.addEventListener('message', handleMessage);

  /** Appelé par React Native pour injecter un message (injectJavaScript) */
  window.receiveFromRN = function (dataStr) {
    handleMessage({ data: dataStr });
  };

  /** Envoyer un message à React Native (type + payload) */
  window.postToRN = function (msg) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } catch (e) {}
  };

  /** S'abonner aux messages entrants (pour terrain_cesium et terrain_ui) */
  window.terrainOnMessage = function (fn) {
    listeners.push(fn);
  };
})();
