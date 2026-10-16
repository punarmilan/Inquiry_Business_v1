import type { Variants } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
export { gsap, ScrollTrigger };
export const ease = [0.22, 1, 0.36, 1] as const;
export const feedback = { whileHover: { y: -2 }, whileTap: { scale: 0.98 }, transition: { duration: 0.2 } };
export const entrance: Variants = {
  resting: { opacity: 1, y: 0 },
  enter: (index: number = 0) => ({ opacity: [0.55, 1], y: [16, 0], transition: { duration: 0.55, delay: (index % 3) * 0.07, ease } }),
};
