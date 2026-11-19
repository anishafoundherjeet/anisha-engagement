/* Anisha & Harjeet — invitation interactions. No dependencies. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionPreference.matches;
  function updateMotionPreference() { reducedMotion = motionPreference.matches; }
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', updateMotionPreference);
  else if (motionPreference.addListener) motionPreference.addListener(updateMotionPreference);
  var isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  /* ------------------------------------------------------------------
     Event data. All times are India Standard Time (UTC+05:30), so the
     countdown is correct wherever the guest opens the invite.
     ------------------------------------------------------------------ */
  var EVENTS = {
    shagan: {
      name: 'Shagan',
      title: 'Shagan · Anisha & Harjeet',
      start: '2027-01-15T18:30:00+05:30',
      end: '2027-01-15T23:00:00+05:30',
      location: 'The Ritz, 2nd floor, Moti Nagar, New Delhi',
      map: 'https://www.google.com/maps/dir/?api=1&destination=28.6631209%2C77.1551365'
    }
  };
  var ICS_FILES = {
    "shagan": "assets/cal/shagan.ics"
};

  /* ============================ Painted artwork ============================ */
  // <img data-art="key">: when it loads, <html> gets "art-key" so CSS can swap the
  // drawn SVG for the painting. <img data-fallback="...">: use the SVG if the art is missing.
  $$('img[data-art]').forEach(function (img) {
    var key = img.getAttribute('data-art');
    var ok = function () { document.documentElement.classList.add('art-' + key); };
    var bad = function () { img.parentNode && img.parentNode.removeChild(img); };
    if (img.complete) { img.naturalWidth ? ok() : bad(); }
    else { img.addEventListener('load', ok); img.addEventListener('error', bad); }
  });
  $$('img[data-fallback]').forEach(function (img) {
    var fallback = function () {
      var f = img.getAttribute('data-fallback');
      img.removeAttribute('data-fallback');
      if (f) img.src = f;
    };
    if (img.complete && !img.naturalWidth && img.getAttribute('loading') !== 'lazy') fallback();
    else img.addEventListener('error', fallback, { once: true });
  });

  /* ============================ Envelope ============================ */
  var envelope = $('#envelope');
  var body = document.body;
  var audio = $('#audio');
  var musicBtn = $('#music');
  var page = $('#page');
  page.inert = true;
  var opened = false;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Reveal the envelope art only after fonts are ready (no monogram flash).
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
    requestAnimationFrame(function () { envelope.classList.add('is-ready'); });
  });

  function openEnvelope() {
    if (opened) return;
    opened = true;
    startMusic(); // must run inside the tap handler for iOS autoplay rules
    envelope.classList.add('is-opening');
    body.classList.add('is-open');

    var unlockAt = reducedMotion ? 650 : 2200;
    var removeAt = reducedMotion ? 1250 : 2900;
    setTimeout(function () {
      body.classList.remove('is-locked');
      page.inert = false;
      window.scrollTo(0, 0);
      $('.hero__names').focus({ preventScroll: true });
      window.dispatchEvent(new Event('invitation:opened'));
    }, unlockAt);
    setTimeout(function () {
      envelope.parentNode && envelope.parentNode.removeChild(envelope);
      if (!musicBtn.hidden) musicBtn.classList.add('is-shown');
    }, removeAt);
  }
  envelope.addEventListener('click', openEnvelope);
  envelope.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); }
  });
  envelope.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  setTimeout(function () { try { envelope.focus({ preventScroll: true }); } catch (e) { } }, 50);

  /* ============================ Music ============================ */
  var wantsMusic = true;
  var fadeRaf = 0;

  function setPressed(on) {
    musicBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }
  function fadeIn() {
    cancelAnimationFrame(fadeRaf);
    var t0 = performance.now();
    try { audio.volume = 0; } catch (e) { }
    (function step(now) {
      var k = Math.min(1, (now - t0) / 2500);
      try { audio.volume = 0.75 * k; } catch (e) { }
      if (k < 1) fadeRaf = requestAnimationFrame(step);
    })(t0);
  }
  function startMusic() {
    if (!audio) return;
    musicBtn.hidden = false;
    var p = audio.play();
    if (p && p.then) {
      p.then(function () { setPressed(true); fadeIn(); })
        .catch(function () { wantsMusic = false; setPressed(false); });
    } else {
      setPressed(true);
    }
  }
  musicBtn.addEventListener('click', function () {
    if (audio.paused) {
      wantsMusic = true;
      audio.play().then(function () { setPressed(true); fadeIn(); }).catch(function () { });
    } else {
      wantsMusic = false;
      cancelAnimationFrame(fadeRaf);
      audio.pause();
      setPressed(false);
    }
  });
  audio.addEventListener('error', function () { musicBtn.hidden = true; });
  document.addEventListener('visibilitychange', function () {
    if (!opened) return;
    if (document.hidden) {
      if (!audio.paused) audio.pause();
    } else if (wantsMusic && audio.paused) {
      audio.play().then(function () { setPressed(true); }).catch(function () { setPressed(false); });
    }
  });

  /* ============================ Scroll reveals ============================ */
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          revealIO.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ============================ Petals ============================ */
  var petals = $('#petals');
  if (petals && !reducedMotion) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 9; i++) {
      var p = document.createElement('span');
      var size = 4 + Math.random() * 5;
      var dur = 18 + Math.random() * 12;
      p.className = 'petal';
      p.style.left = (Math.random() * 100).toFixed(1) + '%';
      p.style.width = size.toFixed(1) + 'px';
      p.style.height = (size * 1.15).toFixed(1) + 'px';
      p.style.setProperty('--dur', dur.toFixed(1) + 's');
      p.style.setProperty('--delay', (-Math.random() * dur).toFixed(1) + 's');
      p.style.setProperty('--sway', ((Math.random() * 120) - 60).toFixed(0) + 'px');
      frag.appendChild(p);
    }
    petals.appendChild(frag);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        petals.classList.toggle('is-paused', !entries[0].isIntersecting);
      }).observe($('#hero'));
    }
  }

  /* ============================ Countdown ============================ */
  var cdSection = $('#countdown');
  var cdTitle = $('#cd-title');
  var cdSub = $('#cd-sub');
  var cdDone = $('#cd-done');
  var RING = 2 * Math.PI * 35;
  var units = {};
  $$('.cd__unit').forEach(function (u) {
    units[u.getAttribute('data-unit')] = { num: $('.cd__num', u), ring: $('.cd__prog', u) };
  });
  var cdVisible = false;
  var ringsArmed = false;
  var cdTimer = 0;
  var lastPhase = '';

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function setNum(el, val, animate) {
    var current = el.querySelector('span:not(.is-out)');
    if (current && current.textContent === val) return;
    $$('.is-out', el).forEach(function (s) { s.parentNode.removeChild(s); });
    if (!animate || !current) {
      el.innerHTML = '';
      var s = document.createElement('span');
      s.textContent = val;
      el.appendChild(s);
      return;
    }
    current.classList.remove('is-in');
    current.classList.add('is-out');
    current.addEventListener('animationend', function () {
      if (current.parentNode) current.parentNode.removeChild(current);
    }, { once: true });
    var next = document.createElement('span');
    next.className = 'is-in';
    next.textContent = val;
    el.appendChild(next);
  }
  function setRing(ring, frac) {
    if (!ringsArmed) return;
    ring.style.strokeDashoffset = (RING * (1 - Math.max(0, Math.min(1, frac)))).toFixed(2);
  }

  function setPhase(id, title, sub, doneText) {
    if (lastPhase === id) return;
    lastPhase = id;
    cdTitle.textContent = title;
    cdSub.textContent = sub;
    if (doneText) {
      cdDone.textContent = doneText;
      cdDone.hidden = false;
      cdSection.classList.add('is-done');
    } else {
      cdDone.hidden = true;
      cdSection.classList.remove('is-done');
    }
  }

  function tick(animate) {
    var now = Date.now();
    var target = Date.parse(EVENTS.shagan.start);
    if (now < target) {
      setPhase('shagan', 'The Shagan Begins In', 'Friday, 15 January 2027 · 6:30 PM');
    } else if (now < Date.parse(EVENTS.shagan.end)) {
      setPhase('today', 'The Shagan Is Here', 'Friday, 15 January 2027 · 6:30 PM', 'The celebrations are underway!');
      return true;
    } else {
      setPhase('complete', 'Happily Engaged', 'Anisha & Harjeet · 15.01.2027', 'Thank you for your love & blessings');
      return false;
    }

    var diff = Math.max(0, target - now);
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    var anim = animate && cdVisible && !document.hidden && !reducedMotion;

    setNum(units.days.num, pad(d), anim);
    setNum(units.hours.num, pad(h), anim);
    setNum(units.minutes.num, pad(m), anim);
    setNum(units.seconds.num, pad(sec), anim);
    setRing(units.days.ring, Math.min(d, 100) / 100);
    setRing(units.hours.ring, h / 24);
    setRing(units.minutes.ring, m / 60);
    setRing(units.seconds.ring, sec / 60);
    return true;
  }

  function schedule() {
    clearTimeout(cdTimer);
    // Align to the next whole second so digits never drift or skip.
    cdTimer = setTimeout(function () {
      if (tick(true)) schedule();
    }, 1000 - (Date.now() % 1000) + 15);
  }

  if (tick(false)) schedule();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      cdVisible = entries[0].isIntersecting;
      if (cdVisible && !ringsArmed) {
        ringsArmed = true;
        // Let the rings sweep in the first time the countdown is seen.
        requestAnimationFrame(function () { tick(false); });
      }
    }, { threshold: 0.2 }).observe(cdSection);
  } else {
    cdVisible = ringsArmed = true;
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && tick(false)) schedule();
  });

  /* ============================ Calendar sheet ============================ */
  var sheet = $('#sheet');
  var sheetList = $('#sheet-list');
  var lastFocus = null;
  var sheetTimer = 0;
  var sheetOpen = false;

  function toGCalDate(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function googleUrl(ev) {
    var q = [
      'action=TEMPLATE',
      'text=' + encodeURIComponent(ev.title),
      'dates=' + toGCalDate(ev.start) + '/' + toGCalDate(ev.end || ev.start),
      'location=' + encodeURIComponent(ev.location),
      'details=' + encodeURIComponent('Directions: ' + ev.map + '\n\n#AnishaFoundHerJeet'),
      'ctz=Asia/Kolkata'
    ];
    return 'https://calendar.google.com/calendar/render?' + q.join('&');
  }
  function makeLink(href, label, ghost, external) {
    var a = document.createElement('a');
    a.className = 'btn' + (ghost ? ' btn--ghost' : '');
    a.href = href;
    a.textContent = label;
    if (external) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  function openSheet(key) {
    var keys = key === 'all' ? Object.keys(EVENTS) : key.split(',');
    sheetList.innerHTML = '';
    var ics = makeLink(ICS_FILES[key], 'Apple / Outlook Calendar', !isIOS, false);
    var googles = keys.map(function (k) {
      var label = 'Google Calendar' + (keys.length > 1 ? ' · ' + EVENTS[k].name : '');
      return makeLink(googleUrl(EVENTS[k]), label, isIOS, true);
    });
    if (isIOS) sheetList.appendChild(ics);
    googles.forEach(function (g) { sheetList.appendChild(g); });
    if (!isIOS) sheetList.appendChild(ics);

    clearTimeout(sheetTimer);
    if (!sheetOpen) lastFocus = document.activeElement;
    sheetOpen = true;
    page.inert = musicBtn.inert = true;
    body.classList.add('modal-open');
    sheet.hidden = false;
    void sheet.offsetWidth; // commit the hidden state before animating in
    sheet.classList.add('is-open');
    var first = sheetList.querySelector('a');
    if (first) first.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    page.inert = musicBtn.inert = false;
    body.classList.remove('modal-open');
    sheet.classList.remove('is-open');
    sheetTimer = setTimeout(function () { sheet.hidden = true; }, reducedMotion ? 50 : 450);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-cal]').forEach(function (btn) {
    btn.addEventListener('click', function () { openSheet(btn.getAttribute('data-cal')); });
  });
  $$('[data-close]', sheet).forEach(function (el) { el.addEventListener('click', closeSheet); });
  sheetList.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(closeSheet, 300); });
  document.addEventListener('keydown', function (e) {
    if (!sheetOpen) return;
    if (e.key === 'Escape') { closeSheet(); return; }
    if (e.key !== 'Tab') return;
    var focusable = $$('a, button', sheet);
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ============================ Hashtag copy ============================ */
  var toast = $('#toast');
  var toastTimer = 0;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-shown'); }, 2000);
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
    return ok;
  }
  $('#tag-copy').addEventListener('click', function () {
    var text = '#AnishaFoundHerJeet';
    var done = function () { showToast('Hashtag copied'); };
    var fallback = function () { showToast(legacyCopy(text) ? 'Hashtag copied' : text); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  });
})();
