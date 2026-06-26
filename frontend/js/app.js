(function () {
  "use strict";

  // To test without backend, you can temporarily enable mockFrontendMode = true.
  const mockFrontendMode = false;

  const VOICE_TAGLINE_FALLBACK = "صدای مورد نظر را از بخش کتابخانه صدا انتخاب کنید.";

  const STORAGE_KEYS = {
    sessionId: "storytelling_session_id",
    lastStory: "storytelling_last_story",
    history: "storytelling_history",
    childName: "storytelling_child_name",
  };

  const GOAL_LABELS = {
    sleep: "خوابیدن",
    food: "غذا خوردن",
    cleanup: "جمع کردن اسباب‌بازی",
    calm: "آرام شدن",
    waiting: "سرگرمی هنگام انتظار",
    "screen-free": "کمتر کردن موبایل",
    brushing: "مسواک",
    bath: "حمام",
    dressing: "لباس پوشیدن",
  };

  const MOOD_LABELS = {
    calm: "آرام",
    angry: "عصبانی",
    restless: "بی‌قرار",
    sleepy: "خواب‌آلود",
    bored: "بی‌حوصله",
    sad: "ناراحت",
    excited: "هیجان‌زده",
  };

  const PROVIDER_LABELS = {
    mock: "تست محلی",
    openai: "هوش مصنوعی",
    liara: "لیارا",
    elevenlabs: "ElevenLabs",
  };

  const GOAL_CHIPS = [
    { key: "sleep", label: "خواب" },
    { key: "food", label: "غذا" },
    { key: "calm", label: "آرامش" },
    { key: "waiting", label: "انتظار" },
    { key: "screen-free", label: "موبایل کمتر" },
    { key: "brushing", label: "مسواک" },
  ];

  const OPENAI_VOICES = [
    { id: "nova", nameFa: "نوا", nameEn: "Nova", backendVoice: "nova", tags: ["ملایم", "قبل خواب"], description: "صدای گرم و آرام — مناسب قصه شب.", avatarHue: 340 },
    { id: "shimmer", nameFa: "شیمر", nameEn: "Shimmer", backendVoice: "shimmer", tags: ["نرم", "مهربان"], description: "لحن نرم و دوستانه برای کودک.", avatarHue: 270 },
    { id: "coral", nameFa: "مرجان", nameEn: "Coral", backendVoice: "coral", tags: ["روشن", "شاد"], description: "انرژی ملایم و شاد.", avatarHue: 28 },
    { id: "alloy", nameFa: "آلوی", nameEn: "Alloy", backendVoice: "alloy", tags: ["خنثی", "واضح"], description: "صدای متعادل و واضح.", avatarHue: 200 },
  ];

  const VOICES = [
    { id: "bahar", nameFa: "بهار", nameEn: "Bahar", backendVoice: "bahar", tags: ["قصه", "قبل خواب", "ملایم"], description: "صدای گرم و طبیعی — مناسب روایت قصه.", avatarHue: 340 },
    { id: "afra", nameFa: "افرا", nameEn: "Afra", backendVoice: "afra", tags: ["آرام", "واضح", "روایت"], description: "راوی آرام و واضح برای روایت قصه.", avatarHue: 200 },
    { id: "sara", nameFa: "سارا", nameEn: "Sara", backendVoice: "sara", tags: ["نرم", "احساسی", "مهربان"], description: "صدای نرم و مهربان.", avatarHue: 270 },
    { id: "dara", nameFa: "دارا", nameEn: "Dara", backendVoice: "dara", tags: ["گرم", "مطمئن", "قصه"], description: "صدای گرم و مطمئن.", avatarHue: 28 },
    { id: "garsha", nameFa: "گرشا", nameEn: "Garsha", backendVoice: "garsha", tags: ["شاد", "بازیگوش", "کمدی"], description: "مناسب قصه‌های شاد و بازیگوش.", avatarHue: 45 },
    { id: "poneh", nameFa: "پونه", nameEn: "Poneh", backendVoice: "poneh", tags: ["جوان", "ماجراجویی", "پرانرژی"], description: "صدای شاد و پرانرژی.", avatarHue: 160 },
  ];

  const LEGACY_VOICE_MAP = {
    "warm-father": "dara",
    "soft-mother": "bahar",
    "funny-uncle": "garsha",
    "calm-narrator": "afra",
    "magical-storyteller": "sara",
    "young-hero": "poneh",
    "sleepy-bedtime": "bahar",
    "cartoon-character": "garsha",
  };

  const PRESETS = {
    calm: { speed: 0.85, pitch: 0.9, emotion: 0.4, clarity: 0.9, label: "آرام" },
    dramatic: { speed: 1.0, pitch: 1.05, emotion: 0.75, clarity: 1.0, label: "نمایشی" },
    playful: { speed: 1.15, pitch: 1.2, emotion: 0.85, clarity: 0.95, label: "بازیگوش" },
    bedtime: { speed: 0.75, pitch: 0.85, emotion: 0.35, clarity: 0.88, label: "قبل خواب" },
  };

  const state = {
    selectedVoiceId: "nova",
    selectedPreset: "calm",
    storyResult: null,
    storyId: null,
    provider: null,
    audioResult: null,
    audioFullUrl: null,
    audioVoiceId: null,
    isGeneratingStory: false,
    isGeneratingAudio: false,
    isPlaying: false,
    waveformAnimating: false,
    voiceMode: null,
    sliders: { speed: 0.85, pitch: 0.9, emotion: 0.4, clarity: 0.9 },
    advanced: { pauseBetweenSentences: 0.5, emphasisLevel: 0.6, backgroundAmbience: false, autoNormalize: true },
    history: [],
  };

  let mobileTab = "home";
  let toastTimeout = null;
  let audioElement = null;
  let storyAudioBlobUrl = null;
  let audioHydrationToken = 0;
  let backgroundAmbienceElement = null;
  let createProgressTimer = null;
  let createHintTimer = null;
  let createProgressValue = 0;
  let storyGenerationAbort = null;

  var CREATE_LOADING_HINTS = [
    "لطفاً چند لحظه صبر کنید...",
    "قصه متناسب با سن و علایق کودک نوشته می‌شود...",
    "تقریباً آماده است...",
  ];

  var BACKGROUND_AMBIENCE_URL = "images/audio/source.mp3";
  var BACKGROUND_AMBIENCE_VOLUME = 0.14;

  function isMobileLayout() {
    return document.body.classList.contains("app-shell");
  }

  function setMobileTab(tab) {
    mobileTab = tab || "home";
    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-tab", mobileTab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    $$(".bottom-nav__item[data-mobile-tab]").forEach(function (item) {
      item.classList.toggle("bottom-nav__item--active", item.dataset.mobileTab === mobileTab);
    });
    var navCreate = $("#btn-nav-create");
    if (navCreate) {
      navCreate.classList.toggle("bottom-nav__item--active", mobileTab === "create");
    }
  }

  function openCreatePanel(mode) {
    var panel = $("#create-panel");
    var empty = $("#create-empty");
    var loading = $("#create-loading");
    if (!panel || !empty || !loading) return;
    panel.hidden = false;
    empty.hidden = mode !== "empty";
    loading.hidden = mode !== "loading";
  }

  function closeCreatePanel() {
    var panel = $("#create-panel");
    if (panel) panel.hidden = true;
  }

  function updateCreateProgressUI(value) {
    var bar = $("#create-progress-bar");
    var pct = $("#create-progress-pct");
    var progress = $("#create-progress");
    var rounded = Math.round(value);
    if (bar) bar.style.width = rounded + "%";
    if (pct) pct.textContent = rounded.toLocaleString("fa-IR") + "٪";
    if (progress) progress.setAttribute("aria-valuenow", String(rounded));
  }

  function startCreateProgress() {
    stopCreateProgress();
    createProgressValue = 0;
    updateCreateProgressUI(0);
    var hintIndex = 0;
    var hintEl = $("#create-loading-hint");
    if (hintEl) hintEl.textContent = CREATE_LOADING_HINTS[0];
    createHintTimer = setInterval(function () {
      hintIndex = (hintIndex + 1) % CREATE_LOADING_HINTS.length;
      if (hintEl) hintEl.textContent = CREATE_LOADING_HINTS[hintIndex];
    }, 3200);
    createProgressTimer = setInterval(function () {
      if (createProgressValue >= 90) return;
      var step = createProgressValue < 45 ? 2.5 : createProgressValue < 75 ? 1.2 : 0.6;
      createProgressValue = Math.min(90, createProgressValue + step);
      updateCreateProgressUI(createProgressValue);
    }, 450);
  }

  function completeCreateProgress() {
    stopCreateProgress();
    updateCreateProgressUI(100);
  }

  function stopCreateProgress() {
    if (createProgressTimer) {
      clearInterval(createProgressTimer);
      createProgressTimer = null;
    }
    if (createHintTimer) {
      clearInterval(createHintTimer);
      createHintTimer = null;
    }
  }

  function delayWithSignal(ms, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      var timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener("abort", function () {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }
    });
  }

  function cancelStoryGeneration() {
    if (!state.isGeneratingStory || !storyGenerationAbort) return;
    storyGenerationAbort.abort();
  }

  function handleNavCreateClick() {
    if (!isMobileLayout()) {
      handlePrimaryAction();
      return;
    }
    if (state.isGeneratingStory) {
      openCreatePanel("loading");
      setMobileTab("create");
      return;
    }
    if (state.storyResult) {
      handlePrimaryAction();
      return;
    }
    var settingsError = validateForm();
    if (settingsError) {
      openCreatePanel("empty");
      setMobileTab("create");
      return;
    }
    openCreatePanel("loading");
    setMobileTab("create");
    handleGenerateStory({ fromCreatePanel: true });
  }

  function syncMobilePlayerMeta() {
    var voice = getSelectedVoice();
    var data = getFormData();
    var duration = data.durationMinutes ? data.durationMinutes + " دقیقه" : "—";
    var compactVoice = $("#player-voice-name-compact");
    var compactDuration = $("#player-duration-compact");
    if (compactVoice) compactVoice.textContent = voice.nameFa;
    if (compactDuration) compactDuration.textContent = duration;
    var playIcon = $("#mobile-play-icon");
    if (playIcon && window.StorytellingIcons) {
      window.StorytellingIcons.setPlayIcon(playIcon, state.isPlaying);
    }
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function getVoiceSampleUrl() {
    return "assets/voice-sample.wav";
  }

  function useApiPlayback() {
    return true;
  }

  function shouldUseClientBackgroundAmbience() {
    return !!state.advanced.backgroundAmbience
      && !(state.audioResult && state.audioResult.backgroundAmbienceApplied);
  }

  function getVoicePlaybackOptions() {
    return {
      backgroundAmbience: shouldUseClientBackgroundAmbience(),
      backgroundAmbienceApplied: !!(state.audioResult && state.audioResult.backgroundAmbienceApplied),
    };
  }

  function stopNativeBackgroundAmbience() {
    if (backgroundAmbienceElement) {
      backgroundAmbienceElement.pause();
      backgroundAmbienceElement.currentTime = 0;
    }
  }

  function startNativeBackgroundAmbience() {
    if (!shouldUseClientBackgroundAmbience()) {
      stopNativeBackgroundAmbience();
      return;
    }
    if (!backgroundAmbienceElement) {
      backgroundAmbienceElement = new Audio(BACKGROUND_AMBIENCE_URL);
      backgroundAmbienceElement.loop = true;
      backgroundAmbienceElement.preload = "auto";
      backgroundAmbienceElement.volume = BACKGROUND_AMBIENCE_VOLUME;
    }
    backgroundAmbienceElement.play().catch(function () { /* autoplay blocked */ });
  }

  function syncNativeBackgroundAmbience(playing) {
    if (playing) startNativeBackgroundAmbience();
    else stopNativeBackgroundAmbience();
  }

  function syncStoryTextFromPreview() {
    var preview = $("#story-preview");
    if (preview && state.storyResult) {
      state.storyResult.storyText = preview.value || state.storyResult.storyText || "";
    }
  }

  function buildNarrationText() {
    if (!state.storyResult) return "";
    syncStoryTextFromPreview();
    var s = state.storyResult;
    return [s.parentIntro, s.storyText, s.calmingAction, s.followUpQuestion]
      .filter(function (part) { return typeof part === "string" && part.trim(); })
      .join("\n\n");
  }

  function invalidateStoryAudioIfNeeded(nextVoiceId) {
    if (state.audioFullUrl && state.audioVoiceId && nextVoiceId !== state.audioVoiceId) {
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      renderAudioPlayer();
      updatePrimaryButton();
    }
  }

  function playGeneratedStoryAudio() {
    if (!state.audioFullUrl) return Promise.resolve(false);
    if (useApiPlayback()) {
      return hydrateStoryAudioPlayer().then(function (ready) {
        if (!ready || !audioElement) return false;
        return audioElement.play()
          .then(function () {
            syncNativeBackgroundAmbience(true);
            syncPlayingState(true);
            return true;
          })
          .catch(function () {
            syncNativeBackgroundAmbience(false);
            syncPlayingState(false);
            showToast("برای پخش، دکمه پلی پلیر را بزن.", "info");
            return false;
          });
      });
    }
    return playWithVoiceSettings(getPlaybackUrl());
  }

  function isStoryAudioUrl(url) {
    return typeof url === "string" && url.indexOf("/api/stories/") !== -1 && url.indexOf("/audio/") !== -1;
  }

  function revokeStoryAudioBlobUrl() {
    if (storyAudioBlobUrl) {
      URL.revokeObjectURL(storyAudioBlobUrl);
      storyAudioBlobUrl = null;
    }
  }

  function getVoiceTagline() {
    if (state.voiceMode && state.voiceMode.voiceTagline) {
      return state.voiceMode.voiceTagline;
    }
    return VOICE_TAGLINE_FALLBACK;
  }

  function setVoiceLoadingLabel(el) {
    if (el) el.textContent = getVoiceTagline();
  }

  function syncVoiceTaglines() {
    setVoiceLoadingLabel($("#voice-lib-subtitle"));
    setVoiceLoadingLabel($("#voice-settings-subtitle"));
    setVoiceLoadingLabel($("#voice-mode-status"));
  }

  function getAuthFetchHeaders() {
    var headers = {};
    var token = window.StorytellingAuth && window.StorytellingAuth.getToken && window.StorytellingAuth.getToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function fetchStoryAudioBlob(url) {
    var response;
    try {
      response = await fetch(url, { headers: getAuthFetchHeaders() });
    } catch (err) {
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("story audio network error", {
          url: url,
          status: null,
          body: null,
          error: err,
        });
      }
      throw err;
    }
    if (!response.ok) {
      var errBody = null;
      try {
        errBody = await response.clone().text();
      } catch (e) { /* ignore */ }
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("story audio HTTP error", {
          url: url,
          status: response.status,
          body: errBody,
          error: null,
        });
      }
      throw new Error("بارگذاری فایل صوتی ناموفق بود.");
    }
    return response.blob();
  }

  function waitForAudioReady(element) {
    return new Promise(function (resolve, reject) {
      if (element.readyState >= 1) {
        resolve();
        return;
      }
      function onReady() {
        cleanup();
        resolve();
      }
      function onError() {
        cleanup();
        reject(new Error("فایل صوتی قابل پخش نیست."));
      }
      function cleanup() {
        element.removeEventListener("loadedmetadata", onReady);
        element.removeEventListener("error", onError);
      }
      element.addEventListener("loadedmetadata", onReady);
      element.addEventListener("error", onError);
    });
  }

  async function hydrateStoryAudioPlayer() {
    if (!useApiPlayback() || !state.audioFullUrl) return false;

    var wrap = $("#audio-player-wrap");
    var label = $("#audio-player-status");
    var token = ++audioHydrationToken;

    try {
      if (label) setVoiceLoadingLabel(label);

      var blob = await fetchStoryAudioBlob(state.audioFullUrl);
      if (token !== audioHydrationToken) return false;

      revokeStoryAudioBlobUrl();
      storyAudioBlobUrl = URL.createObjectURL(blob);

      if (!audioElement) {
        renderAudioPlayerShell();
        audioElement = $("#story-audio");
      }
      if (!audioElement) return false;

      audioElement.src = storyAudioBlobUrl;
      audioElement.load();
      await waitForAudioReady(audioElement);
      if (token !== audioHydrationToken) return false;

      if (label) {
        label.textContent = "فایل صوتی آماده است — می‌توانی آفلاین گوش بدهی یا ذخیره کنی.";
      }
      updateDownloadControls();
      return true;
    } catch (e) {
      if (token !== audioHydrationToken) return false;
      showError(formatApiError(e, "بارگذاری فایل صوتی ناموفق بود."));
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      if (wrap) {
        wrap.hidden = true;
        wrap.innerHTML = "";
      }
      audioElement = null;
      revokeStoryAudioBlobUrl();
      updatePrimaryButton();
      return false;
    }
  }

  function renderAudioPlayerShell() {
    var wrap = $("#audio-player-wrap");
    if (!wrap) return;
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="audio-player-card">' +
        '<p class="audio-player-card__title">فایل صوتی قصه</p>' +
        '<audio id="story-audio" controls preload="auto" class="native-audio"></audio>' +
        '<div class="audio-download-bar">' +
          '<span class="audio-download-bar__label" id="audio-player-status">' + getVoiceTagline() + '</span>' +
          '<button type="button" class="btn btn--sm" id="btn-download-inline" aria-label="دانلود فایل صوتی">' +
            'دانلود صدا' +
          '</button>' +
        '</div>' +
      '</div>';
    audioElement = $("#story-audio");
    if (audioElement) {
      audioElement.addEventListener("play", function () {
        syncNativeBackgroundAmbience(true);
        syncPlayingState(true);
      });
      audioElement.addEventListener("pause", function () {
        syncNativeBackgroundAmbience(false);
        syncPlayingState(false);
      });
      audioElement.addEventListener("ended", function () {
        syncNativeBackgroundAmbience(false);
        syncPlayingState(false);
      });
    }
    var inlineDownload = $("#btn-download-inline");
    if (inlineDownload) inlineDownload.addEventListener("click", handleDownload);
  }

  function getPlaybackUrl() {
    if (useApiPlayback() && state.audioFullUrl) return state.audioFullUrl;
    return getVoiceSampleUrl();
  }

  function formatApiError(err, fallback) {
    if (err && err.data) {
      if (err.data.error) return err.data.error;
      if (err.data.hint) return err.data.hint;
    }
    return (err && err.message) || fallback;
  }

  function getAudioDownloadFilename() {
    var ext = "mp3";
    if (state.audioResult && state.audioResult.format) {
      ext = state.audioResult.format;
    } else if (state.audioFullUrl && state.audioFullUrl.indexOf(".wav") !== -1) {
      ext = "wav";
    }
    var voice = getSelectedVoice();
    var slug = voice.id || "voice";
    return "lalaBye-" + (state.storyId || "sample") + "-" + slug + "." + ext;
  }

  function updateDownloadControls() {
    var hasAudio = !!state.audioFullUrl;
    var footerBtn = $("#btn-download");
    var regenBtn = $("#btn-regenerate-audio");
    if (footerBtn) {
      footerBtn.hidden = !hasAudio;
      footerBtn.disabled = !hasAudio || state.isGeneratingAudio;
    }
    if (regenBtn) {
      regenBtn.hidden = !state.storyResult;
      regenBtn.disabled = state.isGeneratingAudio;
    }
  }

  function syncPlayingState(playing) {
    state.isPlaying = !!playing;
    updatePrimaryButton();
    syncMobilePlayerMeta();
  }

  function playWithVoiceSettings(url) {
    if (!window.VoicePlayer) {
      showError("پخش‌کننده صدا در دسترس نیست.");
      return Promise.resolve(false);
    }
    return window.VoicePlayer.toggle(url, state.sliders, getVoicePlaybackOptions())
      .then(function (playing) {
        syncPlayingState(playing);
        return playing;
      })
      .catch(function (e) {
        syncPlayingState(false);
        showError(e.message || "پخش صدا ناموفق بود.");
        return false;
      });
  }

  function stopVoicePlayback() {
    if (window.VoicePlayer) window.VoicePlayer.stop();
    stopNativeBackgroundAmbience();
    syncPlayingState(false);
  }

  function playVoicePreview(voice) {
    var selected = voice || getSelectedVoice();
    if (!useApiPlayback()) {
      return playWithVoiceSettings(getVoiceSampleUrl());
    }
    if (state.storyResult && state.storyId) {
      if (state.audioFullUrl && state.audioVoiceId === selected.id) {
        return playGeneratedStoryAudio();
      }
      return handleGenerateAudio({ autoPlay: true, voice: selected });
    }
    var previewText = buildNarrationText();
    return window.StorytellingAPI.previewVoice(
      selected.backendVoice,
      "wav",
      previewText || undefined,
      { backgroundAmbience: !!state.advanced.backgroundAmbience },
    )
      .then(function (result) {
        if (!result.success || !result.audio || !result.audio.audioUrl) {
          throw new Error("پیش‌نمایش صدا از سرور دریافت نشد.");
        }
        var url = window.StorytellingAPI.buildFullAudioUrl(result.audio.audioUrl);
        var previewOptions = {
          backgroundAmbience: !!state.advanced.backgroundAmbience && !result.audio.backgroundAmbienceApplied,
          backgroundAmbienceApplied: !!result.audio.backgroundAmbienceApplied,
        };
        if (!window.VoicePlayer) {
          showError("پخش‌کننده صدا در دسترس نیست.");
          return false;
        }
        return window.VoicePlayer.toggle(url, state.sliders, previewOptions)
          .then(function (playing) {
            syncPlayingState(playing);
            return playing;
          });
      })
      .catch(function (e) {
        showError(formatApiError(e, "پیش‌نمایش صدا ناموفق بود."));
        return false;
      });
  }

  function getSessionId() {
    let id = localStorage.getItem(STORAGE_KEYS.sessionId);
    if (!id) {
      id = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(STORAGE_KEYS.sessionId, id);
    }
    return id;
  }

  function getVoices() {
    if (state.voiceMode && state.voiceMode.ttsProvider === "ivira") {
      return VOICES;
    }
    if (state.voiceMode && state.voiceMode.ttsProvider === "openai") {
      return OPENAI_VOICES;
    }
    return OPENAI_VOICES;
  }

  function getSelectedVoice() {
    var voices = getVoices();
    var found = voices.find(function (v) { return v.id === state.selectedVoiceId; });
    if (found) return found;
    var legacyId = LEGACY_VOICE_MAP[state.selectedVoiceId];
    if (legacyId) {
      found = voices.find(function (v) { return v.id === legacyId; });
      if (found) return found;
    }
    return voices[0];
  }

  function formatPersianDate(iso) {
    try {
      return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch (e) {
      return iso || "";
    }
  }

  function showToast(message, type) {
    var container = $("#toast-container");
    if (!container) return;
    var toast = document.createElement("div");
    toast.className = "toast toast--" + (type || "info");
    toast.setAttribute("role", "alert");
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("toast--visible"); });
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function () {
      toast.classList.remove("toast--visible");
      setTimeout(function () { toast.remove(); }, 300);
    }, 4000);
  }

  function showError(message) {
    showToast(message, "error");
    var errorEl = $("#form-error");
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
  }

  function clearError() {
    var errorEl = $("#form-error");
    if (errorEl) { errorEl.textContent = ""; errorEl.hidden = true; }
  }

  function getFormData() {
    return {
      childName: ($("#childName") && $("#childName").value || "").trim(),
      age: Number($("#age") && $("#age").value),
      interest: ($("#interest") && $("#interest").value || "").trim(),
      goal: $("#goal") && $("#goal").value || "",
      mood: $("#mood") && $("#mood").value || "",
      durationMinutes: Number($("#durationMinutes") && $("#durationMinutes").value),
      extraContext: ($("#extraContext") && $("#extraContext").value || "").trim(),
      sessionId: getSessionId(),
    };
  }

  function validateForm() {
    var data = getFormData();
    var safetyChecked = $("#safety-checkbox") && $("#safety-checkbox").checked;
    if (!Number.isFinite(data.age) && data.age !== 0) return "سن کودک را انتخاب کن.";
    if (!data.interest) return "علاقه کودک را وارد کن.";
    if (!data.goal) return "هدف قصه را انتخاب کن.";
    if (!data.mood) return "حال کودک را انتخاب کن.";
    if (!data.durationMinutes) return "مدت زمان قصه را انتخاب کن.";
    if (!safetyChecked) return "لطفاً تأیید کن که این قصه فقط پیشنهاد عمومی است.";
    return null;
  }

  function estimateReadingMinutes(text) {
    if (!text) return 0;
    return Math.max(1, Math.round(text.trim().split(/\s+/).length / 80));
  }

  function loadSavedChildName() {
    try {
      var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
      if (user && user.childName) return user.childName;
      return localStorage.getItem(STORAGE_KEYS.childName) || "";
    } catch (e) {
      return "";
    }
  }

  function saveChildName(name, syncServer) {
    var trimmed = (name || "").trim();
    try {
      if (trimmed) localStorage.setItem(STORAGE_KEYS.childName, trimmed);
      else localStorage.removeItem(STORAGE_KEYS.childName);
    } catch (e) { /* ignore */ }

    if (syncServer && window.StorytellingAPI && window.StorytellingAuth && window.StorytellingAuth.isLoggedIn()) {
      window.StorytellingAPI.updateChildProfile({ childName: trimmed || "" })
        .then(function (result) {
          if (result && result.user) window.StorytellingAuth.updateUser(result.user);
        })
        .catch(function () { /* offline — local only */ });
    }
  }

  function getEffectiveChildName() {
    var fromForm = ($("#childName") && $("#childName").value || "").trim();
    if (fromForm) return fromForm;
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (user && user.childName) return user.childName;
    return loadSavedChildName();
  }

  function applyChildNameToForm(name) {
    var childNameInput = $("#childName");
    if (childNameInput && name) childNameInput.value = name;
    saveChildName(name, false);
  }

  function syncChildDisplay() {
    var name = getEffectiveChildName();
    var nameEl = $("#mobile-profile-name");
    var tagline = $("#mobile-profile-child-label");
    if (nameEl) nameEl.textContent = name || "کودک";
    if (!tagline) return;
    tagline.textContent = name
      ? "یک قصه برای " + name
      : "مدیریت قصه‌ها و حساب کاربری";
  }

  function updateHero(story) {
    var titleEl = $("#hero-title");
    var subEl = $("#hero-subtitle");
    if (!titleEl) return;

    if (story && story.title) {
      titleEl.textContent = story.title;
      if (subEl) subEl.textContent = story.parentIntro || "حالا می‌توانی قصه را بخوانی یا با صدا پخش کنی.";
      var hero = $("#story-hero");
      if (hero) hero.classList.add("story-hero--has-story");
    } else {
      titleEl.textContent = "روزت را به قصه تبدیل کن.";
      if (subEl) subEl.textContent = "وقتی قصه ای برای گفتن نداری با لالابای برای کوچولوت یک قصه تازه بساز.";
      var heroEl = $("#story-hero");
      if (heroEl) heroEl.classList.remove("story-hero--has-story");
    }
  }

  function updateSummaries() {
    var data = getFormData();
    var voice = getSelectedVoice();
    var goalLabel = GOAL_LABELS[data.goal] || "—";
    var duration = data.durationMinutes ? data.durationMinutes + " دقیقه" : "—";
    var el;
    el = $("#summary-goal"); if (el) el.textContent = goalLabel;
    el = $("#summary-voice"); if (el) el.textContent = voice.nameFa;
    el = $("#summary-duration"); if (el) el.textContent = duration;
    el = $("#player-duration"); if (el) el.textContent = duration;
    el = $("#player-voice-name"); if (el) el.textContent = voice.nameFa;
    syncMobilePlayerMeta();
  }

  function updateCharCount() {
    var preview = $("#story-preview");
    var countEl = $("#char-count");
    var readEl = $("#read-duration");
    if (!preview || !countEl) return;
    var text = preview.value || "";
    countEl.textContent = text.length.toLocaleString("fa-IR") + " کاراکتر";
    if (readEl) readEl.textContent = estimateReadingMinutes(text) + " دقیقه تخمینی";
  }

  function setWaveformState(active) {
    state.waveformAnimating = active;
    var wf = $("#waveform");
    if (wf) wf.classList.toggle("waveform--active", active);
    if (wf) wf.classList.toggle("waveform--loading", state.isGeneratingStory || state.isGeneratingAudio);
  }

  function updatePrimaryButton() {
    var btn = $("#btn-primary-action");
    var label = $("#btn-primary-label");
    if (!btn || !label) return;
    btn.disabled = state.isGeneratingStory || state.isGeneratingAudio;
    if (state.isGeneratingStory) {
      label.textContent = "در حال ساخت قصه...";
      btn.classList.add("btn--loading");
      setWaveformState(true);
      return;
    }
    if (state.isGeneratingAudio) {
      label.textContent = useApiPlayback() ? "در حال ساخت فایل صوتی..." : "در حال آماده‌سازی نمونه...";
      btn.classList.add("btn--loading");
      setWaveformState(true);
      return;
    }
    btn.classList.remove("btn--loading");
    if (!state.storyResult) {
      label.textContent = "ساخت قصه";
    } else if (!state.audioFullUrl) {
      label.textContent = useApiPlayback() ? "خواندن قصه با صدا" : "آماده‌سازی نمونه صدا";
    } else if (state.isPlaying) {
      label.textContent = "توقف";
    } else {
      label.textContent = useApiPlayback() ? "پخش" : "پخش نمونه";
    }
    setWaveformState(state.isPlaying);
  }

  function renderGoalChips() {
    var container = $("#goal-chips");
    if (!container) return;
    container.innerHTML = "";
    GOAL_CHIPS.forEach(function (chip) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = chip.label;
      btn.dataset.goal = chip.key;
      var goalSelect = $("#goal");
      if (goalSelect && goalSelect.value === chip.key) btn.classList.add("chip--active");
      btn.addEventListener("click", function () {
        if (goalSelect) goalSelect.value = chip.key;
        $$("#goal-chips .chip").forEach(function (c) { c.classList.remove("chip--active"); });
        btn.classList.add("chip--active");
        updateSummaries();
      });
      container.appendChild(btn);
    });
  }

  function renderVoiceCards(filter) {
    var container = $("#voice-library");
    if (!container) return;
    var query = (filter || "").trim().toLowerCase();
    container.innerHTML = "";
    getVoices().filter(function (v) {
      if (!query) return true;
      var hay = (v.nameFa + " " + v.nameEn + " " + v.tags.join(" ") + " " + v.description).toLowerCase();
      return hay.indexOf(query) !== -1;
    }).forEach(function (voice) {
      var card = document.createElement("article");
      card.className = "voice-card" + (state.selectedVoiceId === voice.id ? " voice-card--selected" : "");
      card.dataset.voiceId = voice.id;
      card.innerHTML =
        '<div class="voice-card__avatar" style="--avatar-hue:' + voice.avatarHue + '">' +
          '<span aria-hidden="true">' + voice.nameFa.charAt(0) + '</span>' +
        '</div>' +
        '<div class="voice-card__body">' +
          '<div class="voice-card__header">' +
            '<h4 class="voice-card__name">' + voice.nameFa + '</h4>' +
            '<span class="voice-card__en">' + voice.nameEn + '</span>' +
          '</div>' +
          '<div class="voice-card__tags">' + voice.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join("") + '</div>' +
          '<p class="voice-card__desc">' + voice.description + '</p>' +
        '</div>' +
        '<button type="button" class="voice-card__preview btn btn--ghost btn--icon btn--sm" aria-label="پیش‌نمایش صدای ' + voice.nameFa + '">' +
          (window.StorytellingIcons ? window.StorytellingIcons.render("play", "app-icon--sm") : "") +
        '</button>';
      card.addEventListener("click", function (e) {
        if (e.target.closest(".voice-card__preview")) return;
        invalidateStoryAudioIfNeeded(voice.id);
        state.selectedVoiceId = voice.id;
        renderVoiceCards($("#voice-search") && $("#voice-search").value);
        updateSummaries();
      });
      var previewBtn = card.querySelector(".voice-card__preview");
      previewBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        previewBtn.classList.add("voice-card__preview--active");
        playVoicePreview(voice).then(function (playing) {
          if (playing) showToast("پیش‌نمایش: " + voice.nameFa, "info");
        });
        setTimeout(function () { previewBtn.classList.remove("voice-card__preview--active"); }, 1200);
      });
      container.appendChild(card);
    });
  }

  function renderStoryCard() {
    var emptyEl = $("#center-empty");
    var resultEl = $("#story-result");
    var preview = $("#story-preview");
    if (!resultEl) return;

    if (!state.storyResult) {
      if (emptyEl) emptyEl.hidden = false;
      resultEl.hidden = true;
      if (preview) preview.value = "";
      var lastSection = $("#last-story-section");
      if (lastSection) lastSection.hidden = true;
      updateHero(null);
      updateCharCount();
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    resultEl.hidden = false;
    var s = state.storyResult;
    var providerLabel = PROVIDER_LABELS[state.provider] || state.provider || "—";

    $("#story-title").textContent = s.title || "بدون عنوان";
    $("#story-parent-intro").textContent = s.parentIntro || "—";
    $("#story-text").textContent = s.storyText || "";
    $("#story-calming").textContent = s.calmingAction || "—";
    $("#story-question").textContent = s.followUpQuestion || "—";
    $("#story-safety").textContent = s.safetyNote || "—";

    var interactionsEl = $("#story-interactions");
    var interactionsSection = $("#story-interactions-section");
    var interactionPoints = (s.interactionPoints || []).filter(function (point) {
      return typeof point === "string" && point.trim();
    });
    if (interactionsEl) {
      interactionsEl.innerHTML = "";
      interactionPoints.forEach(function (point) {
        var li = document.createElement("li");
        li.textContent = point;
        interactionsEl.appendChild(li);
      });
    }
    if (interactionsSection) {
      interactionsSection.hidden = interactionPoints.length === 0;
    }

    $("#meta-story-id").textContent = state.storyId ? "#" + state.storyId : "—";
    $("#meta-duration").textContent = (s.durationMinutes || "—") + " دقیقه";
    $("#meta-age").textContent = s.ageRange || "—";
    $("#meta-provider").textContent = providerLabel;

    if (preview) {
      preview.value = s.storyText || "";
      updateCharCount();
    }

    var lastSection = $("#last-story-section");
    if (lastSection) lastSection.hidden = false;
    updateHero(s);
  }

  function renderAudioPlayer() {
    var wrap = $("#audio-player-wrap");
    if (!wrap) return;
    if (!state.audioFullUrl) {
      wrap.hidden = true;
      wrap.innerHTML = "";
      audioElement = null;
      revokeStoryAudioBlobUrl();
      updateDownloadControls();
      return;
    }
    if (useApiPlayback()) {
      renderAudioPlayerShell();
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML =
      '<div class="sample-audio-player">' +
        '<p class="sample-audio-player__label">' + getVoiceTagline() + '</p>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="btn-inline-play">پخش نمونه</button>' +
      '</div>';
    audioElement = null;
    revokeStoryAudioBlobUrl();
    var inlinePlay = $("#btn-inline-play");
    if (inlinePlay) {
      inlinePlay.addEventListener("click", function () {
        playWithVoiceSettings(getPlaybackUrl());
      });
    }
    updateDownloadControls();
  }

  function renderSliders() {
    Object.keys(state.sliders).forEach(function (key) {
      var input = $("#slider-" + key);
      var val = $("#val-" + key);
      if (input) input.value = state.sliders[key];
      if (val) val.textContent = Number(state.sliders[key]).toFixed(2);
    });
    Object.keys(state.advanced).forEach(function (key) {
      var input = $("#adv-" + key);
      if (!input) return;
      if (input.type === "checkbox") input.checked = !!state.advanced[key];
      else input.value = state.advanced[key];
    });
    $$(".preset-btn").forEach(function (btn) {
      btn.classList.toggle("preset-btn--active", btn.dataset.preset === state.selectedPreset);
    });
  }

  function renderVoiceMode() {
    syncVoiceTaglines();
  }

  function saveLastStory() {
    if (!state.storyResult || !state.storyId) return;
    var voice = getSelectedVoice();
    var payload = {
      storyId: state.storyId,
      provider: state.provider,
      story: state.storyResult,
      voiceId: voice.id,
      voiceName: voice.nameFa,
      audioUrl: isStoryAudioUrl(state.audioFullUrl) ? state.audioFullUrl : null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.lastStory, JSON.stringify(payload));
  }

  function loadLastStory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.lastStory);
      if (!raw) return;
      var data = JSON.parse(raw);
      state.storyId = data.storyId;
      state.provider = data.provider;
      state.storyResult = data.story;
      state.selectedVoiceId = data.voiceId || state.selectedVoiceId;
      state.audioFullUrl = isStoryAudioUrl(data.audioUrl) ? data.audioUrl : null;
      state.audioResult = state.audioFullUrl ? { audioUrl: state.audioFullUrl } : null;
      state.audioVoiceId = data.voiceId || null;
      renderStoryCard();
      renderAudioPlayer();
      if (state.audioFullUrl) hydrateStoryAudioPlayer();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
      updateSummaries();
    } catch (e) { /* ignore corrupt data */ }
  }

  function addToHistory(item) {
    state.history.unshift(item);
    if (state.history.length > 30) state.history = state.history.slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
    renderHistory();
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEYS.history);
      state.history = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.history = [];
    }
    renderHistory();
  }

  function renderHistory() {
    var list = $("#history-list");
    var empty = $("#history-empty");
    if (!list) return;
    list.innerHTML = "";
    if (!state.history.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    state.history.forEach(function (item, index) {
      var card = document.createElement("article");
      card.className = "history-card";
      var providerLabel = PROVIDER_LABELS[item.provider] || item.provider || "—";
      card.innerHTML =
        '<div class="history-card__main">' +
          '<h4>' + (item.title || "قصه بدون عنوان") + '</h4>' +
          '<p class="history-card__meta">' +
            item.voiceName + ' · ' + (item.durationMinutes || "—") + ' دقیقه · ' + providerLabel +
          '</p>' +
          '<time class="history-card__date">' + formatPersianDate(item.savedAt) + '</time>' +
        '</div>' +
        '<div class="history-card__actions">' +
          ((item.audioUrl || !useApiPlayback()) ? '<button type="button" class="btn btn--ghost btn--icon btn--sm history-play" aria-label="پخش">' + (window.StorytellingIcons ? window.StorytellingIcons.render("play", "app-icon--sm") : "") + '</button>' : '') +
          '<button type="button" class="btn btn--secondary btn--sm history-restore">بازیابی</button>' +
        '</div>';
      var playBtn = card.querySelector(".history-play");
      if (playBtn) {
        playBtn.addEventListener("click", function () {
          stopVoicePlayback();
          if (audioElement) audioElement.pause();
          state.audioFullUrl = isStoryAudioUrl(item.audioUrl) ? item.audioUrl : null;
          renderAudioPlayer();
          if (state.audioFullUrl) {
            hydrateStoryAudioPlayer().then(function () {
              playGeneratedStoryAudio();
            });
          } else {
            playWithVoiceSettings(getVoiceSampleUrl());
          }
          closeHistoryDrawer();
        });
      }
      card.querySelector(".history-restore").addEventListener("click", function () {
        restoreHistoryItem(item);
        closeHistoryDrawer();
      });
      list.appendChild(card);
    });
  }

  function restoreHistoryItem(item) {
    state.storyId = item.storyId;
    state.provider = item.provider;
    state.storyResult = item.story;
    state.selectedVoiceId = item.voiceId || state.selectedVoiceId;
    state.audioFullUrl = isStoryAudioUrl(item.audioUrl) ? item.audioUrl : null;
    state.audioVoiceId = item.voiceId || null;

    if (item.formSnapshot) {
      var fs = item.formSnapshot;
      if (fs.childName) applyChildNameToForm(fs.childName);
      ["interest", "extraContext", "age", "goal", "mood", "durationMinutes"].forEach(function (key) {
        var el = $("#" + key);
        if (el && fs[key] !== undefined && fs[key] !== null && fs[key] !== "") {
          el.value = String(fs[key]);
        }
      });
      renderGoalChips();
    }

    renderStoryCard();
    renderAudioPlayer();
    if (state.audioFullUrl) hydrateStoryAudioPlayer();
    renderVoiceCards($("#voice-search") && $("#voice-search").value);
    updateSummaries();
    updatePrimaryButton();
    syncChildDisplay();
    showToast("قصه بازیابی شد.", "success");
  }

  function clearSavedStory() {
    localStorage.removeItem(STORAGE_KEYS.lastStory);
    state.storyResult = null;
    state.storyId = null;
    state.provider = null;
    state.audioResult = null;
    state.audioFullUrl = null;
    state.audioVoiceId = null;
    state.isPlaying = false;
    stopVoicePlayback();
    if (audioElement) audioElement.pause();
    revokeStoryAudioBlobUrl();
    renderStoryCard();
    renderAudioPlayer();
    updatePrimaryButton();
    var lastSection = $("#last-story-section");
    if (lastSection) lastSection.hidden = true;
    showToast("قصه ذخیره‌شده پاک شد.", "info");
  }

  function clearHistory() {
    state.history = [];
    localStorage.removeItem(STORAGE_KEYS.history);
    renderHistory();
    showToast("تاریخچه پاک شد.", "info");
  }

  function openHistoryDrawer() {
    var drawer = $("#history-drawer");
    var overlay = $("#drawer-overlay");
    if (drawer) { drawer.classList.add("drawer--open"); drawer.setAttribute("aria-hidden", "false"); }
    if (overlay) { overlay.classList.add("overlay--visible"); overlay.setAttribute("aria-hidden", "false"); }
    document.body.classList.add("drawer-open");
  }

  function closeHistoryDrawer() {
    var drawer = $("#history-drawer");
    var overlay = $("#drawer-overlay");
    if (drawer) { drawer.classList.remove("drawer--open"); drawer.setAttribute("aria-hidden", "true"); }
    if (overlay) { overlay.classList.remove("overlay--visible"); overlay.setAttribute("aria-hidden", "true"); }
    document.body.classList.remove("drawer-open");
  }

  function scrollToSettings() {
    var panel = $("#settings-panel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getMockStory(data) {
    var name = data.childName || "کودک";
    return {
      success: true,
      storyId: Date.now(),
      provider: "mock",
      story: {
        title: "ماجرای آرام " + name,
        ageRange: data.age + " سال",
        goal: data.goal,
        durationMinutes: data.durationMinutes,
        parentEffort: "low",
        parentIntro: name + " عزیز، بیا با هم یک قصه کوتاه بشنویم.",
        storyText: "روزی روزگاری " + name + " که " + data.interest + " را خیلی دوست داشت، تصمیم گرفت آرام‌تر شود. با هر نفس عمیق، ستاره‌های کوچک در آسمان می‌درخشیدند و قلبش گرم‌تر شد.",
        interactionPoints: ["با هم نفس عمیق بکشیم.", "ستاره‌های انگشت را بشمار."],
        calmingAction: "سه نفس آهسته و آرام.",
        followUpQuestion: "امشب کدام ستاره را دوست داشتی؟",
        safetyNote: "این قصه فقط پیشنهاد عمومی است.",
      },
    };
  }

  async function handleGenerateStory(options) {
    options = options || {};
    clearError();
    var err = validateForm();
    if (err) {
      if (options.fromCreatePanel && isMobileLayout()) {
        openCreatePanel("empty");
        setMobileTab("create");
      } else {
        showError(err);
      }
      return;
    }
    var data = getFormData();
    state.isGeneratingStory = true;
    updatePrimaryButton();
    storyGenerationAbort = new AbortController();
    var signal = storyGenerationAbort.signal;
    if (options.fromCreatePanel && isMobileLayout()) {
      openCreatePanel("loading");
      setMobileTab("create");
      startCreateProgress();
    }

    try {
      var result;
      if (mockFrontendMode) {
        await delayWithSignal(800, signal);
        result = getMockStory(data);
      } else {
        result = await window.StorytellingAPI.generateStory(data, { signal: signal });
      }
      if (signal.aborted) return;
      if (!result.success) throw new Error(result.error || "ساخت قصه ناموفق بود.");
      state.storyId = result.storyId;
      state.provider = result.provider;
      state.storyResult = result.story;
      state.audioResult = null;
      state.audioFullUrl = null;
      renderStoryCard();
      renderAudioPlayer();
      saveLastStory();
      var voice = getSelectedVoice();
      addToHistory({
        storyId: state.storyId,
        provider: state.provider,
        story: state.storyResult,
        title: state.storyResult.title,
        voiceId: voice.id,
        voiceName: voice.nameFa,
        durationMinutes: state.storyResult.durationMinutes,
        audioUrl: null,
        savedAt: new Date().toISOString(),
        formSnapshot: getFormData(),
      });
      if (options.fromCreatePanel && isMobileLayout()) {
        completeCreateProgress();
        showToast("قصه با موفقیت ساخته شد!", "success");
        setTimeout(function () {
          closeCreatePanel();
          setMobileTab("home");
        }, 500);
      } else {
        showToast("قصه با موفقیت ساخته شد!", "success");
        if (isMobileLayout()) setMobileTab("home");
      }
    } catch (e) {
      if (e.name === "AbortError") {
        if (options.fromCreatePanel && isMobileLayout()) {
          stopCreateProgress();
          closeCreatePanel();
          setMobileTab("story");
          showToast("ساخت قصه متوقف شد.", "info");
        }
        return;
      }
      var msg = "ساخت قصه ناموفق بود. لطفاً دوباره تلاش کن.";
      if (e.message === "Failed to fetch" || e.name === "TypeError") {
        msg = "اتصال به سرور برقرار نشد. مطمئن شو بک‌اند روی آدرس درست اجرا شده است.";
      } else if (e.message) {
        msg = e.message;
      }
      if (options.fromCreatePanel && isMobileLayout()) {
        stopCreateProgress();
        closeCreatePanel();
        setMobileTab("story");
        showToast(msg, "error");
      } else {
        showError(msg);
      }
    } finally {
      storyGenerationAbort = null;
      state.isGeneratingStory = false;
      updatePrimaryButton();
    }
  }

  // Future standalone TTS endpoint example:
  // POST /api/tts/generate
  async function generateVoiceFromAPI(text, voice, settings) {
    var url = `${window.API_BASE_URL}/api/tts/generate`;
    var response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, voice: voice, settings: settings }),
      });
    } catch (err) {
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("tts generate network error", {
          url: url,
          status: null,
          body: null,
          error: err,
        });
      }
      throw err;
    }
    if (!response.ok) {
      var errBody = null;
      try {
        errBody = await response.clone().json();
      } catch (e) {
        try { errBody = await response.clone().text(); } catch (e2) { /* ignore */ }
      }
      if (window.StorytellingAPI && window.StorytellingAPI.logFetchFailure) {
        window.StorytellingAPI.logFetchFailure("tts generate HTTP error", {
          url: url,
          status: response.status,
          body: errBody,
          error: null,
        });
      }
    }
    return response.json();
  }

  function buildAudioPayload(voiceOverride) {
    var voice = voiceOverride || getSelectedVoice();
    return {
      voice: voice.backendVoice,
      format: "wav",
      narrationText: buildNarrationText(),
      backgroundAmbience: !!state.advanced.backgroundAmbience,
    };
  }

  async function handleGenerateAudio(options) {
    options = options || {};
    if (!state.storyId) { showError("ابتدا قصه را بساز."); return false; }

    var narrationText = buildNarrationText();
    if (!narrationText.trim()) {
      showError("متن قصه برای خواندن با صدا خالی است.");
      return false;
    }

    if (!useApiPlayback()) {
      state.isGeneratingAudio = true;
      updatePrimaryButton();
      setVoiceLoadingLabel($("#audio-player-status"));
      try {
        await new Promise(function (r) { setTimeout(r, 400); });
        state.audioFullUrl = getVoiceSampleUrl();
        state.audioSourceType = "sample";
        state.audioResult = { audioUrl: state.audioFullUrl, format: "wav", voice: getSelectedVoice().backendVoice };
        state.audioVoiceId = getSelectedVoice().id;
        renderAudioPlayer();
        saveLastStory();
        if (state.history.length && state.history[0].storyId === state.storyId) {
          state.history[0].audioUrl = state.audioFullUrl;
          localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
          renderHistory();
        }
        showToast("نمونه صدا آماده است — اسلایدرها را تغییر بده و پخش کن.", "success");
        if (options.autoPlay) {
          await playGeneratedStoryAudio();
        }
      } finally {
        state.isGeneratingAudio = false;
        updatePrimaryButton();
      }
      return !!options.autoPlay;
    }

    state.isGeneratingAudio = true;
    updatePrimaryButton();
    setVoiceLoadingLabel($("#audio-player-status"));
    try {
      var payload = buildAudioPayload(options.voice);
      var result;
      if (mockFrontendMode) {
        await new Promise(function (r) { setTimeout(r, 1000); });
        result = {
          success: true,
          audio: { id: 1, storyId: state.storyId, voice: payload.voice, format: "wav", audioUrl: "" },
        };
      } else {
        result = await window.StorytellingAPI.generateStoryAudio(state.storyId, payload);
      }
      if (!result.success) throw new Error(result.error || "ساخت صوت ناموفق بود.");
      state.audioResult = result.audio;
      state.audioVoiceId = (options.voice || getSelectedVoice()).id;
      if (!result.audio || !result.audio.audioUrl) {
        throw new Error("آدرس فایل صوتی از سرور دریافت نشد.");
      }
      state.audioFullUrl = window.StorytellingAPI.buildFullAudioUrl(result.audio.audioUrl);
      renderAudioPlayer();
      saveLastStory();
      if (state.history.length && state.history[0].storyId === state.storyId) {
        state.history[0].audioUrl = state.audioFullUrl;
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
        renderHistory();
      }
      var ready = await hydrateStoryAudioPlayer();
      if (!ready) return false;
      showToast("فایل صوتی آماده است!", "success");
      if (options.autoPlay) {
        await playGeneratedStoryAudio();
      }
      return true;
    } catch (e) {
      showError(formatApiError(e, "ساخت فایل صوتی ناموفق بود، اما قصه همچنان قابل استفاده است."));
      return false;
    } finally {
      state.isGeneratingAudio = false;
      updatePrimaryButton();
    }
  }

  function togglePlayPause() {
    if (useApiPlayback()) {
      if (!state.audioFullUrl) return;
      if (!audioElement || !audioElement.src) {
        hydrateStoryAudioPlayer().then(function (ready) {
          if (ready && audioElement) audioElement.play().catch(function () {});
        });
        return;
      }
      if (state.isPlaying) {
        audioElement.pause();
        syncNativeBackgroundAmbience(false);
      } else {
        audioElement.play().catch(function () {
          syncNativeBackgroundAmbience(false);
          showToast("برای پخش، دکمه پلی پلیر را بزن.", "info");
        });
      }
      return;
    }

    if (!state.storyResult) return;
    if (!state.audioFullUrl) {
      handleGenerateAudio().then(function () {
        if (state.audioFullUrl) playWithVoiceSettings(getPlaybackUrl());
      });
      return;
    }
    playWithVoiceSettings(getPlaybackUrl());
  }

  function handlePrimaryAction() {
    if (state.isGeneratingStory || state.isGeneratingAudio) return;
    if (!state.storyResult) {
      handleGenerateStory();
    } else if (!state.audioFullUrl) {
      handleGenerateAudio({ autoPlay: true });
    } else {
      togglePlayPause();
    }
  }

  async function handleDownload() {
    var url = getPlaybackUrl();
    if (!url) {
      showToast("هنوز فایل صوتی آماده نیست. ابتدا «خواندن قصه با صدا» را بزن.", "info");
      return;
    }

    var filename = getAudioDownloadFilename();
    var downloadUrl = url;
    var blobUrl = null;

    try {
      if (useApiPlayback()) {
        var fetchUrl = url.indexOf("?") === -1 ? url + "?download=1" : url + "&download=1";
        var blob = await fetchStoryAudioBlob(fetchUrl);
        blobUrl = URL.createObjectURL(blob);
        downloadUrl = blobUrl;
      }

      var a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("دانلود «" + filename + "» شروع شد.", "success");
    } catch (e) {
      showToast(formatApiError(e, "دانلود فایل صوتی ناموفق بود."), "error");
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  }

  async function fetchVoiceMode() {
    try {
      state.voiceMode = await window.StorytellingAPI.getVoiceMode();
      if (state.voiceMode && state.voiceMode.ttsProvider === "ivira") {
        var defaultVoice = state.voiceMode.defaultVoice;
        if (defaultVoice && VOICES.some(function (v) { return v.id === defaultVoice; })) {
          state.selectedVoiceId = defaultVoice;
        }
      }
      if (state.voiceMode && state.voiceMode.ttsProvider === "openai") {
        var openaiDefault = state.voiceMode.defaultVoice || "nova";
        if (OPENAI_VOICES.some(function (v) { return v.id === openaiDefault; })) {
          state.selectedVoiceId = openaiDefault;
        } else {
          state.selectedVoiceId = "nova";
        }
      }
      renderVoiceMode();
      renderVoiceCards($("#voice-search") && $("#voice-search").value);
      updateSummaries();
    } catch (e) {
      state.voiceMode = null;
      renderVoiceMode();
    }
  }

  function syncProfileAvatarPicker() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (!user || !user.childGender) return;
    var input = document.querySelector('input[name="profileChildGender"][value="' + user.childGender + '"]');
    if (input) input.checked = true;
  }

  function bindProfileAvatarChange() {
    $$('input[name="profileChildGender"]').forEach(function (input) {
      input.addEventListener("change", async function () {
        if (!input.checked || !window.StorytellingAPI) return;
        var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
        if (user && user.childGender === input.value) return;

        try {
          var result = await window.StorytellingAPI.updateChildProfile({ childGender: input.value });
          if (result.user) {
            window.StorytellingAuth.updateUser(result.user);
            window.StorytellingAuth.renderUserAvatar();
            syncChildDisplay();
            showToast("آواتار فرزند به‌روز شد.", "success");
          }
        } catch (e) {
          syncProfileAvatarPicker();
          showToast("تغییر آواتار ناموفق بود.", "error");
        }
      });
    });
  }

  function bindEvents() {
    var voiceSearch = $("#voice-search");
    if (voiceSearch) {
      voiceSearch.addEventListener("input", function () { renderVoiceCards(voiceSearch.value); });
    }

    ["age", "goal", "mood", "durationMinutes", "interest", "childName"].forEach(function (id) {
      var el = $("#" + id);
      if (el) el.addEventListener("change", function () {
        updateSummaries();
        if (id === "childName") {
          saveChildName(el.value, false);
          syncChildDisplay();
        }
      });
      if (el) el.addEventListener("input", function () {
        updateSummaries();
        if (id === "childName") {
          saveChildName(el.value, false);
          syncChildDisplay();
        }
      });
      if (el && id === "childName") {
        el.addEventListener("blur", function () {
          saveChildName(el.value, true);
        });
      }
    });

    var preview = $("#story-preview");
    if (preview) preview.addEventListener("input", updateCharCount);

    Object.keys(state.sliders).forEach(function (key) {
      var input = $("#slider-" + key);
      if (!input) return;
      input.addEventListener("input", function () {
        state.sliders[key] = Number(input.value);
        state.selectedPreset = "";
        var val = $("#val-" + key);
        if (val) val.textContent = Number(input.value).toFixed(2);
        $$(".preset-btn").forEach(function (b) { b.classList.remove("preset-btn--active"); });
        if (window.VoicePlayer) window.VoicePlayer.updateSettings(state.sliders);
      });
    });

    $$(".preset-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var preset = PRESETS[btn.dataset.preset];
        if (!preset) return;
        state.selectedPreset = btn.dataset.preset;
        state.sliders.speed = preset.speed;
        state.sliders.pitch = preset.pitch;
        state.sliders.emotion = preset.emotion;
        state.sliders.clarity = preset.clarity;
        renderSliders();
        if (window.VoicePlayer) window.VoicePlayer.updateSettings(state.sliders);
      });
    });

    var advToggle = $("#advanced-toggle");
    var advBody = $("#advanced-body");
    if (advToggle && advBody) {
      advToggle.addEventListener("click", function () {
        var open = advBody.hidden;
        advBody.hidden = !open;
        advToggle.setAttribute("aria-expanded", String(open));
      });
    }

    Object.keys(state.advanced).forEach(function (key) {
      var input = $("#adv-" + key);
      if (!input) return;
      input.addEventListener("change", function () {
        state.advanced[key] = input.type === "checkbox" ? input.checked : Number(input.value);
        if (key === "backgroundAmbience" && state.audioFullUrl) {
          stopVoicePlayback();
          state.audioFullUrl = null;
          state.audioResult = null;
          renderAudioPlayer();
          updatePrimaryButton();
        }
      });
    });

    $("#btn-history") && $("#btn-history").addEventListener("click", openHistoryDrawer);
    $("#btn-settings") && $("#btn-settings").addEventListener("click", scrollToSettings);
    $("#drawer-close") && $("#drawer-close").addEventListener("click", closeHistoryDrawer);
    $("#drawer-overlay") && $("#drawer-overlay").addEventListener("click", closeHistoryDrawer);
    $("#btn-clear-history") && $("#btn-clear-history").addEventListener("click", clearHistory);
    $("#btn-clear-saved") && $("#btn-clear-saved").addEventListener("click", clearSavedStory);

    $("#btn-primary-action") && $("#btn-primary-action").addEventListener("click", handlePrimaryAction);
    $("#btn-preview") && $("#btn-preview").addEventListener("click", function () {
      if (state.storyResult && useApiPlayback()) {
        handleGenerateAudio({ autoPlay: true }).then(function (playing) {
          if (playing) showToast("در حال خواندن قصه با صدای " + getSelectedVoice().nameFa, "info");
        });
        return;
      }
      playVoicePreview().then(function (playing) {
        if (playing) showToast("پیش‌نمایش: " + getSelectedVoice().nameFa, "info");
      });
    });
    $("#btn-regenerate-audio") && $("#btn-regenerate-audio").addEventListener("click", function () {
      state.audioFullUrl = null;
      state.audioResult = null;
      state.audioVoiceId = null;
      renderAudioPlayer();
      handleGenerateAudio({ autoPlay: true });
    });
    $("#btn-download") && $("#btn-download").addEventListener("click", handleDownload);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeHistoryDrawer();
    });

    $$(".bottom-nav__item[data-mobile-tab]").forEach(function (item) {
      item.addEventListener("click", function () {
        closeCreatePanel();
        setMobileTab(item.dataset.mobileTab);
      });
    });

    $$("[data-mobile-tab-link]").forEach(function (item) {
      item.addEventListener("click", function () {
        closeCreatePanel();
        setMobileTab(item.dataset.mobileTabLink);
      });
    });

    var navCreate = $("#btn-nav-create");
    if (navCreate) navCreate.addEventListener("click", handleNavCreateClick);

    $("#btn-go-story-settings") && $("#btn-go-story-settings").addEventListener("click", function () {
      closeCreatePanel();
      setMobileTab("story");
    });

    $("#btn-cancel-story") && $("#btn-cancel-story").addEventListener("click", cancelStoryGeneration);

    $("#btn-header-history") && $("#btn-header-history").addEventListener("click", openHistoryDrawer);
    $("#mobile-btn-history") && $("#mobile-btn-history").addEventListener("click", openHistoryDrawer);
    $("#mobile-btn-logout") && $("#mobile-btn-logout").addEventListener("click", function () {
      if (window.StorytellingAuth) window.StorytellingAuth.logout();
    });
    $("#btn-mobile-play") && $("#btn-mobile-play").addEventListener("click", handlePrimaryAction);
    $("#btn-preview-compact") && $("#btn-preview-compact").addEventListener("click", function () {
      if (state.storyResult && useApiPlayback()) {
        handleGenerateAudio({ autoPlay: true });
        return;
      }
      playVoicePreview().then(function (playing) {
        if (playing) showToast("پیش‌نمایش: " + getSelectedVoice().nameFa, "info");
      });
    });

    window.addEventListener("resize", function () {
      if (isMobileLayout()) {
        document.body.setAttribute("data-mobile-tab", mobileTab);
      }
    });

    bindProfileAvatarChange();
  }

  function syncUserFromServer() {
    if (!window.StorytellingAPI || !window.StorytellingAuth) return;
    window.StorytellingAPI.getMe()
      .then(function (result) {
        if (result && result.user) {
          window.StorytellingAuth.updateUser(result.user);
          window.StorytellingAuth.renderUserAvatar();
          if (result.user.childName) applyChildNameToForm(result.user.childName);
          syncChildDisplay();
          syncProfileAvatarPicker();
        }
      })
      .catch(function () {
        /* offline or expired — local session still used */
      });
  }

  function init() {
    getSessionId();
    var savedChildName = loadSavedChildName();
    applyChildNameToForm(savedChildName);

    window.__lalaByeSyncChildDisplay = syncChildDisplay;

    if (window.VoicePlayer) {
      window.VoicePlayer.setOnStateChange(syncPlayingState);
    }
    if (window.StorytellingAuth) {
      window.StorytellingAuth.renderUserAvatar();
      window.StorytellingAuth.bindProfileMenu();
      syncChildDisplay();
      syncProfileAvatarPicker();
      syncUserFromServer();
    }
    renderGoalChips();
    renderVoiceCards();
    renderSliders();
    loadHistory();
    loadLastStory();
    if (!state.storyResult) updateHero(null);
    updateSummaries();
    updateCharCount();
    updatePrimaryButton();
    updateDownloadControls();
    bindEvents();
    syncVoiceTaglines();
    fetchVoiceMode();
    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-tab", mobileTab);
    }
    syncMobilePlayerMeta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
