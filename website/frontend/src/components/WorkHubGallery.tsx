import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { workHubHighlights, imageSrcSet } from '../data/siteData';
import { PLAY_STORE_URL } from '../constants';
import { gsap, ScrollTrigger } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import SectionHeading from './SectionHeading';

export default function WorkHubGallery() {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || !root.current || !track.current || !viewport.current) return;
    const media = gsap.matchMedia();
    media.add('(min-width: 960px)', () => {
      const travel = () => Math.max(0, track.current!.scrollWidth - viewport.current!.clientWidth);
      const tween = gsap.to(track.current, { x: () => -travel(), ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 100px', end: () => '+=' + Math.max(1, travel()), pin: true, scrub: 0.5, invalidateOnRefresh: true, onUpdate: self => { root.current?.style.setProperty('--gallery-progress', String(self.progress)); } } });
      const cards = Array.from(track.current!.querySelectorAll<HTMLElement>('article'));
      cards.forEach(card => gsap.fromTo(card.querySelector('img'), { scale: 1.06 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      const focus = (event: FocusEvent) => {
        const card = (event.target as HTMLElement).closest('article');
        const trigger = tween.scrollTrigger;
        if (!card || !trigger || !travel()) return;
        const distance = Math.min((card as HTMLElement).offsetLeft, travel());
        trigger.scroll(trigger.start + distance / travel() * (trigger.end - trigger.start));
        tween.progress(distance / travel());
        viewport.current!.scrollLeft = 0;
      };
      track.current!.addEventListener('focusin', focus);
      let frame = 0;
      const observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => ScrollTrigger.refresh()); });
      observer.observe(viewport.current!);
      return () => { observer.disconnect(); cancelAnimationFrame(frame); track.current?.removeEventListener('focusin', focus); root.current?.style.removeProperty('--gallery-progress'); };
    }, root);
    return () => media.revert();
  }, [reduced]);
  return <section ref={root} className="section workHubGallery" aria-label="How InquiryExperts works">
    <div className="galleryHeading"><SectionHeading eyebrow="APP EXPERIENCE / THREE SIMPLE MOMENTS" title={<>Local life.<br /><span>In full view.</span></>} /><p>Discover. Book. Grow.<br />Explore the app, one moment at a time.</p></div>
    <div ref={viewport} className="galleryViewport" tabIndex={0} aria-label="App experience gallery; scroll to explore">
      <div ref={track} className="workHubGalleryGrid">{workHubHighlights.map(({ icon: Icon, title, body, image, imageAlt }, index) => <article className="workHubVisualCard" key={title}>
        <img src={image} srcSet={imageSrcSet(image)} sizes="(max-width: 639px) 90vw, 60vw" alt={imageAlt || ''} loading="lazy" onLoad={() => ScrollTrigger.refresh()} />
        <span className="galleryNumber">0{index + 1}</span>
        <div><Icon size={25} aria-hidden="true" /><h3>{title}</h3><p>{body}</p><a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" aria-label={title + ' in the Android app'}>Explore in the app<ArrowUpRight size={20} /></a></div>
      </article>)}</div>
    </div>
    <div className="galleryProgress" aria-hidden="true"><span /></div>
  </section>;
}
