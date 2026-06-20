(function () {
  "use strict";

  var form = document.getElementById("login-form");
  var registerForm = document.getElementById("register-form");
  var errorEl = document.getElementById("login-error");
  var tabLogin = document.getElementById("tab-login");
  var tabRegister = document.getElementById("tab-register");
  var panelLogin = document.getElementById("panel-login");
  var panelRegister = document.getElementById("panel-register");

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("btn--loading", loading);
  }

  function switchTab(tab) {
    var isLogin = tab === "login";
    if (tabLogin) {
      tabLogin.classList.toggle("auth-tab--active", isLogin);
      tabLogin.setAttribute("aria-selected", String(isLogin));
    }
    if (tabRegister) {
      tabRegister.classList.toggle("auth-tab--active", !isLogin);
      tabRegister.setAttribute("aria-selected", String(!isLogin));
    }
    if (panelLogin) panelLogin.hidden = !isLogin;
    if (panelRegister) panelRegister.hidden = isLogin;
    showError("");
  }

  if (tabLogin) tabLogin.addEventListener("click", function () { switchTab("login"); });
  if (tabRegister) tabRegister.addEventListener("click", function () { switchTab("register"); });

  function redirectAfterAuth(user) {
    if (user && user.childGender) {
      window.location.href = "/";
    } else {
      window.location.href = "/onboarding";
    }
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError("");
      var btn = form.querySelector('button[type="submit"]');
      var email = document.getElementById("login-email").value.trim();
      var password = document.getElementById("login-password").value;

      if (!email || !password) {
        showError("ایمیل و رمز عبور را وارد کن.");
        return;
      }

      setLoading(btn, true);
      try {
        var result = await window.StorytellingAPI.login(email, password);
        window.StorytellingAuth.saveSession(result.token, result.user);
        redirectAfterAuth(result.user);
      } catch (err) {
        var msg = "ورود ناموفق بود.";
        if (err.message === "Failed to fetch") {
          msg = "اتصال به سرور برقرار نشد. بک‌اند را اجرا کن.";
        } else if (err.message) {
          msg = err.message;
        }
        showError(msg);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError("");
      var btn = registerForm.querySelector('button[type="submit"]');
      var name = document.getElementById("register-name").value.trim();
      var email = document.getElementById("register-email").value.trim();
      var password = document.getElementById("register-password").value;

      if (!name || !email || !password) {
        showError("همه فیلدها را پر کن.");
        return;
      }

      setLoading(btn, true);
      try {
        var result = await window.StorytellingAPI.register(email, password, name);
        window.StorytellingAuth.saveSession(result.token, result.user);
        redirectAfterAuth(result.user);
      } catch (err) {
        var msg = "ثبت‌نام ناموفق بود.";
        if (err.message === "Failed to fetch") {
          msg = "اتصال به سرور برقرار نشد. بک‌اند را اجرا کن.";
        } else if (err.message) {
          msg = err.message;
        }
        showError(msg);
      } finally {
        setLoading(btn, false);
      }
    });
  }

  function applyLoginBackground() {
    var imageUrl = "images/login-bg.png";
    var img = document.getElementById("login-bg-img");
    if (img) {
      img.src = imageUrl;
      return;
    }

    var bgEl = document.getElementById("login-bg");
    if (!bgEl) return;
    bgEl.style.backgroundImage = 'url("' + imageUrl + '")';
    bgEl.style.backgroundSize = "cover";
    bgEl.style.backgroundPosition = "center";
    bgEl.style.backgroundRepeat = "no-repeat";
  }

  applyLoginBackground();
  window.StorytellingAuth.redirectIfLoggedIn();
})();
