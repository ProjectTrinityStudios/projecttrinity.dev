// Project Trinity: the site's only script. No tracking, no cookies, nothing stored.
// 1. The light/dark switch (for this visit only; the page otherwise follows the system setting).
// 2. The film's play mark (the video goes on YouTube later).
// 3. The two boxes: checked here, and not sent anywhere yet.

(function () {
  "use strict";

  // 1. Light and dark
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  var label = document.querySelector("[data-theme-label]");
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  // ?theme=dark or ?theme=light opens the page in that mode (handy for previews and screenshots)
  var asked = new URLSearchParams(window.location.search).get("theme");
  if (asked === "dark" || asked === "light") root.setAttribute("data-theme", asked);

  function isDark() {
    var set = root.getAttribute("data-theme");
    return set ? set === "dark" : media.matches;
  }
  function paintToggle() {
    if (!toggle) return;
    var dark = isDark();
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    label.textContent = "Dark";
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      root.setAttribute("data-theme", isDark() ? "light" : "dark");
      paintToggle();
    });
    media.addEventListener("change", paintToggle);
    paintToggle();
  }

  // 2. The film
  var film = document.querySelector("[data-film]");
  var filmNote = document.querySelector("[data-film-note]");
  if (film && filmNote) {
    film.addEventListener("click", function () {
      filmNote.textContent = "The video goes up on YouTube soon and will play right here.";
    });
  }

  // 3. The boxes
  var forms = document.querySelectorAll("form[data-unconnected]");
  Array.prototype.forEach.call(forms, function (form) {
    var note = form.querySelector("[data-form-note]");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var problems = [];
      var firstBad = null;

      Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) {
        el.removeAttribute("aria-invalid");
      });

      var email = form.querySelector('input[type="email"]');
      if (email && !email.checkValidity()) {
        email.setAttribute("aria-invalid", "true");
        problems.push(email.value ? "That email doesn't look right." : "Add your email.");
        firstBad = firstBad || email;
      }

      var platforms = form.querySelectorAll('input[name="platform"]');
      if (platforms.length && !form.querySelector('input[name="platform"]:checked')) {
        Array.prototype.forEach.call(platforms, function (r) { r.setAttribute("aria-invalid", "true"); });
        problems.push("Pick where you'll play.");
        firstBad = firstBad || platforms[0];
      }

      var age = form.querySelector('input[name="age"]');
      if (age && !age.checked) {
        age.setAttribute("aria-invalid", "true");
        problems.push("Tick the box to say you're 13 or older.");
        firstBad = firstBad || age;
      }

      if (problems.length) {
        note.classList.add("is-error");
        note.textContent = problems.join(" ");
        if (firstBad) firstBad.focus();
        return;
      }

      note.classList.remove("is-error");
      note.textContent = "This box isn't connected yet, so nothing was sent.";
    });
  });
})();
