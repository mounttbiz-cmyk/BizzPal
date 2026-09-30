/* ============================================================================
   CHROME — preloader, cursor, nav, menu, progress, grain
   ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { DASHBOARD_URL } from '../config';

const IS_TOUCH = () => typeof window !== 'undefined' && window.matchMedia('(hover:none), (pointer:coarse)').matches;

export function Preloader ({ done }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf, start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / 1400);
      setPct(Math.round((done ? 1 : t * 0.92) * 100));
      if (!done || t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [done]);

  return (
    <div className={'pre' + (done ? ' done' : '')} role="status" aria-live="polite">
      <svg className="pre__mark-svg" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="32" cy="28" rx="26" ry="12" transform="rotate(-26 32 28)" stroke="url(#preGoldGrad)" strokeWidth="2.4" />
        <ellipse cx="32" cy="28" rx="14" ry="14" stroke="url(#preGoldGrad)" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.65" />
        <circle cx="32" cy="28" r="5" fill="url(#preGoldGrad)" />
        <circle cx="51" cy="19" r="3.2" fill="#F0D98A" />
        <circle cx="13" cy="37" r="3" fill="#F0D98A" />
        <circle cx="16" cy="16" r="2.2" fill="#F0D98A" />
        <defs>
          <linearGradient id="preGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF9E9" />
            <stop offset="50%" stopColor="#D9B44A" />
            <stop offset="100%" stopColor="#A8823A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="wm">
        <span className="wm__a">Bizz</span>
        <span className="wm__b">Pal</span>
        <span className="wm__tm">&trade;</span>
      </div>
      <div className="pre__track"><span className="pre__fill" style={{ width: pct + '%' }} /></div>
      <div className="pre__pct">{String(pct).padStart(2, '0')}</div>
    </div>
  );
}

export function Cursor () {
  const ring = useRef(), dot = useRef(), glow = useRef();
  useEffect(() => {
    if (IS_TOUCH()) return;
    let mx = innerWidth / 2, my = innerHeight / 2;
    const p = [{ x: mx, y: my }, { x: mx, y: my }, { x: mx, y: my }];
    let running = false;
    let raf = 0;

    const els = [ring.current, dot.current, glow.current];
    const ease = [0.16, 0.55, 0.07];

    const loop = () => {
      let maxDist = 0;
      for (let i = 0; i < 3; i++) {
        const el = els[i];
        if (!el) continue;
        const dx = mx - p[i].x;
        const dy = my - p[i].y;
        p[i].x += dx * ease[i];
        p[i].y += dy * ease[i];
        el.style.transform = `translate3d(${p[i].x.toFixed(1)}px,${p[i].y.toFixed(1)}px,0)`;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist > maxDist) maxDist = dist;
      }
      if (maxDist > 0.15) {
        raf = requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const move = e => {
      mx = e.clientX;
      my = e.clientY;
      wake();
    };

    addEventListener('pointermove', move, { passive: true });
    wake();

    const onOver = e => {
      if (e.target && e.target.closest && e.target.closest('a, button, .card, input')) {
        document.body.classList.add('is-hover');
      }
    };
    const onOut = e => {
      if (!e.relatedTarget || (e.relatedTarget.closest && !e.relatedTarget.closest('a, button, .card, input'))) {
        document.body.classList.remove('is-hover');
      }
    };

    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
    };
  }, []);

  return (
    <>
      <div className="cur__glow" ref={glow} aria-hidden="true" />
      <div className="cur" ref={ring} aria-hidden="true"><div className="cur__ring" /></div>
      <div className="cur" ref={dot} aria-hidden="true"><div className="cur__dot" /></div>
    </>
  );
}

export function MagneticButton ({ as: Tag = 'a', className = '', children, ...rest }) {
  const ref = useRef();
  const onMove = e => {
    const el = ref.current; if (!el || IS_TOUCH()) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', x + 'px');
    el.style.setProperty('--my', y + 'px');
    el.style.transform = `translate(${(x / r.width - 0.5) * 12}px, ${(y / r.height - 0.5) * 8}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <Tag ref={ref} className={'btn ' + className} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
    </Tag>
  );
}

const DEFAULT_NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Intelligence', href: '#s03' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Vision', href: '#vision' },
  { label: 'Contact', href: '#contact' },
  { label: 'Pricing', href: '/subscription' }
];

export function Nav ({ menuOpen, setMenuOpen, data }) {
  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    const esc = e => { if (e.key === 'Escape') setMenuOpen(false); };
    addEventListener('keydown', esc);
    return () => removeEventListener('keydown', esc);
  }, [menuOpen, setMenuOpen]);

  const brand = data?.brand || 'BizzPal';
  const rawLinks = data?.links || DEFAULT_NAV_LINKS;
  const links = rawLinks.map(l => Array.isArray(l) ? { label: l[0], href: l[1] } : l);
  const ctaText = data?.ctaText || 'Start a Conversation';
  const ctaHref = data?.ctaHref || '#contact';

  return (
    <>
      <header className="nav">
        <a className="brand" href="#hero" aria-label="BizzPal home">
          <svg className="brand__logo-icon" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <ellipse cx="19" cy="17" rx="15" ry="7" transform="rotate(-26 19 17)" stroke="url(#goldLogoGrad)" strokeWidth="1.8" />
            <ellipse cx="19" cy="17" rx="8" ry="8" stroke="url(#goldLogoGrad)" strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.65" />
            <circle cx="19" cy="17" r="3" fill="url(#goldLogoGrad)" />
            <circle cx="30" cy="11.5" r="2.2" fill="#F0D98A" />
            <circle cx="8" cy="22.5" r="2" fill="#F0D98A" />
            <circle cx="10" cy="10" r="1.5" fill="#F0D98A" />
            <defs>
              <linearGradient id="goldLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF9E9" />
                <stop offset="50%" stopColor="#D9B44A" />
                <stop offset="100%" stopColor="#A8823A" />
              </linearGradient>
            </defs>
          </svg>
          <span className="wm">
            <span className="wm__a">Bizz</span>
            <span className="wm__b">Pal</span>
            <span className="wm__tm">&trade;</span>
          </span>
        </a>

        <nav className="nav__links" aria-label="Primary">
          {links.map(({ label, href }) => (
            <a key={href} className="nav__link" href={href}>{label}</a>
          ))}
        </nav>

        <div className="nav__right">
          <MagneticButton className="btn--nav" href={ctaHref}>
            <span>{ctaText}</span><span className="btn__ar" aria-hidden="true">→</span>
          </MagneticButton>
          <button
            className="burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="menu"
            onClick={() => setMenuOpen(v => !v)}
          ><i /><i /></button>
        </div>
      </header>

      <div className="menu" id="menu" aria-hidden={!menuOpen}>
        {links.map(({ label, href }) => <a key={href} href={href}>{label}</a>)}
        <a href={ctaHref} className="menu__cta">
          <span>{ctaText}</span> <span aria-hidden="true">→</span>
        </a>
        <div className="menu__meta">{brand} — Intelligence in Motion</div>
      </div>
    </>
  );
}

export const Progress = () => (
  <div className="prog" aria-hidden="true"><div className="prog__bar" /></div>
);

export const Atmosphere = () => (
  <>
    <div id="bg-fallback" aria-hidden="true" />
    <div className="vignette" aria-hidden="true" />
    <div className="grain" aria-hidden="true" />
  </>
);
