/* =========================================================
   窑承红脉 · 洞润古村 — interactions
   Vanilla JS, no dependencies.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* safety net: if anything throws, never leave content stuck invisible */
  function showEverything() {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    $$('.pal-btn').forEach(function (b) { b.classList.remove('is-active'); });
    var first = $('.pal-btn');
    if (first) first.classList.add('is-active');
    $$('.palette-layer').forEach(function (l, i) {
      l.classList.toggle('is-on', i === 0);
    });
    $$('.step').forEach(function (s, i) {
      s.classList.toggle('is-active', i === 0);
    });
    var t = $('.hero-title');
    if (t) t.classList.remove('is-anim');
  }
  window.addEventListener('error', showEverything);

  /* ---------- current year ---------- */
  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- split hero title into animated glyphs ---------- */
  (function splitTitle() {
    var title = $('[data-split]');
    if (!title) return;
    var nodes = Array.prototype.slice.call(title.childNodes);
    var frag = document.createDocumentFragment();
    var i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split('').forEach(function (ch) {
          if (ch.trim() === '') {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          var span = document.createElement('span');
          span.className = 'ch';
          span.textContent = ch;
          span.style.setProperty('--d', (180 + i * 55) + 'ms');
          frag.appendChild(span);
          i += 1;
        });
      } else {
        frag.appendChild(node);
      }
    });
    title.textContent = '';
    title.appendChild(frag);
    if (!reduceMotion.matches) title.classList.add('is-anim');
  }());

  /* ---------- scroll progress + nav state + hero parallax ---------- */
  var progressBar = $('[data-progress]');
  var nav = $('[data-nav]');
  var heroMedia = $('[data-parallax]');
  var ticking = false;

  function onScrollFrame() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var p = docH > 0 ? clamp(y / docH, 0, 1) : 0;
    if (progressBar) progressBar.style.transform = 'scaleX(' + p + ')';

    if (nav) {
      if (y > window.innerHeight * 0.72) nav.classList.add('is-solid');
      else nav.classList.remove('is-solid');
    }

    if (heroMedia && !reduceMotion.matches && y < window.innerHeight * 1.2) {
      heroMedia.style.transform = 'translate3d(0,' + (y * 0.24) + 'px,0)';
    }
    pinScroll();
  }

  function requestScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScrollFrame);
  }

  window.addEventListener('scroll', requestScroll, { passive: true });

  /* ---------- reveal on enter ---------- */
  (function reveals() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var group = Array.prototype.slice.call(
          el.parentNode ? el.parentNode.children : [el]);
        var i = group.indexOf(el);
        el.style.setProperty('--d', Math.max(0, i) * 70 + 'ms');
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }());

  /* ---------- active nav link ---------- */
  (function activeNav() {
    var links = $$('.nav-links a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) map[id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = map[entry.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    Object.keys(map).forEach(function (id) {
      var t = document.getElementById(id);
      if (t) io.observe(t);
    });
  }());

  /* ---------- material palette ---------- */
  (function palette() {
    var root = $('[data-palette]');
    if (!root) return;
    var btns = $$('.pal-btn', root);
    var layers = $$('.palette-layer', root);
    if (!btns.length) return;

    function activate(i) {
      btns.forEach(function (b, k) { b.classList.toggle('is-active', k === i); });
      layers.forEach(function (l, k) { l.classList.toggle('is-on', k === i); });
    }
    btns.forEach(function (btn, i) {
      var go = function () { activate(i); };
      btn.addEventListener('mouseenter', go);
      btn.addEventListener('focus', go);
      btn.addEventListener('click', go);
    });
    activate(0);
  }());

  /* ---------- space sequence stepper ---------- */
  (function steps() {
    var root = $('[data-steps]');
    if (!root) return;
    var items = $$('.step', root);
    if (!items.length) return;
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        items.forEach(function (o) { o.classList.remove('is-active'); });
        item.classList.add('is-active');
      });
    });
    items[0].classList.add('is-active');
  }());

  /* ---------- horizontal drag for plate strip ---------- */
  (function dragStrip() {
    $$('[data-drag]').forEach(function (strip) {
      var down = false;
      var startX = 0;
      var startLeft = 0;
      var moved = 0;

      strip.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch') return;
        down = true;
        moved = 0;
        startX = e.clientX;
        startLeft = strip.scrollLeft;
        strip.classList.add('is-dragging');
        strip.setPointerCapture(e.pointerId);
      });

      strip.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        strip.scrollLeft = startLeft - dx;
      });

      function end(e) {
        if (!down) return;
        down = false;
        strip.classList.remove('is-dragging');
        if (strip.releasePointerCapture && e.pointerId !== undefined) {
          try { strip.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
        if (moved > 6) {
          strip.addEventListener('click', function block(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            strip.removeEventListener('click', block, true);
          }, true);
        }
      }
      strip.addEventListener('pointerup', end);
      strip.addEventListener('pointercancel', end);
      strip.addEventListener('pointerleave', function () {
        if (down) { down = false; strip.classList.remove('is-dragging'); }
      });
    });
  }());

  /* ---------- pinned horizontal rendering gallery ---------- */
  var pinScroll = function () {};

  (function pinned() {
    var pin = $('[data-pin]');
    if (!pin) return;
    var track = $('[data-pin-track]', pin);
    var bar = $('[data-pin-bar]', pin);
    if (!track) return;

    var narrow = window.matchMedia('(max-width: 780px)');
    var overflow = 0;
    var enabled = false;

    function measure() {
      if (narrow.matches || reduceMotion.matches) {
        pin.classList.remove('is-pinned');
        pin.style.height = '';
        track.style.transform = '';
        if (bar) bar.style.transform = 'scaleX(1)';
        enabled = false;
        pinScroll = function () {};
        return;
      }
      pin.classList.add('is-pinned');
      enabled = true;

      var style = window.getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap) || 0;
      var kids = Array.prototype.slice.call(track.children);
      var padL = parseFloat(style.paddingLeft) || 0;
      var padR = parseFloat(style.paddingRight) || 0;
      var total = padL + padR;
      kids.forEach(function (k) { total += k.getBoundingClientRect().width; });
      total += gap * Math.max(0, kids.length - 1);

      overflow = Math.max(0, Math.round(total - window.innerWidth));
      pin.style.height = (window.innerHeight + overflow) + 'px';

      pinScroll = function () {
        if (!enabled) { track.style.transform = ''; return; }
        var rect = pin.getBoundingClientRect();
        var span = pin.offsetHeight - window.innerHeight;
        var p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
        track.style.transform = 'translate3d(' + (-p * overflow) + 'px,0,0)';
        if (bar) bar.style.transform = 'scaleX(' + (0.12 + 0.88 * p) + ')';
      };
      pinScroll();
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 160);
    });

    var count = $('[data-pin-count]');
    if (count) count.textContent = String(track.children.length);

    measure();
    // re-measure once webfonts/images settle the layout
    window.addEventListener('load', measure);
  }());

  /* =========================================================
     LIGHTBOX with zoom + pan
     ========================================================= */
  (function lightbox() {
    var lb = $('[data-lb]');
    if (!lb) return;

    var stage = $('[data-lb-stage]', lb);
    var img = $('[data-lb-img]', lb);
    var titleEl = $('[data-lb-title]', lb);
    var noteEl = $('[data-lb-note]', lb);
    var indexEl = $('[data-lb-index]', lb);
    var totalEl = $('[data-lb-total]', lb);
    var prevBtn = $('[data-lb-prev]', lb);
    var nextBtn = $('[data-lb-next]', lb);
    var closeBtn = $('[data-lb-close]', lb);

    var items = [];
    var index = 0;
    var scale = 1;
    var tx = 0;
    var ty = 0;
    var dragging = false;
    var dragStart = null;

    function collect(group) {
      return $$('[data-gal="' + group + '"]');
    }

    function apply() {
      img.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) scale(' + scale + ')';
      stage.style.cursor = scale > 1 ? 'grab' : 'default';
    }

    function reset() {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    }

    function clampPan() {
      var r = stage.getBoundingClientRect();
      var maxX = (r.width * (scale - 1)) / 2 + 40;
      var maxY = (r.height * (scale - 1)) / 2 + 40;
      tx = clamp(tx, -maxX, maxX);
      ty = clamp(ty, -maxY, maxY);
    }

    function show(i) {
      index = (i + items.length) % items.length;
      var el = items[index];
      img.src = el.getAttribute('data-full');
      img.alt = el.getAttribute('data-title') || '';
      if (titleEl) titleEl.textContent = el.getAttribute('data-title') || '';
      if (noteEl) noteEl.textContent = el.getAttribute('data-note') || '';
      if (indexEl) indexEl.textContent = String(index + 1);
      if (totalEl) totalEl.textContent = String(items.length);
      var single = items.length < 2;
      if (prevBtn) prevBtn.disabled = single;
      if (nextBtn) nextBtn.disabled = single;
      reset();
      // preload neighbours
      [1, -1].forEach(function (d) {
        var n = items[(index + d + items.length) % items.length];
        if (n && items.length > 1) {
          var pre = new Image();
          pre.src = n.getAttribute('data-full');
        }
      });
    }

    function open(group, el) {
      items = collect(group);
      var i = items.indexOf(el);
      if (i < 0) items = [el], i = 0;
      lb.hidden = false;
      document.body.classList.add('is-locked');
      // force reflow so the opacity transition runs
      void lb.offsetWidth;
      lb.classList.add('is-open');
      show(i);
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    function close() {
      lb.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        lb.hidden = true;
        img.removeAttribute('src');
      }, 340);
    }

    function zoomAt(factor, clientX, clientY) {
      var prev = scale;
      var next = clamp(scale * factor, 1, 7);
      if (next === prev) return;
      var r = stage.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var px = (clientX === undefined ? cx : clientX) - cx;
      var py = (clientY === undefined ? cy : clientY) - cy;
      var k = next / prev;
      tx = px - k * (px - tx);
      ty = py - k * (py - ty);
      scale = next;
      clampPan();
      apply();
    }

    /* open from any card */
    $$('[data-gal]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        open(el.getAttribute('data-gal'), el);
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', function () { show(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });

    var zoomInBtn = $('[data-lb-in]', lb);
    var zoomOutBtn = $('[data-lb-out]', lb);
    var fitBtn = $('[data-lb-fit]', lb);
    if (zoomInBtn) zoomInBtn.addEventListener('click', function () { zoomAt(1.5); });
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', function () { zoomAt(1 / 1.5); });
    if (fitBtn) fitBtn.addEventListener('click', reset);

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.16 : 1 / 1.16, e.clientX, e.clientY);
    }, { passive: false });

    stage.addEventListener('dblclick', function (e) {
      if (scale > 1.05) reset();
      else zoomAt(2.4, e.clientX, e.clientY);
    });

    stage.addEventListener('pointerdown', function (e) {
      if (scale <= 1.02) {
        dragStart = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, swipe: true };
        return;
      }
      dragging = true;
      stage.classList.add('is-grabbing');
      dragStart = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, swipe: false };
      stage.setPointerCapture(e.pointerId);
    });

    stage.addEventListener('pointermove', function (e) {
      if (!dragStart) return;
      var dx = e.clientX - dragStart.x;
      var dy = e.clientY - dragStart.y;
      if (dragging) {
        tx = dragStart.tx + dx;
        ty = dragStart.ty + dy;
        apply();
      }
    });

    function endDrag(e) {
      if (!dragStart) return;
      var dx = e.clientX - dragStart.x;
      stage.classList.remove('is-grabbing');
      if (dragging) {
        dragging = false;
        clampPan();
        apply();
      } else if (dragStart.swipe && Math.abs(dx) > 70 && items.length > 1) {
        show(dx < 0 ? index + 1 : index - 1);
      }
      dragStart = null;
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', function () {
      dragStart = null;
      dragging = false;
      stage.classList.remove('is-grabbing');
    });

    /* close when clicking the empty area around the image */
    stage.addEventListener('click', function (e) {
      if (e.target === stage) close();
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      switch (e.key) {
        case 'Escape': close(); break;
        case 'ArrowLeft': if (items.length > 1) show(index - 1); break;
        case 'ArrowRight': if (items.length > 1) show(index + 1); break;
        case '+':
        case '=': zoomAt(1.4); break;
        case '-':
        case '_': zoomAt(1 / 1.4); break;
        case '0': reset(); break;
        default: break;
      }
    });
  }());

  /* ---------- first paint ---------- */
  onScrollFrame();
  window.addEventListener('load', requestScroll);
  window.addEventListener('resize', requestScroll);
}());
