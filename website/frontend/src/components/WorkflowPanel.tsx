import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../animations/motion';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { IconText } from '../types';
export default function WorkflowPanel({ id, title, items, tone }: { id?: string; title: string; items: IconText[]; tone: string }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'bottom 70%', scrub: 0.4 } });
      timeline.fromTo('.workflowLine', { scaleY: 0 }, { scaleY: 1, ease: 'none' });
      gsap.utils.toArray<HTMLElement>('.workflowItem').forEach((step, index) => {
        timeline.from(step.querySelector('.stepIcon'), { scale: 0.88, duration: 0.2 }, index * 0.18)
          .from(step.querySelector('.stepCopy'), { x: 14, duration: 0.25 }, index * 0.18);
      });
    }, root);
    return () => context.revert();
  }, [reduced, items]);
  return <article ref={root} className={'workflowPanel ' + tone} id={id}><h3>{title}</h3><div className="workflowItems"><span className="workflowLine" aria-hidden="true" />{items.map(({ icon: Icon, title: itemTitle, body }, index) => <div className="workflowItem" key={itemTitle}><span className="stepIcon"><Icon size={23} aria-hidden="true" /></span><div className="stepCopy"><span className="stepNumber">STEP 0{index + 1}</span><strong>{itemTitle}</strong><p>{body}</p></div></div>)}</div></article>;
}
