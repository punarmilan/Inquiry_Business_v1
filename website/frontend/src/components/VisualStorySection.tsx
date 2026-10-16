import { useLayoutEffect, useRef } from 'react';
import { appImages, experienceCopy, trustItems, imageSrcSet } from '../data/siteData';
import { gsap } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export default function VisualStorySection() {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'bottom 60%', scrub: 0.5 } });
      timeline.fromTo('.storyPhoto img', { scale: 1.08, yPercent: -3 }, { scale: 1, yPercent: 0 }, 0)
        .from('.storyCopy h2', { y: 22 }, 0)
        .from('.storyList > span', { x: 14, stagger: 0.15 }, 0.1);
    }, root);
    return () => context.revert();
  }, [reduced]);
  return <section ref={root} className="section visualStorySection" aria-label="InquiryExperts visual highlights">
    <figure className="storyPhoto"><img src={appImages.electricianWorker} srcSet={imageSrcSet(appImages.electricianWorker)} sizes="(max-width: 639px) 90vw, 45vw" alt="Electrician completing local service work" loading="lazy" /><figcaption><span>THE PEOPLE BEHIND THE PEACE OF MIND</span><strong>Real skills. Right nearby.</strong></figcaption></figure>
    <div className="storyCopy"><p className="eyebrow">{experienceCopy.story.eyebrow}</p><h2>{experienceCopy.story.title}</h2><p>{experienceCopy.story.body}</p><div className="storyList">{trustItems.map(({ icon: Icon, title }) => <span key={title}><Icon size={19} aria-hidden="true" />{title}</span>)}</div></div>
  </section>;
}
