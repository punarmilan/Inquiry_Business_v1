import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { categories, experienceCopy, workHubHighlights, workerSteps, imageSrcSet } from '../data/siteData';
import { gsap, ScrollTrigger } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { getServicePath } from '../utils/routes';
import tealBackground from '../../assets/optimized/teal-background-1024.webp';
import PhonePreview from './PhonePreview';
import type { NavigationHandler } from '../types';

export default function DiscoveryExperience({ navigate }: { navigate: NavigationHandler }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  useLayoutEffect(() => {
    if (reduced) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 960px)', () => {
      const chapters = gsap.utils.toArray<HTMLElement>('.discoveryChapter', root.current);
      ScrollTrigger.create({ trigger: '.discoveryLayout', endTrigger: chapters.at(-1), start: 'top 120px', end: 'bottom bottom-=60', pin: '.discoveryVisual', pinSpacing: false });
      chapters.forEach((chapter, index) => {
        ScrollTrigger.create({ trigger: chapter, start: 'top center', end: 'bottom center', onEnter: () => setSelected(index), onEnterBack: () => setSelected(index) });
      });
      // The phone rises out of the neighbourhood; GSAP moves the wrapper so it never fights PhonePreview's own tilt.
      gsap.fromTo('.productDevice', { y: 110, rotateX: 14 }, { y: -20, rotateX: 0, ease: 'none', scrollTrigger: { trigger: '.discoveryProduct', start: 'top bottom', end: 'bottom 45%', scrub: 0.6 } });
      gsap.fromTo('.productBackdrop img', { scale: 1.18, yPercent: -6 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.discoveryProduct', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.chapterProgress > span', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.discoveryLayout', start: 'top center', end: 'bottom center', scrub: true } });
    }, root);
    return () => media.revert();
  }, [reduced]);
  return <section ref={root} id="discover" className="discoveryExperience" aria-labelledby="discovery-title">
    <div className="experienceIntro"><p className="eyebrow">{experienceCopy.discovery.eyebrow}</p><h2 id="discovery-title">Small radius.<br /><span>Endless possibilities.</span></h2><p>{experienceCopy.discovery.body}</p></div>
    <div className="discoveryProduct">
      <div className="productBackdrop" aria-hidden="true"><img src={tealBackground} alt="" loading="lazy" /></div>
      <div className="productCopy"><p className="eyebrow"><span className="statusDot" />THE NEIGHBOURHOOD, IN YOUR POCKET</p><h3>Everything nearby.<br /><span>One calm screen.</span></h3>
        <ul className="productSteps">{workerSteps.map(({ icon: Icon, title, body }) => <li key={title}><Icon size={22} aria-hidden="true" /><div><strong>{title}</strong><span>{body}</span></div></li>)}</ul>
      </div>
      <div className="productDevice"><PhonePreview /></div>
    </div>
    <div className="discoveryLayout">
      <div className="discoveryVisual" aria-hidden="true">
        {workHubHighlights.map((item, index) => <img key={item.title} className={selected === index ? 'active' : ''} src={item.image} srcSet={imageSrcSet(item.image)} sizes="(max-width: 639px) 90vw, 45vw" alt="" loading="lazy" onLoad={() => ScrollTrigger.refresh()} />)}
        <div className="discoveryVisualCaption"><MapPin size={19} /><span>{workHubHighlights[selected].title}</span><b>0{selected + 1}</b></div>
      </div>
      <div className="discoveryChapters"><div className="chapterProgress" aria-hidden="true"><span /></div>
        {workHubHighlights.map(({ icon: Icon, title, body, image, imageAlt }, index) => <article className={'discoveryChapter ' + (selected === index ? 'active' : '')} key={title}>
          <img className="chapterMobileImage" src={image} srcSet={imageSrcSet(image)} sizes="(max-width: 639px) 90vw, 60vw" alt={imageAlt} loading="lazy" />
          <span className="chapterIndex">0{index + 1} / LOCAL, MADE SIMPLE</span><Icon size={27} aria-hidden="true" /><h3>{title}</h3><p>{body}</p>
          <a className="textLink" href={index === 1 ? '/services' : '/work-hub'} onClick={event => navigate(event, index === 1 ? '/services' : '/work-hub')}>Explore {index === 1 ? 'services' : 'how it works'}<ArrowUpRight size={20} /></a>
        </article>)}
      </div>
    </div>
    <div className="discoverySelector"><span>What can we help with?</span><div className="flex flex-wrap justify-start gap-2 xl:justify-end">{categories.map(({ icon: Icon, title, slug }) => <a key={slug} href={getServicePath(slug)} onClick={event => navigate(event, getServicePath(slug))}><Icon size={16} />{title}<ArrowUpRight size={14} /></a>)}</div></div>
  </section>;
}
