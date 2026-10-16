import { BadgeCheck, BriefcaseBusiness, IndianRupee, MapPin, Timer } from 'lucide-react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { liveJobs } from '../data/siteData';
import previewCustomer from '../../assets/optimized/hero-woman-320.webp';

function PhonePreview() {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 150, damping: 24 });
  const rotateY = useSpring(y, { stiffness: 150, damping: 24 });
  useEffect(() => { if (reduced) { x.set(0); y.set(0); } }, [reduced, x, y]);
  return (
    <motion.div className="phoneFrame" style={reduced ? {} : { rotateX, rotateY, transformPerspective: 1000 }} onPointerMove={event => {
      if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      x.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -5);
      y.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 6);
    }} onPointerLeave={() => { x.set(0); y.set(0); }}>
      <div className="phoneTop">
        <MapPin size={15} aria-hidden="true" />
        <strong>Pune, Maharashtra</strong>
        <BadgeCheck size={16} aria-hidden="true" />
      </div>
      <div className="phoneHero">
        <div>
          <span>Offers Near You</span>
          <strong>Within 10 KM</strong>
          <small>Approved local deals</small>
        </div>
        <img src={previewCustomer} alt="" loading="lazy" />
      </div>
      <div className="phoneChips">
        <span className="active">Cleaning</span>
        <span>Electrician</span>
        <span>Driver</span>
        <span>More</span>
      </div>
      <div className="miniJobCard">
        <span className="miniIcon">
          <IndianRupee size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>{liveJobs[0].title}</strong>
          <p>{liveJobs[0].pay} · {liveJobs[0].distance}</p>
        </div>
      </div>
      <div className="miniJobCard muted">
        <span className="miniIcon blue">
          <BriefcaseBusiness size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>Book an electrician</strong>
          <p>From Rs. 499 - Managed service</p>
        </div>
      </div>
      <div className="miniJobCard muted">
        <span className="miniIcon green">
          <Timer size={17} aria-hidden="true" />
        </span>
        <div>
          <strong>Professional assigned</strong>
          <p>Booking chat available</p>
        </div>
      </div>
      <p className="phoneSample">ILLUSTRATIVE APP PREVIEW</p>
      <div className="phoneTabbar">
        <span className="active">Offers</span>
        <span>Services</span>
        <b>+</b>
        <span>More</span>
        <span>Profile</span>
      </div>
    </motion.div>
  );
}

export default PhonePreview;
