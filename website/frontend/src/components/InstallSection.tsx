import { ArrowUpRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PLAY_STORE_URL } from '../constants';
import { experienceCopy } from '../data/siteData';
import { feedback } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useParallax } from '../hooks/useParallax';
import PhonePreview from './PhonePreview';

export default function InstallSection() {
  const device = useParallax<HTMLDivElement>();
  const reduced = useReducedMotion();
  return <section className="installSection" id="install">
    <div className="installCopy"><p className="eyebrow">{experienceCopy.install.eyebrow}</p><h2>{experienceCopy.install.title}</h2><p>{experienceCopy.install.body}</p>
      <motion.a {...(reduced ? {} : feedback)} className="primaryAction" href={PLAY_STORE_URL} target="_blank" rel="noreferrer"><Play size={17} fill="currentColor" />{experienceCopy.install.action}<ArrowUpRight size={19} /></motion.a>
      <div className="qrPanel"><QRCodeSVG value={PLAY_STORE_URL} size={108} level="Q" marginSize={2} title="InquiryExperts Play Store QR" /><div><strong>Scan. Install. Explore.</strong><span>InquiryExperts Android App</span></div></div>
    </div>
    <div className="installDevice" ref={device}><PhonePreview /></div>
  </section>;
}
