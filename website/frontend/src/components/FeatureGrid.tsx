import { motion } from 'framer-motion';
import { features } from '../data/siteData';
import { entrance } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
export default function FeatureGrid({ limit }: { limit?: number }) {
  const reduced = useReducedMotion();
  const visible = typeof limit === 'number' ? features.slice(0, limit) : features;
  return <div className="featureGrid">{visible.map(({ icon: Icon, title, body, category }, index) => <motion.article key={title} className="featureCard" variants={entrance} initial={false} whileInView={reduced ? 'resting' : 'enter'} custom={index} viewport={{ once: true, amount: 0.15 }} whileHover={reduced ? {} : { y: -4 }} transition={{ duration: 0.2 }}>
    <div className="featureCardBody flex h-full flex-col"><div className="featureCardTop"><span className="featureIcon"><Icon size={24} aria-hidden="true" /></span><span className="featureNumber">{String(index + 1).padStart(2, '0')}</span></div>{category && <p className="featureCategory">{category}</p>}<h3>{title}</h3><p>{body}</p></div>
  </motion.article>)}</div>;
}
