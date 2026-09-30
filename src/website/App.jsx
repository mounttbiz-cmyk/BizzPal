"use client";

/* ============================================================================
   BIZZPAL — INTELLIGENCE IN MOTION
   Dynamic Website connected to Super Admin Control Plane
   ========================================================================== */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import './styles.css';
import { useSmoothScroll, useAnchors, useReveals } from './scroll/useScroll';
import { Preloader, Cursor, Nav, Progress, Atmosphere } from './components/Chrome';
import { useWebsiteConfig } from './hooks/useWebsiteConfig';
import {
  AnnouncementBanner,
  Hero, SceneAwakening, SceneConnection, SceneIntelligence, SceneBizzPal,
  About, SceneExpansion, Solutions, Stats, SceneHuman, Vision, SceneFuture,
  Contact, Footer
} from './components/Sections';

/* The WebGL bundle is heavy — split it out so the readable page paints first. */
const Experience = lazy(() => import('./three/Experience'));

function detect () {
  if (typeof window === 'undefined') return { webgl: false, reduced: false, low: false };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let webgl = false;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webgl = false; }
  return { webgl: webgl && !reduced, reduced, low: window.innerWidth < 820 };
}

export default function App () {
  const [env] = useState(detect);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { config } = useWebsiteConfig();

  const lenis = useSmoothScroll({ webgl: env.webgl });
  useAnchors(lenis, useCallback(() => setMenuOpen(false), []));
  useReveals();

  useEffect(() => {
    const root = document.documentElement;
    if (!env.webgl) root.classList.add('no-webgl');
    if (env.reduced) root.classList.add('reduced');
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    document.fonts?.ready.then(() => setTimeout(finish, 400)).catch(finish);
    const safety = setTimeout(finish, 3200);
    return () => clearTimeout(safety);
  }, [env]);

  useEffect(() => {
    if (menuOpen) lenis.current?.stop(); else lenis.current?.start();
  }, [menuOpen, lenis]);

  const sec = config.sections || {};

  return (
    <>
      <AnnouncementBanner data={config.announcement} />
      <Atmosphere />
      {env.webgl && (
        <Suspense fallback={null}>
          <Experience quality={env.low ? 'low' : 'high'} />
        </Suspense>
      )}
      <Cursor />
      <Progress />
      <Preloader done={ready} logoUrl={config.nav?.logoUrl} />

      <a href="#hero" className="btn skip">
        <span>Skip to content</span>
      </a>

      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} data={config.nav} />

      <main>
        {sec.hero?.enabled !== false && <Hero ready={ready} data={config.hero} />}
        {sec.sceneAwakening?.enabled !== false && <SceneAwakening data={config.scenes?.s01} />}
        {sec.sceneConnection?.enabled !== false && <SceneConnection data={config.scenes?.s02} />}
        {sec.sceneIntelligence?.enabled !== false && <SceneIntelligence data={config.scenes?.s03} />}
        {sec.sceneBizzPal?.enabled !== false && <SceneBizzPal data={config.scenes?.s04} />}
        {sec.about?.enabled !== false && <About data={config.about} />}
        {sec.sceneExpansion?.enabled !== false && <SceneExpansion data={config.scenes?.s05} />}
        {sec.solutions?.enabled !== false && <Solutions data={config.solutions} />}
        {sec.stats?.enabled !== false && <Stats data={config.stats} />}
        {sec.sceneHuman?.enabled !== false && <SceneHuman data={config.scenes?.s06} />}
        {sec.vision?.enabled !== false && <Vision data={config.vision} />}
        {sec.sceneFuture?.enabled !== false && <SceneFuture data={config.scenes?.s07} />}
        {sec.contact?.enabled !== false && <Contact data={config.contact} />}
        {sec.footer?.enabled !== false && <Footer data={config.footer} />}
      </main>
    </>
  );
}
