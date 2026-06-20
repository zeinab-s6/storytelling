(function () {
  "use strict";

  function getBaseUrl() {
    return window.STORYTELLING_CONFIG?.API_BASE_URL || "https://storytelling-production-d009.up.railway.app";
  }

  function authHeaders() {
    var token = window.StorytellingAuth?.getToken?.();
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function request(url, options) {
    var response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options?.headers || {}),
      },
    });

    var data = null;
    var contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      var text = await response.text();
      data = { success: response.ok, error: text || "خطای ناشناخته" };
    }

    if (!response.ok) {
      var error = new Error(data?.error || data?.hint || "درخواست ناموفق بود.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function buildFullAudioUrl(audioUrl) {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
      return audioUrl;
    }
    var base = getBaseUrl().replace(/\/$/, "");
    var path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
    return base + path;
  }

  async function login(email, password) {
    return request(getBaseUrl() + "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    });
  }

  async function register(email, password, displayName) {
    return request(getBaseUrl() + "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: email, password: password, displayName: displayName }),
    });
  }

  async function getMe() {
    return request(getBaseUrl() + "/api/auth/me", { method: "GET" });
  }

  async function updateChildProfile(payload) {
    return request(getBaseUrl() + "/api/auth/child-profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async function generateStory(payload) {
    return request(getBaseUrl() + "/api/stories/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function generateStoryAudio(storyId, payload) {
    return request(getBaseUrl() + "/api/stories/" + storyId + "/audio", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getVoiceMode() {
    return request(getBaseUrl() + "/api/voices/mode", { method: "GET" });
  }

  async function previewVoice(voice, format, text) {
    var body = { voice: voice, format: format || "wav" };
    if (text) body.text = text;
    return request(getBaseUrl() + "/api/voices/preview", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  window.StorytellingAPI = {
    getBaseUrl,
    buildFullAudioUrl,
    login,
    register,
    getMe,
    updateChildProfile,
    generateStory,
    generateStoryAudio,
    getVoiceMode,
    previewVoice,
  };
})();
