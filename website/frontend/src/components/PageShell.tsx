import { motion } from 'framer-motion';
import { appImages, imageSrcSet } from '../data/siteData';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ease } from '../animations/motion';
import type { PageTitle } from '../types';
export default function PageShell({ eyebrow, title, body, children }: { eyebrow: string; title: PageTitle; body: string; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return <><motion.section className="pageHero" initial={false} animate={reduced ? {} : { y: [10, 0] }} transition={{ duration: 0.45, ease }}>
    <div className="pageHeroCopy"><p className="eyebrow">{eyebrow} / INQUIRYEXPERTS</p><h1>{title}</h1><p>{body}</p></div>
    <div className="pageHeroVisual"><img className="pageHeroImage" src={appImages.electricianWorker} srcSet={imageSrcSet(appImages.electricianWorker)} sizes="(max-width: 639px) 90vw, 45vw" alt="" /><span>YOUR LOCAL WORLD, IN FOCUS.</span></div>
  </motion.section>{children}</>;
}
