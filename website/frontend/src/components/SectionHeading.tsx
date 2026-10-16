import type { PageTitle } from '../types';
import { useGSAPReveal } from '../hooks/useGSAPReveal';
export default function SectionHeading({ eyebrow, title }: { eyebrow: string; title: PageTitle }) {
  const ref = useGSAPReveal<HTMLDivElement>();
  return <div ref={ref} className="sectionHead"><p className="eyebrow">{eyebrow}</p><div className="headingMask"><h2 data-reveal>{title}</h2></div></div>;
}
