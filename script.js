(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // dateline + footer year
  document.getElementById('year').textContent = new Date().getFullYear();
  // today's date from the visitor's clock; rolls over at midnight if the tab stays open
  const todayEl = document.getElementById('today');
  const setToday = () => {
    const now = new Date();
    todayEl.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · Hyderabad, India';
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(setToday, nextMidnight - now + 1000);
  };
  setToday();

  // day / night edition (remembered in this browser)
  const editionBtn = document.getElementById('editionToggle');
  const editionLabel = editionBtn.querySelector('.edition__label');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const applyEdition = (e) => {
    root.setAttribute('data-edition', e);
    editionLabel.textContent = e === 'night' ? 'Night edition' : 'Day edition';
    editionBtn.setAttribute('aria-label', e === 'night' ? 'Switch to day edition' : 'Switch to night edition');
    if (themeMeta) themeMeta.setAttribute('content', e === 'night' ? '#0b0b0c' : '#ffffff');
  };
  applyEdition(root.getAttribute('data-edition') === 'night' ? 'night' : 'day');
  editionBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-edition') === 'night' ? 'day' : 'night';
    const go = () => {
      applyEdition(next);
      try { localStorage.setItem('edition', next); } catch (err) { /* storage blocked: still switches for this visit */ }
    };
    if (!document.startViewTransition || reduced) { go(); return; }
    // the new edition spreads out as a circle from the switch
    const r = editionBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(go).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.2,.7,.1,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  // mobile menu
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

  // reading progress
  const bar = document.getElementById('progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // highlight the current section in the top bar
  const links = [...document.querySelectorAll('.topbar__links a')];
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ['profile', 'work', 'cases', 'toolbox', 'essay', 'contact'].forEach((id) => sectionObs.observe(document.getElementById(id)));

  // lead photo: autofocus hunts, locks, shutter fires, then a slow pan.
  // Repeats on its own every 9 seconds, but only while the photo is on screen and the tab is visible.
  const shoot = document.getElementById('shoot');
  let shooting = false, onScreen = false, repeat = 0;
  const takeShot = () => {
    if (shooting) return;
    shooting = true;
    shoot.classList.remove('is-focusing', 'is-locked', 'is-shot');
    void shoot.offsetWidth; // restart the CSS animations
    shoot.classList.add('is-focusing');
    setTimeout(() => shoot.classList.add('is-locked'), 1150);
    setTimeout(() => { shoot.classList.add('is-shot'); shooting = false; }, 1600);
  };
  const schedule = () => {
    clearInterval(repeat);
    if (onScreen && !document.hidden) repeat = setInterval(takeShot, 9000);
  };
  if (reduced) {
    shoot.classList.add('is-locked');
  } else {
    setTimeout(takeShot, 500);
    new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; schedule(); }, { threshold: 0.4 }).observe(shoot);
    document.addEventListener('visibilitychange', schedule);
  }

  // photos develop and blocks rise into place as they scroll into view
  const develop = [...document.querySelectorAll('.develop')];
  const rise = [...document.querySelectorAll('.profile__text, .job-feature, .brief, .record, .case, .ad, .contact__list')];
  if (reduced) {
    develop.forEach((el) => el.classList.add('is-developed'));
  } else {
    rise.forEach((el) => el.classList.add('rise'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('develop') ? 'is-developed' : 'is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.18 });
    develop.concat(rise).forEach((el) => io.observe(el));
  }

  // "At a glance" numbers count up
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = end + suffix; return; }
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / 1200, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    obs.observe(el);
  });

  // copy email button in the contact section
  const copyBtn = document.getElementById('copyEmail');
  copyBtn.addEventListener('click', async () => {
    const text = copyBtn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // older browsers / file:// pages: fall back to a temporary text field
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    copyBtn.textContent = 'Copied ✓';
    copyBtn.classList.add('is-done');
    setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('is-done'); }, 2000);
  });

  // photo viewer for the essay plates
  const plates = [...document.querySelectorAll('.plate')];
  const viewer = document.getElementById('viewer');
  const vImg = viewer.querySelector('img');
  const vCap = viewer.querySelector('figcaption');
  let current = 0;
  const show = (i) => {
    current = (i + plates.length) % plates.length;
    const img = plates[current].querySelector('img');
    vImg.src = img.src;
    vImg.alt = img.alt;
    vCap.innerHTML = plates[current].querySelector('figcaption').innerHTML;
  };
  const open = (i) => {
    show(i);
    viewer.classList.add('is-open');
    viewer.inert = false;
    document.body.style.overflow = 'hidden';
    viewer.querySelector('.viewer__close').focus();
  };
  const close = () => {
    viewer.classList.remove('is-open');
    viewer.inert = true;
    document.body.style.overflow = '';
    plates[current].focus();
  };
  plates.forEach((p, i) => {
    p.tabIndex = 0;
    p.setAttribute('role', 'button');
    p.setAttribute('aria-label', 'Open photo: ' + p.querySelector('img').alt);
    p.addEventListener('click', () => open(i));
    p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });
  viewer.querySelector('.viewer__close').addEventListener('click', close);
  viewer.querySelector('.viewer__nav--prev').addEventListener('click', () => show(current - 1));
  viewer.querySelector('.viewer__nav--next').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });
  addEventListener('keydown', (e) => {
    if (!viewer.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
})();
