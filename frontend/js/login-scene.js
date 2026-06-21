(function () {
  "use strict";

  var NIGHT_DELAY_MS = 3000;
  var NIGHT_THEME = "#0a0e18";
  var DAY_THEME = "#87CEEB";
  var LOGIN_MUSIC_VOLUME = 0.55;

  var loginMusic = null;
  var loginMusicStarted = false;
  var loginMusicInteractHandler = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setThemeColor(color) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", color);
  }

  function enterNightMode() {
    if (document.body.classList.contains("login-page--night")) return;
    document.body.classList.add("login-page--night");
    setThemeColor(NIGHT_THEME);
  }

  function startLoginMusic() {
    if (loginMusicStarted || !loginMusic) return;
    loginMusic.play()
      .then(function () {
        loginMusicStarted = true;
        unbindLoginMusicFallback();
      })
      .catch(function () {
        bindLoginMusicFallback();
      });
  }

  function unbindLoginMusicFallback() {
    if (!loginMusicInteractHandler) return;
    document.removeEventListener("click", loginMusicInteractHandler);
    document.removeEventListener("touchstart", loginMusicInteractHandler);
    document.removeEventListener("keydown", loginMusicInteractHandler);
    loginMusicInteractHandler = null;
  }

  function bindLoginMusicFallback() {
    if (loginMusicInteractHandler) return;

    loginMusicInteractHandler = function () {
      startLoginMusic();
    };

    document.addEventListener("click", loginMusicInteractHandler, { passive: true });
    document.addEventListener("touchstart", loginMusicInteractHandler, { passive: true });
    document.addEventListener("keydown", loginMusicInteractHandler);
  }

  function initLoginMusic() {
    var musicUrl = "images/audio/audio-cuppycake.mp3";
    if (!document.body.classList.contains("login-page")) return;

    loginMusic = new Audio(musicUrl);
    loginMusic.loop = true;
    loginMusic.preload = "auto";
    loginMusic.volume = LOGIN_MUSIC_VOLUME;
    startLoginMusic();
  }

  function initLoginScene() {
    if (!document.body.classList.contains("login-page")) return;

    setThemeColor(DAY_THEME);
    initLoginMusic();

    if (prefersReducedMotion()) {
      enterNightMode();
      return;
    }

    window.setTimeout(enterNightMode, NIGHT_DELAY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLoginScene);
  } else {
    initLoginScene();
  }
})();
