// Project Trinity: the site's only script. No tracking, no cookies; the one thing kept is the Day or Night pick, in this browser only.
// 1. The light/dark switch: the visitor's pick is kept in this browser (localStorage, never a cookie, never sent) so it
//    holds across pages; until they pick, the page follows the system setting. Each page's head reads it before drawing.
// 2. The header: clear over a picture, solid once the page scrolls; a menu on a phone.
// 3. The film: loads YouTube's privacy-enhanced player only when play is pressed.
// 4. The boxes: checked here, then sent to the site's form handler (with Cloudflare's Turnstile spam check).
// 5. The welcome note after confirming the email list.
// 6. The portraits (painted or render), the hero scrolls and the skill clips.

(function () {
  "use strict";

  var root = document.documentElement;
  var query = new URLSearchParams(window.location.search);

  // 6a. THE PORTRAIT SETTING (Tooling 182): which portraits the site shows, everywhere at once.
  //   "painted": the game's own painted stickers (img/party/), and the fight cards on the boss banners.
  //   "render":  Models 101's realistic renders (img/portraits/): the 4:5 cut-outs and the 16:9 banners.
  // ?portraits=painted or ?portraits=render previews the other one. Without this script the page shows the painted set.
  var PORTRAITS = "painted";
  var askedPortraits = query.get("portraits");
  root.setAttribute("data-portraits", askedPortraits === "render" || askedPortraits === "painted" ? askedPortraits : PORTRAITS);

  // 1. Light and dark
  var toggle = document.querySelector("[data-theme-toggle]");
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  // ?theme=dark or ?theme=light opens the page in that mode (handy for previews and screenshots)
  var asked = query.get("theme");
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
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { window.localStorage.setItem("pt-theme", next); } catch (e) { /* storage off: this page only */ }
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

  // Silent loops (the first screen's B-roll, a devlog clip): playing only while on screen, and left out
  // altogether (the still or poster stays) for anyone who has asked for less motion.
  Array.prototype.forEach.call(document.querySelectorAll("[data-broll], [data-loop]"), function (broll) {
    var still = window.matchMedia("(prefers-reduced-motion: reduce)");
    var seen = !("IntersectionObserver" in window);
    var steer = function () {
      if (still.matches || !seen || document.hidden || broll.getAttribute("data-paused") === "true") {
        broll.pause();
      } else {
        var playing = broll.play();
        if (playing && playing.catch) playing.catch(function () {});
      }
    };
    broll.muted = true;
    broll.addEventListener("playing", function () { broll.classList.add("is-playing"); });
    if (still.matches) {
      broll.removeAttribute("autoplay");
      broll.pause();
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        seen = entries[0].isIntersecting;
        steer();
      }, { threshold: 0.05 }).observe(broll);
    }
    document.addEventListener("visibilitychange", steer);
    still.addEventListener("change", steer);
    // a skill clip gets a Pause button (it loops for as long as it is on screen)
    var frame = broll.closest(".skill-clip");
    if (frame && !still.matches) {
      var hold = document.createElement("button");
      hold.type = "button";
      hold.className = "clip-hold";
      hold.setAttribute("aria-pressed", "false");
      hold.textContent = "Pause";
      hold.addEventListener("click", function () {
        var paused = broll.getAttribute("data-paused") !== "true";
        broll.setAttribute("data-paused", paused ? "true" : "false");
        hold.setAttribute("aria-pressed", paused ? "true" : "false");
        hold.textContent = paused ? "Play" : "Pause";
        steer();
      });
      frame.appendChild(hold);
    }
    steer();
  });

  // 6b. A link to a hero (/shatterbound/#bastion) opens that hero's scroll.
  function openFromHash() {
    var id = window.location.hash.slice(1);
    var target = id && document.getElementById(id);
    if (target && target.matches("details.scroll")) target.open = true;
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

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

      // The Contact page's kind (bug, idea, thanks, something else) is the one choice it asks for.
      var kinds = form.querySelectorAll('input[name="kind"]');
      if (kinds.length && !form.querySelector('input[name="kind"]:checked')) {
        Array.prototype.forEach.call(kinds, function (r) { r.setAttribute("aria-invalid", "true"); });
        problems.push("Pick what it is: a bug, an idea, thanks, or something else.");
        firstBad = firstBad || kinds[0];
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
      var played = field("played");
      var code = field("report_code");
      function chosen(n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : undefined; }
      var body = {
        email: email.value.trim(),
        age: true,
        token: token,
        platform: picked ? picked.value : undefined,
        note: noteField ? noteField.value : undefined,
        join_list: join ? join.checked : undefined,
        name: name ? name.value.trim() : undefined,
        message: message ? message.value : undefined,
        kind: chosen("kind"),
        ran: chosen("ran"),
        severity: chosen("severity"),
        played: played ? played.value.trim() : undefined,
        report_code: code ? code.value.trim() : undefined
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
  var params = query;
  if (welcome && params.get("subscribed") === "1") {
    params.delete("subscribed");
    var rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
    if (typeof welcome.showModal === "function") welcome.showModal();
  }
})();
