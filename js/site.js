// Project Trinity: the site's only script. No tracking, no cookies, nothing stored.
// 1. The light/dark switch (for this visit only; the page otherwise follows the system setting).
// 2. The header: clear over a picture, solid once the page scrolls; a menu on a phone.
// 3. The film: loads YouTube's privacy-enhanced player only when play is pressed.
// 4. The boxes: checked here, then sent to the site's form handler (with Cloudflare's Turnstile spam check).
// 5. The welcome note after confirming the email list.

(function () {
  "use strict";

  // 1. Light and dark
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  // ?theme=dark or ?theme=light opens the page in that mode (handy for previews and screenshots)
  var asked = new URLSearchParams(window.location.search).get("theme");
  if (asked === "dark" || asked === "light") root.setAttribute("data-theme", asked);

  function isDark() {
    var set = root.getAttribute("data-theme");
    return set ? set === "dark" : media.matches;
  }
  function paintToggle() {
    if (toggle) toggle.setAttribute("aria-pressed", isDark() ? "true" : "false");
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      root.setAttribute("data-theme", isDark() ? "light" : "dark");
      paintToggle();
    });
    media.addEventListener("change", paintToggle);
    paintToggle();
  }

  // 2. The header
  var header = document.querySelector("[data-header]");
  var menuButton = document.querySelector("[data-menu-button]");
  if (header) {
    var solid = function () {
      header.classList.toggle("is-solid", window.scrollY > 24);
    };
    window.addEventListener("scroll", solid, { passive: true });
    solid();
  }
  if (header && menuButton) {
    var setOpen = function (open) {
      header.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    };
    menuButton.addEventListener("click", function () {
      setOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        menuButton.focus();
      }
    });
    // a link inside the menu (such as Request a build on the front page) closes it
    header.querySelector("#site-menu").addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    // Only now does the phone layout fold the links behind the Menu button: if this script fails, they stay visible.
    root.classList.add("js");
  }

  // 3. The film: nothing of YouTube's runs until the visitor presses play; then its privacy-enhanced
  // player (youtube-nocookie.com) opens in a window over the page. Without the script, the link goes to YouTube.
  var filmDialog = document.getElementById("film");
  var filmSlot = filmDialog && filmDialog.querySelector("[data-film-slot]");
  Array.prototype.forEach.call(document.querySelectorAll("[data-film]"), function (link) {
    if (!filmDialog || typeof filmDialog.showModal !== "function") return;
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var id = link.getAttribute("data-film");
      var frame = document.createElement("iframe");
      frame.className = "film-frame";
      frame.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0&playsinline=1";
      frame.title = "Project Trinity: Shatterbound, gameplay video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      filmSlot.replaceChildren(frame);
      filmDialog.showModal();
    });
  });
  if (filmDialog) {
    // closing the window stops the video
    filmDialog.addEventListener("close", function () { filmSlot.replaceChildren(); });
    filmDialog.addEventListener("click", function (event) {
      if (event.target === filmDialog) filmDialog.close();
    });
  }

  // 4. The boxes: checked here, then sent to the site's form handler on Cloudflare
  // (api.projecttrinity.dev). Cloudflare Turnstile, the spam check, loads only once someone starts filling a box.
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  // On this machine the boxes talk to `wrangler dev`; on the site, to the deployed handler.
  var API = LOCAL ? "http://127.0.0.1:8787" : "https://api.projecttrinity.dev";
  // The site key is public by design. On this machine, Cloudflare's published always-pass test key.
  var TURNSTILE_SITE_KEY = LOCAL ? "1x00000000000000000000AA" : "0x4AAAAAAGTNcejv966pk7dd";
  var FAILED = "That didn't go through. Please try again in a minute, or email hello@projecttrinity.dev.";
  var RATE = "Too many messages for now. Try again later, or write to hello@projecttrinity.dev.";

  var turnstileReady = null;
  function loadTurnstile() {
    if (turnstileReady) return turnstileReady;
    turnstileReady = new Promise(function (resolve, reject) {
      window.onTurnstileLoad = function () { resolve(window.turnstile); };
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = function () { turnstileReady = null; reject(new Error("turnstile")); };
      document.head.appendChild(s);
    });
    return turnstileReady;
  }

  var forms = document.querySelectorAll("form[data-endpoint]");
  Array.prototype.forEach.call(forms, function (form) {
    var note = form.querySelector("[data-form-note]");
    var slot = form.querySelector("[data-turnstile]");
    var button = form.querySelector('button[type="submit"]');
    var widgetId = null;
    var sending = false;

    function startCheck() {
      if (widgetId !== null || !slot) return;
      widgetId = "pending";
      loadTurnstile().then(function (ts) {
        widgetId = ts.render(slot, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "flexible",
          theme: "auto",
          appearance: "interaction-only"
        });
      }).catch(function () { widgetId = null; });
    }
    form.addEventListener("focusin", startCheck);
    form.addEventListener("pointerdown", startCheck);

    function say(text, isError) {
      note.classList.toggle("is-error", !!isError);
      note.textContent = text;
    }
    function field(name) { return form.querySelector('[name="' + name + '"]'); }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (sending) return;
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
      var picked = form.querySelector('input[name="platform"]:checked');
      if (platforms.length && !picked) {
        Array.prototype.forEach.call(platforms, function (r) { r.setAttribute("aria-invalid", "true"); });
        problems.push("Pick where you'll play.");
        firstBad = firstBad || platforms[0];
      }

      var message = field("message");
      if (message && !message.value.trim()) {
        message.setAttribute("aria-invalid", "true");
        problems.push("Write your message.");
        firstBad = firstBad || message;
      }

      var age = field("age");
      if (age && !age.checked) {
        age.setAttribute("aria-invalid", "true");
        problems.push("Tick the box to say you're 13 or older.");
        firstBad = firstBad || age;
      }

      if (problems.length) {
        say(problems.join(" "), true);
        if (firstBad) firstBad.focus();
        return;
      }

      var token = window.turnstile && widgetId !== null && widgetId !== "pending"
        ? window.turnstile.getResponse(widgetId) : "";
      if (!token) {
        startCheck();
        say("One moment: the spam check is still loading. Press the button again in a second.", true);
        return;
      }

      var join = field("join_list");
      var noteField = field("note");
      var name = field("name");
      var body = {
        email: email.value.trim(),
        age: true,
        token: token,
        platform: picked ? picked.value : undefined,
        note: noteField ? noteField.value : undefined,
        join_list: join ? join.checked : undefined,
        name: name ? name.value.trim() : undefined,
        message: message ? message.value : undefined
      };

      sending = true;
      button.disabled = true;
      say("Sending...", false);
      fetch(API + form.getAttribute("data-endpoint"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "omit"
      }).then(function (res) {
        return res.json().catch(function () { return { ok: false }; }).then(function (out) {
          if (res.status === 429) out.error = "rate";
          return out;
        });
      }).then(function (out) {
        if (out.ok) {
          form.reset();
          say(form.getAttribute("data-thanks"), false);
        } else if (out.error === "rate") {
          // the draft stays in the box
          say(RATE, true);
        } else {
          say(FAILED, true);
        }
      }).catch(function () {
        say(FAILED, true);
      }).then(function () {
        sending = false;
        button.disabled = false;
        if (window.turnstile && widgetId !== null && widgetId !== "pending") window.turnstile.reset(widgetId);
      });
    });

    // Send starts disabled in the page, so a visitor without this script never sends a form to nowhere.
    if (button) button.disabled = false;
  });

  // 5. The welcome note: Kit sends people here (?subscribed=1) after they confirm the email list.
  var welcome = document.getElementById("welcome");
  var params = new URLSearchParams(window.location.search);
  if (welcome && params.get("subscribed") === "1") {
    params.delete("subscribed");
    var rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
    if (typeof welcome.showModal === "function") welcome.showModal();
  }
})();
