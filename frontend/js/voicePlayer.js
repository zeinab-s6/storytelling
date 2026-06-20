(function () {
  "use strict";

  var audioContext = null;
  var sourceNode = null;
  var gainNode = null;
  var lowpassNode = null;
  var highShelfNode = null;
  var bufferCache = {};
  var playingUrl = null;
  var isPlaying = false;
  var onStateChange = null;

  function getContext() {
    if (!audioContext) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
    }
    return audioContext;
  }

  function settingsToParams(settings) {
    var speed = settings.speed != null ? settings.speed : 0.85;
    var pitch = settings.pitch != null ? settings.pitch : 0.9;
    var emotion = settings.emotion != null ? settings.emotion : 0.4;
    var clarity = settings.clarity != null ? settings.clarity : 0.9;

    return {
      playbackRate: speed,
      detune: (pitch - 1) * 900,
      lowpassFrequency: 12000 - emotion * 5500,
      highShelfGain: (clarity - 0.75) * 14,
      gain: 0.55 + clarity * 0.35,
    };
  }

  function applyParams(params) {
    if (!sourceNode) return;
    if (sourceNode.playbackRate) sourceNode.playbackRate.value = params.playbackRate;
    if (sourceNode.detune) sourceNode.detune.value = params.detune;
    if (lowpassNode) lowpassNode.frequency.value = params.lowpassFrequency;
    if (highShelfNode) highShelfNode.gain.value = params.highShelfGain;
    if (gainNode) gainNode.gain.value = params.gain;
  }

  function buildChain(ctx, settings) {
    var params = settingsToParams(settings);
    sourceNode = ctx.createBufferSource();
    lowpassNode = ctx.createBiquadFilter();
    highShelfNode = ctx.createBiquadFilter();
    gainNode = ctx.createGain();

    lowpassNode.type = "lowpass";
    lowpassNode.frequency.value = params.lowpassFrequency;
    lowpassNode.Q.value = 0.7;

    highShelfNode.type = "highshelf";
    highShelfNode.frequency.value = 3200;
    highShelfNode.gain.value = params.highShelfGain;

    gainNode.gain.value = params.gain;

    sourceNode.connect(lowpassNode);
    lowpassNode.connect(highShelfNode);
    highShelfNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    applyParams(params);
  }

  function notifyState() {
    if (typeof onStateChange === "function") onStateChange(isPlaying);
  }

  function stopInternal() {
    if (sourceNode) {
      try {
        sourceNode.onended = null;
        sourceNode.stop(0);
      } catch (e) {
        /* already stopped */
      }
      sourceNode.disconnect();
      sourceNode = null;
    }
    isPlaying = false;
    playingUrl = null;
    notifyState();
  }

  function authFetchHeaders() {
    var headers = {};
    var token = window.StorytellingAuth && window.StorytellingAuth.getToken && window.StorytellingAuth.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function loadBuffer(url) {
    if (bufferCache[url]) return Promise.resolve(bufferCache[url]);
    return fetch(url, { headers: authFetchHeaders() })
      .then(function (res) {
        if (!res.ok) {
          return res.text().catch(function () { return ""; }).then(function (body) {
            var loadError = new Error("بارگذاری فایل صوتی ناموفق بود.");
            if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
              window.StorytellingAPI.logFetchFailure(url, loadError, res, body);
            }
            throw loadError;
          });
        }
        return res.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        var ctx = getContext();
        if (!ctx) throw new Error("مرورگر از پخش صدا پشتیبانی نمی‌کند.");
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then(function (buffer) {
        bufferCache[url] = buffer;
        return buffer;
      })
      .catch(function (err) {
        if (!err.status && window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
          window.StorytellingAPI.logFetchFailure(url, err, null, null);
        }
        throw err;
      });
  }

  function play(url, settings) {
    var ctx = getContext();
    if (!ctx) return Promise.reject(new Error("مرورگر از پخش صدا پشتیبانی نمی‌کند."));

    stopInternal();

    return loadBuffer(url).then(function (buffer) {
      if (ctx.state === "suspended") {
        return ctx.resume().then(function () { return buffer; });
      }
      return buffer;
    }).then(function (buffer) {
      buildChain(ctx, settings || {});
      sourceNode.buffer = buffer;
      sourceNode.loop = false;
      sourceNode.onended = function () {
        isPlaying = false;
        playingUrl = null;
        notifyState();
      };
      sourceNode.start(0);
      isPlaying = true;
      playingUrl = url;
      notifyState();
    });
  }

  function toggle(url, settings) {
    if (isPlaying && playingUrl === url) {
      stopInternal();
      return Promise.resolve(false);
    }
    return play(url, settings).then(function () { return true; });
  }

  function updateSettings(settings) {
    if (!isPlaying) return;
    applyParams(settingsToParams(settings || {}));
  }

  function setOnStateChange(callback) {
    onStateChange = callback;
  }

  window.VoicePlayer = {
    play: play,
    toggle: toggle,
    stop: stopInternal,
    updateSettings: updateSettings,
    setOnStateChange: setOnStateChange,
    isPlaying: function () { return isPlaying; },
    getPlayingUrl: function () { return playingUrl; },
  };
})();
