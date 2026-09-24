(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  // nav: background on scroll + active link
  const nav = document.getElementById('nav');
  const links = [...document.querySelectorAll('.nav__links a')];
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'work', 'projects', 'skills', 'gallery', 'contact'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObs.observe(el);
  });

  // typed terminal line
  const typed = document.getElementById('typed');
  const cmds = [
    'flutter build apk --release',
    'php artisan queue:work',
    'git push origin main',
    'flutter test',
    'git pull --rebase',
  ];
  if (reduced) {
    typed.textContent = cmds[0];
  } else {
    let ci = 0, i = 0, deleting = false;
    const tick = () => {
      const cmd = cmds[ci];
      i += deleting ? -1 : 1;
      typed.textContent = cmd.slice(0, i);
      let delay = deleting ? 28 : 55 + Math.random() * 60;
      if (!deleting && i === cmd.length) { deleting = true; delay = 1800; }
      else if (deleting && i === 0) { deleting = false; ci = (ci + 1) % cmds.length; delay = 400; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 1200);
  }

  // reveal on scroll
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => revealObs.observe(el));

  // count-up stats
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const end = +el.dataset.count;
      const suffix = el.dataset.suffix || '';
      countObs.unobserve(el);
      if (reduced) { el.textContent = end + suffix; return; }
      const t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((el) => countObs.observe(el));

  // gallery filters
  const figs = [...document.querySelectorAll('#masonry figure')];
  document.querySelectorAll('.filters button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filters button').forEach((b) => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.filter;
      figs.forEach((fig) => fig.classList.toggle('is-hidden', f !== 'all' && fig.dataset.cat !== f));
    });
  });

  // lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  let current = 0;
  const visible = () => figs.filter((f) => !f.classList.contains('is-hidden'));
  const show = (fig) => {
    const img = fig.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.innerHTML = fig.querySelector('figcaption').innerHTML;
  };
  const open = (fig) => {
    current = visible().indexOf(fig);
    show(fig);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lightbox__close').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  const move = (d) => {
    const v = visible();
    current = (current + d + v.length) % v.length;
    show(v[current]);
  };
  figs.forEach((fig) => {
    fig.tabIndex = 0;
    fig.addEventListener('click', () => open(fig));
    fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig); } });
  });
  lb.querySelector('.lightbox__close').addEventListener('click', close);
  lb.querySelector('.lightbox__nav--prev').addEventListener('click', () => move(-1));
  lb.querySelector('.lightbox__nav--next').addEventListener('click', () => move(1));
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });
})();
