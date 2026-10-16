import { Download, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import infinityLogo from '../../assets/optimized/infinity-logo-transparent-160.webp';
import { navItems, PLAY_STORE_URL } from '../constants';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { NavigationHandler, RoutePath } from '../types';
import { isActiveNavItem } from '../utils/routes';

export default function Navbar({ route, navigate }: { route: RoutePath; navigate: NavigationHandler }) {
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(route === '/');
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 24);
      const hero = route === '/' ? document.querySelector('.cinematicHero') : null;
      setOverHero(!!hero && hero.getBoundingClientRect().bottom > 96);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [route]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
      if (event.key !== 'Tab') return;
      const links = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>('a') || []);
      const first = links[0];
      const last = links.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); toggle.current?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); toggle.current?.focus(); }
      else if (document.activeElement === toggle.current) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
    };
    const media = window.matchMedia('(min-width: 960px)');
    const closeOnDesktop = () => { if (media.matches) { setOpen(false); document.getElementById('main-content')?.focus({ preventScroll: true }); } };
    document.addEventListener('keydown', onKey);
    media.addEventListener('change', closeOnDesktop);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey); media.removeEventListener('change', closeOnDesktop); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [route]);
  return <header className={'topNav' + (scrolled ? ' isScrolled' : '') + (overHero && !open ? ' overHero' : '')}>
    <a className="brand" href="/" aria-label="InquiryExperts home" onClick={event => navigate(event, '/')}><span className="brandMark"><img src={infinityLogo} alt="" /></span><span className="brandWordmark">Inquiry<span>Experts</span><small>LOCAL DEALS &amp; SERVICES</small></span></a>
    <nav className="navLinks" aria-label="Main navigation">{navItems.map(item => <a key={item.path} className={isActiveNavItem(route, item.path) ? 'active' : ''} aria-current={isActiveNavItem(route, item.path) ? 'page' : undefined} href={item.path} onClick={event => navigate(event, item.path)}>{item.label}</a>)}</nav>
    <motion.a whileHover={reduced ? {} : { y: -2 }} whileTap={reduced ? {} : { scale: 0.98 }} className="navButton" href={PLAY_STORE_URL} target="_blank" rel="noreferrer"><Download size={16} />Get the App</motion.a>
    <button ref={toggle} className="menuToggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => { setOpen(!open); if (open) toggle.current?.focus(); }}>{open ? <X /> : <Menu />}</button>
    <AnimatePresence>{open && <motion.nav ref={panel} id="mobile-navigation" className="mobileNavigation" aria-label="Mobile navigation" initial={reduced ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: 0.2 }}>
      {navItems.map((item, index) => <a key={item.path} aria-current={isActiveNavItem(route, item.path) ? 'page' : undefined} href={item.path} onClick={event => { setOpen(false); toggle.current?.focus(); navigate(event, item.path); }}><span>0{index + 1}</span>{item.label}</a>)}
      <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer"><Download size={20} />Get the Android app</a>
    </motion.nav>}</AnimatePresence>
  </header>;
}
