import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../animations/motion';
import { useReducedMotion } from './useReducedMotion';

export function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 960px)', () => {
      gsap.fromTo(ref.current, { y: 25, rotate: -3 }, { y: -25, rotate: 3, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    });
    return () => media.revert();
  }, [reduced]);
  return ref;
}
