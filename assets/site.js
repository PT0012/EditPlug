/* EditPlug site script. No inline scripts anywhere, so the Content-Security-Policy
   can block injected code. Nothing here is needed to read the page. */
(function () {
  "use strict";

  /* 1. Clickjacking: refuse to run inside someone else's frame.
     GitHub Pages can't send X-Frame-Options, so this is a best effort. */
  if (window.top !== window.self) {
    // Browsers now block a frame from moving the top window without a click,
    // so hide the page and offer one link that opens it properly.
    try { window.top.location.replace(window.location.href); } catch (e) {}
    var url = window.location.href;
    document.body.textContent = "";
    var a = document.createElement("a");
    a.href = url; a.target = "_top"; a.rel = "noopener";
    a.className = "btn"; a.textContent = "Open EditPlug";
    var box = document.createElement("main");
    box.className = "wrap page";
    box.appendChild(a);
    document.body.appendChild(box);
    return; // run nothing else inside a frame
  }

  /* 2. Analytics only after consent (UK PECR). The choice is kept in local
     storage, not a cookie. */
  var GA_ID = "G-9VWXM5M5LQ";
  var CS_SRC = "https://t.contentsquare.net/uxa/2b19dc73e002e.js"; // Contentsquare: delete this line and loadContentsquare() if you don't use it
  var KEY = "ep-consent"; // "granted" | "denied"
  var loaded = false;

  function getChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function addScript(src) {
    var s = document.createElement("script");
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }
  function loadAnalytics() {
    if (loaded) return; loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
    addScript("https://www.googletagmanager.com/gtag/js?id=" + GA_ID);
    if (CS_SRC) addScript(CS_SRC);
  }
  function clearAnalyticsCookies() {
    var host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^(_ga|_gid|_gat|_cs_|_hj)/.test(name)) {
        ["", "; domain=" + host, "; domain=." + host].forEach(function (d) {
          document.cookie = name + "=; Max-Age=0; path=/" + d;
        });
      }
    });
  }
  function track(event, params) {
    if (loaded && window.gtag) window.gtag("event", event, params || {});
  }

  var banner = document.getElementById("consent");
  function showBanner() { if (banner) { banner.hidden = false; } }
  function hideBanner() { if (banner) banner.hidden = true; }

  if (getChoice() === "granted") loadAnalytics();
  else if (!getChoice()) showBanner();

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-consent], [data-cookie-settings]");
    if (!t) return;
    if (t.hasAttribute("data-cookie-settings")) { showBanner(); var f = banner && banner.querySelector("button"); if (f) f.focus(); return; }
    var v = t.getAttribute("data-consent");
    var was = getChoice();
    setChoice(v);
    hideBanner();
    if (v === "granted") loadAnalytics();
    else if (was === "granted") { clearAnalyticsCookies(); location.reload(); }
  });

  /* 3. Mobile menu */
  var menuBtn = document.getElementById("menu-btn");
  var menu = document.getElementById("mobile-menu");
  if (menuBtn && menu) {
    var setOpen = function (open) {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.hidden = !open;
    };
    menuBtn.addEventListener("click", function () { setOpen(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setOpen(false); menuBtn.focus(); } });
  }

  /* 3b. Signed in to EditPlug? The account server sets a harmless yes/no
     cookie for editplug.com (no identity in it). */
  var signedIn = /(?:^|;\s*)ep_signed_in=1(?:;|$)/.test(document.cookie);

  /* 3c. Cookie-free visit counter on our own server: daily totals only,
     nothing stored in the browser, so it needs no consent. Real site only. */
  var COUNTER = "https://aistudio.editplug.com/api/site-beacon";
  var live_site = /(^|\.)editplug\.com$/.test(location.hostname);
  function count(name) {
    if (!live_site || !navigator.sendBeacon) return;
    try { navigator.sendBeacon(COUNTER, JSON.stringify(name ? { t: "event", name: name } : { t: "view", path: location.pathname, referrer: document.referrer })); } catch (e) {}
  }
  count();

  /* 4. Links that open a form in a new tab: show a waiting state, and
     record which audience clicked (only if analytics were accepted). */
  var live = document.getElementById("live");
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a) return;
    var href = a.href;
    // Get a quote: the join form when signed out, the project brief when signed in. Same GA event name as before.
    if (a.hasAttribute("data-quote")) { track("creator_form_click", { event_category: "conversion", event_label: a.dataset.where || "" }); count(signedIn ? "quote_brief" : "quote_join"); }
    else if (href.indexOf("tally.so/r/wLOxXp") > -1) { track("editor_form_click", { event_category: "conversion", event_label: a.dataset.where || "" }); count("editor_apply"); }
    else if (/\/account\/?$|aistudio\.editplug\.com\/(sign-in|sign-up|app|account)/.test(href)) { track("account_click", { event_label: a.dataset.where || "" }); count("account"); }
    else if (href.indexOf("aistudio.editplug.com") > -1) { track("ai_studio_click", { event_label: a.dataset.where || "" }); count("ai_studio"); }

    if (!a.hasAttribute("data-wait") || a.getAttribute("aria-busy") === "true") return;
    a.setAttribute("aria-busy", "true");
    if (live) live.textContent = "Opening the form in a new tab.";
    var done = function () {
      a.removeAttribute("aria-busy");
      window.removeEventListener("focus", done);
    };
    setTimeout(function () { window.addEventListener("focus", done); }, 300);
    setTimeout(done, 4000);
  });

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 5. AI Studio dropdown in the main nav (disclosure pattern) */
  document.querySelectorAll(".dd-btn").forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    var setOpen = function (open) { btn.setAttribute("aria-expanded", String(open)); panel.hidden = !open; };
    btn.addEventListener("click", function () { setOpen(panel.hidden); });
    document.addEventListener("click", function (e) { if (!panel.hidden && !btn.parentNode.contains(e.target)) setOpen(false); });
    btn.parentNode.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { setOpen(false); btn.focus(); } });
    btn.parentNode.addEventListener("focusout", function (e) { if (!btn.parentNode.contains(e.relatedTarget)) setOpen(false); });
  });

  /* 6. Moving strip: pause button (WCAG 2.2.2) */
  var marquee = document.querySelector(".marquee");
  if (marquee) {
    var mBtn = marquee.querySelector(".marquee-toggle");
    mBtn.addEventListener("click", function () {
      var paused = marquee.classList.toggle("is-paused");
      mBtn.setAttribute("aria-pressed", String(paused));
      mBtn.setAttribute("aria-label", paused ? "Play the moving list" : "Pause the moving list");
    });
  }

  /* 7. Community carousel arrows */
  var reviewsTrack = document.getElementById("reviews-track");
  document.querySelectorAll("[data-scroll]").forEach(function (b) {
    b.addEventListener("click", function () {
      var card = reviewsTrack.querySelector("li");
      var step = card ? card.getBoundingClientRect().width + 24 : 300;
      reviewsTrack.scrollBy({ left: step * Number(b.getAttribute("data-scroll")), behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* 8. AI Studio example videos: play only while on screen, never with
     reduced motion or data saver, and the visitor can pause them. */
  var vids = [].slice.call(document.querySelectorAll("video.auto"));
  var vToggle = document.getElementById("studio-toggle");
  var saveData = navigator.connection && navigator.connection.saveData;
  var userPaused = reduceMotion || saveData;
  var visible = new Set();
  function syncVideos() {
    vids.forEach(function (v) {
      if (!userPaused && visible.has(v)) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
    if (vToggle) { vToggle.textContent = userPaused ? "Play videos" : "Pause videos"; vToggle.setAttribute("aria-pressed", String(userPaused)); }
  }
  if (vids.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target); });
      syncVideos();
    }, { threshold: 0.4 });
    vids.forEach(function (v) { io.observe(v); });
  }
  if (vToggle) vToggle.addEventListener("click", function () { userPaused = !userPaused; syncVideos(); });
  syncVideos();

  /* 10. Before and After: quality picker (1080p by default), one video at a
     time, and no download option in the player menu. */
  var baVideos = [].slice.call(document.querySelectorAll(".ba video[data-src]"));
  var quality = document.getElementById("ba-quality");
  var played = false;
  if (quality) quality.addEventListener("change", function () {
    baVideos.forEach(function (v) {
      var t = v.currentTime, playing = !v.paused;
      v.src = v.getAttribute("data-src") + "-" + quality.value + ".mp4";
      if (t || playing) {
        v.addEventListener("loadedmetadata", function once() {
          v.removeEventListener("loadedmetadata", once);
          v.currentTime = t;
          if (playing) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        });
        v.load();
      }
    });
  });
  baVideos.forEach(function (v) {
    v.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    v.addEventListener("play", function () { baVideos.forEach(function (o) { if (o !== v) o.pause(); }); if (!played) { played = true; count("video_play"); } });
  });

  /* 11. AI Studio examples: tap to see one bigger. Uses the native dialog, so
     Escape and focus return work for free. */
  var box = document.getElementById("lightbox");
  if (box && box.showModal) {
    var boxBody = box.querySelector(".lightbox-body");
    var boxTitle = document.getElementById("lightbox-title");
    var lbFoot = box.querySelector(".lightbox-foot");
    var lbQuality = document.getElementById("lb-quality");
    var resumeAfter = false;
    var openTile = function (tile) {
      var media = tile.querySelector("img, video");
      var name = tile.querySelector("figcaption").textContent;
      boxBody.textContent = "";
      var big;
      if (media.tagName === "IMG") {
        big = document.createElement("img");
        big.src = media.currentSrc || media.src; big.alt = media.alt;
      } else {
        big = document.createElement("video");
        var full = media.getAttribute("data-full"), small = media.querySelector("source").src;
        big.src = full || small; big.poster = media.poster;
        // Opened by a tap, so the browser allows sound: the originals have it.
        big.controls = true; big.loop = true; big.playsInline = true;
        big.setAttribute("controlslist", "nodownload"); big.setAttribute("aria-label", media.getAttribute("aria-label"));
        big.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        if (!reduceMotion) big.autoplay = true;
        lbQuality.options[0].textContent = "Original (" + (media.getAttribute("data-full-height") || "HD") + "p)";
        lbQuality.value = "full";
        lbQuality.onchange = function () {
          var t = big.currentTime, playing = !big.paused;
          big.src = lbQuality.value === "full" && full ? full : small;
          big.addEventListener("loadedmetadata", function once() {
            big.removeEventListener("loadedmetadata", once);
            big.currentTime = t;
            if (playing) { var p = big.play(); if (p && p.catch) p.catch(function () {}); }
          });
        };
      }
      lbFoot.hidden = media.tagName === "IMG" || !media.getAttribute("data-full");
      boxBody.appendChild(big);
      boxTitle.textContent = name + ", made in EditPlug AI Studio";
      resumeAfter = !userPaused; userPaused = true; syncVideos();
      box.showModal();
    };
    document.querySelectorAll(".studio-grid .tile").forEach(function (tile) {
      tile.addEventListener("click", function () { openTile(tile); });
    });
    box.addEventListener("click", function (e) { if (e.target === box || e.target.closest("[data-close]")) box.close(); });
    box.addEventListener("close", function () {
      boxBody.textContent = "";
      if (resumeAfter) { userPaused = false; syncVideos(); }
    });
  }

  /* 12. Signed in: "Sign in" becomes "My account", and Get a quote opens
     the project brief instead of the join form. */
  if (signedIn) {
    document.querySelectorAll("[data-account]").forEach(function (a) { a.textContent = "My account"; });
    document.querySelectorAll("[data-account-out]").forEach(function (a) { a.hidden = true; });
    document.querySelectorAll("[data-quote]").forEach(function (a) {
      a.href = "https://aistudio.editplug.com/app/projects/new?utm_source=editplug.com&utm_medium=website&utm_content=" + (a.dataset.where || "quote");
    });
  }

  /* 9. Keep the copyright year current */
  var y = document.getElementById("year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
