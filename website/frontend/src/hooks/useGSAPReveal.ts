import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../animations/motion';
import { useReducedMotion } from './useReducedMotion';

export function useGSAPReveal<T extends HTMLElement>(selector = '[data-reveal]') {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const context = gsap.context(() => {
      gsap.fromTo(selector, { y: 22 }, { y: 0, duration: 0.65, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } });
    }, ref);
    return () => context.revert();
  }, [reduced, selector]);
  return ref;
}
