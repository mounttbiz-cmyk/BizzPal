/* ============================================================================
   SECTIONS — Dynamic & Configurable Content Presentation.
   Allows Super Admin to edit every headline, button, link, and scene text.
   ========================================================================== */
import { useState, useEffect, useRef } from 'react';
import { MagneticButton } from './Chrome';
import { applyFX, resetFX } from '../lib/engine';
import { DASHBOARD_URL } from '../config';

export const DEFAULT_CONTACT = {
  email: 'hello@bizzpal.in',
  site: 'bizzpal.in',
  linkedin: 'https://linkedin.com/company/bizzpal',
  twitter: 'https://twitter.com/bizzpal'
};

const IS_TOUCH = () => typeof window !== 'undefined' && window.matchMedia('(hover:none), (pointer:coarse)').matches;

/* ------------------------------------------------------------------- announcement banner */
export function AnnouncementBanner({ data }) {
  if (!data?.enabled) return null;
  return (
    <aside className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-center gap-3 shadow-lg" style={{ zIndex: 100 }}>
      <span>{data.text}</span>
      {data.linkText && (
        <a
          href={data.linkUrl || '#'}
          className="underline decoration-white/60 underline-offset-2 hover:text-cyan-200 transition-colors"
        >
          {data.linkText} →
        </a>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------- hero */
export function Hero({ ready, data }) {
  const eyebrow = data?.eyebrow || 'Artificial Intelligence · For Business';
  const subtitle = data?.subtitle || 'Your Business. Powered by Intelligence.';
  const primaryCtaText = data?.primaryCtaText || 'Explore BizzPal';
  const primaryCtaHref = data?.primaryCtaHref || '#s01';
  const secondaryCtaText = data?.secondaryCtaText || 'Discover Our Intelligence';
  const secondaryCtaHref = data?.secondaryCtaHref || '#s03';

  return (
    <section id="hero" className="story" aria-label="BizzPal — Your AI Business Partner">
      <div className="pin">
        <div className="wrap hero__inner">
          <p className={'eyebrow eyebrow--both rv' + (ready ? ' in' : '')} data-d="1">{eyebrow}</p>

          <h1 className={'hero__mark' + (ready ? ' in' : '')} aria-label="BizzPal™">
            <span className="ch ch--s" aria-hidden="true" style={{ transitionDelay: '0.30s' }}>B</span>
            <span className="ch ch--s" aria-hidden="true" style={{ transitionDelay: '0.355s' }}>i</span>
            <span className="ch ch--s" aria-hidden="true" style={{ transitionDelay: '0.41s' }}>z</span>
            <span className="ch ch--s" aria-hidden="true" style={{ transitionDelay: '0.465s' }}>z</span>
            <span className="ch ch--g" aria-hidden="true" style={{ transitionDelay: '0.52s' }}>P</span>
            <span className="ch ch--g" aria-hidden="true" style={{ transitionDelay: '0.575s' }}>a</span>
            <span className="ch ch--g" aria-hidden="true" style={{ transitionDelay: '0.63s' }}>l</span>
            <span className="ch ch--tm" aria-hidden="true" style={{ transitionDelay: '0.685s' }}>&trade;</span>
          </h1>

          <p className={'hero__sub rv' + (ready ? ' in' : '')} data-d="4">
            Your Business. <em>Powered by Intelligence.</em>
          </p>

          <div className={'hero__cta rv' + (ready ? ' in' : '')} data-d="5">
            <MagneticButton className="btn--solid btn--lg" href={primaryCtaHref}>
              <span>{primaryCtaText}</span><span className="btn__ar" aria-hidden="true">→</span>
            </MagneticButton>
            <MagneticButton className="btn--lg" href={secondaryCtaHref}>
              <span>{secondaryCtaText}</span>
            </MagneticButton>
          </div>
        </div>

        <div className="scroll-ind" aria-hidden="true">
          <span>Scroll to enter</span><span className="scroll-ind__line" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ cinematic captions */
function Beat({ id, height, label, align = 'center', modifier = '', children }) {
  const beatClass = ['beat', align === 'center' ? 'beat--c' : '', modifier, 'fade'].filter(Boolean).join(' ');
  const style = align === 'right' ? { marginLeft: 'auto', textAlign: 'right' } : undefined;
  return (
    <section id={id} className="story" style={{ height }} aria-label={label}>
      <div className="pin">
        <div className="wrap">
          <div className={beatClass} data-fade style={style}>{children}</div>
        </div>
      </div>
    </section>
  );
}

export const SceneAwakening = ({ data }) => (
  <Beat id="s01" height="170svh" label="Awakening">
    <p className="eyebrow" style={{ justifyContent: 'center' }}>
      {data?.eyebrow || 'Scene 01 — Awakening'}
    </p>
    <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>
      {data?.headline || 'Every breakthrough\nbegins with a signal.'}
    </h2>
  </Beat>
);

export const SceneConnection = ({ data }) => (
  <Beat id="s02" height="190svh" label="Connection" align="left">
    <p className="eyebrow">
      {data?.eyebrow || 'Scene 02 — Connection'}
    </p>
    <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>
      {data?.headline || 'We connect data,\nintelligence and\npossibility.'}
    </h2>
  </Beat>
);

const FLOATERS = [
  ['Signal', '1,204', 'pathways active', 0.10],
  ['Inference', '0.8ms', 'mean latency', 0.14],
  ['Structure', null, 'self-organising graph', 0.12],
  ['Context', null, 'continuously learning', 0.16]
];

export const SceneIntelligence = ({ data }) => (
  <section id="s03" className="story" style={{ height: '205svh' }} aria-label="Intelligence">
    <div className="pin">
      <div className="floaters" aria-hidden="true">
        {FLOATERS.map(([title, val, tail, off]) => (
          <div className="floater fade" key={title} data-fade data-fade-off={off}>
            <b>{title}</b>{val && <i>{val}</i>}{val ? ' ' : ''}{tail}
          </div>
        ))}
      </div>
      <div className="wrap">
        <div className="beat beat--c fade" data-fade>
          <p className="eyebrow" style={{ justifyContent: 'center' }}>
            {data?.eyebrow || 'Scene 03 — Intelligence'}
          </p>
          <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>
            {data?.headline || 'Turning complexity\ninto intelligence.'}
          </h2>
        </div>
      </div>
    </div>
  </section>
);

export const SceneBizzPal = ({ data }) => (
  <Beat id="s04" height="175svh" label="This is BizzPal" modifier="beat--n">
    <h2 className="h-xl" style={{ fontWeight: 500 }}>
      {data?.headline || 'This is BizzPal.'}
    </h2>
    <p className="lead" style={{ margin: '26px auto 0', textAlign: 'center' }}>
      {data?.lead || 'Building intelligent systems for a rapidly evolving world.'}
    </p>
  </Beat>
);

export const SceneExpansion = ({ data }) => (
  <Beat id="s05" height="160svh" label="Expansion">
    <p className="eyebrow" style={{ justifyContent: 'center' }}>
      {data?.eyebrow || 'Scene 05 — Expansion'}
    </p>
    <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>
      {data?.headline || 'One intelligence.\nInfinite possibilities.'}
    </h2>
  </Beat>
);

export const SceneHuman = ({ data }) => (
  <Beat id="s06" height="190svh" label="Human and AI" align="right">
    <p className="eyebrow" style={{ justifyContent: 'flex-end' }}>
      {data?.eyebrow || 'Scene 06 — Human + AI'}
    </p>
    <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>
      {data?.headline || 'AI doesn’t replace\npossibility.\nIt expands it.'}
    </h2>
    <p className="lead" style={{ margin: '26px 0 0 auto' }}>
      {data?.lead || 'Technology should amplify human potential — not stand in for it.'}
    </p>
  </Beat>
);

export const SceneFuture = ({ data }) => {
  const eyebrow = data?.eyebrow || 'Scene 07 — Future';
  const headline = data?.headline || 'The future isn’t coming.\nWe’re engineering it.';
  const ctaText = data?.ctaText || 'Build the Future with BizzPal';
  const ctaHref = data?.ctaHref || DASHBOARD_URL;

  return (
    <section id="s07" className="story" style={{ height: '180svh' }} aria-label="The future">
      <div className="pin">
        <div className="wrap">
          <div className="beat beat--c fade" data-fade>
            <p className="eyebrow" style={{ justifyContent: 'center' }}>{eyebrow}</p>
            <h2 className="h-xl" style={{ whiteSpace: 'pre-line' }}>{headline}</h2>
            <div className="hero__cta" style={{ marginTop: 40 }}>
              <MagneticButton className="btn--solid btn--lg" href={ctaHref}>
                <span>{ctaText}</span><span className="btn__ar" aria-hidden="true">→</span>
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ about */
const DEFAULT_APPROACH = [
  { label: 'Understand the problem', num: '01' },
  { label: 'Model the intelligence', num: '02' },
  { label: 'Engineer the system', num: '03' },
  { label: 'Scale what works', num: '04' }
];

export const About = ({ data }) => {
  const eyebrow = data?.eyebrow || 'About BizzPal';
  const headline = data?.headline || 'We build intelligence that moves the world forward.';
  const p1 = data?.p1 || 'BizzPal uses artificial intelligence to automate tasks, analyse data, and help businesses make smarter, faster decisions for growth.';
  const p2 = data?.p2 || 'We work at the point where information becomes understanding — designing systems that read complexity, find the signal inside it, and turn that signal into a decision a business can act on today.';
  const rawApproach = data?.approach || DEFAULT_APPROACH;
  const approach = rawApproach.map((item, idx) =>
    Array.isArray(item) ? { label: item[0], num: item[1] } : { label: item.label, num: item.num || `0${idx+1}` }
  );

  return (
    <section id="about" aria-labelledby="about-h">
      <div className="wrap">
        <p className="eyebrow rv">{eyebrow}</p>
        <h2 className="h-xl rv" id="about-h">{headline}</h2>
        <div className="rule rv" />
        <div className="about__grid">
          <div className="about__cols">
            <p className="lead rv" data-d="1">{p1}</p>
            <p className="lead rv" data-d="2">{p2}</p>
          </div>
          <div className="rv" data-d="3">
            <p className="small" style={{ letterSpacing: '.24em', textTransform: 'uppercase', fontSize: 10.5, color: 'var(--ink-faint)' }}>
              Our approach
            </p>
            <div className="clist" style={{ marginTop: 20 }}>
              {approach.map(({ label, num }) => (
                <div className="crow" key={num}><span className="crow__v">{label}</span><span className="crow__k">{num}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- solutions */
const GLYPHS = {
  ai: <><circle cx="50" cy="50" r="8" /><circle cx="20" cy="24" r="4" /><circle cx="82" cy="30" r="4" /><circle cx="26" cy="78" r="4" /><circle cx="76" cy="76" r="4" /><path d="M50 50 20 24M50 50 82 30M50 50 26 78M50 50 76 76M20 24 82 30M26 78 76 76" /></>,
  auto: <><rect x="14" y="14" width="26" height="26" rx="4" /><rect x="60" y="14" width="26" height="26" rx="4" /><rect x="14" y="60" width="26" height="26" rx="4" /><rect x="60" y="60" width="26" height="26" rx="4" /><path d="M40 27h20M27 40v20M73 40v20M40 73h20" /></>,
  data: <><path d="M12 78 34 52l18 14 22-38" /><path d="M12 88h76" /><circle cx="34" cy="52" r="3.5" /><circle cx="52" cy="66" r="3.5" /><circle cx="74" cy="28" r="3.5" /></>,
  digital: <><rect x="12" y="20" width="76" height="52" rx="6" /><path d="M12 36h76M34 84h32" /><circle cx="24" cy="28" r="2.5" /><circle cx="34" cy="28" r="2.5" /></>,
  custom: <><path d="M50 10 86 30v40L50 90 14 70V30z" /><path d="M50 32 68 42v20L50 72 32 62V42z" /><circle cx="50" cy="52" r="5" /></>
};

const DEFAULT_CARDS = [
  { id: 'c1', num: '01', fx: 'ai', title: 'AI & Machine Intelligence', desc: 'Systems that transform complex information into actionable intelligence.' },
  { id: 'c2', num: '02', fx: 'auto', title: 'Intelligent Automation', desc: 'Smarter workflows designed to reduce friction and increase scale.' },
  { id: 'c3', num: '03', fx: 'data', title: 'Data & Analytics', desc: 'Turning data into clarity, prediction and strategic advantage.' },
  { id: 'c4', num: '04', fx: 'digital', title: 'Digital Intelligence', desc: 'Building intelligent digital experiences for modern organisations.' },
  { id: 'c5', num: '05', fx: 'custom', title: 'Custom AI Systems', desc: 'Purpose-built intelligence designed around specific business challenges.' }
];

function Card({ n, fx = 'ai', title, desc, delay }) {
  const onMove = e => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty('--mx', x + 'px');
    el.style.setProperty('--my', y + 'px');
    if (IS_TOUCH()) return;
    el.style.transform = `perspective(1000px) rotateX(${(0.5 - y / r.height) * 9}deg) rotateY(${(x / r.width - 0.5) * 11}deg) translateY(-4px)`;
  };
  const leave = e => { e.currentTarget.style.transform = ''; resetFX(); };
  return (
    <article
      className="card rv" data-d={delay} tabIndex={0}
      onPointerMove={onMove}
      onPointerEnter={() => applyFX(fx)}
      onFocus={() => applyFX(fx)}
      onPointerLeave={leave}
      onBlur={resetFX}
    >
      <div className="card__n">{n}</div>
      <div className="card__b">
        <h3 className="card__t">{title}</h3>
        <p className="card__d">{desc}</p>
      </div>
      <svg className="card__glyph" viewBox="0 0 100 100" aria-hidden="true">{GLYPHS[fx] || GLYPHS.ai}</svg>
    </article>
  );
}

export const Solutions = ({ data }) => {
  const eyebrow = data?.eyebrow || 'Solutions';
  const headline = data?.headline || 'Capabilities, engineered.';
  const subtitle = data?.subtitle || 'Each capability is a system, not a feature — built around the problem it is meant to solve.';
  const cards = data?.cards || DEFAULT_CARDS;

  return (
    <section id="solutions" aria-labelledby="sol-h">
      <div className="wrap">
        <div className="sol__head">
          <div>
            <p className="eyebrow rv">{eyebrow}</p>
            <h2 className="h-l rv" id="sol-h" data-d="1">{headline}</h2>
          </div>
          <p className="small rv" data-d="2" style={{ maxWidth: '34ch' }}>
            {subtitle}
          </p>
        </div>
        <div className="cards">
          {cards.map((card, i) => (
            <Card
              key={card.id || card.num || i}
              n={card.num || `0${i+1}`}
              fx={card.fx || 'ai'}
              title={card.title}
              desc={card.desc}
              delay={i + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ stats */
const DEFAULT_STATS = [
  { id: 's1', num: '01', label: 'Intelligence' },
  { id: 's2', num: '∞', label: 'Possibilities' },
  { id: 's3', num: '24/7', label: 'Designed to think' },
  { id: 's4', num: '01', label: 'Vision' }
];

export const Stats = ({ data }) => {
  const items = data?.items || DEFAULT_STATS;
  return (
    <section id="stats" aria-label="Impact">
      <div className="wrap">
        <div className="stats">
          {items.map((stat, i) => (
            <div className="rv" key={stat.id || stat.label || i} data-d={i || undefined}>
              <div className="stat__n">{stat.num}</div>
              <div className="stat__l">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ----------------------------------------------------------------- vision */
const DEFAULT_VISION_WORDS = ['Understand.', 'Predict.', 'Adapt.', 'Create.', 'Evolve.', 'BizzPal.'];

export const Vision = ({ data }) => {
  const words = data?.words || DEFAULT_VISION_WORDS;
  const label = data?.label || 'The next interface is intelligence';

  return (
    <section id="vision" className="story" style={{ height: '330svh' }} aria-labelledby="vision-h">
      <div className="pin">
        <div className="wrap" style={{ position: 'relative', height: '100%' }}>
          <p className="vision__label" id="vision-h">{label}</p>
          {words.map((w, i) => (
            <div
              key={`${w}-${i}`}
              className={`vision__word${i === words.length - 1 ? ' is-final' : ''}`}
              data-word
            >
              {w}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- contact */
export function Contact({ data }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState(data?.note || 'Opens your mail app — nothing is stored on this page.');
  const [alert, setAlert] = useState(false);

  const eyebrow = data?.eyebrow || 'Contact';
  const headline = data?.headline || 'Ready to build\nwhat’s next?';
  const ctaText = data?.ctaText || 'Start a Conversation';
  const contactInfo = {
    email: data?.email || DEFAULT_CONTACT.email,
    site: data?.site || DEFAULT_CONTACT.site,
    linkedin: data?.linkedin || DEFAULT_CONTACT.linkedin,
    twitter: data?.twitter || DEFAULT_CONTACT.twitter,
  };

  const submit = e => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNote('Please enter a valid email address.'); setAlert(true); return;
    }
    const to = contactInfo.email || 'hello@bizzpal.in';
    const subject = encodeURIComponent('Starting a conversation with BizzPal');
    const body = encodeURIComponent(`Hi BizzPal,\n\nI'd like to talk about a project.\n\nMy email: ${email.trim()}\n\n`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setNote('Opening your mail app…'); setAlert(false);
  };

  const social = (label, url) => url && !url.includes('placeholder')
    ? <a className="crow" key={label} href={url} target="_blank" rel="noopener"><span className="crow__v">{label}</span><span className="crow__k">Social</span></a>
    : <span className="crow" key={label}><span className="crow__v">{label} <span className="ph">ADD LINK</span></span><span className="crow__k">Social</span></span>;

  return (
    <section id="contact" aria-labelledby="contact-h">
      <div className="wrap">
        <div className="contact__grid">
          <div>
            <p className="eyebrow rv">{eyebrow}</p>
            <h2 className="h-xl rv" id="contact-h" data-d="1" style={{ whiteSpace: 'pre-line', color: '#FFFFFF' }}>{headline}</h2>
            <form className="field rv" data-d="2" onSubmit={submit} noValidate>
              <label htmlFor="email" style={{ position: 'absolute', left: -9999 }}>Your email address</label>
              <input
                id="email" type="email" name="email" placeholder="your@email.com"
                autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required
              />
              <button type="submit" aria-label={ctaText}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h13M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="small rv" data-d="3" style={{ marginTop: 14, fontSize: 12.5, color: alert ? '#f87171' : 'var(--ink-faint)' }}>
              {note}
            </p>
          </div>

          <div className="rv" data-d="2">
            <p className="small" style={{ letterSpacing: '.24em', textTransform: 'uppercase', fontSize: 10.5, color: 'var(--ink-faint)', marginBottom: 20 }}>
              Direct
            </p>
            <div className="clist">
              <a className="crow" href={`mailto:${contactInfo.email}`}><span className="crow__v">{contactInfo.email}</span><span className="crow__k">Email</span></a>
              <a className="crow" href={`https://${contactInfo.site}`} target="_blank" rel="noopener"><span className="crow__v">{contactInfo.site}</span><span className="crow__k">Website</span></a>
              {social('LinkedIn', contactInfo.linkedin)}
              {social('X / Twitter', contactInfo.twitter)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const Footer = () => {
  return (
    <footer>
      <div className="wrap foot">
        <span>© 2026 BizzPal</span>
        <span>
          <span className="wm wm--sm">
            <span className="wm__a">Bizz</span><span className="wm__b">Pal</span><span className="wm__tm">&trade;</span>
          </span>
          &nbsp;&mdash;&nbsp;Your AI Business Partner
        </span>
        <a href="#hero">Back to top ↑</a>
      </div>
    </footer>
  );
};
