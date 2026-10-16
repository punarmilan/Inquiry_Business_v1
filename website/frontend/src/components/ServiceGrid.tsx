import { ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { categories, imageSrcSet } from '../data/siteData';
import { entrance } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { NavigationHandler } from '../types';
import { getServicePath } from '../utils/routes';
export default function ServiceGrid({ navigate }: { navigate: NavigationHandler }) {
  const reduced = useReducedMotion();
  return <div className="serviceImageGrid" aria-label="InquiryExperts service categories">{categories.map(({ icon: Icon, title, image, imageAlt, slug, body }, index) => <motion.a className="serviceCard" key={slug} href={getServicePath(slug)} onClick={event => navigate(event, getServicePath(slug))} variants={entrance} custom={index} initial={false} whileInView={reduced ? 'resting' : 'enter'} viewport={{ once: true, amount: 0.1 }} whileHover={reduced ? {} : { y: -4 }} whileFocus={reduced ? {} : { y: -4 }} transition={{ duration: 0.2 }}>
    <div className="serviceImage"><img src={image} srcSet={imageSrcSet(image)} sizes="(max-width: 639px) 90vw, 60vw" alt={imageAlt || ''} loading="lazy" /><span className="serviceArrow"><ArrowUpRight size={22} /></span></div>
    <div className="serviceCardBody"><span className="serviceIcon"><Icon size={20} aria-hidden="true" /></span><div><h3>{title}</h3><p>{body}</p></div></div>
  </motion.a>)}</div>;
}
