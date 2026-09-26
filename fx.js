// FX layer: film-counter loader, smooth scroll, animated doodle hero,
// and scroll scenes (statement, horizontal case files, logo rails, big line).
// Without motion (reduced-motion devices) only the loader is removed and the page stays static.
(() => {
  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const loader = document.getElementById('loader');
  const hero = document.getElementById('hero');

  if (!motion) { loader.remove(); return; }
  root.classList.add('fx');

  // ───────── loader: counts 000 → 100 while the page loads, then the curtains split ─────────
  const countEl = document.getElementById('loaderCount');
  const barEl = document.getElementById('loaderBar');
  let pageLoaded = document.readyState === 'complete';
  addEventListener('load', () => { pageLoaded = true; });
  setTimeout(() => { pageLoaded = true; }, 4500); // never wait longer than this
  root.style.overflow = 'hidden';
  const t0 = performance.now();
  let shown = 0;
  const finishLoader = () => {
    root.style.overflow = '';
    root.classList.add('loader-done');
    dispatchEvent(new Event('loader:done'));
    setTimeout(() => loader.remove(), 1500);
  };
  const countUp = (now) => {
    const target = Math.min((now - t0) / 1700, pageLoaded ? 1 : 0.9);
    shown += (target - shown) * 0.12;
    if (target === 1 && shown > 0.995) shown = 1;
    countEl.textContent = String(Math.round(shown * 100)).padStart(3, '0');
    barEl.style.transform = `scaleX(${shown})`;
    if (shown >= 1) { setTimeout(finishLoader, 280); return; }
    requestAnimationFrame(countUp);
  };
  requestAnimationFrame(countUp);
  const afterLoader = (fn) => (root.classList.contains('loader-done') ? fn() : addEventListener('loader:done', fn, { once: true }));

  // ───────── smooth scroll ─────────
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop();
    afterLoader(() => lenis.start());
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      const target = hash === '#top' ? 0 : (hash.length > 1 ? document.querySelector(hash) : null);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -70 });
    }));
    // pause smooth scroll while the photo viewer is open
    const viewer = document.getElementById('viewer');
    new MutationObserver(() => (viewer.classList.contains('is-open') ? lenis.stop() : lenis.start()))
      .observe(viewer, { attributes: true, attributeFilter: ['class'] });
  }

  // ───────── doodle: fully interactive ─────────
  const doodle = document.getElementById('doodle');
  const fitDoodle = () => {
    const sub = hero.querySelector('.subline'), foot = hero.querySelector('.hero__foot');
    if (innerWidth > 760) hero.style.setProperty('--doodle-bottom', `${sub.offsetHeight + foot.offsetHeight + 24}px`);
  };
  fitDoodle();
  addEventListener('resize', fitDoodle);
  if (document.fonts) document.fonts.ready.then(fitDoodle);
  const svg = doodle.querySelector('svg');
  const head = doodle.querySelector('.doodle__head');
  const pupils = doodle.querySelector('.doodle__pupils');
  const bubble = document.getElementById('doodleBubble');
  const camera = doodle.querySelector('.doodle__camera');
  let bubbleTimer, idleTimer, asleep = false;

  // falls asleep once you scroll past the home screen, wakes up when you come back
  const sleepCheck = () => {
    const shouldSleep = scrollY > hero.offsetHeight * 0.3;
    if (shouldSleep === asleep) return;
    asleep = shouldSleep;
    doodle.classList.toggle('is-asleep', asleep);
    if (asleep) {
      bubble.classList.remove('is-on');
      clearTimeout(idleTimer);
    } else {
      replay(doodle, 'is-waking');
      setTimeout(() => doodle.classList.remove('is-waking'), 1000);
      setTimeout(() => say('Oh! Welcome back 👋', 2400), 350);
    }
  };
  addEventListener('scroll', sleepCheck, { passive: true });

  const say = (text, ms = 2600) => {
    if (asleep) return;
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('is-on'), ms);
    nudgeLater();
  };
  const nudgeLater = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!asleep && !document.hidden) say('Psst… tap my camera 📸', 3200); }, 12000);
  };
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  sleepCheck(); // already scrolled down on load (e.g. after a refresh) → start asleep

  // camera: flash, "say cheese", and print a polaroid of a real photo from the gallery
  const photos = [...document.querySelectorAll('.plate img')].map((img) => ({ src: img.currentSrc || img.src, alt: img.alt }));
  const snaps = [];
  // shuffle-bag: every photo appears once before any repeats, and never twice in a row
  let bag = [], lastShown = null;
  const nextPhoto = () => {
    if (!bag.length) {
      bag = photos.slice();
      for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === lastShown) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    lastShown = bag.pop();
    return lastShown;
  };
  const printPhoto = () => {
    if (!photos.length) return;
    const pick = nextPhoto();
    const r = camera.getBoundingClientRect();
    const el = document.createElement('figure');
    el.className = 'snap';
    el.innerHTML = `<img src="${pick.src}" alt="${pick.alt}"><span>Pixel with Praneeth</span>`;
    el.style.left = `${r.left + r.width / 2 - 75}px`;
    el.style.top = `${r.top}px`;
    document.body.appendChild(el);
    const dx = -(160 + Math.random() * Math.min(innerWidth * 0.35, 420));
    const dy = -(80 + Math.random() * 180);
    const rot = -25 + Math.random() * 50;
    el.animate(
      [{ transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 0 },
       { transform: `translate(${dx * 0.6}px, ${dy - 60}px) scale(1.05) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.55 },
       { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${rot}deg)`, opacity: 1 }],
      { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    el.addEventListener('click', () => {
      if (lenis) lenis.scrollTo('#essay', { offset: -70 }); else document.getElementById('essay').scrollIntoView({ behavior: 'smooth' });
    });
    snaps.push(el);
    if (snaps.length > 4) { const old = snaps.shift(); old.classList.add('is-gone'); setTimeout(() => old.remove(), 600); }
    setTimeout(() => { el.classList.add('is-gone'); setTimeout(() => { el.remove(); const i = snaps.indexOf(el); if (i > -1) snaps.splice(i, 1); }, 600); }, 6000);
  };
  const flash = (print) => {
    replay(doodle, 'is-flash');
    if (print) { say('Say cheese! 📸'); setTimeout(printPhoto, 250); }
  };
  camera.addEventListener('click', (e) => { e.stopPropagation(); flash(true); });
  camera.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flash(true); } });
  afterLoader(() => {
    setTimeout(() => flash(false), 1400);
    setInterval(() => { if (!document.hidden && !asleep) flash(false); }, 7000);
    nudgeLater();
  });

  // hair boings, face and doodles talk
  const hair = doodle.querySelector('.doodle__hair');
  hair.addEventListener('click', (e) => { e.stopPropagation(); replay(hair, 'is-boing'); say(hair.dataset.say); });
  doodle.querySelector('.doodle__face').addEventListener('click', (e) => { e.stopPropagation(); say(e.target.dataset.say); });

  // hover: say hi and smile wider
  doodle.addEventListener('pointerenter', () => { doodle.classList.add('is-hover'); if (!bubble.classList.contains('is-on')) say("Hi, I'm Praneeth 👋", 2000); });
  doodle.addEventListener('pointerleave', () => doodle.classList.remove('is-hover'));

  // head turns and pupils follow the cursor
  hero.addEventListener('pointermove', (e) => {
    const r = doodle.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5;
    const dx = (e.clientX - cx) / innerWidth, dy = (e.clientY - cy) / innerHeight;
    head.style.setProperty('--turn', `${Math.max(-8, Math.min(8, dx * 16))}deg`);
    head.style.setProperty('--look-x', `${Math.max(-8, Math.min(8, dx * 20))}px`);
    head.style.setProperty('--look-y', `${Math.max(-5, Math.min(5, dy * 12))}px`);
    const a = Math.atan2(e.clientY - cy, e.clientX - cx);
    const d = Math.min(1, Math.hypot(e.clientX - cx, e.clientY - cy) / 250);
    pupils.style.setProperty('--px', `${Math.cos(a) * 4 * d}px`);
    pupils.style.setProperty('--py', `${Math.sin(a) * 4 * d}px`);
  });
  hero.addEventListener('pointerleave', () => {
    ['--turn', '--look-x', '--look-y'].forEach((v) => head.style.removeProperty(v));
    pupils.style.removeProperty('--px'); pupils.style.removeProperty('--py');
  });

  // floating doodles: drag them around; a click (no drag) spins it and says a fact
  doodle.querySelectorAll('.bit').forEach((bit) => {
    let startX, startY, baseX = 0, baseY = 0, moved = false;
    bit.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      bit.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY; moved = false;
      bit.classList.add('is-dragging');
    });
    bit.addEventListener('pointermove', (e) => {
      if (!bit.classList.contains('is-dragging')) return;
      const k = 500 / svg.getBoundingClientRect().width;   // screen px → drawing units
      const x = baseX + (e.clientX - startX) * k, y = baseY + (e.clientY - startY) * k;
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 4) moved = true;
      bit.style.translate = `${x}px ${y}px`;
    });
    bit.addEventListener('pointerup', (e) => {
      bit.classList.remove('is-dragging');
      const k = 500 / svg.getBoundingClientRect().width;
      baseX += (e.clientX - startX) * k; baseY += (e.clientY - startY) * k;
      if (!moved) { replay(bit, 'is-spin'); say(bit.dataset.say); }
    });
  });

  // ───────── text scramble on hover ─────────
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/';
  const scramble = (el) => {
    if (el.dataset.busy) return;
    const text = el.dataset.text || (el.dataset.text = el.textContent);
    el.dataset.busy = '1';
    let f = 0;
    const step = () => {
      el.textContent = [...text].map((c, i) => (c === ' ' || i < f / 2 ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      if (++f <= text.length * 2) requestAnimationFrame(step);
      else { el.textContent = text; delete el.dataset.busy; }
    };
    step();
  };
  document.querySelectorAll('.topbar__links a, .contents span, .button').forEach((el) => el.addEventListener('pointerenter', () => scramble(el)));

  // ───────── logo rails (built from the toolbox logos) ─────────
  const rail = document.getElementById('logoRail');
  const rows = [...rail.querySelectorAll('.logo-rail__row')];
  const tools = [...document.querySelectorAll('.tool')];
  const chip = (tool) => {
    const c = document.createElement('span');
    c.className = 'logo-chip';
    tool.querySelectorAll('.logo').forEach((svg) => c.appendChild(svg.cloneNode(true)));
    c.appendChild(document.createTextNode(tool.querySelector('.tool__name').textContent));
    return c;
  };
  const half = Math.ceil(tools.length / 2);
  [tools.slice(0, half), tools.slice(half)].forEach((set, r) => {
    for (let copy = 0; copy < 4; copy++) set.forEach((t) => rows[r].appendChild(chip(t)));
  });
  const railX = [0, 0];

  // ───────── GSAP scroll scenes ─────────
  if (!hasGsap) return;
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  // statement: words light up as it scrolls through
  const stmt = document.getElementById('statement');
  const words = [];
  stmt.innerHTML = stmt.textContent.split(/\s+/).map((w) => `<span class="sw">${w.replace(/&/g, '&amp;')}</span>`).join(' ');
  stmt.querySelectorAll('.sw').forEach((w) => words.push(w));
  ScrollTrigger.create({
    trigger: stmt, start: 'top 82%', end: 'bottom 40%', scrub: true,
    onUpdate: (self) => {
      const p = self.progress * (words.length + 2);
      words.forEach((w, i) => { w.style.opacity = Math.min(1, Math.max(0.14, p - i)); });
    },
  });

  // experience: while scrolling, cards stack like a deck; at the end the deck spreads
  // back out into the full list so every card stays visible afterwards (tablet/desktop)
  const stack = document.querySelector('.stack');
  const cards = [...stack.querySelectorAll('.stack__card')];
  gsap.matchMedia().add('(min-width: 761px)', () => {
    const top = (c) => c.offsetTop - cards[0].offsetTop;          // natural position in the list
    const stacked = (c, i) => -top(c) + i * 24;                    // position when stacked on card 1
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stack, start: 'top 90px', end: () => '+=' + innerHeight * (cards.length * 0.75),
        pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1,
      },
    });
    cards.forEach((card, i) => {
      if (i === 0) return;
      tl.fromTo(card, { y: () => stacked(card, i) + innerHeight }, { y: () => stacked(card, i), ease: 'power2.out', duration: 1 }, i - 1);
      tl.to(cards.slice(0, i), { scale: (k) => 1 - (i - k) * 0.035, transformOrigin: '50% 0%', ease: 'none', duration: 1 }, i - 1);
    });
    tl.to(cards, { y: 0, scale: 1, ease: 'power2.inOut', duration: 1.4, stagger: 0.08 }, '+=0.35');
    return () => gsap.set(cards, { clearProps: 'transform' });
  });

  // case files: pinned, slide sideways while scrolling down (desktop only)
  const cases = document.getElementById('cases');
  const track = document.getElementById('casesTrack');
  const progress = document.createElement('div');
  progress.className = 'cases-progress';
  progress.innerHTML = '<span id="casesCount">01 / 04</span><span class="cases-progress__bar"><span></span></span><span>Scroll →</span>';
  track.after(progress);
  const fill = progress.querySelector('.cases-progress__bar span');
  const counter = progress.querySelector('#casesCount');
  const total = track.children.length;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    root.classList.add('fx-pin');
    // how far the track must travel so the last card ends fully in view
    const distance = () => {
      const left = cases.getBoundingClientRect().left + parseFloat(getComputedStyle(cases).paddingLeft);
      return Math.max(0, track.scrollWidth - (innerWidth - left) + 48);
    };
    const tween = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: cases, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => {
          fill.style.transform = `scaleX(${self.progress})`;
          counter.textContent = `${String(Math.min(total, Math.floor(self.progress * total) + 1)).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
        },
      },
    });
    ScrollTrigger.refresh();
    return () => { tween.kill(); root.classList.remove('fx-pin'); gsap.set(track, { clearProps: 'transform' }); };
  });

  // photo essay: plates float at different speeds
  const speeds = [-4, 3, -5, 4, -3, 4];
  document.querySelectorAll('.plate').forEach((plate, i) => {
    gsap.fromTo(plate, { yPercent: speeds[i % speeds.length] }, {
      yPercent: -speeds[i % speeds.length], ease: 'none',
      scrollTrigger: { trigger: plate, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // contact: giant outlined line slides across
  gsap.fromTo('#bigline', { xPercent: 0 }, {
    xPercent: -38, ease: 'none',
    scrollTrigger: { trigger: '#bigline', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  // logo rails stream in opposite directions, faster with scroll speed
  gsap.ticker.add(() => {
    const v = lenis ? Math.abs(lenis.velocity || 0) : 0;
    const speed = 0.5 + Math.min(v * 0.25, 10);
    rows.forEach((row, r) => {
      const loop = row.scrollWidth / 4;
      railX[r] += r === 0 ? -speed : speed;
      if (railX[r] <= -loop) railX[r] += loop;
      if (railX[r] >= 0) railX[r] -= loop;
      row.style.transform = `translate3d(${railX[r]}px, 0, 0)`;
    });
  });

  afterLoader(() => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
