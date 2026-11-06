/* Website v01 · page behaviour (Oct 29 2026): scroll reveals, nav state, section-by-section keys for presenting, video pause off-screen. */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');

  window.addEventListener('DOMContentLoaded', function () {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // reveals
    var items = [].slice.call(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window && !reduced) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      items.forEach(function (el) { io.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('in'); });
    }

    // nav background once past the hero
    var nav = document.getElementById('nav');
    function onScroll() { nav.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // presenting: arrows / space / page keys move one stop at a time (each section, plus the feature row inside The Applicator)
    var stops = [].slice.call(document.querySelectorAll('.panel, [data-stop]'));
    function topOf(el) {
      var y = el.getBoundingClientRect().top + window.scrollY;
      if (el.hasAttribute('data-stop')) {                 // centre the feature row in the screen
        y -= Math.max(90, (window.innerHeight - el.offsetHeight) / 2);
      }
      return Math.max(0, Math.round(y));
    }
    function go(dir) {
      var ys = stops.map(topOf).sort(function (a, b) { return a - b; });
      var y = window.scrollY, target = null;
      if (dir > 0) { for (var i = 0; i < ys.length; i++) if (ys[i] > y + 10) { target = ys[i]; break; } }
      else { for (var j = ys.length - 1; j >= 0; j--) if (ys[j] < y - 10) { target = ys[j]; break; } }
      if (target === null) target = dir > 0 ? doc.scrollHeight : 0;
      window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    }
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      var k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || k === 'ArrowRight' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); go(1); }
      else if (k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowLeft' || (k === ' ' && e.shiftKey)) { e.preventDefault(); go(-1); }
      else if (k === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (k === 'End') { e.preventDefault(); window.scrollTo({ top: doc.scrollHeight, behavior: 'smooth' }); }
    });

    // turntable: play only while visible; a still poster for reduced motion
    var v = document.getElementById('turntable');
    if (v) {
      if (reduced) { v.removeAttribute('autoplay'); v.pause(); }
      else if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } else { v.pause(); }
        }, { threshold: 0.2 }).observe(v);
      }
    }
  });
})();
