// Motion layer: letter/word reveals, scroll effects, ticker, cursor and magnetic buttons.
// Does nothing when the visitor's device asks for reduced motion (html.motion is not set).
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('motion')) return;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ───────── split headings into letters / words ─────────
  const splitChars = (el, startIndex = 0) => {
    const text = el.textContent;
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'char';
      c.setAttribute('aria-hidden', 'true');
      c.style.setProperty('--i', startIndex + i);
      c.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(c);
    });
  };
  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) { walk(n); return; }
        if (n.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'word';
          const inner = document.createElement('span');
          inner.className = 'word__in';
          inner.style.setProperty('--i', i++);
          inner.textContent = part;
          w.appendChild(inner);
          frag.appendChild(w);
        });
        n.replaceWith(frag);
      });
    };
    walk(el);
  };

  document.querySelectorAll('.masthead__first, .masthead__last, .section__title').forEach((el) => splitChars(el));
  document.querySelectorAll('.lead__headline, .backpage__line, .job-feature__title, .case h3').forEach(splitWords);

  // stagger indexes for lists that animate in sequence
  const index = (selector, childSelector) => document.querySelectorAll(selector).forEach((parent) => {
    parent.querySelectorAll(childSelector).forEach((child, i) => child.style.setProperty('--i', i));
  });
  index('.dateline', ':scope > span');
  index('.subline', ':scope > span');
  index('.contents ol', 'li');
  index('.glance dl', ':scope > div');
  index('.ticks', 'li');
  index('.tools', '.tool');
  index('.spread', '.plate');

  // wrap photos so they can slide and drift inside their frame without covering captions
  document.querySelectorAll('.plate img, .profile__photo img').forEach((img) => {
    const wrap = document.createElement('span');
    wrap.className = 'imgwrap';
    img.replaceWith(wrap);
    wrap.appendChild(img);
  });

  root.classList.add('is-split');
  const start = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  // wait for the film-counter loader (fx.js) when it's on the page, otherwise for the fonts
  if (document.getElementById('loader')) addEventListener('loader:done', start, { once: true });
  else (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);

  // ───────── reveal on scroll ─────────
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.section__head, .backpage__line').forEach((el) => io.observe(el));

  // ───────── scroll-driven effects (one rAF loop) ─────────
  const topbar = document.getElementById('topbar');
  const menu = document.getElementById('menu');
  const first = document.querySelector('.masthead__first');
  const last = document.querySelector('.masthead__last');
  const parallax = [...document.querySelectorAll('.imgwrap img')];
  const track = document.getElementById('tickerTrack');

  // duplicate ticker items so the band loops seamlessly
  track.innerHTML += track.innerHTML;
  let tickerX = 0, loopWidth = track.scrollWidth / 2;
  addEventListener('resize', () => { loopWidth = track.scrollWidth / 2; });
  if (document.fonts) document.fonts.ready.then(() => { loopWidth = track.scrollWidth / 2; });

  // phones/tablets: skip the photo parallax and name drift (costly there, barely visible)
  const lite = matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)').matches;
  // only work on things that are on screen
  const onScreen = new Set();
  const vis = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target))), { rootMargin: '120px 0px' });
  parallax.forEach((img) => vis.observe(img.parentElement));
  vis.observe(track.parentElement);

  let lastY = scrollY, velocity = 0, lastTime = performance.now(), firstFrame = true;
  const frame = (now) => {
    const y = scrollY;
    const dt = Math.min(now - lastTime, 64) || 16;
    lastTime = now;
    const dy = y - lastY;
    velocity += (dy / dt * 16 - velocity) * 0.12;   // smoothed scroll speed
    lastY = y;

    // top bar: tuck away while scrolling down, return on the way up
    if (menu.hidden) {
      if (dy > 4 && y > 240) topbar.classList.add('is-tucked');
      else if (dy < -4 || y < 240) topbar.classList.remove('is-tucked');
    }

    const scrolled = dy !== 0 || firstFrame;
    firstFrame = false;
    if (!lite && scrolled) {
      // read every position first, then write (reading after writing forces extra layout work)
      const reads = [];
      parallax.forEach((img) => {
        if (onScreen.has(img.parentElement)) reads.push([img, img.parentElement.getBoundingClientRect()]);
      });
      // name drifts apart as the front page scrolls away
      if (y < innerHeight * 1.5) {
        first.style.translate = `${-y * 0.12}px 0`;
        last.style.translate = `${y * 0.12}px 0`;
      }
      // photos move a little slower than the page
      reads.forEach(([img, r]) => {
        const offset = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.translate = `0 ${offset * -7}%`;
      });
    }

    // ticker: steady drift, pushed faster (and leaning) by scroll speed — only while visible
    if (!onScreen.has(track.parentElement)) { requestAnimationFrame(frame); return; }
    const dir = velocity < -0.5 ? -1 : 1;
    tickerX -= (0.6 + Math.min(Math.abs(velocity) * 0.35, 12)) * dir;
    if (tickerX <= -loopWidth) tickerX += loopWidth;
    if (tickerX > 0) tickerX -= loopWidth;
    const skew = Math.max(-10, Math.min(10, velocity * -0.4));
    track.style.transform = `translate3d(${tickerX}px, 0, 0) skewX(${skew}deg)`;

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (!finePointer) return;

  // ───────── cursor ─────────
  const dot = document.createElement('div');
  dot.className = 'cursor';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span>View</span>';
  document.body.append(dot, ring);
  let mx = -100, my = -100, rx = -100, ry = -100;
  addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    dot.classList.add('is-on'); ring.classList.add('is-on');
    const t = e.target;
    const view = t.closest && t.closest('.plate');
    const link = t.closest && t.closest('a, button');
    ring.classList.toggle('is-view', !!view);
    ring.classList.toggle('is-link', !view && !!link);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { dot.classList.remove('is-on'); ring.classList.remove('is-on'); });
  addEventListener('pointerdown', () => ring.classList.add('is-down'));
  addEventListener('pointerup', () => ring.classList.remove('is-down'));
  const follow = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  // ───────── magnetic buttons ─────────
  document.querySelectorAll('.button, .store, .edition, .topbar__resume, .essay__more, .contact__copy').forEach((el) => {
    el.classList.add('magnetic');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.25;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.35;
      el.style.translate = `${x}px ${y}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });
})();
