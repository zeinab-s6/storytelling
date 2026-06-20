(function () {
  "use strict";

  function getBaseUrl() {
    return (window.API_BASE_URL || "").replace(/\/$/, "");
  }

  function apiUrl(path) {
    var normalizedPath = path.startsWith("/") ? path : "/" + path;
    return getBaseUrl() + normalizedPath;
  }

  function logFetchFailure(url, error, response, responseBody) {
    console.error("[StorytellingAPI] Request failed", {
      url: url,
      status: response ? response.status : null,
      responseBody: responseBody,
      error: error,
    });
  }

  function authHeaders() {
    var token = window.StorytellingAuth?.getToken?.();
    var headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  async function readResponseBody(response) {
    var contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }
    var text = await response.text();
    return { success: response.ok, error: text || "خطای ناشناخته" };
  }

  async function request(url, options) {
    var response = null;
    var data = null;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders(),
          ...(options?.headers || {}),
        },
      });

      data = await readResponseBody(response);

      if (!response.ok) {
        var apiError = new Error(data?.error || data?.hint || "درخواست ناموفق بود.");
        apiError.status = response.status;
        apiError.data = data;
        logFetchFailure(url, apiError, response, data);
        throw apiError;
      }

      return data;
    } catch (err) {
      if (!response) {
        logFetchFailure(url, err, null, null);
      }
      throw err;
    }
  }

  function buildFullAudioUrl(audioUrl) {
    if (!audioUrl) return "";
    if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
      return audioUrl;
    }
    var path = audioUrl.startsWith("/") ? audioUrl : "/" + audioUrl;
    return getBaseUrl() + path;
  }

  async function login(email, password) {
    return request(`${window.API_BASE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: email, password: password }),
    });
  }

  async function register(email, password, displayName) {
    return request(`${window.API_BASE_URL}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ email: email, password: password, displayName: displayName }),
    });
  }

  async function getMe() {
    return request(`${window.API_BASE_URL}/api/auth/me`, { method: "GET" });
  }

  async function updateChildProfile(payload) {
    return request(`${window.API_BASE_URL}/api/auth/child-profile`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async function generateStory(payload) {
    return request(`${window.API_BASE_URL}/api/stories/generate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function generateStoryAudio(storyId, payload) {
    return request(`${window.API_BASE_URL}/api/stories/${storyId}/audio`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async function getVoiceMode() {
    return request(`${window.API_BASE_URL}/api/voices/mode`, { method: "GET" });
  }

  async function previewVoice(voice, format, text) {
    var body = { voice: voice, format: format || "wav" };
    if (text) body.text = text;
    return request(`${window.API_BASE_URL}/api/voices/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  window.StorytellingAPI = {
    getBaseUrl,
    apiUrl,
    logFetchFailure,
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
