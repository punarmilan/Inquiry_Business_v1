import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { ArrowDown, ArrowUpRight, BadgeCheck, MapPin, Pause, Play, ScanQrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { experienceCopy } from '../data/siteData';
import { heroPoses, POSE_SIZES, POSTER_POSE } from '../data/heroPoses';
import { PLAY_STORE_URL } from '../constants';
import { gsap, feedback } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSceneVisibility } from '../hooks/useSceneVisibility';
import type { NavigationHandler } from '../types';
import './AnimatedHero.css';

const POSE_INTERVAL = 3200;
// Deterministic spread of light motes, weighted towards the portrait side so the headline stays calm.
const MOTES = Array.from({ length: 18 }, (_, index) => {
  const random = (salt: number) => (Math.sin(index * 91.7 + salt * 17.3) + 1) / 2;
  return {
    '--x': (36 + random(1) * 60).toFixed(1) + '%',
    '--y': (20 + random(2) * 68).toFixed(1) + '%',
    '--s': (2 + random(3) * 3.5).toFixed(1) + 'px',
    '--d': (9 + random(4) * 8).toFixed(1) + 's',
    '--delay': (-random(5) * 14).toFixed(1) + 's',
    '--dx': ((random(6) - 0.5) * 60).toFixed(0) + 'px',
    '--rise': (120 + random(7) * 160).toFixed(0) + 'px',
  } as CSSProperties;
});

export default function AnimatedHero({ navigate }: { navigate: NavigationHandler }) {
  const root = useRef<HTMLElement>(null);
  const pointerFrame = useRef(0);
  const reduced = useReducedMotion();
  const { ref, active } = useSceneVisibility();
  const [paused, setPaused] = useState(false);
  const [pose, setPose] = useState(POSTER_POSE);
  const [posesReady, setPosesReady] = useState(false);
  const running = !reduced && active && !paused;
  const motionState = reduced ? 'reduced' : running ? 'running' : 'paused';
  const shownPose = heroPoses[reduced ? POSTER_POSE : pose];

  // Decode every pose after the page has loaded so each switch is instant, without delaying first paint.
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || connection?.saveData) return;
    let cancelled = false;
    const preload = () => {
      Promise.all(heroPoses.map(async ({ src, srcSet }) => {
        const image = new Image();
        image.sizes = POSE_SIZES;
        image.srcset = srcSet;
        image.src = src;
        await image.decode();
      })).then(() => { if (!cancelled) setPosesReady(true); }, () => {});
    };
    if (document.readyState === 'complete') preload();
    else window.addEventListener('load', preload, { once: true });
    return () => { cancelled = true; window.removeEventListener('load', preload); };
  }, [reduced]);

  useEffect(() => {
    if (!posesReady || !running) return;
    const timer = window.setTimeout(() => setPose(current => (current + 1) % heroPoses.length), POSE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [posesReady, running, pose]);

  useLayoutEffect(() => {
    if (reduced) return;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } })
        .from('.heroEnvironment', { scale: 1.05, duration: 2.4, ease: 'power2.out' }, 0)
        .from('.heroPose', { yPercent: 4, duration: 1.4, ease: 'power2.out' }, 0.1)
        .from('.heroHeadline > span', { yPercent: 35, opacity: 0, stagger: 0.12 }, 0.15)
        .from('.heroLead', { y: 16 }, 0.35)
        .from('.heroActions', { y: 12 }, 0.45);
      // Scroll hands over to the product story: the world falls behind while the copy lifts away.
      const scrollOut = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.heroEnvironment', { yPercent: 12, ease: 'none', scrollTrigger: scrollOut });
      gsap.to('.heroStage', { y: -70, ease: 'none', scrollTrigger: { ...scrollOut } });
    }, root);
    return () => context.revert();
  }, [reduced]);

  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);
  // Desktop pointer depth: layers read --px/--py through the CSS `translate` property, separate from their looping `transform`.
  const trackPointer = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = requestAnimationFrame(() => {
      const section = root.current;
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      section.style.setProperty('--px', ((clientX - bounds.left) / bounds.width - 0.5).toFixed(3));
      section.style.setProperty('--py', ((clientY - bounds.top) / bounds.height - 0.5).toFixed(3));
    });
  };
  const resetPointer = () => {
    cancelAnimationFrame(pointerFrame.current);
    root.current?.style.removeProperty('--px');
    root.current?.style.removeProperty('--py');
  };

  return <section ref={root} className={'cinematicHero' + (running ? ' isLive' : '') + (reduced ? ' isReduced' : '')} aria-labelledby="hero-title" onPointerMove={trackPointer} onPointerLeave={resetPointer}>
    <div ref={ref} className="heroEnvironment" data-motion={motionState} aria-hidden="true">
      <div className="heroBackdrop" />
      <div className="heroDrift" />
      <div className="heroBeams"><i /><i /><i /></div>
      <div className="heroGlow" />
      <div className="heroPortrait">
        <div className="heroPortraitBody"><img className="heroPose" src={shownPose.src} srcSet={shownPose.srcSet} sizes={POSE_SIZES} alt="" fetchPriority="high" decoding="async" draggable={false} /></div>
        <span className="heroSignal signalOffers"><MapPin size={17} /><b>Offers near you</b><small>Approved, within 10 KM</small></span>
        <span className="heroSignal signalBooking"><BadgeCheck size={17} /><b>Professional assigned</b><small>Booking chat available</small></span>
      </div>
      <div className="heroMotes">{MOTES.map((style, index) => <i key={index} style={style} />)}</div>
      <div className="heroGround" />
      <div className="heroScrim" />
    </div>
    <div className="heroStage">
      <div className="heroEditorial">
        <p className="eyebrow"><span className="statusDot" />{experienceCopy.hero.eyebrow}</p>
        <h1 id="hero-title" className="heroHeadline">{experienceCopy.hero.lines.map((line, index) => <span key={line} className={index ? 'accentLine' : ''}>{line}</span>)}</h1>
        <p className="heroLead">{experienceCopy.hero.body}</p>
        <div className="heroActions">
          <motion.a {...(reduced ? {} : feedback)} className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer"><Play size={17} fill="currentColor" />Open Play Store<ArrowUpRight size={18} /></motion.a>
          <motion.a {...(reduced ? {} : feedback)} className="secondaryAction" href="/download" onClick={event => navigate(event, '/download')}><ScanQrCode size={18} />Scan QR</motion.a>
        </div>
        <p className="heroFootnote"><MapPin size={15} />{experienceCopy.hero.note}</p>
      </div>
    </div>
    <div className="heroFoot">
      <a className="heroScroll" href="#discover"><ArrowDown size={16} /><span>GOOD THINGS ARE CLOSER THAN YOU THINK</span></a>
      {!reduced && <button type="button" className="sceneToggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play background motion' : 'Pause background motion'} aria-pressed={paused} title={paused ? 'Play background motion' : 'Pause background motion'}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>}
    </div>
  </section>;
}
