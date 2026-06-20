(function () {
  "use strict";

  var AVATARS = {
    boy: "images/boy.png",
    girl: "images/girl.png",
  };

  var LABELS = {
    boy: "آواتار انتخاب شد",
    girl: "آواتار انتخاب شد",
  };

  var form = document.getElementById("onboarding-form");
  var errorEl = document.getElementById("onboarding-error");
  var submitBtn = document.getElementById("onboarding-submit");
  var previewImg = document.getElementById("onboarding-avatar-preview");
  var previewLabel = document.getElementById("onboarding-preview-label");
  var parentNameEl = document.getElementById("onboarding-parent-name");
  var childNameInput = document.getElementById("onboarding-child-name");

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  var BRAND_SUBMIT_LABEL =
    'ورود به <span class="brand-name"><span class="brand-name__lala">lala</span><span class="brand-name__bye">Bye</span></span>';

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading || !form.querySelector('input[name="childGender"]:checked');
    submitBtn.classList.toggle("btn--loading", loading);
    if (loading) {
      submitBtn.textContent = "در حال ذخیره...";
      return;
    }
    submitBtn.innerHTML = BRAND_SUBMIT_LABEL;
  }

  function getPreviewLabel(gender) {
    var name = childNameInput && childNameInput.value.trim();
    if (name) return name;
    return LABELS[gender] || "یک گزینه را انتخاب کن";
  }

  function updatePreview(gender) {
    if (!gender || !AVATARS[gender]) return;
    if (previewImg) previewImg.src = AVATARS[gender];
    if (previewLabel) previewLabel.textContent = getPreviewLabel(gender);
    if (submitBtn) submitBtn.disabled = false;
  }

  function initParentName() {
    var user = window.StorytellingAuth && window.StorytellingAuth.getUser();
    if (parentNameEl && user && user.displayName) {
      parentNameEl.textContent = user.displayName;
    }
  }

  function syncProfileFromServer() {
    if (!window.StorytellingAPI) return;
    window.StorytellingAPI.getMe()
      .then(function (result) {
        if (!result || !result.user) return;
        window.StorytellingAuth.updateUser(result.user);
        if (result.user.childGender) {
          window.location.href = "/";
          return;
        }
        if (parentNameEl && result.user.displayName) {
          parentNameEl.textContent = result.user.displayName;
        }
      })
      .catch(function () { /* use local session */ });
  }

  if (childNameInput) {
    childNameInput.addEventListener("input", function () {
      var selected = form && form.querySelector('input[name="childGender"]:checked');
      if (selected) updatePreview(selected.value);
      else if (previewLabel) {
        var name = childNameInput.value.trim();
        previewLabel.textContent = name || "یک گزینه را انتخاب کن";
      }
    });
  }

  if (form) {
    form.querySelectorAll('input[name="childGender"]').forEach(function (input) {
      input.addEventListener("change", function () {
        showError("");
        updatePreview(input.value);
      });
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showError("");

      var selected = form.querySelector('input[name="childGender"]:checked');
      if (!selected) {
        showError("لطفاً جنسیت فرزند را انتخاب کن.");
        return;
      }

      var payload = { childGender: selected.value };
      var childName = childNameInput && childNameInput.value.trim();
      if (childName) payload.childName = childName;

      setLoading(true);
      try {
        var result = await window.StorytellingAPI.updateChildProfile(payload);
        if (result.user) {
          window.StorytellingAuth.updateUser(result.user);
          if (childName) {
            try { localStorage.setItem("storytelling_child_name", childName); } catch (err) { /* ignore */ }
          }
        }
        window.location.href = "/";
      } catch (err) {
        var msg = "ذخیره اطلاعات ناموفق بود.";
        if (err.message === "Failed to fetch") {
          msg = "اتصال به سرور برقرار نشد.";
        } else if (err.message) {
          msg = err.message;
        }
        showError(msg);
      } finally {
        setLoading(false);
      }
    });
  }

  initParentName();
  syncProfileFromServer();
})();
