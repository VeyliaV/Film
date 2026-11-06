/* Website v01 · fluid gradient (Oct 29 2026). Plain WebGL 1, no library.
   Slow domain-warped noise mixed through the palette; the cursor adds a gentle swirl that follows with lag.
   Renders at reduced resolution (it is soft by nature), pauses when off-screen or the tab is hidden,
   draws one still frame for prefers-reduced-motion, and leaves the CSS gradient in place when WebGL is missing. */
(function () {
  'use strict';

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  var FRAG = [
    'precision mediump float;',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uMouseAmt;',
    'uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4;',
    'vec3 hash3(vec2 p){ vec3 q = vec3(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)), dot(p, vec2(419.2, 371.9))); return fract(sin(q) * 43758.5453); }',
    'float noise(vec2 x){ vec2 i = floor(x); vec2 f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash3(i).x, b = hash3(i + vec2(1.0, 0.0)).x, c = hash3(i + vec2(0.0, 1.0)).x, d = hash3(i + vec2(1.0, 1.0)).x;',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }',
    'float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 r = mat2(0.8, 0.6, -0.6, 0.8);',
    '  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.02 + 3.1; a *= 0.5; } return v; }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes; float asp = uRes.x / uRes.y;',
    '  vec2 p = vec2(uv.x * asp, uv.y) * 1.35; float t = uTime * 0.035;',
    /* cursor: a soft swirl that pushes the colour fields around it */
    '  vec2 m = vec2(uMouse.x * asp, uMouse.y) * 1.35; vec2 d = p - m; float r = length(d);',
    '  float sw = uMouseAmt * 0.55 * exp(-r * r * 2.2); float cs = cos(sw), sn = sin(sw);',
    '  p = m + mat2(cs, -sn, sn, cs) * d;',
    '  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.8));',
    '  vec2 w = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 3.2 * q + vec2(8.3, 2.8) - t * 0.5));',
    '  float f = fbm(p + 2.6 * w);',
    '  vec3 col = mix(c0, c1, smoothstep(0.25, 0.85, f));',
    '  col = mix(col, c2, smoothstep(0.35, 0.95, length(q) * 0.9) * 0.85);',
    '  col = mix(col, c3, smoothstep(0.55, 1.0, w.x) * 0.45);',
    '  col = mix(col, c4, smoothstep(0.55, 0.95, f * w.y + 0.25) * 0.55);',
    '  col += (hash3(gl_FragCoord.xy + fract(uTime)).x - 0.5) / 255.0;',  /* dither: no banding in soft gradients */
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function hex(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }

  var PALETTES = {
    hero:  ['#F2D9D3', '#F0B9A2', '#D9C6E4', '#DE9AA2', '#FAF3EE'],   // blush, apricot, lilac, rose, ivory (kept light: plum text stays AA)
    story: ['#F2D9D3', '#F3C6B4', '#DFD0EA', '#E6AEB4', '#F8F0EB']
  };

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function Fluid(canvas, palette, scale) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' }) ||
           canvas.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl || window.__noWebGL) { canvas.setAttribute('data-fallback', 'css'); return; }

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.setAttribute('data-fallback', 'css'); return; }
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { canvas.setAttribute('data-fallback', 'css'); return; }
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['uRes', 'uTime', 'uMouse', 'uMouseAmt', 'c0', 'c1', 'c2', 'c3', 'c4'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    palette.forEach(function (h, i) { gl.uniform3fv(U['c' + i], hex(h)); });

    var mouse = { x: 0.7, y: 0.6, tx: 0.7, ty: 0.6, amt: 0, tamt: 0 };
    var visible = true, running = false, t0 = performance.now(), last = 0, raf = 0;
    var seed = Math.random() * 40;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var k = Math.min(window.devicePixelRatio || 1, 2) * scale;
      var w = Math.max(2, Math.round(r.width * k)), h = Math.max(2, Math.round(r.height * k));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      gl.uniform2f(U.uRes, w, h);
    }
    function draw(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var k = 1 - Math.pow(0.04, dt);                      // smooth follow, frame-rate independent
      mouse.x += (mouse.tx - mouse.x) * k * 0.6; mouse.y += (mouse.ty - mouse.y) * k * 0.6;
      mouse.amt += (mouse.tamt - mouse.amt) * k * 0.5; mouse.tamt *= Math.pow(0.35, dt);
      gl.uniform1f(U.uTime, seed + (now - t0) / 1000);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uMouseAmt, mouse.amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (running || reduced) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize(); draw(performance.now());
    canvas.classList.add('on');
    if (reduced) { window.addEventListener('resize', function () { resize(); draw(performance.now()); }); return; }

    window.addEventListener('resize', resize);
    var host = canvas.parentElement;
    host.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width, ny = 1 - (e.clientY - r.top) / r.height;
      var dx = nx - mouse.tx, dy = ny - mouse.ty;
      mouse.tx = nx; mouse.ty = ny;
      mouse.tamt = Math.min(1.6, mouse.tamt + Math.sqrt(dx * dx + dy * dy) * 6);
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (visible && start()); });
    start();
  }

  window.addEventListener('DOMContentLoaded', function () {
    var a = document.getElementById('fluid'), b = document.getElementById('fluid2');
    if (a) Fluid(a, PALETTES.hero, 0.5);
    if (b) Fluid(b, PALETTES.story, 0.35);
  });
})();
